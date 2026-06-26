import { readFileSync } from 'fs';

const md = readFileSync('data2.md', 'utf8').replace(/\r/g, '');

const questions = [];
let currentPart = 0;
let currentQ = null;

for (const line of md.split('\n')) {
  const partMatch = line.match(/### PART (\d+)/);
  if (partMatch) { currentPart = parseInt(partMatch[1]); continue; }

  const qMatch = line.match(/\*\*Q(\d+)\.\*\*/);
  if (qMatch) {
    if (currentQ) questions.push(currentQ);
    currentQ = { part: currentPart, text: '', choices: [], answer: '' };
    currentQ.text = line.replace(/\*\*Q\d+\.\*\*/, '').trim();
    continue;
  }

  // Correct choice: **D. Discrete, Nominal, Nominal ✔** possibly with _notes_ after
  const correctMatch = line.match(/^- \*\*([A-D])\. (.+?) ✔\*\*/);
  if (correctMatch && currentQ) {
    currentQ.choices.push({ key: correctMatch[1], text: correctMatch[2].trim() });
    currentQ.answer = correctMatch[1];
    continue;
  }

  // Regular choice: - A. Continuous, Nominal, Nominal
  const choiceMatch = line.match(/^- ([A-D])\. (.+)/);
  if (choiceMatch && currentQ) {
    currentQ.choices.push({ key: choiceMatch[1], text: choiceMatch[2].trim() });
    continue;
  }
}
if (currentQ) questions.push(currentQ);

const API = 'https://exam-system.sanigkram24.workers.dev/api';

async function main() {
  console.log(`Parsed ${questions.length} questions across ${new Set(questions.map(q => q.part)).size} parts\n`);

  for (const q of questions) {
    if (!q.answer) {
      console.error(`WARNING: Q${questions.indexOf(q) + 1} (Part ${q.part}) has NO correct answer!`);
      console.error(`  Text: ${q.text.slice(0, 80)}`);
    }
    if (q.choices.length !== 4) {
      console.error(`WARNING: Q${questions.indexOf(q) + 1} has ${q.choices.length} choices (expected 4)`);
    }
  }

  const examPayload = {
    title: 'STAT 120 — Set B Examination',
    description: '50 items · 5 Parts · 60 minutes',
    time_limit: 60,
    questions_per_set: 10,
  };

  console.log('Creating exam\nPOST ' + API + '/exams');
  console.log('Body:', JSON.stringify(examPayload));
  const examRes = await fetch(API + '/exams', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(examPayload),
  });
  const examText = await examRes.text();
  let exam;
  try { exam = JSON.parse(examText); } catch { console.error('Response:', examText.slice(0, 500)); throw new Error('Failed to create exam'); }
  console.log(`Exam created: ${exam.id}\n`);

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const body = {
      part: q.part,
      text: q.text,
      choices: q.choices,
      answer: q.answer,
      explain: '',
      sort_order: i,
    };
    const res = await fetch(API + '/exams/' + exam.id + '/questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = {}; }
    console.log(`  Q${i + 1} (Part ${q.part}): ${data.id ? 'OK' : 'FAIL ' + res.status} — ${q.text.slice(0, 60)}`);
  }

  console.log(`\nDone! All ${questions.length} questions seeded to exam ${exam.id}`);
}

main().catch(console.error);
