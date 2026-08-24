import { Hono } from 'hono';
import { cors } from 'hono/cors';

const app = new Hono();

app.use('/api/*', cors());

function uuid() { return crypto.randomUUID(); }

const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no 0/O/1/I/L
function genCode(len = 6) {
  let out = '';
  for (let i = 0; i < len; i++) out += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return out;
}

async function uniqueClassCode(db) {
  for (let i = 0; i < 25; i++) {
    const code = genCode();
    const exists = await db.prepare(`SELECT id FROM classes WHERE access_code = ?`).bind(code).first();
    if (!exists) return code;
  }
  return genCode() + Date.now().toString().slice(-2);
}

async function log(db, action, details = '') {
  try {
    await db.prepare(
      `INSERT INTO activity_log (id, action, details) VALUES (?, ?, ?)`
    ).bind(uuid(), action, details).run();
  } catch {}
}

// ── NOTIFICATIONS (Upscale.md §42-43, §72) ─────
const NOTIF_TYPES = new Set(['assessment_published','assessment_reminder','assessment_submitted','result_published','grade_changed','attendance_recorded','announcement']);

async function createNotification(db, { class_id = '', student_id = '', title, body = '', type = 'announcement', exam_id = '' }) {
  if (!title || !String(title).trim()) return null;
  const t = NOTIF_TYPES.has(type) ? type : 'announcement';
  const id = uuid();
  try {
    await db.prepare(`INSERT INTO notifications (id, class_id, student_id, title, body, type, exam_id) VALUES (?, ?, ?, ?, ?, ?, ?)`).bind(id, class_id || '', (student_id || '').toUpperCase(), String(title).trim(), String(body || ''), t, exam_id || '').run();
    return id;
  } catch { return null; }
}

// ── WEB PUSH (Real Push) ─────────────────────────
function b64urlEncode(bytes) {
  let str = '';
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  for (let i = 0; i < arr.length; i++) str += String.fromCharCode(arr[i]);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/,'');
}
function b64urlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  const bin = atob(str);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function b64urlDecodeToString(str) {
  const bytes = b64urlDecode(str);
  return new TextDecoder().decode(bytes);
}
async function vapidJwtForEndpoint(endpoint, env) {
  const vapidPublic = env.VAPID_PUBLIC_KEY || '';
  const vapidPrivate = env.VAPID_PRIVATE_KEY || '';
  const vapidSubject = env.VAPID_SUBJECT || 'mailto:admin@wmsu.edu.ph';
  if (!vapidPublic || !vapidPrivate) throw new Error('VAPID keys not configured');
  // Decode public to get x,y
  const pubRaw = b64urlDecode(vapidPublic);
  if (pubRaw.length !== 65 || pubRaw[0] !== 0x04) throw new Error('Invalid VAPID public key');
  const x = b64urlEncode(pubRaw.slice(1,33));
  const y = b64urlEncode(pubRaw.slice(33,65));
  const jwk = { kty:'EC', crv:'P-256', x, y, d: vapidPrivate };
  const header = b64urlEncode(new TextEncoder().encode(JSON.stringify({ typ:'JWT', alg:'ES256' })));
  const aud = new URL(endpoint).origin;
  const exp = Math.floor(Date.now()/1000) + 12*3600;
  const payload = b64urlEncode(new TextEncoder().encode(JSON.stringify({ aud, exp, sub: vapidSubject })));
  const data = new TextEncoder().encode(header + '.' + payload);
  const key = await crypto.subtle.importKey('jwk', jwk, { name:'ECDSA', namedCurve:'P-256' }, false, ['sign']);
  const sigBuf = await crypto.subtle.sign({ name:'ECDSA', hash:'SHA-256' }, key, data);
  // WebCrypto returns raw r||s 64 bytes; need to handle DER fallback (some impl returns DER)
  let sigBytes = new Uint8Array(sigBuf);
  // If DER (starts with 0x30), convert to raw
  if (sigBytes[0] === 0x30) {
    // Simple DER parse: 0x30 len 0x02 rLen r ... 0x02 sLen s
    let off = 2;
    if (sigBytes[1] & 0x80) off += (sigBytes[1] & 0x7f) + 1;
    const rLen = sigBytes[off+1];
    const r = sigBytes.slice(off+2, off+2+rLen);
    off = off+2+rLen;
    const sLen = sigBytes[off+1];
    const s = sigBytes.slice(off+2, off+2+sLen);
    const raw = new Uint8Array(64);
    raw.set(r.slice(-32), 32 - Math.min(32, r.length));
    raw.set(s.slice(-32), 64 - Math.min(32, s.length));
    sigBytes = raw;
  }
  const sig = b64urlEncode(sigBytes);
  return header + '.' + payload + '.' + sig;
}

async function sendPushToSubscription(sub, env, payloadForLog) {
  const endpoint = sub.endpoint;
  const vapidPublic = env.VAPID_PUBLIC_KEY || '';
  let headers = { 'TTL': '86400' };
  try {
    const jwt = await vapidJwtForEndpoint(endpoint, env);
    headers['Authorization'] = `vapid t=${jwt}, k=${vapidPublic}`;
  } catch (e) {
    // If VAPID not configured, skip push
    return { ok:false, reason:'vapid_error' };
  }
  // Empty tickle push — SW fetches notifications
  try {
    const res = await fetch(endpoint, { method:'POST', headers, body: '' });
    if (res.status === 404 || res.status === 410) return { ok:false, status: res.status, gone:true };
    return { ok: res.ok, status: res.status };
  } catch (e) {
    return { ok:false, error: String(e) };
  }
}

async function triggerPushForNotification(db, { class_id, student_id, title, body, type }) {
  const env = { VAPID_PUBLIC_KEY: '', VAPID_PRIVATE_KEY: '', VAPID_SUBJECT: '' };
  // env will be injected per-request via c.env; this helper is called with db only,
  // so we store VAPID in DB? Instead caller passes env; fallback: try to read from global
  // For now, we fetch subscriptions and let the route handler do the actual send.
  // This helper is a no-op when called from createNotification without env — real send is done in route handlers where c.env is available.
  return;
}
async function triggerPushWithEnv(db, env, { class_id, student_id }) {
  let subs = [];
  if (student_id) {
    const { results } = await db.prepare(`SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE student_id = ?`).bind(student_id.toUpperCase()).all();
    subs = results || [];
  } else if (class_id) {
    const { results: enrolls } = await db.prepare(`SELECT student_id FROM enrollments WHERE class_id = ?`).bind(class_id).all();
    const ids = enrolls.map(r=>r.student_id).filter(Boolean);
    if (ids.length) {
      const { results } = await db.prepare(`SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE student_id IN (${ids.map(()=>'?').join(',')})`).bind(...ids).all();
      subs = results || [];
    }
  } else {
    const { results } = await db.prepare(`SELECT endpoint, p256dh, auth FROM push_subscriptions LIMIT 200`).all();
    subs = results || [];
  }
  let sent = 0, gone = 0;
  for (const s of subs) {
    const r = await sendPushToSubscription(s, env);
    if (r.ok) sent++;
    if (r.gone) {
      try { await db.prepare(`DELETE FROM push_subscriptions WHERE endpoint = ?`).bind(s.endpoint).run(); gone++; } catch {}
    }
  }
  return { sent, gone, total: subs.length };
}

function adminCheck(c) {
  const auth = c.req.header('Authorization');
  const expected = c.env.VITE_ADMIN_PASSWORD || 'admin123';
  return auth === expected;
}

// Clamp the passing score (percent) to a sane 0–100 range; empty/NaN/non-numeric
// (e.g. 'abc') falls back to 60. The form pre-validates, so this is a safety net.
function clampPassing(v) {
  if (v === undefined || v === null || v === '' || Number.isNaN(Number(v))) return 60;
  const n = Number(v);
  return Math.max(0, Math.min(100, n));
}

// ── EXAMS ──────────────────────────────────────────
app.get('/api/exams', async (c) => {
  const db = c.env.DB;
  const { results } = await db.prepare(
    `SELECT e.*,
       (SELECT COUNT(*) FROM questions WHERE exam_id = e.id) as question_count,
       (SELECT COUNT(*) FROM submissions WHERE exam_id = e.id) as submission_count
     FROM exams e ORDER BY e.created_at DESC`
  ).all();
  return c.json(results);
});

