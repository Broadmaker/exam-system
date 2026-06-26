import { Hono } from 'hono';
import { cors } from 'hono/cors';

const app = new Hono();

app.use('/api/*', cors());

function uuid() { return crypto.randomUUID(); }

async function log(db, action, details = '') {
  await db.prepare(
    `INSERT INTO activity_log (id, action, details) VALUES (?, ?, ?)`
  ).bind(uuid(), action, details).run();
}

function adminCheck(c) {
  const auth = c.req.header('Authorization');
  const expected = c.env.VITE_ADMIN_PASSWORD || 'admin123';
  return auth === expected;
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
  await db.prepare(
    `INSERT INTO exams (id, title, description, time_limit, questions_per_set, show_answers)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(id, body.title, body.description || '', body.time_limit || 60, body.questions_per_set || 10, body.show_answers !== undefined ? (body.show_answers ? 1 : 0) : 1).run();
  await log(db, 'exam_created', 'Created exam: ' + body.title);
  return c.json({ id }, 201);
});

app.get('/api/exams/:id', async (c) => {
  const db = c.env.DB;
  const examId = c.req.param('id');
  const exam = await db.prepare(`SELECT * FROM exams WHERE id = ?`).bind(examId).first();
  if (!exam) return c.json({ error: 'Exam not found' }, 404);
  const { results: questions } = await db.prepare(
    `SELECT * FROM questions WHERE exam_id = ? ORDER BY part, sort_order`
  ).bind(examId).all();
  return c.json({ ...exam, questions });
});

app.put('/api/exams/:id', async (c) => {
  const db = c.env.DB;
  const examId = c.req.param('id');
  const body = await c.req.json();
  const old = await db.prepare(`SELECT title FROM exams WHERE id = ?`).bind(examId).first();
  await db.prepare(
    `UPDATE exams SET title = ?, description = ?, time_limit = ?, questions_per_set = ?, show_answers = ?, updated_at = datetime('now')
     WHERE id = ?`
  ).bind(body.title, body.description || '', body.time_limit || 60, body.questions_per_set || 10, body.show_answers !== undefined ? (body.show_answers ? 1 : 0) : 1, examId).run();
  await log(db, 'exam_updated', 'Updated: ' + (old?.title || examId));
  return c.json({ success: true });
});

app.delete('/api/exams/:id', async (c) => {
  const db = c.env.DB;
  const old = await db.prepare(`SELECT title FROM exams WHERE id = ?`).bind(c.req.param('id')).first();
  await db.prepare(`DELETE FROM exams WHERE id = ?`).bind(c.req.param('id')).run();
  await log(db, 'exam_deleted', 'Deleted: ' + (old?.title || c.req.param('id')));
  return c.json({ success: true });
});

// ── QUESTIONS ──────────────────────────────────────
app.post('/api/exams/:examId/questions', async (c) => {
  const db = c.env.DB;
  const examId = c.req.param('examId');
  const body = await c.req.json();
  const id = uuid();
  await db.prepare(
    `INSERT INTO questions (id, exam_id, part, text, choices, answer, explain, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(id, examId, body.part, body.text, JSON.stringify(body.choices), body.answer, body.explain || '', body.sort_order || 0).run();
  return c.json({ id }, 201);
});

app.put('/api/questions/:id', async (c) => {
  const db = c.env.DB;
  const body = await c.req.json();
  await db.prepare(
    `UPDATE questions SET part = ?, text = ?, choices = ?, answer = ?, explain = ?, sort_order = ? WHERE id = ?`
  ).bind(body.part, body.text, JSON.stringify(body.choices), body.answer, body.explain || '', body.sort_order || 0, c.req.param('id')).run();
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
    await db.prepare(
      `INSERT INTO questions (id, exam_id, part, text, choices, answer, explain, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(id, examId, q.part || 1, q.text, JSON.stringify(q.choices || []), q.answer, q.explain || '', body.start_order + i || i).run();
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
  await db.prepare(
    `INSERT INTO question_bank (id, part, text, choices, answer, explain)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(id, body.part, body.text, JSON.stringify(body.choices), body.answer, body.explain || '').run();
  await log(db, 'bank_added', 'Added question to bank (part ' + body.part + ')');
  return c.json({ id }, 201);
});

app.put('/api/bank/:id', async (c) => {
  if (!adminCheck(c)) return c.json({ error: 'Unauthorized' }, 401);
  const db = c.env.DB;
  const body = await c.req.json();
  await db.prepare(
    `UPDATE question_bank SET part = ?, text = ?, choices = ?, answer = ?, explain = ? WHERE id = ?`
  ).bind(body.part, body.text, JSON.stringify(body.choices), body.answer, body.explain || '', c.req.param('id')).run();
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
  const { exam_id, student_name, student_section, seed, answers, score, total, tab_switches, time_taken } = body;

  const existing = await db.prepare(
    `SELECT id FROM submissions WHERE exam_id = ? AND student_name = ? AND student_section = ?`
  ).bind(exam_id, student_name, student_section).first();
  if (existing) return c.json({ error: 'You have already submitted this exam.' }, 409);

  const id = uuid();
  await db.prepare(
    `INSERT INTO submissions (id, exam_id, student_name, student_section, seed, answers, score, total, tab_switches, time_taken)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(id, exam_id, student_name, student_section, seed, JSON.stringify(answers), score, total, tab_switches, time_taken).run();
  return c.json({ id }, 201);
});

// ── LEADERBOARD ────────────────────────────────────
app.get('/api/leaderboard/:examId', async (c) => {
  const db = c.env.DB;
  const { results } = await db.prepare(
    `SELECT student_name, student_section, score, total, tab_switches, time_taken, submitted_at
     FROM submissions WHERE exam_id = ?
     ORDER BY score DESC, time_taken ASC LIMIT 100`
  ).bind(c.req.param('examId')).all();
  return c.json(results);
});

// ── SUBMISSIONS (admin) ────────────────────────────
app.get('/api/submissions/:examId', async (c) => {
  const db = c.env.DB;
  const { results } = await db.prepare(
    `SELECT id, student_name, student_section, score, total, tab_switches, time_taken, submitted_at, answers
     FROM submissions WHERE exam_id = ?
     ORDER BY submitted_at DESC`
  ).bind(c.req.param('examId')).all();
  return c.json(results);
});

// ── ANALYTICS ───────────────────────────────────────
app.get('/api/analytics/:examId', async (c) => {
  const db = c.env.DB;
  const examId = c.req.param('examId');

  const { results: questions } = await db.prepare(
    `SELECT * FROM questions WHERE exam_id = ? ORDER BY part, sort_order`
  ).bind(examId).all();

  const { results: submissions } = await db.prepare(
    `SELECT seed, answers FROM submissions WHERE exam_id = ?`
  ).bind(examId).all();

  if (!questions.length) return c.json([]);

  const totalStudents = submissions.length;

  const analytics = questions.map((q, qIdx) => {
    const choices = parseChoices(q.choices);
    const choiceMap = {}; // actual key -> { text, count, correct }
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

// ── REGRADE ─────────────────────────────────────────
app.post('/api/regrade/:examId', async (c) => {
  const db = c.env.DB;
  const examId = c.req.param('examId');

  const auth = c.req.header('Authorization');
  const expected = c.env.VITE_ADMIN_PASSWORD || 'admin123';
  if (auth !== expected) return c.json({ error: 'Unauthorized' }, 401);

  const { results: questions } = await db.prepare(
    `SELECT * FROM questions WHERE exam_id = ? ORDER BY part, sort_order`
  ).bind(examId).all();

  const { results: submissions } = await db.prepare(
    `SELECT id, student_name, student_section, seed, answers, score, total FROM submissions WHERE exam_id = ?`
  ).bind(examId).all();

  const updated = [];
  for (const sub of submissions) {
    const studentSeed = Number(sub.seed);
    const submittedAnswers = typeof sub.answers === 'string' ? JSON.parse(sub.answers) : sub.answers;
    const shuffledQs = shuffleWithSeed(questions, studentSeed);

    let correctCount = 0;
    shuffledQs.forEach((q, idx) => {
      const choices = parseChoices(q.choices);
      const choiceSeed = studentSeed + idx * 7919;
      const shuffled = shuffleWithSeed(choices, choiceSeed).map((c, ci) => ({
        ...c, displayKey: String.fromCharCode(65 + ci),
      }));
      const correctDisplayKey = shuffled.find(c => c.key === q.answer).displayKey;
      const chosen = submittedAnswers[q.id];
      if (chosen === correctDisplayKey) correctCount++;
    });

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
