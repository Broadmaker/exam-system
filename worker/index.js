import { Hono } from 'hono';
import { cors } from 'hono/cors';

const app = new Hono();

app.use('/api/*', cors());

function uuid() { return crypto.randomUUID(); }

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
    `INSERT INTO exams (id, title, description, time_limit, questions_per_set)
     VALUES (?, ?, ?, ?, ?)`
  ).bind(id, body.title, body.description || '', body.time_limit || 60, body.questions_per_set || 10).run();
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
  await db.prepare(
    `UPDATE exams SET title = ?, description = ?, time_limit = ?, questions_per_set = ?, updated_at = datetime('now')
     WHERE id = ?`
  ).bind(body.title, body.description || '', body.time_limit || 60, body.questions_per_set || 10, examId).run();
  return c.json({ success: true });
});

app.delete('/api/exams/:id', async (c) => {
  const db = c.env.DB;
  await db.prepare(`DELETE FROM exams WHERE id = ?`).bind(c.req.param('id')).run();
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

app.delete('/api/questions/:id', async (c) => {
  const db = c.env.DB;
  await db.prepare(`DELETE FROM questions WHERE id = ?`).bind(c.req.param('id')).run();
  return c.json({ success: true });
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
    `SELECT id, student_name, student_section, score, total, tab_switches, time_taken, submitted_at
     FROM submissions WHERE exam_id = ?
     ORDER BY submitted_at DESC`
  ).bind(c.req.param('examId')).all();
  return c.json(results);
});

// ── Shared utility functions (mirrors client-side shuffle for grading) ──
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

  // Simple admin check
  const auth = c.req.header('Authorization');
  const expected = c.env.VITE_ADMIN_PASSWORD || 'admin123';
  if (auth !== expected) return c.json({ error: 'Unauthorized' }, 401);

  // Fetch questions
  const { results: questions } = await db.prepare(
    `SELECT * FROM questions WHERE exam_id = ? ORDER BY part, sort_order`
  ).bind(examId).all();

  // Fetch all submissions for this exam
  const { results: submissions } = await db.prepare(
    `SELECT id, student_name, student_section, seed, answers, score, total FROM submissions WHERE exam_id = ?`
  ).bind(examId).all();

  const updated = [];
  for (const sub of submissions) {
    const studentSeed = Number(sub.seed);
    const submittedAnswers = typeof sub.answers === 'string' ? JSON.parse(sub.answers) : sub.answers;

    // Shuffle questions the same way the client does
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

  return c.json({ regraded: updated.length, results: updated });
});

export default app;
