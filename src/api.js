const BASE = import.meta.env.VITE_API_URL || '/api';

async function request(path, options = {}) {
  const res = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(text.includes('<!DOCTYPE') ? 'API server is not running. Start the Worker with `npx wrangler dev`.' : text.slice(0, 200));
  }
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  listExams: () => request('/exams'),
  getExam: (id) => request('/exams/' + id),
  createExam: (body) => request('/exams', { method: 'POST', body: JSON.stringify(body) }),
  updateExam: (id, body) => request('/exams/' + id, { method: 'PUT', body: JSON.stringify(body) }),
  deleteExam: (id) => request('/exams/' + id, { method: 'DELETE' }),
  addQuestion: (examId, body) => request('/exams/' + examId + '/questions', { method: 'POST', body: JSON.stringify(body) }),
  deleteQuestion: (id) => request('/questions/' + id, { method: 'DELETE' }),
  updateQuestion: (id, body) => request('/questions/' + id, { method: 'PUT', body: JSON.stringify(body) }),
  submitScore: (body) => request('/submit', { method: 'POST', body: JSON.stringify(body) }),
  getLeaderboard: (examId) => request('/leaderboard/' + examId),
  getSubmissions: (examId) => request('/submissions/' + examId),
  regrade: (examId, adminPassword) => request('/regrade/' + examId, { method: 'POST', headers: { 'Authorization': adminPassword } }),
};
