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
    `INSERT INTO exams (id, title, description, time_limit, questions_per_set, show_answers, deadline)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(id, body.title, body.description || '', body.time_limit || 60, body.questions_per_set || 10, body.show_answers !== undefined ? (body.show_answers ? 1 : 0) : 1, body.deadline || '').run();
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
    `UPDATE exams SET title = ?, description = ?, time_limit = ?, questions_per_set = ?, show_answers = ?, deadline = ?, updated_at = datetime('now')
     WHERE id = ?`
  ).bind(body.title, body.description || '', body.time_limit || 60, body.questions_per_set || 10, body.show_answers !== undefined ? (body.show_answers ? 1 : 0) : 1, body.deadline || '', examId).run();
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
  const qType = body.type || 'multiple_choice';
  await db.prepare(
    `INSERT INTO questions (id, exam_id, part, text, type, choices, answer, explain, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(id, examId, body.part, body.text, qType, JSON.stringify(body.choices || []), body.answer, body.explain || '', body.sort_order || 0).run();
  return c.json({ id }, 201);
});

app.put('/api/questions/:id', async (c) => {
  const db = c.env.DB;
  const body = await c.req.json();
  const qType = body.type || 'multiple_choice';
  await db.prepare(
    `UPDATE questions SET part = ?, text = ?, type = ?, choices = ?, answer = ?, explain = ?, sort_order = ? WHERE id = ?`
  ).bind(body.part, body.text, qType, JSON.stringify(body.choices || []), body.answer, body.explain || '', body.sort_order || 0, c.req.param('id')).run();
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
      `INSERT INTO questions (id, exam_id, part, text, type, choices, answer, explain, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(id, examId, q.part || 1, q.text, qType, JSON.stringify(q.choices || []), q.answer, q.explain || '', body.start_order + i || i).run();
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
    `INSERT INTO question_bank (id, part, text, type, choices, answer, explain)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(id, body.part, body.text, qType, JSON.stringify(body.choices || []), body.answer, body.explain || '').run();
  await log(db, 'bank_added', 'Added question to bank (part ' + body.part + ')');
  return c.json({ id }, 201);
});

app.put('/api/bank/:id', async (c) => {
  if (!adminCheck(c)) return c.json({ error: 'Unauthorized' }, 401);
  const db = c.env.DB;
  const body = await c.req.json();
  const qType = body.type || 'multiple_choice';
  await db.prepare(
    `UPDATE question_bank SET part = ?, text = ?, type = ?, choices = ?, answer = ?, explain = ? WHERE id = ?`
  ).bind(body.part, body.text, qType, JSON.stringify(body.choices || []), body.answer, body.explain || '', c.req.param('id')).run();
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

  const exam = await db.prepare(`SELECT deadline FROM exams WHERE id = ?`).bind(exam_id).first();
  if (exam?.deadline) {
    const deadlineMs = new Date(exam.deadline).getTime();
    const startedAt = Number(body.started_at);
    if (Date.now() > deadlineMs && (!startedAt || startedAt > deadlineMs)) {
      return c.json({ error: 'This exam has already ended.' }, 403);
    }
  }

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

  const { results: reviewRows } = await db.prepare(
    `SELECT submission_id, question_id, verdict FROM answer_reviews ar
     INNER JOIN submissions s ON s.id = ar.submission_id WHERE s.exam_id = ?`
  ).bind(c.req.param('examId')).all();
  const reviewsBySub = {};
  reviewRows.forEach(r => {
    reviewsBySub[r.submission_id] = reviewsBySub[r.submission_id] || {};
    reviewsBySub[r.submission_id][r.question_id] = r.verdict;
  });

  return c.json(results.map(sub => ({ ...sub, reviews: reviewsBySub[sub.id] || {} })));
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
    `SELECT * FROM questions WHERE exam_id = ? ORDER BY part, sort_order`
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
    `SELECT * FROM questions WHERE exam_id = ? ORDER BY part, sort_order`
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