app.post('/api/exams', async (c) => {
  const db = c.env.DB;
  const body = await c.req.json();
  const id = uuid();
  const passing = clampPassing(body.passing_score);
  await db.prepare(
    `INSERT INTO exams (id, title, description, time_limit, questions_per_set, show_answers, deadline, access_code, roster, class_id, type, status, passing_score, start_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(id, body.title, body.description || '', body.time_limit || 60, body.questions_per_set || 10, body.show_answers !== undefined ? (body.show_answers ? 1 : 0) : 1, body.deadline || '', body.access_code || '', JSON.stringify(body.roster || []), body.class_id || '', body.type || 'major_exam', body.status || 'draft', passing, body.start_at || '').run();
  await log(db, 'exam_created', 'Created exam: ' + body.title);
  // Auto-notify class when a non-draft exam is created + real push
  const s = body.status || 'draft';
  if (s === 'active' || s === 'scheduled' || s === 'published') {
    await createNotification(db, { class_id: body.class_id || '', title: `New ${body.type || 'exam'}: ${body.title}`, body: body.description || `An assessment has been published${body.start_at ? ' — opens ' + body.start_at : ''}.`, type: 'assessment_published', exam_id: id });
    try { c.executionCtx?.waitUntil?.(triggerPushWithEnv(db, c.env, { class_id: body.class_id || '' }).catch(()=>{})); } catch {}
  }
  return c.json({ id }, 201);
});

app.get('/api/exams/:id', async (c) => {
  const db = c.env.DB;
  const examId = c.req.param('id');
  const exam = await db.prepare(`SELECT * FROM exams WHERE id = ?`).bind(examId).first();
  if (!exam) return c.json({ error: 'Exam not found' }, 404);
  const { results: questions } = await db.prepare(
    `SELECT * FROM questions WHERE exam_id = ? ORDER BY part, sort_order, id`
  ).bind(examId).all();

  const isAdmin = adminCheck(c);
  const roster = typeof exam.roster === 'string' ? exam.roster : JSON.stringify(exam.roster || []);
  const klass = exam.class_id ? await db.prepare(`SELECT name, subject, section FROM classes WHERE id = ?`).bind(exam.class_id).first() : null;
  return c.json({
    ...exam,
    questions,
    class_name: klass ? [klass.name, klass.section].filter(Boolean).join(' — ') : '',
    access_code: isAdmin ? (exam.access_code || '') : undefined,
    has_access_code: !!(exam.access_code || ''),
    roster: isAdmin ? (typeof roster === 'string' ? JSON.parse(roster) : []) : undefined,
  });
});

app.put('/api/exams/:id', async (c) => {
  const db = c.env.DB;
  const examId = c.req.param('id');
  const body = await c.req.json();
  const old = await db.prepare(`SELECT title, status FROM exams WHERE id = ?`).bind(examId).first();
  const passing = clampPassing(body.passing_score);
  await db.prepare(
    `UPDATE exams SET title = ?, description = ?, time_limit = ?, questions_per_set = ?, show_answers = ?, deadline = ?, access_code = ?, roster = ?, class_id = ?, type = ?, status = ?, passing_score = ?, start_at = ?, updated_at = datetime('now')
     WHERE id = ?`
  ).bind(body.title, body.description || '', body.time_limit || 60, body.questions_per_set || 10, body.show_answers !== undefined ? (body.show_answers ? 1 : 0) : 1, body.deadline || '', body.access_code || '', JSON.stringify(body.roster || []), body.class_id || '', body.type || 'major_exam', body.status || 'draft', passing, body.start_at || '', examId).run();
  await log(db, 'exam_updated', 'Updated: ' + (old?.title || examId));
  // Notify on publish/activate transition (draft→active/scheduled/published) + real push
  const prev = old?.status || 'draft';
  const next = body.status || 'draft';
  const isPublish = prev === 'draft' && (next === 'active' || next === 'scheduled' || next === 'published');
  if (isPublish) {
    await createNotification(db, { class_id: body.class_id || '', title: `Assessment published: ${body.title}`, body: `Status is now ${next}${body.start_at ? ' — opens ' + body.start_at : ''}.`, type: 'assessment_published', exam_id: examId });
    try { c.executionCtx?.waitUntil?.(triggerPushWithEnv(db, c.env, { class_id: body.class_id || '' }).catch(()=>{})); } catch {}
  }
  return c.json({ success: true });
});

// Duplicate an exam (Upscale.md §67): copies the exam row plus all its questions.
// The copy is reset to draft, with no deadline and no scheduled start, so the
// instructor can edit and republish it freely.
app.post('/api/exams/:id/duplicate', async (c) => {
  if (!adminCheck(c)) return c.json({ error: 'Unauthorized' }, 401);
  const db = c.env.DB;
  const src = await db.prepare(`SELECT * FROM exams WHERE id = ?`).bind(c.req.param('id')).first();
  if (!src) return c.json({ error: 'Exam not found' }, 404);
  const newId = uuid();
  const passing = clampPassing(src.passing_score);
  await db.prepare(
    `INSERT INTO exams (id, title, description, time_limit, questions_per_set, show_answers, deadline, access_code, roster, class_id, type, status, passing_score, start_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(newId, src.title + ' (copy)', src.description, src.time_limit, src.questions_per_set, src.show_answers, '', src.access_code, src.roster, src.class_id, src.type, 'draft', passing, '').run();
  const { results: questions } = await db.prepare(
    `SELECT part, text, type, choices, answer, explain, sort_order, difficulty, topic, competency, tags FROM questions WHERE exam_id = ?`
  ).bind(c.req.param('id')).all();
  for (const q of questions) {
    await db.prepare(
      `INSERT INTO questions (id, exam_id, part, text, type, choices, answer, explain, sort_order, difficulty, topic, competency, tags)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(uuid(), newId, q.part, q.text, q.type, q.choices, q.answer, q.explain || '', q.sort_order, q.difficulty || '', q.topic || '', q.competency || '', q.tags || '').run();
  }
  await log(db, 'exam_duplicated', 'Duplicated: ' + src.title + ' → ' + src.title + ' (copy)');
  return c.json({ id: newId }, 201);
});

app.delete('/api/exams/:id', async (c) => {
  const db = c.env.DB;
  const old = await db.prepare(`SELECT title FROM exams WHERE id = ?`).bind(c.req.param('id')).first();
  await db.prepare(`DELETE FROM exams WHERE id = ?`).bind(c.req.param('id')).run();
  await log(db, 'exam_deleted', 'Deleted: ' + (old?.title || c.req.param('id')));
  return c.json({ success: true });
});

// Tell the student whether a retry is currently allowed for their submission
// (auto-submitted, or explicitly granted by the proctor).
app.get('/api/exams/:id/retry-status', async (c) => {
  const db = c.env.DB;
  const examId = c.req.param('id');
  const { student_id = '', student_name = '', student_section = '' } = c.req.query();
  if (!student_id || !student_name) return c.json({ allowed: false });

  const sub = await db.prepare(
    `SELECT reason, retry_allowed FROM submissions WHERE exam_id = ? AND student_id = ? AND student_name = ? AND student_section = ?`
  ).bind(examId, student_id, student_name, student_section).first();

  if (!sub) return c.json({ allowed: false });
  const auto = sub.reason === 'timeout' || sub.reason === 'tab' || sub.reason === 'kick';
  return c.json({ allowed: !!sub.retry_allowed || auto, reason: sub.reason });
});

// Look up a student in the class roster for a class-linked exam, so they only
// need to type their student ID to start.
app.get('/api/exams/:id/student', async (c) => {
  const db = c.env.DB;
  const examId = c.req.param('id');
  const studentId = (c.req.query('student_id') || '').trim().toUpperCase();
  if (!studentId) return c.json({ error: 'Student ID is required.' }, 400);

  const exam = await db.prepare(`SELECT class_id FROM exams WHERE id = ?`).bind(examId).first();
  if (!exam) return c.json({ error: 'Exam not found' }, 404);

  if (!exam.class_id) return c.json({ error: 'This exam is not linked to a class.' }, 400);

  const roster = await db.prepare(
    `SELECT student_id, student_name, student_section FROM enrollments WHERE class_id = ? AND student_id = ?`
  ).bind(exam.class_id, studentId).first();
  if (!roster) {
    return c.json({ error: 'This student ID is not enrolled in the linked class.' }, 404);
  }

  return c.json({ student_id: roster.student_id, student_name: roster.student_name, student_section: roster.student_section });
});

// ── QUESTIONS ──────────────────────────────────────
app.post('/api/exams/:examId/questions', async (c) => {
  const db = c.env.DB;
  const examId = c.req.param('examId');
  const body = await c.req.json();
  const id = uuid();
  const qType = body.type || 'multiple_choice';
  await db.prepare(
    `INSERT INTO questions (id, exam_id, part, text, type, choices, answer, explain, sort_order, difficulty, topic, competency, tags)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(id, examId, body.part, body.text, qType, JSON.stringify(body.choices || []), body.answer, body.explain || '', body.sort_order || 0, body.difficulty || '', body.topic || '', body.competency || '', JSON.stringify(body.tags || [])).run();
  return c.json({ id }, 201);
});

app.put('/api/questions/:id', async (c) => {
  const db = c.env.DB;
  const body = await c.req.json();
  const qType = body.type || 'multiple_choice';
  await db.prepare(
    `UPDATE questions SET part = ?, text = ?, type = ?, choices = ?, answer = ?, explain = ?, sort_order = ?, difficulty = ?, topic = ?, competency = ?, tags = ? WHERE id = ?`
  ).bind(body.part, body.text, qType, JSON.stringify(body.choices || []), body.answer, body.explain || '', body.sort_order || 0, body.difficulty || '', body.topic || '', body.competency || '', JSON.stringify(body.tags || []), c.req.param('id')).run();
  return c.json({ success: true });
});

app.delete('/api/questions/:id', async (c) => {
  const db = c.env.DB;
  await db.prepare(`DELETE FROM questions WHERE id = ?`).bind(c.req.param('id')).run();
  return c.json({ success: true });
});

// ── BULK IMPORT QUESTIONS ──────────────────────────
app.post('/api/exams/:examId/questions/bulk', async (c) => {
  const db = c.env.DB;
  const examId = c.req.param('examId');
  const body = await c.req.json();
  const questions = body.questions || [];
  const added = [];
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const id = uuid();
    const qType = q.type || 'multiple_choice';
    await db.prepare(
      `INSERT INTO questions (id, exam_id, part, text, type, choices, answer, explain, sort_order, difficulty, topic, competency, tags)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(id, examId, q.part || 1, q.text, qType, JSON.stringify(q.choices || []), q.answer, q.explain || '', body.start_order + i || i, q.difficulty || '', q.topic || '', q.competency || '', JSON.stringify(q.tags || [])).run();
    added.push(id);
  }
  await log(db, 'bulk_import', 'Imported ' + added.length + ' questions into exam ' + examId);
  return c.json({ count: added.length, ids: added }, 201);
});

// ── QUESTION BANK ──────────────────────────────────
app.get('/api/bank', async (c) => {
  const db = c.env.DB;
  const { results } = await db.prepare(
    `SELECT * FROM question_bank ORDER BY created_at DESC`
  ).all();
  return c.json(results);
});

app.post('/api/bank', async (c) => {
  if (!adminCheck(c)) return c.json({ error: 'Unauthorized' }, 401);
  const db = c.env.DB;
  const body = await c.req.json();
  const id = uuid();
  const qType = body.type || 'multiple_choice';
  await db.prepare(
    `INSERT INTO question_bank (id, part, text, type, choices, answer, explain, difficulty, topic, competency, tags)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(id, body.part, body.text, qType, JSON.stringify(body.choices || []), body.answer, body.explain || '', body.difficulty || '', body.topic || '', body.competency || '', JSON.stringify(body.tags || [])).run();
  await log(db, 'bank_added', 'Added question to bank (part ' + body.part + ')');
  return c.json({ id }, 201);
});

app.put('/api/bank/:id', async (c) => {
  if (!adminCheck(c)) return c.json({ error: 'Unauthorized' }, 401);
  const db = c.env.DB;
  const body = await c.req.json();
  const qType = body.type || 'multiple_choice';
  await db.prepare(
    `UPDATE question_bank SET part = ?, text = ?, type = ?, choices = ?, answer = ?, explain = ?, difficulty = ?, topic = ?, competency = ?, tags = ? WHERE id = ?`
  ).bind(body.part, body.text, qType, JSON.stringify(body.choices || []), body.answer, body.explain || '', body.difficulty || '', body.topic || '', body.competency || '', JSON.stringify(body.tags || []), c.req.param('id')).run();
  await log(db, 'bank_updated', 'Updated bank question ' + c.req.param('id'));
  return c.json({ success: true });
});

app.delete('/api/bank/:id', async (c) => {
  if (!adminCheck(c)) return c.json({ error: 'Unauthorized' }, 401);
  const db = c.env.DB;
  await db.prepare(`DELETE FROM question_bank WHERE id = ?`).bind(c.req.param('id')).run();
  await log(db, 'bank_deleted', 'Deleted bank question ' + c.req.param('id'));
  return c.json({ success: true });
});

// ── ACTIVITY LOG ───────────────────────────────────
app.get('/api/logs', async (c) => {
  const db = c.env.DB;
  const { results } = await db.prepare(
    `SELECT * FROM activity_log ORDER BY created_at DESC LIMIT 200`
  ).all();
  return c.json(results);
});

// ── SUBMIT ─────────────────────────────────────────
app.post('/api/submit', async (c) => {
  const db = c.env.DB;
  const body = await c.req.json();
  const { exam_id, student_name, student_section, student_id = '', seed, answers, score, total, tab_switches, time_taken, reason = 'manual' } = body;

  const exam = await db.prepare(`SELECT deadline, class_id, status, start_at FROM exams WHERE id = ?`).bind(exam_id).first();
  // Find any prior submission for this student so we can tell a fresh attempt
  // (blocked by lifecycle) from a resumed mid-session finalization (allowed).
  const existing = await db.prepare(
    `SELECT id, reason, retry_allowed FROM submissions WHERE exam_id = ? AND student_name = ? AND student_section = ?`
  ).bind(exam_id, student_name, student_section).first();
  const isResumeFinalization = !!existing;

  // Never accept FRESH submissions for exams that aren't open for new attempts:
  // draft (never published), scheduled-but-not-open, closed, or archived. Resumed
  // finalizations are the only exception: a student who already started (before
  // the exam was drawn down) must be able to finish and keep their work. This
  // mirrors the client-side lifecycle gate in Exam.jsx and /session/start.
  if (exam && !isResumeFinalization) {
    const notOpen = exam.status === 'draft' || exam.status === 'closed' || exam.status === 'archived' ||
      (exam.status === 'scheduled' && exam.start_at && new Date(exam.start_at).getTime() > Date.now());
    if (notOpen) {
      const msg = exam.status === 'draft' ? 'This exam is not published yet.'
        : exam.status === 'scheduled' ? 'This exam has not opened yet.'
        : exam.status === 'closed' ? 'This exam has been closed by the instructor.'
        : 'This exam has been archived and is no longer available.';
      return c.json({ error: msg }, 403);
    }
  }
  if (exam?.deadline) {
    const deadlineMs = new Date(exam.deadline).getTime();
    const startedAt = Number(body.started_at);
    if (Date.now() > deadlineMs && (!startedAt || startedAt > deadlineMs)) {
      return c.json({ error: 'This exam has already ended.' }, 403);
    }
  }

  const safeReason = ['manual', 'timeout', 'tab', 'kick'].includes(reason) ? reason : 'manual';
  // Allow re-submission when the previous attempt was auto-submitted (timeout/tab/kick)
  // or the proctor explicitly granted a retry for this student.
  if (existing && existing.reason === 'manual' && !existing.retry_allowed) {
    return c.json({ error: 'You have already submitted this exam.' }, 409);
  }

  if (exam.class_id) {
    const enrolled = await db.prepare(
      `SELECT id FROM enrollments WHERE class_id = ? AND student_id = ?`
    ).bind(exam.class_id, student_id).first();
    if (!enrolled) {
      return c.json({ error: 'You must be enrolled in this class to take this exam.' }, 403);
    }
  }

  const id = existing ? existing.id : uuid();
  if (existing) {
    await db.prepare(
      `UPDATE submissions
       SET student_id = ?, seed = ?, answers = ?, score = ?, total = ?, tab_switches = ?, time_taken = ?, reason = ?, submitted_at = datetime('now')
       WHERE id = ?`
    ).bind(student_id, seed, JSON.stringify(answers), score, total, tab_switches, time_taken, safeReason, id).run();
    // Answers changed, so discard any manual reviews tied to the old attempt.
    await db.prepare(`DELETE FROM answer_reviews WHERE submission_id = ?`).bind(id).run();
  } else {
    await db.prepare(
      `INSERT INTO submissions (id, exam_id, student_name, student_section, student_id, seed, answers, score, total, tab_switches, time_taken, reason)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(id, exam_id, student_name, student_section, student_id, seed, JSON.stringify(answers), score, total, tab_switches, time_taken, safeReason).run();
  }

  // Mark attendance as submitted and close the student's active session(s).
  await db.prepare(
    `UPDATE attendance SET status = 'submitted', submitted_at = datetime('now')
     WHERE exam_id = ? AND (student_id = ? OR (student_name = ? AND student_section = ?))`
  ).bind(exam_id, student_id, student_name, student_section).run();
  await db.prepare(
    `UPDATE exam_sessions SET active = 0 WHERE exam_id = ? AND student_id = ?`
  ).bind(exam_id, student_id).run();

  // Auto-record class attendance when this exam belongs to a class.
  if (exam.class_id) {
    const today = new Date().toISOString().slice(0, 10);
    await db.prepare(
      `INSERT INTO class_attendance (id, class_id, date, student_id, student_name, status, source)
       VALUES (?, ?, ?, ?, ?, 'present', 'exam')
       ON CONFLICT(class_id, date, student_id)
       DO UPDATE SET student_name = excluded.student_name`
    ).bind(uuid(), exam.class_id, today, student_id, student_name).run();
  }

  await log(db, 'submission', `${existing ? 'Resubmission' : 'Score recorded'} for ${student_name} (${student_id || 'no ID'}): ${score}/${total} (${safeReason})`);
  return c.json({ id }, existing ? 200 : 201);
});

// ── SESSIONS (single-session lock + heartbeat) ──────
const SESSION_STALE_MS = 75 * 1000; // a session is stale if no heartbeat for 75s

app.post('/api/exams/:id/session/start', async (c) => {
  const db = c.env.DB;
  const examId = c.req.param('id');
  const body = await c.req.json();
  const { student_id, student_name, student_section, device_id = '' } = body;

  if (!student_id) {
    return c.json({ error: 'Student ID is required.' }, 400);
  }

  const exam = await db.prepare(`SELECT deadline, access_code, class_id, status, start_at FROM exams WHERE id = ?`).bind(examId).first();
  if (!exam) return c.json({ error: 'Exam not found' }, 404);

  // Lifecycle gate (Upscale.md §48): only scheduled (when open) and active exams
  // can be started. Draft / closed / archived exams are blocked server-side.
  const now = Date.now();
  if (exam.status === 'draft') {
    return c.json({ error: 'This exam is not published yet. Please check back later.' }, 403);
  }
  if (exam.status === 'archived') {
    return c.json({ error: 'This exam is archived and no longer available.' }, 403);
  }
  if (exam.status === 'closed') {
    return c.json({ error: 'This exam has been closed by the instructor.' }, 403);
  }
  if (exam.status === 'scheduled' && exam.start_at && new Date(exam.start_at).getTime() > now) {
    return c.json({ error: 'This exam opens at ' + new Date(exam.start_at).toLocaleString() + '.' }, 403);
  }

  // For class-linked exams the name/section come from the class roster, so the
  // student only needs to enter their student ID.
  if (exam.class_id) {
    const roster = await db.prepare(
      `SELECT student_id, student_name, student_section FROM enrollments WHERE class_id = ? AND student_id = ?`
    ).bind(exam.class_id, student_id).first();
    if (!roster) {
      return c.json({ error: 'You must be enrolled in this class to take this exam.' }, 403);
    }
    body.student_name = roster.student_name;
    body.student_section = roster.student_section;
  } else if (!student_name || !student_section) {
    return c.json({ error: 'Student ID, name and section are required.' }, 400);
  }

  const enrolledName = body.student_name;
  const enrolledSection = body.student_section;

  if (exam.access_code && body.access_code !== exam.access_code) {
    return c.json({ error: 'Invalid access code. Ask your proctor for the correct code.' }, 403);
  }

  if (exam.deadline && new Date(exam.deadline).getTime() <= Date.now()) {
    return c.json({ error: 'This exam has already ended.' }, 403);
  }

  // Reject if this student already has a live session on another device.
  const live = await db.prepare(
    `SELECT id FROM exam_sessions
     WHERE exam_id = ? AND student_id = ? AND active = 1
       AND CAST(strftime('%s', last_seen) AS INTEGER) > ?`
  ).bind(examId, student_id, Math.floor((Date.now() - SESSION_STALE_MS) / 1000)).first();
  if (live) {
    return c.json({ error: 'This student already has an active session on another device.' }, 409);
  }

  // Expire stale sessions so the lock is not stuck.
  await db.prepare(
    `UPDATE exam_sessions SET active = 0 WHERE exam_id = ? AND student_id = ? AND active = 1`
  ).bind(examId, student_id).run();

  const sessionId = uuid();
  await db.prepare(
    `INSERT INTO exam_sessions (id, exam_id, student_id, student_name, student_section, device_id)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(sessionId, examId, student_id, enrolledName, enrolledSection, device_id).run();

  // Attendance: one row per student per exam. Insert if new, otherwise mark started.
  const existingAtt = await db.prepare(
    `SELECT id FROM attendance WHERE exam_id = ? AND student_id = ?`
  ).bind(examId, student_id).first();
  if (existingAtt) {
    await db.prepare(
      `UPDATE attendance SET status = 'started', started_at = datetime('now'), student_name = ?, student_section = ?
       WHERE id = ?`
    ).bind(enrolledName, enrolledSection, existingAtt.id).run();
  } else {
    await db.prepare(
      `INSERT INTO attendance (id, exam_id, student_id, student_name, student_section, status, started_at, checked_in)
       VALUES (?, ?, ?, ?, ?, 'started', datetime('now'), datetime('now'))`
    ).bind(uuid(), examId, student_id, enrolledName, enrolledSection).run();
  }

  await log(db, 'session_start', `${enrolledName} (${student_id}) started ${examId}`);
  return c.json({ session_id: sessionId, student_name: enrolledName, student_section: enrolledSection }, 201);
});

// Heartbeat and end are intentionally NOT lifecycle-gated: a student who is
// already mid-session must be able to keep heartbeating and finalize even if
// the instructor closes/archives the exam while they are taking it. New access
// is blocked upstream at /session/start.

app.post('/api/exams/:id/session/heartbeat', async (c) => {
  const db = c.env.DB;
  const examId = c.req.param('id');
  const body = await c.req.json();
  const { session_id, tab_switches = 0 } = body;
  if (!session_id) return c.json({ error: 'Missing session_id' }, 400);

  const updated = await db.prepare(
    `UPDATE exam_sessions SET last_seen = datetime('now'), tab_switches = ?
     WHERE id = ? AND exam_id = ? AND active = 1`
  ).bind(tab_switches, session_id, examId).run();

  const session = await db.prepare(
    `SELECT kicked, active FROM exam_sessions WHERE id = ? AND exam_id = ?`
  ).bind(session_id, examId).first();
  if (!session) return c.json({ error: 'Session not found' }, 404);

  return c.json({ active: !!session.active, kicked: !!session.kicked });
});

app.post('/api/exams/:id/session/end', async (c) => {
  const db = c.env.DB;
  const examId = c.req.param('id');
  const body = await c.req.json();
  if (body.session_id) {
    await db.prepare(
      `UPDATE exam_sessions SET active = 0 WHERE id = ? AND exam_id = ?`
    ).bind(body.session_id, examId).run();
  }
  return c.json({ success: true });
});

// ── PROCTORING (admin) ──────────────────────────────
app.get('/api/proctor/:examId', async (c) => {
  if (!adminCheck(c)) return c.json({ error: 'Unauthorized' }, 401);
  const db = c.env.DB;
  const examId = c.req.param('examId');
  const staleFloor = Math.floor((Date.now() - SESSION_STALE_MS) / 1000);

  const { results: active } = await db.prepare(
    `SELECT id, student_id, student_name, student_section, tab_switches, started_at, last_seen
     FROM exam_sessions
     WHERE exam_id = ? AND active = 1
       AND CAST(strftime('%s', last_seen) AS INTEGER) > ?
     ORDER BY last_seen DESC`
  ).bind(examId, staleFloor).all();

  const { results: stale } = await db.prepare(
    `SELECT id, student_id, student_name, student_section, tab_switches, started_at, last_seen
     FROM exam_sessions
     WHERE exam_id = ? AND active = 1
       AND CAST(strftime('%s', last_seen) AS INTEGER) <= ?
     ORDER BY last_seen DESC`
  ).bind(examId, staleFloor).all();

  const { results: kicked } = await db.prepare(
    `SELECT id, student_id, student_name, student_section, tab_switches, started_at, last_seen
     FROM exam_sessions
     WHERE exam_id = ? AND kicked = 1
     ORDER BY last_seen DESC`
  ).bind(examId).all();

  const { results: submitted } = await db.prepare(
    `SELECT student_id, student_name, student_section, score, total, tab_switches, submitted_at, reason, retry_allowed
     FROM submissions WHERE exam_id = ? ORDER BY submitted_at DESC LIMIT 50`
  ).bind(examId).all();

  return c.json({ active, stale, kicked, submitted });
});

app.post('/api/proctor/:examId/kick', async (c) => {
  if (!adminCheck(c)) return c.json({ error: 'Unauthorized' }, 401);
  const db = c.env.DB;
  const examId = c.req.param('examId');
  const body = await c.req.json();

  if (!body.session_id) return c.json({ error: 'Missing session_id' }, 400);
  const session = await db.prepare(
    `SELECT student_id, student_name FROM exam_sessions WHERE id = ? AND exam_id = ?`
  ).bind(body.session_id, examId).first();
  if (!session) return c.json({ error: 'Session not found' }, 404);

  await db.prepare(
    `UPDATE exam_sessions SET kicked = 1, active = 0 WHERE id = ?`
  ).bind(body.session_id).run();
  await db.prepare(
    `UPDATE attendance SET status = 'kicked' WHERE exam_id = ? AND student_id = ?`
  ).bind(examId, session.student_id).run();
  await log(db, 'session_kicked', `Admin kicked ${session.student_name} (${session.student_id})`);

  return c.json({ success: true });
});

// Allow/deny a retry for an already-submitted student. Body: { student_id, allow }.
app.post('/api/proctor/:examId/retry', async (c) => {
  if (!adminCheck(c)) return c.json({ error: 'Unauthorized' }, 401);
  const db = c.env.DB;
  const examId = c.req.param('examId');
  const body = await c.req.json();
  if (!body.student_id) return c.json({ error: 'Missing student_id' }, 400);

  await db.prepare(
    `UPDATE submissions SET retry_allowed = ? WHERE exam_id = ? AND student_id = ?`
  ).bind(body.allow ? 1 : 0, examId, body.student_id).run();
  await db.prepare(
    `UPDATE attendance SET retry_allowed = ? WHERE exam_id = ? AND student_id = ?`
  ).bind(body.allow ? 1 : 0, examId, body.student_id).run();
  await log(db, 'retry_allowed', `Admin ${body.allow ? 'allowed' : 'denied'} retry for student ${body.student_id} in ${examId}`);

  return c.json({ success: true });
});

// ── ATTENDANCE (admin) ──────────────────────────────
app.get('/api/exams/:examId/attendance', async (c) => {
  if (!adminCheck(c)) return c.json({ error: 'Unauthorized' }, 401);
  const db = c.env.DB;
  const examId = c.req.param('examId');

  const exam = await db.prepare(`SELECT title, roster, class_id FROM exams WHERE id = ?`).bind(examId).first();
  if (!exam) return c.json({ error: 'Exam not found' }, 404);

  // Roster comes from the class enrollments when the exam is linked to a class.
  let roster = [];
  if (exam.class_id) {
    const { results } = await db.prepare(
      `SELECT student_id, student_name, student_section FROM enrollments WHERE class_id = ?`
    ).bind(exam.class_id).all();
    roster = results.map(r => ({ id: r.student_id, name: r.student_name, section: r.student_section }));
  }
  if (!roster.length) {
    try {
      roster = typeof exam.roster === 'string' ? JSON.parse(exam.roster) : (exam.roster || []);
    } catch { roster = []; }
  }

  const { results: records } = await db.prepare(
    `SELECT student_id, student_name, student_section, status, checked_in, started_at, submitted_at
     FROM attendance WHERE exam_id = ? ORDER BY checked_in`
  ).bind(examId).all();

  const byId = {};
  records.forEach(r => { byId[r.student_id] = byId[r.student_id] || r; });

  // Roster students, merged with actual attendance records (absent → not in records).
  const students = roster.map(r => ({
    student_id: r.id || r.student_id || '',
    student_name: r.name || r.student_name || '',
    student_section: r.section || r.student_section || '',
    ...(byId[r.id] || byId[r.student_id] || {}),
  }));
  // Walk-ins: attendance records that are not in the roster.
  const rosterKeys = new Set(students.map(s => s.student_id));
  const walkIns = records.filter(r => !rosterKeys.has(r.student_id));

  const statusCounts = { checked_in: 0, started: 0, submitted: 0, kicked: 0, absent: 0 };
  students.forEach(s => {
    const st = s.status || 'absent';
    statusCounts[st] = (statusCounts[st] || 0) + 1;
  });

  return c.json({ exam_title: exam.title, roster_size: students.length, students, walkIns, statusCounts });
});

// ── STANDALONE ATTENDANCE SESSIONS ──────────────────
app.get('/api/attendance-sessions', async (c) => {
  if (!adminCheck(c)) return c.json({ error: 'Unauthorized' }, 401);
  const db = c.env.DB;
  const { results } = await db.prepare(
    `SELECT s.*, (SELECT COUNT(*) FROM checkins ch WHERE ch.session_id = s.id) as checkin_count
     FROM attendance_sessions s ORDER BY s.date DESC, s.created_at DESC`
  ).all();
  return c.json(results);
});

app.post('/api/attendance-sessions', async (c) => {
  if (!adminCheck(c)) return c.json({ error: 'Unauthorized' }, 401);
  const db = c.env.DB;
  const body = await c.req.json();
  if (!body.title || !body.title.trim()) return c.json({ error: 'Title is required' }, 400);
  const id = uuid();
  await db.prepare(
    `INSERT INTO attendance_sessions (id, title, date, access_code, roster, class_id, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(id, body.title.trim(), body.date || new Date().toISOString().slice(0, 10), body.access_code || '', JSON.stringify(body.roster || []), body.class_id || '', body.expires_at || '').run();
  await log(db, 'attendance_session_created', 'Created attendance session: ' + body.title);
  return c.json({ id }, 201);
});

app.put('/api/attendance-sessions/:id', async (c) => {
  if (!adminCheck(c)) return c.json({ error: 'Unauthorized' }, 401);
  const db = c.env.DB;
  const id = c.req.param('id');
  const body = await c.req.json();
  await db.prepare(
    `UPDATE attendance_sessions SET title = ?, date = ?, access_code = ?, roster = ?, class_id = ?, expires_at = ? WHERE id = ?`
  ).bind(body.title || '', body.date || '', body.access_code || '', JSON.stringify(body.roster || []), body.class_id || '', body.expires_at || '', id).run();
  await log(db, 'attendance_session_updated', 'Updated attendance session: ' + id);
  return c.json({ success: true });
});

app.delete('/api/attendance-sessions/:id', async (c) => {
  if (!adminCheck(c)) return c.json({ error: 'Unauthorized' }, 401);
  const db = c.env.DB;
  await db.prepare(`DELETE FROM attendance_sessions WHERE id = ?`).bind(c.req.param('id')).run();
  await log(db, 'attendance_session_deleted', 'Deleted attendance session ' + c.req.param('id'));
  return c.json({ success: true });
});

// Public session info (no access code / roster leaked).
app.get('/api/attendance-sessions/:id', async (c) => {
  const db = c.env.DB;
  const session = await db.prepare(`SELECT * FROM attendance_sessions WHERE id = ?`).bind(c.req.param('id')).first();
  if (!session) return c.json({ error: 'Attendance session not found' }, 404);
  return c.json({
    id: session.id,
    title: session.title,
    date: session.date,
    expires_at: session.expires_at || '',
    has_access_code: !!(session.access_code || ''),
  });
});

// Find a session by access code (for manual entry without a QR).
app.post('/api/attendance-sessions/lookup', async (c) => {
  const db = c.env.DB;
  const body = await c.req.json();
  const code = String(body.code || '').trim().toUpperCase();
  if (!code) return c.json({ error: 'Enter a code' }, 400);
  const session = await db.prepare(
    `SELECT * FROM attendance_sessions WHERE UPPER(access_code) = ? ORDER BY date DESC LIMIT 1`
  ).bind(code).first();
  if (!session) return c.json({ error: 'No attendance session found for that code.' }, 404);
  return c.json({ id: session.id, title: session.title, date: session.date });
});

app.post('/api/attendance-sessions/:id/checkin', async (c) => {
  const db = c.env.DB;
  const id = c.req.param('id');
  const body = await c.req.json();

  const session = await db.prepare(`SELECT * FROM attendance_sessions WHERE id = ?`).bind(id).first();
  if (!session) return c.json({ error: 'Attendance session not found' }, 404);

  if (session.expires_at && new Date(session.expires_at).getTime() <= Date.now()) {
    return c.json({ error: 'This check-in session has expired.' }, 403);
  }

  const { student_id, student_name, student_section } = body;
  if (!student_id || !student_name || !student_section) {
    return c.json({ error: 'Student ID, name and section are required.' }, 400);
  }
  if (session.access_code && body.access_code !== session.access_code) {
    return c.json({ error: 'Invalid access code. Ask your instructor for the correct code.' }, 403);
  }

  const existing = await db.prepare(
    `SELECT id, checked_in FROM checkins WHERE session_id = ? AND student_id = ?`
  ).bind(id, student_id).first();
  if (existing) {
    return c.json({ already: true, checked_in: existing.checked_in });
  }

  const checkinId = uuid();
  await db.prepare(
    `INSERT INTO checkins (id, session_id, student_id, student_name, student_section)
     VALUES (?, ?, ?, ?, ?)`
  ).bind(checkinId, id, student_id, student_name, student_section).run();

  // A session bound to a class also marks that class's attendance for the session date.
  if (session.class_id) {
    await db.prepare(
      `INSERT INTO class_attendance (id, class_id, date, student_id, student_name, status, source)
       VALUES (?, ?, ?, ?, ?, 'present', 'checkin')
       ON CONFLICT(class_id, date, student_id)
       DO UPDATE SET student_name = excluded.student_name`
    ).bind(uuid(), session.class_id, session.date || new Date().toISOString().slice(0, 10), student_id, student_name).run();
  }

  await log(db, 'checkin', `${student_name} (${student_id}) checked in to ${session.title}`);
  return c.json({ id: checkinId, checked_in: new Date().toISOString() }, 201);
});

app.get('/api/attendance-sessions/:id/report', async (c) => {
  if (!adminCheck(c)) return c.json({ error: 'Unauthorized' }, 401);
  const db = c.env.DB;
  const id = c.req.param('id');

  const session = await db.prepare(`SELECT * FROM attendance_sessions WHERE id = ?`).bind(id).first();
  if (!session) return c.json({ error: 'Attendance session not found' }, 404);

  let roster = [];
  try {
    roster = typeof session.roster === 'string' ? JSON.parse(session.roster) : (session.roster || []);
  } catch { roster = []; }

  const { results: checkins } = await db.prepare(
    `SELECT student_id, student_name, student_section, checked_in FROM checkins
     WHERE session_id = ? ORDER BY checked_in`
  ).bind(id).all();

  const byId = {};
  checkins.forEach(r => { byId[r.student_id] = byId[r.student_id] || r; });

  const students = roster.map(r => ({
    student_id: r.id || r.student_id || '',
    student_name: r.name || r.student_name || '',
    student_section: r.section || r.student_section || '',
    ...(byId[r.id] || byId[r.student_id] || {}),
  }));
  const rosterKeys = new Set(students.map(s => s.student_id));
  const walkIns = checkins.filter(r => !rosterKeys.has(r.student_id));

  return c.json({
    session: { id: session.id, title: session.title, date: session.date, access_code: session.access_code },
    roster_size: students.length,
    present: checkins.length,
    absent: students.filter(s => !s.checked_in).length,
    students,
    walkIns,
  });
});

// ── CLASSES ─────────────────────────────────────────
app.get('/api/classes', async (c) => {
  if (!adminCheck(c)) return c.json({ error: 'Unauthorized' }, 401);
  const db = c.env.DB;
  const { results } = await db.prepare(
    `SELECT c.*,
       (SELECT COUNT(*) FROM enrollments en WHERE en.class_id = c.id) as student_count,
       (SELECT COUNT(*) FROM exams e WHERE e.class_id = c.id) as exam_count
     FROM classes c ORDER BY c.created_at DESC`
  ).all();
  return c.json(results);
});

app.post('/api/classes', async (c) => {
  if (!adminCheck(c)) return c.json({ error: 'Unauthorized' }, 401);
  const db = c.env.DB;
  const body = await c.req.json();
  if (!body.name || !body.name.trim()) return c.json({ error: 'Class name is required' }, 400);
  const id = uuid();
  const access_code = (body.access_code || '').trim().toUpperCase() || await uniqueClassCode(db);
  await db.prepare(
    `INSERT INTO classes (id, name, subject, section, instructor, access_code)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(id, body.name.trim(), body.subject || '', body.section || '', body.instructor || '', access_code).run();
  await log(db, 'class_created', 'Created class: ' + body.name);
  return c.json({ id, access_code }, 201);
});

app.put('/api/classes/:id', async (c) => {
  if (!adminCheck(c)) return c.json({ error: 'Unauthorized' }, 401);
  const db = c.env.DB;
  const id = c.req.param('id');
  const body = await c.req.json();
  const current = await db.prepare(`SELECT access_code FROM classes WHERE id = ?`).bind(id).first();
  const access_code = (body.access_code || '').trim().toUpperCase() || current?.access_code || await uniqueClassCode(db);
  await db.prepare(
    `UPDATE classes SET name = ?, subject = ?, section = ?, instructor = ?, access_code = ? WHERE id = ?`
  ).bind(body.name || '', body.subject || '', body.section || '', body.instructor || '', access_code, id).run();
  await log(db, 'class_updated', 'Updated class: ' + id);
  return c.json({ success: true, access_code });
});

app.delete('/api/classes/:id', async (c) => {
  if (!adminCheck(c)) return c.json({ error: 'Unauthorized' }, 401);
  const db = c.env.DB;
  await db.prepare(`DELETE FROM classes WHERE id = ?`).bind(c.req.param('id')).run();
  await log(db, 'class_deleted', 'Deleted class ' + c.req.param('id'));
  return c.json({ success: true });
});

// ── CLASS SELF-ENROLLMENT (student-facing) ──────────
app.get('/api/classes/code/:code', async (c) => {
  const db = c.env.DB;
  const code = c.req.param('code').trim().toUpperCase();
  const klass = await db.prepare(`SELECT id, name, subject, section FROM classes WHERE access_code = ?`).bind(code).first();
  if (!klass) return c.json({ error: 'Invalid class code. Double-check with your instructor.' }, 404);
  return c.json(klass);
});

app.post('/api/classes/enroll', async (c) => {
  const db = c.env.DB;
  const body = await c.req.json();
  const code = (body.access_code || '').trim().toUpperCase();
  const student_id = (body.student_id || '').trim().toUpperCase();

  if (!code) return c.json({ error: 'Enter the class code.' }, 400);
  if (!student_id || !body.student_name) {
    return c.json({ error: 'Student ID and name are required.' }, 400);
  }

  const klass = await db.prepare(`SELECT id, name, subject, section FROM classes WHERE access_code = ?`).bind(code).first();
  if (!klass) return c.json({ error: 'Invalid class code. Double-check with your instructor.' }, 404);

  const existing = await db.prepare(
    `SELECT id FROM enrollments WHERE class_id = ? AND student_id = ?`
  ).bind(klass.id, student_id).first();
  if (existing) {
    return c.json({
      error: 'You are already enrolled in this class.',
      already: true,
      class: { id: klass.id, name: klass.name, subject: klass.subject, section: klass.section },
    }, 200);
  }

  await db.prepare(
    `INSERT INTO enrollments (id, class_id, student_id, student_name, student_section)
     VALUES (?, ?, ?, ?, ?)`
  ).bind(uuid(), klass.id, student_id, body.student_name.trim(), klass.section || '').run();
  await log(db, 'class_enroll', `${body.student_name.trim()} (${student_id}) enrolled via code in ${klass.name}`);
  return c.json({
    success: true,
    class: { id: klass.id, name: klass.name, subject: klass.subject, section: klass.section },
  }, 201);
});

// ── ENROLLMENTS ─────────────────────────────────────
app.get('/api/classes/:id', async (c) => {
  if (!adminCheck(c)) return c.json({ error: 'Unauthorized' }, 401);
  const db = c.env.DB;
  const id = c.req.param('id');
  const klass = await db.prepare(`SELECT * FROM classes WHERE id = ?`).bind(id).first();
  if (!klass) return c.json({ error: 'Class not found' }, 404);
  const { results: enrollments } = await db.prepare(
    `SELECT student_id, student_name, student_section, created_at FROM enrollments WHERE class_id = ? ORDER BY student_name`
  ).bind(id).all();
  const { results: exams } = await db.prepare(
    `SELECT id, title, deadline, (SELECT COUNT(*) FROM submissions s WHERE s.exam_id = exams.id) as submission_count
     FROM exams WHERE class_id = ? ORDER BY created_at DESC`
  ).bind(id).all();
  const { results: sessions } = await db.prepare(
    `SELECT s.id, s.title, s.date, s.access_code, s.expires_at,
            (SELECT COUNT(*) FROM checkins ch WHERE ch.session_id = s.id) as checkin_count
     FROM attendance_sessions s WHERE s.class_id = ? ORDER BY s.date DESC, s.created_at DESC`
  ).bind(id).all();
  return c.json({ ...klass, enrollments, exams, sessions });
});

// ── GRADEBOOK (Upscale.md §40-41) ──────────────────
// Returns a per-class matrix of students x exams. Each cell uses the student's
// BEST score for that exam (students may retry). Also returns per-exam averages
// and a per-student overall average (mean of exam percentages).
// When weighted categories are configured (§41), also returns weighted averages.
app.get('/api/classes/:id/gradebook', async (c) => {
  if (!adminCheck(c)) return c.json({ error: 'Unauthorized' }, 401);
  const db = c.env.DB;
  const klass = await db.prepare(`SELECT * FROM classes WHERE id = ?`).bind(c.req.param('id')).first();
  if (!klass) return c.json({ error: 'Class not found' }, 404);

  const { results: enrollments } = await db.prepare(
    `SELECT student_id, student_name, student_section FROM enrollments WHERE class_id = ? ORDER BY student_name`
  ).bind(klass.id).all();

  const { results: exams } = await db.prepare(
    `SELECT id, title, type, passing_score, time_limit, deadline FROM exams WHERE class_id = ? ORDER BY created_at ASC`
  ).bind(klass.id).all();
  const examIds = exams.map(e => e.id);

  // Grade categories (weighted) — may be empty (fallback to simple average).
  let categories = [];
  try {
    const { results: catRows } = await db.prepare(
      `SELECT id, name, weight, types, sort_order FROM class_grade_categories WHERE class_id = ? ORDER BY sort_order ASC, created_at ASC`
    ).bind(klass.id).all();
    categories = (catRows || []).map(r => {
      let types = [];
      try { types = typeof r.types === 'string' ? JSON.parse(r.types) : (r.types || []); } catch { types = []; }
      return { id: r.id, name: r.name, weight: Number(r.weight) || 0, types: Array.isArray(types) ? types : [], sort_order: r.sort_order };
    });
  } catch {}

  // Best score per (student_id, exam_id), plus each exam's max total.
  let subs = [];
  if (examIds.length) {
    subs = (await db.prepare(
      `SELECT student_id, exam_id, score, total
       FROM submissions WHERE exam_id IN (${examIds.map(() => '?').join(',')})`
    ).bind(...examIds).all()).results;
  }

  const best = {}; // `${student_id}::${exam_id}` -> {score,total}
  const examMaxTotal = {}; // exam_id -> largest total seen
  subs.forEach(s => {
    if (!s.student_id) return;
    const key = s.student_id + '::' + s.exam_id;
    const pct = s.total ? s.score / s.total : 0;
    const cur = best[key];
    if (!cur || pct > (cur.total ? cur.score / cur.total : -1)) {
      best[key] = { score: s.score, total: s.total };
    }
    if (!examMaxTotal[s.exam_id] || s.total > examMaxTotal[s.exam_id]) examMaxTotal[s.exam_id] = s.total;
  });

  // Map exam type → categories that include it (first match wins for weighting; exams
  // without a category are uncategorized and only count toward simple average).
  const examToCat = {};
  exams.forEach(ex => {
    const found = categories.find(cat => cat.types.includes(ex.type));
    if (found) examToCat[ex.id] = found.id;
  });
  // Only categories that actually have at least one exam in this class contribute to total weight.
  const activeCategories = categories.filter(cat => exams.some(ex => cat.types.includes(ex.type)));
  const totalActiveWeight = activeCategories.reduce((a, cat) => a + (Number(cat.weight) || 0), 0);

  const rows = enrollments.map(e => {
    const cells = [];
    let sumPct = 0, taken = 0;
    for (const ex of exams) {
      const cell = best[e.student_id + '::' + ex.id];
      if (cell) {
        const pct = cell.total ? (cell.score / cell.total) * 100 : 0;
        sumPct += pct; taken++;
        cells.push({ examId: ex.id, score: cell.score, total: cell.total, pct: +pct.toFixed(1) });
      } else {
        cells.push({ examId: ex.id, score: null, total: examMaxTotal[ex.id] || 0, pct: null });
      }
    }
    const average = taken ? +((sumPct / taken)).toFixed(1) : null;

    // Per-category averages + weighted grade (§41).
    let categoryAverages = [];
    let weightedAverage = null;
    if (activeCategories.length && totalActiveWeight > 0) {
      let weightedSum = 0;
      categoryAverages = activeCategories.map(cat => {
        const catExams = exams.filter(ex => cat.types.includes(ex.type));
        const pcts = catExams.map(ex => {
          const cell = best[e.student_id + '::' + ex.id];
          if (!cell) return null;
          return cell.total ? (cell.score / cell.total) * 100 : 0;
        }).filter(v => v !== null);
        // If student took nothing in this category, treat as 0 (penalize missing work).
        // This keeps weighted total out of 100% even when skipping — matches LMS convention.
        const catAvg = pcts.length ? +((pcts.reduce((a, b) => a + b, 0) / pcts.length).toFixed(1)) : 0;
        const takenInCat = pcts.length;
        weightedSum += catAvg * (Number(cat.weight) || 0);
        return { categoryId: cat.id, name: cat.name, weight: Number(cat.weight) || 0, average: catAvg, taken: takenInCat, total: catExams.length };
      });
      weightedAverage = +(weightedSum / totalActiveWeight).toFixed(1);
    }

    return {
      student_id: e.student_id, student_name: e.student_name, student_section: e.student_section,
      average,
      weightedAverage,
      categoryAverages,
      cells,
    };
  });

  // Per-exam average (mean of enrolled students' best pct where answered).
  const examStats = exams.map(ex => {
    const scored = rows.map(r => r.cells.find(c => c.examId === ex.id)).filter(c => c && c.pct !== null);
    return {
      id: ex.id, title: ex.title, type: ex.type, passing_score: ex.passing_score,
      total: examMaxTotal[ex.id] || 0,
      submitted: scored.length,
      average: scored.length ? +((scored.reduce((a, c) => a + c.pct, 0) / scored.length)).toFixed(1) : null,
    };
  });

  // Per-category class averages (mean of student category averages).
  const categoryStats = activeCategories.map(cat => {
    const vals = rows.map(r => {
      const ca = (r.categoryAverages || []).find(x => x.categoryId === cat.id);
      return ca ? ca.average : null;
    }).filter(v => v !== null);
    return {
      id: cat.id, name: cat.name, weight: cat.weight, types: cat.types,
      examCount: exams.filter(ex => cat.types.includes(ex.type)).length,
      average: vals.length ? +((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1)) : null,
    };
  });

  return c.json({
    class: klass,
    exams: examStats,
    rows,
    categories,
    activeCategories: categoryStats,
    totalWeight: totalActiveWeight,
  });
});

// ── GRADE CATEGORIES (Upscale.md §41) ────────────
app.get('/api/classes/:id/grade-categories', async (c) => {
  if (!adminCheck(c)) return c.json({ error: 'Unauthorized' }, 401);
  const db = c.env.DB;
  const classId = c.req.param('id');
  const klass = await db.prepare(`SELECT id FROM classes WHERE id = ?`).bind(classId).first();
  if (!klass) return c.json({ error: 'Class not found' }, 404);
  let results = [];
  try {
    results = (await db.prepare(`SELECT id, name, weight, types, sort_order, created_at FROM class_grade_categories WHERE class_id = ? ORDER BY sort_order ASC, created_at ASC`).bind(classId).all()).results || [];
  } catch { results = []; }
  const parsed = results.map(r => {
    let types = [];
    try { types = typeof r.types === 'string' ? JSON.parse(r.types) : (r.types || []); } catch { types = []; }
    return { id: r.id, name: r.name, weight: Number(r.weight) || 0, types: Array.isArray(types) ? types : [], sort_order: r.sort_order, created_at: r.created_at };
  });
  return c.json(parsed);
});

app.put('/api/classes/:id/grade-categories', async (c) => {
  if (!adminCheck(c)) return c.json({ error: 'Unauthorized' }, 401);
  const db = c.env.DB;
  const classId = c.req.param('id');
  const klass = await db.prepare(`SELECT id FROM classes WHERE id = ?`).bind(classId).first();
  if (!klass) return c.json({ error: 'Class not found' }, 404);
  const body = await c.req.json();
  const incoming = Array.isArray(body.categories) ? body.categories : (Array.isArray(body) ? body : []);
  // Validate.
  if (incoming.length > 20) return c.json({ error: 'Too many categories (max 20).' }, 400);
  const cleaned = [];
  const seenTypes = new Set();
  for (let i = 0; i < incoming.length; i++) {
    const raw = incoming[i];
    const name = String(raw.name || '').trim();
    if (!name) return c.json({ error: `Category #${i + 1}: name is required.` }, 400);
    if (name.length > 50) return c.json({ error: `Category "${name}": name must be ≤50 characters.` }, 400);
    const weight = Number(raw.weight);
    if (!Number.isFinite(weight) || weight < 0 || weight > 100) return c.json({ error: `Category "${name}": weight must be 0–100.` }, 400);
    const types = Array.isArray(raw.types) ? raw.types.map(t => String(t).trim()).filter(Boolean) : [];
    if (!types.length) return c.json({ error: `Category "${name}": pick at least one assessment type.` }, 400);
    // Prevent overlapping types (one exam type should belong to one category)
    for (const t of types) {
      if (seenTypes.has(t)) return c.json({ error: `Assessment type "${t}" is used in more than one category — each type must belong to only one category.` }, 400);
      seenTypes.add(t);
    }
    cleaned.push({ id: raw.id && String(raw.id).trim() ? String(raw.id).trim() : uuid(), name, weight, types, sort_order: Number.isFinite(Number(raw.sort_order)) ? Number(raw.sort_order) : i });
  }
  // Replace atomically via batch to avoid partial writes if an INSERT fails.
  const stmts = [];
  stmts.push(db.prepare(`DELETE FROM class_grade_categories WHERE class_id = ?`).bind(classId));
  for (const cat of cleaned) {
    stmts.push(db.prepare(`INSERT INTO class_grade_categories (id, class_id, name, weight, types, sort_order) VALUES (?, ?, ?, ?, ?, ?)`).bind(cat.id, classId, cat.name, cat.weight, JSON.stringify(cat.types), cat.sort_order));
  }
  // D1 batch is atomic (all or none within a transaction).
  if (stmts.length) await db.batch(stmts);
  await log(db, 'grade_categories', `Updated ${cleaned.length} grade categor${cleaned.length === 1 ? 'y' : 'ies'} for class ${classId}`);
  return c.json({ success: true, count: cleaned.length });
});

// ── NOTIFICATIONS (Upscale.md §42-43, §72) ──────
app.post('/api/notifications', async (c) => {
  if (!adminCheck(c)) return c.json({ error: 'Unauthorized' }, 401);
  const db = c.env.DB;
  const body = await c.req.json();
  const title = String(body.title || '').trim();
  const notifBody = String(body.body || '').trim();
  const type = String(body.type || 'announcement').trim();
  const class_id = String(body.class_id || '').trim();
  const student_id = String(body.student_id || '').trim().toUpperCase();
  const exam_id = String(body.exam_id || '').trim();
  if (!title) return c.json({ error: 'Title is required.' }, 400);
  if (title.length > 120) return c.json({ error: 'Title must be ≤120 characters.' }, 400);
  if (notifBody.length > 1000) return c.json({ error: 'Body must be ≤1000 characters.' }, 400);
  if (type && !NOTIF_TYPES.has(type)) return c.json({ error: 'Invalid type.' }, 400);
  if (class_id) {
    const klass = await db.prepare(`SELECT id FROM classes WHERE id = ?`).bind(class_id).first();
    if (!klass) return c.json({ error: 'Class not found.' }, 404);
  }
  const id = await createNotification(db, { class_id, student_id, title, body: notifBody, type, exam_id });
  await log(db, 'notification_created', `${type}: ${title}` + (class_id ? ` for class ${class_id}` : student_id ? ` for ${student_id}` : ''));
  // Real Web Push (non-blocking)
  try { c.executionCtx?.waitUntil?.(triggerPushWithEnv(db, c.env, { class_id, student_id }).catch(()=>{})); } catch { try { await triggerPushWithEnv(db, c.env, { class_id, student_id }); } catch {} }
  return c.json({ id }, 201);
});

app.get('/api/push/vapid-public-key', async (c) => {
  const key = c.env.VAPID_PUBLIC_KEY || c.env.VITE_VAPID_PUBLIC_KEY || '';
  return c.json({ publicKey: key });
});

app.post('/api/push/subscribe', async (c) => {
  const db = c.env.DB;
  const body = await c.req.json();
  const student_id = String(body.student_id || '').trim().toUpperCase();
  const sub = body.subscription;
  if (!student_id) return c.json({ error: 'student_id required' }, 400);
  if (!sub || !sub.endpoint) return c.json({ error: 'subscription.endpoint required' }, 400);
  // Validate student exists (enrolled or has prior submission/push or enrolled globally)
  const exists = await db.prepare(`SELECT student_id FROM enrollments WHERE student_id = ? UNION SELECT student_id FROM submissions WHERE student_id = ? UNION SELECT student_id FROM push_subscriptions WHERE student_id = ? LIMIT 1`).bind(student_id, student_id, student_id).first();
  if (!exists) return c.json({ error: 'Student ID not found — not enrolled in any class. Check with your instructor or enroll at /enroll first.' }, 404);
  if (!/^.+$/.test(String(sub.endpoint)) || !String(sub.endpoint).startsWith('https://')) return c.json({ error: 'Invalid subscription endpoint — must be https://' }, 400);
  const endpoint = String(sub.endpoint).slice(0, 500);
  const p256dh = String(sub.keys?.p256dh || sub.p256dh || '').slice(0, 200);
  const auth = String(sub.keys?.auth || sub.auth || '').slice(0, 200);
  const expirationTime = sub.expirationTime ? String(sub.expirationTime) : '';
  const id = uuid();
  try {
    await db.prepare(`INSERT INTO push_subscriptions (id, student_id, endpoint, p256dh, auth, expiration_time) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(student_id, endpoint) DO UPDATE SET p256dh=excluded.p256dh, auth=excluded.auth, expiration_time=excluded.expiration_time`).bind(id, student_id, endpoint, p256dh, auth, expirationTime).run();
  } catch (e) {
    // Fallback if ON CONFLICT not supported for this SQLite version
    await db.prepare(`DELETE FROM push_subscriptions WHERE student_id = ? AND endpoint = ?`).bind(student_id, endpoint).run();
    await db.prepare(`INSERT INTO push_subscriptions (id, student_id, endpoint, p256dh, auth, expiration_time) VALUES (?, ?, ?, ?, ?, ?)`).bind(id, student_id, endpoint, p256dh, auth, expirationTime).run();
  }
  await log(db, 'push_subscribed', `Push subscribed for ${student_id}`);
  return c.json({ success: true });
});

app.post('/api/push/unsubscribe', async (c) => {
  const db = c.env.DB;
  const body = await c.req.json();
  const student_id = String(body.student_id || '').trim().toUpperCase();
  const endpoint = String(body.endpoint || body.subscription?.endpoint || '');
  if (!student_id || !endpoint) return c.json({ error: 'student_id and endpoint required' }, 400);
  await db.prepare(`DELETE FROM push_subscriptions WHERE student_id = ? AND endpoint = ?`).bind(student_id, endpoint).run();
  return c.json({ success: true });
});

app.post('/api/push/test', async (c) => {
  if (!adminCheck(c)) return c.json({ error: 'Unauthorized' }, 401);
  const db = c.env.DB;
  const body = await c.req.json().catch(()=>({}));
  const student_id = String(body.student_id || '').trim().toUpperCase();
  const class_id = String(body.class_id || '').trim();
  if (!student_id && !class_id) return c.json({ error: 'Provide student_id or class_id' }, 400);
  const result = await triggerPushWithEnv(db, c.env, { student_id, class_id });
  return c.json(result);
});

app.get('/api/notifications', async (c) => {
  const db = c.env.DB;
  const q = c.req.query();
  const student_id = String(q.student_id || '').trim().toUpperCase();
  const class_id = String(q.class_id || '').trim();
  const type = String(q.type || '').trim();
  const limit = Math.min(Math.max(Number(q.limit) || 50, 1), 100);
  const isAdmin = adminCheck(c);

  // Student view: needs student_id to see personal + class broadcasts
  if (student_id) {
    // Find classes this student is enrolled in
    const { results: enrolls } = await db.prepare(`SELECT class_id FROM enrollments WHERE student_id = ?`).bind(student_id).all();
    const classIds = enrolls.map(r => r.class_id).filter(Boolean);
    const placeholders = classIds.length ? `,${classIds.map(() => '?').join(',')}` : '';
    let sql = `SELECT n.*, CASE WHEN nr.read_at IS NOT NULL THEN 1 ELSE 0 END as is_read FROM notifications n LEFT JOIN notification_reads nr ON nr.notification_id = n.id AND nr.student_id = ? WHERE (n.student_id = ? OR (n.student_id = '' AND n.class_id = '') OR (n.student_id = '' AND n.class_id IN ('__none__'${placeholders})))`;
    const binds = [student_id, student_id, ...classIds];
    if (type && NOTIF_TYPES.has(type)) { sql += ` AND n.type = ?`; binds.push(type); }
    sql += ` ORDER BY n.created_at DESC LIMIT ?`;
    binds.push(limit);
    const { results } = await db.prepare(sql).bind(...binds).all();
    return c.json(results);
  }

  // Admin / class-filtered view (requires admin)
  if (class_id) {
    if (!isAdmin) return c.json({ error: 'Unauthorized' }, 401);
    let sql = `SELECT * FROM notifications WHERE class_id = ?`;
    const binds = [class_id];
    if (type && NOTIF_TYPES.has(type)) { sql += ` AND type = ?`; binds.push(type); }
    sql += ` ORDER BY created_at DESC LIMIT ?`;
    binds.push(limit);
    const { results } = await db.prepare(sql).bind(...binds).all();
    return c.json(results);
  }

  // Global admin list
  if (!isAdmin) return c.json({ error: 'Student ID is required. Add ?student_id=YOUR_ID to see your notifications.' }, 400);
  let sqlG = `SELECT * FROM notifications`;
  const bindsG = [];
  if (type && NOTIF_TYPES.has(type)) { sqlG += ` WHERE type = ?`; bindsG.push(type); }
  sqlG += ` ORDER BY created_at DESC LIMIT ?`;
  bindsG.push(limit);
  const { results } = await db.prepare(sqlG).bind(...bindsG).all();
  return c.json(results);
});

app.get('/api/notifications/unread-count', async (c) => {
  const db = c.env.DB;
  const student_id = String(c.req.query('student_id') || '').trim().toUpperCase();
  if (!student_id) return c.json({ error: 'student_id required' }, 400);
  const { results: enrolls } = await db.prepare(`SELECT class_id FROM enrollments WHERE student_id = ?`).bind(student_id).all();
  const classIds = enrolls.map(r => r.class_id).filter(Boolean);
  const placeholders = classIds.length ? `,${classIds.map(() => '?').join(',')}` : '';
  const sql = `SELECT COUNT(*) as cnt FROM notifications n LEFT JOIN notification_reads nr ON nr.notification_id = n.id AND nr.student_id = ? WHERE (n.student_id = ? OR n.student_id = '' AND (n.class_id = '' OR n.class_id IN ('__none__'${placeholders}))) AND nr.read_at IS NULL`;
  const binds = [student_id, student_id, ...classIds];
  const row = await db.prepare(sql).bind(...binds).first();
  return c.json({ count: row?.cnt || 0 });
});

app.post('/api/notifications/:id/read', async (c) => {
  const db = c.env.DB;
  const nid = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));
  const student_id = String(body.student_id || c.req.query('student_id') || '').trim().toUpperCase();
  if (!student_id) return c.json({ error: 'student_id required' }, 400);
  const notif = await db.prepare(`SELECT id FROM notifications WHERE id = ?`).bind(nid).first();
  if (!notif) return c.json({ error: 'Notification not found' }, 404);
  await db.prepare(`INSERT OR IGNORE INTO notification_reads (notification_id, student_id) VALUES (?, ?)`).bind(nid, student_id).run();
  return c.json({ success: true });
});

app.post('/api/notifications/read-all', async (c) => {
  const db = c.env.DB;
  const body = await c.req.json().catch(() => ({}));
  const student_id = String(body.student_id || '').trim().toUpperCase();
  if (!student_id) return c.json({ error: 'student_id required' }, 400);
  const { results: enrolls } = await db.prepare(`SELECT class_id FROM enrollments WHERE student_id = ?`).bind(student_id).all();
  const classIds = enrolls.map(r => r.class_id).filter(Boolean);
  const placeholders = classIds.length ? `,${classIds.map(() => '?').join(',')}` : '';
  const sql = `SELECT id FROM notifications WHERE (student_id = ? OR student_id = '' AND (class_id = '' OR class_id IN ('__none__'${placeholders})))`;
  const binds = [student_id, ...classIds];
  const { results } = await db.prepare(sql).bind(...binds).all();
  for (const r of results) {
    await db.prepare(`INSERT OR IGNORE INTO notification_reads (notification_id, student_id) VALUES (?, ?)`).bind(r.id, student_id).run();
  }
  return c.json({ success: true, count: results.length });
});

app.delete('/api/notifications/:id', async (c) => {
  if (!adminCheck(c)) return c.json({ error: 'Unauthorized' }, 401);
  const db = c.env.DB;
  await db.prepare(`DELETE FROM notifications WHERE id = ?`).bind(c.req.param('id')).run();
  await log(db, 'notification_deleted', `Deleted notification ${c.req.param('id')}`);
  return c.json({ success: true });
});

app.post('/api/classes/:id/enroll', async (c) => {
  if (!adminCheck(c)) return c.json({ error: 'Unauthorized' }, 401);
  const db = c.env.DB;
  const classId = c.req.param('id');
  const body = await c.req.json();
  const students = body.students || [];
  let added = 0, skipped = 0;
  for (const s of students) {
    if (!s.student_id || !s.student_name) continue;
    const existing = await db.prepare(
      `SELECT id FROM enrollments WHERE class_id = ? AND student_id = ?`
    ).bind(classId, s.student_id).first();
    if (existing) { skipped++; continue; }
    await db.prepare(
      `INSERT INTO enrollments (id, class_id, student_id, student_name, student_section)
       VALUES (?, ?, ?, ?, ?)`
    ).bind(uuid(), classId, s.student_id, s.student_name, s.student_section || '').run();
    added++;
  }
  await log(db, 'enroll', `Enrolled ${added} student(s) in class ${classId}`);
  return c.json({ added, skipped }, 201);
});

app.delete('/api/classes/:id/enroll/:studentId', async (c) => {
  if (!adminCheck(c)) return c.json({ error: 'Unauthorized' }, 401);
  const db = c.env.DB;
  await db.prepare(
    `DELETE FROM enrollments WHERE class_id = ? AND student_id = ?`
  ).bind(c.req.param('id'), c.req.param('studentId')).run();
  return c.json({ success: true });
});

// Update an enrolled student's details (ID, name, or section).
app.put('/api/classes/:id/enroll/:studentId', async (c) => {
  if (!adminCheck(c)) return c.json({ error: 'Unauthorized' }, 401);
  const db = c.env.DB;
  const classId = c.req.param('id');
  const oldStudentId = c.req.param('studentId');
  const body = await c.req.json();
  const newStudentId = (body.student_id || '').trim().toUpperCase();
  const newName = (body.student_name || '').trim();
  const newSection = (body.student_section || '').trim();
  if (!newStudentId || !newName) {
    return c.json({ error: 'Student ID and name are required.' }, 400);
  }

  const existing = await db.prepare(
    `SELECT id FROM enrollments WHERE class_id = ? AND student_id = ?`
  ).bind(classId, oldStudentId).first();
  if (!existing) return c.json({ error: 'Student is not enrolled in this class.' }, 404);

  if (newStudentId !== oldStudentId) {
    const clash = await db.prepare(
      `SELECT id FROM enrollments WHERE class_id = ? AND student_id = ?`
    ).bind(classId, newStudentId).first();
    if (clash) return c.json({ error: 'Another student with that ID is already enrolled.' }, 409);
    await db.prepare(
      `UPDATE enrollments SET student_id = ?, student_name = ?, student_section = ? WHERE id = ?`
    ).bind(newStudentId, newName, newSection, existing.id).run();
    // Keep linked records in sync with the corrected ID/name.
    await db.prepare(
      `UPDATE submissions SET student_id = ?, student_name = ?, student_section = ? WHERE student_id = ?`
    ).bind(newStudentId, newName, newSection, oldStudentId).run();
    await db.prepare(
      `UPDATE attendance SET student_id = ?, student_name = ?, student_section = ? WHERE student_id = ?`
    ).bind(newStudentId, newName, newSection, oldStudentId).run();
    await db.prepare(
      `UPDATE class_attendance SET student_id = ?, student_name = ? WHERE class_id = ? AND student_id = ?`
    ).bind(newStudentId, newName, classId, oldStudentId).run();
  } else {
    await db.prepare(
      `UPDATE enrollments SET student_name = ?, student_section = ? WHERE id = ?`
    ).bind(newName, newSection, existing.id).run();
    await db.prepare(
      `UPDATE submissions SET student_name = ?, student_section = ? WHERE student_id = ? AND student_section = ?`
    ).bind(newName, newSection, oldStudentId, newSection).run();
await db.prepare(
      `UPDATE submissions SET student_name = ?, student_section = ? WHERE student_id = ?`
    ).bind(newName, newSection, oldStudentId).run();
    await db.prepare(
      `UPDATE class_attendance SET student_name = ? WHERE class_id = ? AND student_id = ?`
    ).bind(newName, classId, oldStudentId).run();
  }

  await log(db, 'enroll_updated', `${oldStudentId} → ${newStudentId} (${newName}) in class ${classId}`);
  return c.json({ success: true });
});

// Known students (from submissions + enrollments) to speed up enrollment.
app.get('/api/students', async (c) => {
  if (!adminCheck(c)) return c.json({ error: 'Unauthorized' }, 401);
  const db = c.env.DB;
  const { results: fromSubs } = await db.prepare(
    `SELECT DISTINCT student_id, student_name, student_section FROM submissions
     WHERE student_id != '' ORDER BY student_name`
  ).all();
  const { results: fromEnroll } = await db.prepare(
    `SELECT DISTINCT student_id, student_name, student_section FROM enrollments ORDER BY student_name`
  ).all();
  const map = {};
  [...fromSubs, ...fromEnroll].forEach(r => {
    if (!r.student_id || map[r.student_id]) return;
    map[r.student_id] = { student_id: r.student_id, student_name: r.student_name, student_section: r.student_section || '' };
  });
  return c.json(Object.values(map));
});

// ── CLASS ATTENDANCE (manual) ───────────────────────
app.get('/api/classes/:id/attendance', async (c) => {
  if (!adminCheck(c)) return c.json({ error: 'Unauthorized' }, 401);
  const db = c.env.DB;
  const classId = c.req.param('id');
  const date = c.req.query('date') || new Date().toISOString().slice(0, 10);

  const { results: enrollments } = await db.prepare(
    `SELECT student_id, student_name, student_section FROM enrollments WHERE class_id = ? ORDER BY student_name`
  ).bind(classId).all();
  const { results: records } = await db.prepare(
    `SELECT student_id, status, source FROM class_attendance WHERE class_id = ? AND date = ?`
  ).bind(classId, date).all();
  const byId = {};
  records.forEach(r => { byId[r.student_id] = r; });

  const students = enrollments.map(en => ({
    student_id: en.student_id,
    student_name: en.student_name,
    student_section: en.student_section,
    status: byId[en.student_id]?.status || 'absent',
    source: byId[en.student_id]?.source || null,
  }));

  return c.json({ date, present: students.filter(s => s.status !== 'absent').length, absent: students.filter(s => s.status === 'absent').length, students });
});

app.post('/api/classes/:id/attendance', async (c) => {
  if (!adminCheck(c)) return c.json({ error: 'Unauthorized' }, 401);
  const db = c.env.DB;
  const classId = c.req.param('id');
  const body = await c.req.json();
  const date = body.date || new Date().toISOString().slice(0, 10);
  const records = body.records || [];

  for (const r of records) {
    if (!r.student_id) continue;
    const name = r.student_name || (await db.prepare(`SELECT student_name FROM enrollments WHERE class_id = ? AND student_id = ?`).bind(classId, r.student_id).first())?.student_name || '';
    await db.prepare(
      `INSERT INTO class_attendance (id, class_id, date, student_id, student_name, status, source)
       VALUES (?, ?, ?, ?, ?, ?, 'manual')
       ON CONFLICT(class_id, date, student_id)
       DO UPDATE SET status = excluded.status, student_name = excluded.student_name`
    ).bind(uuid(), classId, date, r.student_id, name, r.status || 'absent').run();
  }
  await log(db, 'class_attendance', `Marked ${records.length} student(s) for class ${classId} on ${date}`);
  return c.json({ success: true });
});

app.get('/api/classes/:id/attendance/history', async (c) => {
  if (!adminCheck(c)) return c.json({ error: 'Unauthorized' }, 401);
  const db = c.env.DB;
  const classId = c.req.param('id');

  const { results: enrollments } = await db.prepare(
    `SELECT student_id, student_name, student_section FROM enrollments WHERE class_id = ? ORDER BY student_name`
  ).bind(classId).all();
  const { results: dates } = await db.prepare(
    `SELECT DISTINCT date FROM class_attendance WHERE class_id = ? ORDER BY date ASC`
  ).bind(classId).all();
  const { results: records } = await db.prepare(
    `SELECT student_id, date, status, source FROM class_attendance WHERE class_id = ? ORDER BY date ASC`
  ).bind(classId).all();

  const dateList = dates.map(d => d.date);
  const recMap = {};
  records.forEach(r => { recMap[r.date + '|' + r.student_id] = r; });

  const summary = enrollments.map(en => {
    const mine = records.filter(r => r.student_id === en.student_id);
    return {
      student_id: en.student_id,
      student_name: en.student_name,
      student_section: en.student_section,
      present: mine.filter(r => r.status === 'present').length,
      late: mine.filter(r => r.status === 'late').length,
      absent: mine.filter(r => r.status === 'absent').length,
      attended: mine.filter(r => r.status !== 'absent').length,
    };
  });

  const byDate = {};
  dateList.forEach(d => {
    const onDate = records.filter(r => r.date === d);
    byDate[d] = {
      present: onDate.filter(r => r.status !== 'absent').length,
      absent: onDate.filter(r => r.status === 'absent').length,
      unrecorded: Math.max(0, enrollments.length - onDate.length),
    };
  });

  return c.json({ dates: dateList, students: enrollments, records, summary, byDate });
});

// ── STUDENT RECORDS PORTAL ──────────────────────────
app.get('/api/student/:studentId', async (c) => {
  const db = c.env.DB;
  const studentId = c.req.param('studentId').trim().toUpperCase();

  const { results: enrollments } = await db.prepare(
    `SELECT class_id FROM enrollments WHERE student_id = ?`
  ).bind(studentId).all();
  const { results: subs } = await db.prepare(
    `SELECT e.id as exam_id, e.title, e.time_limit, e.class_id, e.type, e.status, e.passing_score,
            c.name as class_name, c.subject, c.section,
            s.score, s.total, s.submitted_at, s.time_taken, s.tab_switches, s.student_name, s.student_section,
            s.seed, s.answers
     FROM submissions s
     JOIN exams e ON e.id = s.exam_id
     LEFT JOIN classes c ON c.id = e.class_id
     WHERE s.student_id = ? ORDER BY s.submitted_at DESC`
  ).bind(studentId).all();
  const passedFor = (s) => {
    const pct = s.total ? (s.score / s.total) * 100 : 0;
    return pct >= Number(s.passing_score ?? 60);
  };

  // Build class list: enrolled classes + classes with submissions.
  const classIds = new Set(enrollments.map(e => e.class_id));
  subs.forEach(s => { if (s.class_id) classIds.add(s.class_id); });

  const classes = [];
  for (const cid of classIds) {
    const klass = await db.prepare(`SELECT * FROM classes WHERE id = ?`).bind(cid).first();
    if (!klass) continue;
    const { results: att } = await db.prepare(
      `SELECT date, status, source FROM class_attendance WHERE class_id = ? AND student_id = ? ORDER BY date`
    ).bind(cid, studentId).all();
    const examResults = subs.filter(s => s.class_id === cid).map(s => ({
      exam_id: s.exam_id, title: s.title, score: s.score, total: s.total,
      submitted_at: s.submitted_at, time_taken: s.time_taken, tab_switches: s.tab_switches,
      type: s.type, status: s.status, passing_score: s.passing_score, passed: passedFor(s),
    }));
    const presentDays = att.filter(a => a.status !== 'absent').length;
    classes.push({
      class_id: cid,
      name: klass.name, subject: klass.subject, section: klass.section, instructor: klass.instructor,
      attendance: { total: att.length, present: presentDays, absent: att.length - presentDays, records: att },
      exam_results: examResults,
    });
  }

  const profile = subs[0] || (enrollments.length
    ? await db.prepare(`SELECT student_name, student_section FROM enrollments WHERE class_id = ? AND student_id = ?`).bind(enrollments[0].class_id, studentId).first()
    : null);

  // ── Competency breakdown (Upscale.md §32, §65) ──
  // Grade this student's per-question answers for every exam they took and
  // bucket correct/incorrect by the question's competency tag (if any).
  // Must mirror computeScore: questions are ordered, then seed-shuffled, and
  // the choice seed uses the SHUFFLED question index (matching the client).
  const competencyBuckets = {}; // competency -> { correct, total }
  for (const s of subs) {
    const qs = (await db.prepare(
      `SELECT id, type, choices, answer, competency, sort_order FROM questions WHERE exam_id = ? ORDER BY part, sort_order, id`
    ).bind(s.exam_id).all()).results;
    if (!qs.length) continue;
    let submittedAnswers = {};
    try {
      submittedAnswers = (typeof s.answers === 'string' && s.answers) ? JSON.parse(s.answers) : (s.answers || {});
    } catch { /* corrupt answers → treat as empty */ }
    const studentSeed = Number(s.seed) || 0;
    const shuffledQs = shuffleWithSeed(qs, studentSeed);
    shuffledQs.forEach((q, idx) => {
      const comp = (q.competency || '').trim();
      if (!comp) return; // only competency-tagged questions contribute
      let correct = false;
      if ((q.type || 'multiple_choice') === 'fill_blank') {
        correct = matchesAnswer(submittedAnswers[q.id] || '', q.answer);
      } else {
        const choices = parseChoices(q.choices);
        const choiceSeed = studentSeed + idx * 7919;
        const shuffled = shuffleWithSeed(choices, choiceSeed).map((c, ci) => ({
          ...c, displayKey: String.fromCharCode(65 + ci),
        }));
        const chosen = shuffled.find(c => c.displayKey === submittedAnswers[q.id]);
        correct = !!chosen && chosen.key === q.answer;
      }
      competencyBuckets[comp] = competencyBuckets[comp] || { correct: 0, total: 0 };
      competencyBuckets[comp].total++;
      if (correct) competencyBuckets[comp].correct++;
    });
  }
  const competencies = Object.entries(competencyBuckets).map(([competency, v]) => ({
    competency,
    correct: v.correct,
    total: v.total,
    pct: v.total ? Math.round((v.correct / v.total) * 100) : 0,
  })).sort((a, b) => a.pct - b.pct);

  // ── Assessment timeline + trend (Upscale.md §34-35) ──
  const timeline = subs.map(s => ({
    exam_id: s.exam_id,
    title: s.title,
    type: s.type,
    class_name: s.class_name || s.subject || '',
    submitted_at: s.submitted_at,
    score: s.score, total: s.total,
    pct: s.total ? Math.round((s.score / s.total) * 100) : 0,
    passed: passedFor(s),
  })).sort((a, b) => {
    const ta = a.submitted_at ? new Date(a.submitted_at).getTime() : 0;
    const tb = b.submitted_at ? new Date(b.submitted_at).getTime() : 0;
    return ta - tb;
  });
  // Most recent 10 assessments, oldest → newest, for a simple performance trend.
  const trend = timeline.slice(-10).map(t => ({ label: t.title, pct: t.pct, submitted_at: t.submitted_at }));

  return c.json({
    student_id: studentId,
    student_name: profile?.student_name || '—',
    student_section: profile?.student_section || '',
    classes,
    timeline,
    trend,
    competencies,
    exams: subs.map(s => ({
      exam_id: s.exam_id, title: s.title, class_name: s.class_name || s.subject || '', class_section: s.section || '',
      score: s.score, total: s.total, submitted_at: s.submitted_at, time_taken: s.time_taken, tab_switches: s.tab_switches,
      type: s.type, status: s.status, passing_score: s.passing_score, passed: passedFor(s),
    })),
  });
});

// ── LEADERBOARD ────────────────────────────────────
app.get('/api/leaderboard/:examId', async (c) => {
  const db = c.env.DB;
  const examId = c.req.param('examId');
  const exam = await db.prepare(`SELECT passing_score FROM exams WHERE id = ?`).bind(examId).first();
  const passing = exam ? Number(exam.passing_score) : 60;
  const { results } = await db.prepare(
    `SELECT student_name, student_section, score, total, tab_switches, time_taken, submitted_at, reason, retry_allowed
     FROM submissions WHERE exam_id = ?
     ORDER BY score DESC, time_taken ASC LIMIT 100`
  ).bind(examId).all();
  return c.json({
    passing_score: passing,
    results: results.map(r => {
      const pct = r.total ? (r.score / r.total) * 100 : 0;
      return { ...r, passed: pct >= passing };
    }),
  });
});

// ── SUBMISSIONS (admin) ────────────────────────────
app.get('/api/submissions/:examId', async (c) => {
  const db = c.env.DB;
  const examId = c.req.param('examId');
  const exam = await db.prepare(`SELECT passing_score FROM exams WHERE id = ?`).bind(examId).first();
  const passing = exam ? Number(exam.passing_score) : 60;
  const { results } = await db.prepare(
    `SELECT id, student_name, student_section, student_id, score, total, tab_switches, time_taken, submitted_at, reason, retry_allowed, answers
     FROM submissions WHERE exam_id = ?
     ORDER BY submitted_at DESC`
  ).bind(examId).all();

  const { results: reviewRows } = await db.prepare(
    `SELECT submission_id, question_id, verdict FROM answer_reviews ar
     INNER JOIN submissions s ON s.id = ar.submission_id WHERE s.exam_id = ?`
  ).bind(examId).all();
  const reviewsBySub = {};
  reviewRows.forEach(r => {
    reviewsBySub[r.submission_id] = reviewsBySub[r.submission_id] || {};
    reviewsBySub[r.submission_id][r.question_id] = r.verdict;
  });

  return c.json({
    passing_score: passing,
    results: results.map(sub => {
      const pct = sub.total ? (sub.score / sub.total) * 100 : 0;
      return { ...sub, passed: pct >= passing, reviews: reviewsBySub[sub.id] || {} };
    }),
  });
});

// ── ANALYTICS ───────────────────────────────────────
app.get('/api/analytics/:examId', async (c) => {
  const db = c.env.DB;
  const examId = c.req.param('examId');

  const { results: questions } = await db.prepare(
    `SELECT * FROM questions WHERE exam_id = ? ORDER BY part, sort_order, id`
  ).bind(examId).all();

  const { results: submissions } = await db.prepare(
    `SELECT seed, answers FROM submissions WHERE exam_id = ?`
  ).bind(examId).all();

  if (!questions.length) return c.json([]);

  const totalStudents = submissions.length;

  const analytics = questions.map((q, qIdx) => {
    const qType = q.type || 'multiple_choice';

    if (qType === 'fill_blank') {
      let correctCount = 0;
      submissions.forEach(sub => {
        const submittedAnswers = typeof sub.answers === 'string' ? JSON.parse(sub.answers) : sub.answers;
        const studentAnswer = submittedAnswers[q.id] || '';
        if (matchesAnswer(studentAnswer, q.answer)) correctCount++;
      });
      return {
        questionId: q.id,
        text: q.text,
        part: q.part,
        type: qType,
        sortOrder: q.sort_order,
        total: totalStudents,
        correct: correctCount,
        answer: q.answer,
      };
    }

    const choices = parseChoices(q.choices);
    const choiceMap = {};
    choices.forEach(c => {
      choiceMap[c.key] = { text: c.text, count: 0, correct: c.key === q.answer };
    });

    let correctCount = 0;
    submissions.forEach(sub => {
      const studentSeed = Number(sub.seed);
      const submittedAnswers = typeof sub.answers === 'string' ? JSON.parse(sub.answers) : sub.answers;
      const choiceSeed = studentSeed + qIdx * 7919;
      const shuffled = shuffleWithSeed(choices, choiceSeed).map((c, ci) => ({
        ...c, displayKey: String.fromCharCode(65 + ci),
      }));
      const chosenDisplayKey = submittedAnswers[q.id];
      const chosenChoice = shuffled.find(s => s.displayKey === chosenDisplayKey);
      if (chosenChoice) {
        choiceMap[chosenChoice.key].count++;
        if (chosenChoice.key === q.answer) correctCount++;
      }
    });

    return {
      questionId: q.id,
      text: q.text,
      part: q.part,
      type: qType,
      sortOrder: q.sort_order,
      total: totalStudents,
      correct: correctCount,
      choices: Object.entries(choiceMap).map(([key, val]) => ({
        key, text: val.text, count: val.count, correct: val.correct,
      })),
    };
  });

  return c.json(analytics);
});

// ── Shared utility functions ───────────────────────
function seededRandom(seed) {
  let s = seed;
  return function () {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}
function shuffleWithSeed(arr, seed) {
  const a = [...arr];
  const rand = seededRandom(seed);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function parseChoices(choices) {
  return typeof choices === 'string' ? JSON.parse(choices) : choices;
}

// ── Fill-in-the-blank equivalence engine ──
// Mirrors src/utils.js: canonicalize → numeric compare → sampling → reorder fallback.
const REL_TOL = 1e-6;
const ABS_TOL = 1e-9;

const FUNCS = {
  abs: Math.abs, sqrt: Math.sqrt, cbrt: Math.cbrt, exp: Math.exp, expm1: Math.expm1,
  ln: Math.log, log10: Math.log10, log2: Math.log2,
  sin: Math.sin, cos: Math.cos, tan: Math.tan,
  asin: Math.asin, acos: Math.acos, atan: Math.atan,
  floor: Math.floor, ceil: Math.ceil, round: Math.round, sign: Math.sign,
};

function isFuncOrConst(w) {
  return !!FUNCS[w] || w === 'pi' || w === 'tau' || w === 'e';
}

function insertStars(s) {
  s = s.replace(/([0-9])(?=[a-z](?![0-9]))/g, '$1*');
  s = s.replace(/([0-9)])(?=\()/g, '$1*');
  s = s.replace(/([a-z][a-z0-9_]*)(?=\()/g, m => isFuncOrConst(m) ? m : m + '*');
  return s;
}

function canonicalizeSequence(s) {
  s = s
    .replace(/[\u2212\u2013\u2014\u2296]/g, '-')
    .replace(/[\u00d7\u00b7\u2219\u2297]/g, '*')
    .replace(/\u00f7/g, '/')
    .replace(/\u00b0/g, '');
  const sup = { '\u00b2': 2, '\u00b3': 3, '\u00b9': 1, '\u2070': 0, '\u2074': 4, '\u2075': 5, '\u2076': 6, '\u2077': 7, '\u2078': 8, '\u2079': 9 };
  s = s.replace(/[\u00b2\u00b3\u00b9\u2070\u2074\u2075\u2076\u2077\u2078\u2079]/g, d => '^' + sup[d]);
  s = s.replace(/\u221a([0-9]+(?:[.,][0-9]+)?|\([^()]*\)|[a-z][a-z0-9_]*)/g, (_, g) => 'sqrt(' + (g[0] === '(' ? g.slice(1, -1) : g) + ')');
  s = s.replace(/[\u03c0\u03a0]/g, 'pi').replace(/\u03c4/g, 'tau');
  return s;
}

function canonicalize(input) {
  if (input === null || input === undefined) return '';
  let s = String(input).toLowerCase().trim();
  s = canonicalizeSequence(s);
  s = s.replace(/\s+/g, '');
  s = s.replace(/^[a-z][a-z0-9_]*=/g, '');
  s = insertStars(s);
  return s;
}

function tokenize(expr) {
  const tokens = [];
  let i = 0;
  const len = expr.length;
  while (i < len) {
    const ch = expr[i];
    if ('+-*/%^()'.includes(ch)) { tokens.push({ t: ch }); i++; continue; }
    if (/[0-9.]/.test(ch)) {
      let j = i;
      while (j < len && /[0-9.,]/.test(expr[j])) j++;
      let numStr = expr.slice(i, j).replace(/,/g, '');
      let k = j;
      if (expr[k] === 'e' || expr[k] === 'E') {
        let m = k + 1;
        let sign = '';
        if (expr[m] === '+' || expr[m] === '-') { sign = expr[m]; m++; }
        let digits = '';
        while (m < len && /[0-9]/.test(expr[m])) { digits += expr[m]; m++; }
        if (digits) { numStr += 'e' + sign + digits; k = m; }
      }
      const val = Number(numStr);
      if (isNaN(val)) throw new Error('bad number');
      tokens.push({ t: 'num', v: val });
      i = k;
      continue;
    }
    if (/[a-z]/.test(ch)) {
      let word = '';
      while (i < len && /[a-z0-9_]/.test(expr[i])) { word += expr[i]; i++; }
      tokens.push({ t: 'id', v: word });
      continue;
    }
    throw new Error('bad char: ' + ch);
  }
  return tokens;
}

function analyzeExpr(expr) {
  const tokens = tokenize(expr);
  const vars = new Set();
  for (let idx = 0; idx < tokens.length; idx++) {
    const tok = tokens[idx];
    if (tok.t !== 'id') continue;
    const isFunc = !!FUNCS[tok.v] && tokens[idx + 1] && tokens[idx + 1].t === '(';
    if (isFunc || tok.v === 'pi' || tok.v === 'e' || tok.v === 'tau') continue;
    vars.add(tok.v);
  }
  return { tokens, vars };
}

function evalTokens(tokens, vars) {
  let pos = 0;
  const peek = () => tokens[pos];
  const next = () => tokens[pos++];
  const expect = (op) => { const t = next(); if (!t || t.t !== op) throw new Error('expected ' + op); };

  const expression = () => {
    let left = term();
    while (peek() && (peek().t === '+' || peek().t === '-')) {
      const op = next().t;
      const right = term();
      left = op === '+' ? left + right : left - right;
    }
    return left;
  };
  const term = () => {
    let left = unary();
    while (peek() && (peek().t === '*' || peek().t === '/')) {
      const op = next().t;
      const right = unary();
      left = op === '*' ? left * right : left / right;
    }
    return left;
  };
  const unary = () => {
    if (peek() && peek().t === '-') { next(); return -unary(); }
    if (peek() && peek().t === '+') { next(); return unary(); }
    return power();
  };
  const power = () => {
    const base = atom();
    if (peek() && peek().t === '^') {
      next();
      const exponent = power();
      return Math.pow(base, exponent);
    }
    return base;
  };
  const atom = () => {
    const t = next();
    if (!t) throw new Error('unexpected end');
    if (t.t === 'num') {
      if (peek() && peek().t === '%') { next(); return t.v / 100; }
      return t.v;
    }
    if (t.t === '(') {
      const value = expression();
      expect(')');
      return value;
    }
    if (t.t === 'id') {
      if (peek() && peek().t === '(') {
        if (!FUNCS[t.v]) throw new Error('unknown function: ' + t.v);
        next(); // (
        const arg = expression();
        expect(')');
        return FUNCS[t.v](arg);
      }
      if (t.v === 'pi') return Math.PI;
      if (t.v === 'tau') return 2 * Math.PI;
      if (t.v === 'e') return Math.E;
      const value = vars && Object.prototype.hasOwnProperty.call(vars, t.v) ? vars[t.v] : undefined;
      if (value === undefined) throw new Error('unknown variable: ' + t.v);
      return value;
    }
    throw new Error('unexpected token');
  };

  const value = expression();
  if (peek()) throw new Error('trailing tokens');
  return value;
}

function almostEqual(a, b) {
  if (!isFinite(a) || !isFinite(b)) return false;
  const diff = Math.abs(a - b);
  return diff <= ABS_TOL || diff <= REL_TOL * Math.max(Math.abs(a), Math.abs(b));
}

function numericCompare(sExpr, cExpr) {
  let sInfo, cInfo;
  try {
    sInfo = analyzeExpr(sExpr);
    cInfo = analyzeExpr(cExpr);
    if (sInfo.vars.size > 0 || cInfo.vars.size > 0) return null;
    const a = evalTokens(sInfo.tokens, null);
    const b = evalTokens(cInfo.tokens, null);
    return almostEqual(a, b);
  } catch {
    return null;
  }
}

function samplePoints() {
  const pts = [-1000, -100, -12, -10, -3, -2, -1, -0.5, 0.5, 1, 2, 3, 10, 12, 48, 100, 500, 1000];
  let r = 123456789;
  for (let i = 0; i < 24; i++) {
    r = (1103515245 * r + 12345) >>> 0;
    pts.push((r / 4294967296) * 400 - 200);
  }
  return pts;
}
const SAMPLE_POINTS = samplePoints();

function sampleCompare(sExpr, cExpr) {
  let sInfo, cInfo;
  try {
    sInfo = analyzeExpr(sExpr);
    cInfo = analyzeExpr(cExpr);
  } catch {
    return null;
  }
  if (sInfo.vars.size !== cInfo.vars.size) return null;
  for (const v of sInfo.vars) if (!cInfo.vars.has(v)) return null;

  const varList = [...sInfo.vars];
  let compared = 0;
  for (const pt of SAMPLE_POINTS) {
    const vars = {};
    varList.forEach(v => { vars[v] = pt; });
    let a, b;
    try {
      a = evalTokens(sInfo.tokens, vars);
      b = evalTokens(cInfo.tokens, vars);
    } catch {
      continue;
    }
    compared++;
    if (!almostEqual(a, b)) return false;
    if (compared >= 12) break;
  }
  return compared >= 8;
}

function sortFactors(s) {
  return s.split('*').filter(Boolean).sort().join('*');
}

function matchesAnswer(studentAnswer, correctAnswer) {
  const s = canonicalize(studentAnswer);
  const c = canonicalize(correctAnswer);
  if (!c) return false;
  if (!s) return false;
  if (s === c) return true;

  const numeric = numericCompare(s, c);
  if (numeric !== null) return numeric;

  const sampled = sampleCompare(s, c);
  if (sampled !== null) return sampled;

  return sortFactors(s) === sortFactors(c);
}

// Compute a submission's per-question correctness using the exact shuffle the
// student saw. `overrides` maps question_id -> 'correct' | 'incorrect' (manual
// admin review) and wins over the engine's auto verdict.
function computeScore(questions, sub, overrides = {}) {
  const studentSeed = Number(sub.seed);
  const submittedAnswers = typeof sub.answers === 'string' ? JSON.parse(sub.answers) : sub.answers;
  const shuffledQs = shuffleWithSeed(questions, studentSeed);
  const perQuestion = [];
  let correctCount = 0;

  shuffledQs.forEach((q, idx) => {
    const qType = q.type || 'multiple_choice';
    let autoCorrect = false;
    if (qType === 'fill_blank') {
      const studentAnswer = submittedAnswers[q.id] || '';
      autoCorrect = matchesAnswer(studentAnswer, q.answer);
    } else {
      const choices = parseChoices(q.choices);
      const choiceSeed = studentSeed + idx * 7919;
      const shuffled = shuffleWithSeed(choices, choiceSeed).map((c, ci) => ({
        ...c, displayKey: String.fromCharCode(65 + ci),
      }));
      const correctDisplayKey = shuffled.find(c => c.key === q.answer).displayKey;
      const chosen = submittedAnswers[q.id];
      autoCorrect = chosen === correctDisplayKey;
    }

    const verdict = overrides[q.id];
    const correct = verdict === 'correct' ? true : verdict === 'incorrect' ? false : autoCorrect;
    if (correct) correctCount++;
    perQuestion.push({ question_id: q.id, autoCorrect, correct, verdict: verdict || null });
  });

  return { correctCount, perQuestion };
}

// ── REVIEW (manual grade) ───────────────────────────
app.post('/api/submissions/:id/review', async (c) => {
  if (!adminCheck(c)) return c.json({ error: 'Unauthorized' }, 401);
  const db = c.env.DB;
  const subId = c.req.param('id');
  const body = await c.req.json();
  const { question_id, verdict } = body;
  if (verdict !== 'correct' && verdict !== 'incorrect' && verdict !== null && verdict !== undefined && verdict !== '') {
    return c.json({ error: 'verdict must be correct, incorrect, or null' }, 400);
  }

  const sub = await db.prepare(`SELECT * FROM submissions WHERE id = ?`).bind(subId).first();
  if (!sub) return c.json({ error: 'Submission not found' }, 404);

  const { results: questions } = await db.prepare(
    `SELECT * FROM questions WHERE exam_id = ? ORDER BY part, sort_order, id`
  ).bind(sub.exam_id).all();

  if (verdict === 'correct' || verdict === 'incorrect') {
    await db.prepare(
      `INSERT INTO answer_reviews (submission_id, question_id, verdict)
       VALUES (?, ?, ?)
       ON CONFLICT(submission_id, question_id)
       DO UPDATE SET verdict = excluded.verdict, updated_at = datetime('now')`
    ).bind(subId, question_id, verdict).run();
  } else if (verdict === null || verdict === '' || verdict === undefined) {
    await db.prepare(
      `DELETE FROM answer_reviews WHERE submission_id = ? AND question_id = ?`
    ).bind(subId, question_id).run();
  }

  const { results: reviewRows } = await db.prepare(
    `SELECT question_id, verdict FROM answer_reviews WHERE submission_id = ?`
  ).bind(subId).all();
  const overrides = {};
  reviewRows.forEach(r => { overrides[r.question_id] = r.verdict; });

  const { correctCount } = computeScore(questions, sub, overrides);
  await db.prepare(`UPDATE submissions SET score = ? WHERE id = ?`).bind(correctCount, subId).run();
  await log(db, 'submission_reviewed', `Manual review on ${sub.student_name}: Q ${question_id} → ${verdict || 'auto'}`);
  // Notify student of grade change (Upscale §42 grade_changed)
  const examForNotif = await db.prepare(`SELECT title, class_id FROM exams WHERE id = ?`).bind(sub.exam_id).first();
  if (sub.student_id) {
    await createNotification(db, { class_id: examForNotif?.class_id || '', student_id: sub.student_id, title: `Grade updated: ${examForNotif?.title || 'Assessment'}`, body: `Your score is now ${correctCount}/${sub.total} — review was ${verdict || 'cleared'}.`, type: 'grade_changed', exam_id: sub.exam_id });
    try { c.executionCtx?.waitUntil?.(triggerPushWithEnv(db, c.env, { student_id: sub.student_id }).catch(()=>{})); } catch {}
  }

  return c.json({ id: subId, score: correctCount, total: sub.total, question_id, verdict: verdict || null });
});

// ── REGRADE ─────────────────────────────────────────
app.post('/api/regrade/:examId', async (c) => {
  const db = c.env.DB;
  const examId = c.req.param('examId');

  const auth = c.req.header('Authorization');
  const expected = c.env.VITE_ADMIN_PASSWORD || 'admin123';
  if (auth !== expected) return c.json({ error: 'Unauthorized' }, 401);

  const { results: questions } = await db.prepare(
    `SELECT * FROM questions WHERE exam_id = ? ORDER BY part, sort_order, id`
  ).bind(examId).all();

  const { results: submissions } = await db.prepare(
    `SELECT id, student_name, student_section, seed, answers, score, total FROM submissions WHERE exam_id = ?`
  ).bind(examId).all();

  const { results: reviewRows } = await db.prepare(
    `SELECT submission_id, question_id, verdict FROM answer_reviews ar
     INNER JOIN submissions s ON s.id = ar.submission_id WHERE s.exam_id = ?`
  ).bind(examId).all();
  const overridesBySub = {};
  reviewRows.forEach(r => {
    overridesBySub[r.submission_id] = overridesBySub[r.submission_id] || {};
    overridesBySub[r.submission_id][r.question_id] = r.verdict;
  });

  const updated = [];
  for (const sub of submissions) {
    const { correctCount } = computeScore(questions, sub, overridesBySub[sub.id] || {});

    await db.prepare(
      `UPDATE submissions SET score = ? WHERE id = ?`
    ).bind(correctCount, sub.id).run();

    updated.push({
      name: sub.student_name,
      section: sub.student_section,
      old_score: sub.score,
      new_score: correctCount,
      total: sub.total,
    });
  }

  await log(db, 'regrade', 'Regraded ' + updated.length + ' submissions for exam ' + examId);
  return c.json({ regraded: updated.length, results: updated });
});

export default app;
