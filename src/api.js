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
  if (!res.ok) {
    const e = new Error(data.error || 'Request failed');
    e.status = res.status;
    throw e;
  }
  return data;
}

const adminPass = () => import.meta.env.VITE_ADMIN_PASSWORD || 'admin123';

export const api = {
  listExams: () => request('/exams'),
  getExam: (id) => request('/exams/' + id),
  createExam: (body) => request('/exams', { method: 'POST', body: JSON.stringify(body) }),
  updateExam: (id, body) => request('/exams/' + id, { method: 'PUT', body: JSON.stringify(body) }),
  deleteExam: (id) => request('/exams/' + id, { method: 'DELETE' }),
  duplicateExam: (id) => request('/exams/' + id + '/duplicate', { method: 'POST' }),
  addQuestion: (examId, body) => request('/exams/' + examId + '/questions', { method: 'POST', body: JSON.stringify(body) }),
  deleteQuestion: (id) => request('/questions/' + id, { method: 'DELETE' }),
  updateQuestion: (id, body) => request('/questions/' + id, { method: 'PUT', body: JSON.stringify(body) }),
  bulkImportQuestions: (examId, questions, startOrder = 0) =>
    request('/exams/' + examId + '/questions/bulk', { method: 'POST', body: JSON.stringify({ questions, start_order: startOrder }) }),
  submitScore: (body) => request('/submit', { method: 'POST', body: JSON.stringify(body) }),
  getLeaderboard: (examId) => request('/leaderboard/' + examId),
  getSubmissions: (examId) => request('/submissions/' + examId),
  reviewAnswer: (submissionId, body) => request('/submissions/' + submissionId + '/review', { method: 'POST', body: JSON.stringify(body), headers: { 'Authorization': adminPass() } }),
  regrade: (examId) => request('/regrade/' + examId, { method: 'POST', headers: { 'Authorization': adminPass() } }),
  // Question Bank
  listBank: () => request('/bank'),
  addBank: (body) => request('/bank', { method: 'POST', body: JSON.stringify(body), headers: { 'Authorization': adminPass() } }),
  updateBank: (id, body) => request('/bank/' + id, { method: 'PUT', body: JSON.stringify(body), headers: { 'Authorization': adminPass() } }),
  deleteBank: (id) => request('/bank/' + id, { method: 'DELETE', headers: { 'Authorization': adminPass() } }),
  getAnalytics: (examId) => request('/analytics/' + examId),
  // Activity Log
  getLogs: () => request('/logs'),
  // Sessions (single-session lock, heartbeat, proctoring)
  startSession: (examId, body) => request('/exams/' + examId + '/session/start', { method: 'POST', body: JSON.stringify(body) }),
  heartbeat: (examId, body) => request('/exams/' + examId + '/session/heartbeat', { method: 'POST', body: JSON.stringify(body) }),
  endSession: (examId, body) => request('/exams/' + examId + '/session/end', { method: 'POST', body: JSON.stringify(body) }),
  getProctor: (examId) => request('/proctor/' + examId, { headers: { 'Authorization': adminPass() } }),
  kickStudent: (examId, sessionId) => request('/proctor/' + examId + '/kick', { method: 'POST', body: JSON.stringify({ session_id: sessionId }), headers: { 'Authorization': adminPass() } }),
  allowRetry: (examId, studentId, allow) => request('/proctor/' + examId + '/retry', { method: 'POST', body: JSON.stringify({ student_id: studentId, allow }), headers: { 'Authorization': adminPass() } }),
  getRetryStatus: (examId, studentId, studentName, studentSection) => request('/exams/' + examId + '/retry-status?student_id=' + encodeURIComponent(studentId) + '&student_name=' + encodeURIComponent(studentName) + '&student_section=' + encodeURIComponent(studentSection)),
  lookupStudent: (examId, studentId) => request('/exams/' + examId + '/student?student_id=' + encodeURIComponent(studentId)),
  // Attendance
  getAttendance: (examId) => request('/exams/' + examId + '/attendance', { headers: { 'Authorization': adminPass() } }),
  // Standalone attendance sessions
  listAttendanceSessions: () => request('/attendance-sessions', { headers: { 'Authorization': adminPass() } }),
  createAttendanceSession: (body) => request('/attendance-sessions', { method: 'POST', body: JSON.stringify(body), headers: { 'Authorization': adminPass() } }),
  updateAttendanceSession: (id, body) => request('/attendance-sessions/' + id, { method: 'PUT', body: JSON.stringify(body), headers: { 'Authorization': adminPass() } }),
  deleteAttendanceSession: (id) => request('/attendance-sessions/' + id, { method: 'DELETE', headers: { 'Authorization': adminPass() } }),
  getAttendanceSession: (id) => request('/attendance-sessions/' + id),
  lookupAttendanceSession: (code) => request('/attendance-sessions/lookup', { method: 'POST', body: JSON.stringify({ code }) }),
  checkin: (id, body) => request('/attendance-sessions/' + id + '/checkin', { method: 'POST', body: JSON.stringify(body) }),
  getAttendanceSessionReport: (id) => request('/attendance-sessions/' + id + '/report', { headers: { 'Authorization': adminPass() } }),
  // Classes & enrollments
  listClasses: () => request('/classes', { headers: { 'Authorization': adminPass() } }),
  createClass: (body) => request('/classes', { method: 'POST', body: JSON.stringify(body), headers: { 'Authorization': adminPass() } }),
  updateClass: (id, body) => request('/classes/' + id, { method: 'PUT', body: JSON.stringify(body), headers: { 'Authorization': adminPass() } }),
  deleteClass: (id) => request('/classes/' + id, { method: 'DELETE', headers: { 'Authorization': adminPass() } }),
  getClass: (id) => request('/classes/' + id, { headers: { 'Authorization': adminPass() } }),
  getClassGradebook: (classId) => request('/classes/' + classId + '/gradebook', { headers: { 'Authorization': adminPass() } }),
  getGradeCategories: (classId) => request('/classes/' + classId + '/grade-categories', { headers: { 'Authorization': adminPass() } }),
  saveGradeCategories: (classId, categories) => request('/classes/' + classId + '/grade-categories', { method: 'PUT', body: JSON.stringify({ categories }), headers: { 'Authorization': adminPass() } }),
  enrollStudents: (classId, students) => request('/classes/' + classId + '/enroll', { method: 'POST', body: JSON.stringify({ students }), headers: { 'Authorization': adminPass() } }),
  removeStudent: (classId, studentId) => request('/classes/' + classId + '/enroll/' + encodeURIComponent(studentId), { method: 'DELETE', headers: { 'Authorization': adminPass() } }),
  updateStudent: (classId, studentId, body) => request('/classes/' + classId + '/enroll/' + encodeURIComponent(studentId), { method: 'PUT', body: JSON.stringify(body), headers: { 'Authorization': adminPass() } }),
  listStudents: () => request('/students', { headers: { 'Authorization': adminPass() } }),
  // Class attendance
  getClassAttendance: (classId, date) => request('/classes/' + classId + '/attendance?date=' + encodeURIComponent(date), { headers: { 'Authorization': adminPass() } }),
  saveClassAttendance: (classId, date, records) => request('/classes/' + classId + '/attendance', { method: 'POST', body: JSON.stringify({ date, records }), headers: { 'Authorization': adminPass() } }),
  getClassAttendanceHistory: (classId) => request('/classes/' + classId + '/attendance/history', { headers: { 'Authorization': adminPass() } }),
  // Student records portal
  getStudentRecords: (studentId) => request('/student/' + encodeURIComponent(studentId)),
  // Class self-enrollment (student-facing)
  lookupClassCode: (code) => request('/classes/code/' + encodeURIComponent(code)),
  enrollByCode: (body) => request('/classes/enroll', { method: 'POST', body: JSON.stringify(body) }),
};
