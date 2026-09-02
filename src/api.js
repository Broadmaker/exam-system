const BASE = import.meta.env.VITE_API_URL || '/api';

async function request(path, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);
  const hasBody = options.body !== undefined && options.body !== null;
  const headers = { ...(hasBody ? { 'Content-Type': 'application/json' } : {}), ...options.headers };
  let res;
  try {
    res = await fetch(BASE + path, {
      credentials: 'include',
      ...options,
      headers,
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));
  } catch (e) {
    clearTimeout(timeout);
    if (e.name === 'AbortError') {
      const err = new Error('Request timed out (7s). Worker not responding.');
      err.status = 408;
      throw err;
    }
    throw e;
  }
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(text.includes('<!DOCTYPE') ? 'API server is not running. Start the Worker with `npx wrangler dev`.' : text.slice(0, 200));
  }
  if (!res.ok) {
    const e = new Error(data.error || data.message || 'Request failed');
    e.status = res.status;
    throw e;
  }
  return data;
}

// Deprecated — auth now via HttpOnly cookie (POST /api/admin/login); do NOT reintroduce Authorization header
const adminPass = () => '';
const maybeAdminHeaders = () => { return {}; };

// Simple memo cache with 30s TTL + dedupe for concurrent requests (P2) — GET only, key includes method
const _memo = new Map(); // key -> {data, ts}
const _pending = new Map(); // key -> Promise
async function memoRequest(path, options = {}, ttl = 30000) {
  const method = (options.method || 'GET').toUpperCase();
  if (method !== 'GET') return request(path, options);
  const key = method + ':' + path + ':' + JSON.stringify(options.headers || {}) + ':' + (options.credentials || 'include');
  const now = Date.now();
  const hit = _memo.get(key);
  if (hit && now - hit.ts < ttl) return hit.data;
  if (_pending.has(key)) return _pending.get(key);
  const p = request(path, options).then(data => {
    _memo.set(key, { data, ts: Date.now() });
    _pending.delete(key);
    return data;
  }).catch(e => { _pending.delete(key); throw e; });
  _pending.set(key, p);
  return p;
}
function invalidateMemo(prefix) {
  for (const k of _memo.keys()) if (k.startsWith(prefix)) _memo.delete(k);
  for (const k of _pending.keys()) if (k.startsWith(prefix)) _pending.delete(k);
}
export const api = {
  listExams: () => memoRequest('/exams', {}, 30000),
  getExam: (id, code, studentId) => {
    const qs = new URLSearchParams();
    if (code) qs.set('code', code);
    if (studentId) qs.set('student_id', studentId);
    const q = qs.toString();
    return request('/exams/' + id + (q ? '?' + q : ''), { credentials: 'include' });
  },
  createExam: (body) => request('/exams', { method: 'POST', body: JSON.stringify(body), credentials: 'include' }).then(r => { invalidateMemo('/exams'); return r; }),
  updateExam: (id, body) => request('/exams/' + id, { method: 'PUT', body: JSON.stringify(body), credentials: 'include' }).then(r => { invalidateMemo('/exams'); return r; }),
  deleteExam: (id) => request('/exams/' + id, { method: 'DELETE', credentials: 'include' }).then(r => { invalidateMemo('/exams'); return r; }),
  duplicateExam: (id) => request('/exams/' + id + '/duplicate', { method: 'POST', credentials: 'include' }).then(r => { invalidateMemo('/exams'); return r; }),
  addQuestion: (examId, body) => request('/exams/' + examId + '/questions', { method: 'POST', body: JSON.stringify(body), credentials: 'include' }),
  deleteQuestion: (id) => request('/questions/' + id, { method: 'DELETE', credentials: 'include' }),
  updateQuestion: (id, body) => request('/questions/' + id, { method: 'PUT', body: JSON.stringify(body), credentials: 'include' }),
  bulkImportQuestions: (examId, questions, startOrder = 0) =>
    request('/exams/' + examId + '/questions/bulk', { method: 'POST', body: JSON.stringify({ questions, start_order: startOrder }), credentials: 'include' }),
  submitScore: (body) => request('/submit', { method: 'POST', body: JSON.stringify(body) }),
  getLeaderboard: (examId) => request('/leaderboard/' + examId),
  getSubmissions: (examId) => request('/submissions/' + examId, { credentials: 'include' }),
  reviewAnswer: (submissionId, body) => request('/submissions/' + submissionId + '/review', { method: 'POST', body: JSON.stringify(body), credentials: 'include' }),
  regrade: (examId) => request('/regrade/' + examId, { method: 'POST', credentials: 'include' }),
  aiCheckFill: (body) => request('/ai/check-fill', { method: 'POST', body: JSON.stringify(body), credentials: 'include' }),
  aiRegrade: (examId) => request('/ai/regrade/' + examId, { method: 'POST', credentials: 'include' }),
  // Question Bank
  listBank: () => memoRequest('/bank', { credentials: 'include' }, 30000),
  addBank: (body) => request('/bank', { method: 'POST', body: JSON.stringify(body), credentials: 'include' }).then(r => { invalidateMemo('/bank'); return r; }),
  updateBank: (id, body) => request('/bank/' + id, { method: 'PUT', body: JSON.stringify(body), credentials: 'include' }).then(r => { invalidateMemo('/bank'); return r; }),
  deleteBank: (id) => request('/bank/' + id, { method: 'DELETE', credentials: 'include' }).then(r => { invalidateMemo('/bank'); return r; }),
  getAnalytics: (examId) => request('/analytics/' + examId, { credentials: 'include' }),
  // Activity Log
  getLogs: () => request('/logs', { credentials: 'include' }),
  // Sessions (single-session lock, heartbeat, proctoring)
  startSession: (examId, body) => request('/exams/' + examId + '/session/start', { method: 'POST', body: JSON.stringify(body) }),
  heartbeat: (examId, body) => request('/exams/' + examId + '/session/heartbeat', { method: 'POST', body: JSON.stringify(body) }),
  endSession: (examId, body) => request('/exams/' + examId + '/session/end', { method: 'POST', body: JSON.stringify(body) }),
  getProctor: (examId) => request('/proctor/' + examId, { credentials: 'include' }),
  kickStudent: (examId, sessionId) => request('/proctor/' + examId + '/kick', { method: 'POST', body: JSON.stringify({ session_id: sessionId }), credentials: 'include' }),
  cleanupStale: (examId) => request('/proctor/' + examId + '/cleanup-stale', { method: 'POST', credentials: 'include' }),
  allowRetry: (examId, studentId, allow) => request('/proctor/' + examId + '/retry', { method: 'POST', body: JSON.stringify({ student_id: studentId, allow }), credentials: 'include' }),
  getRetryStatus: (examId, studentId, studentName, studentSection) => request('/exams/' + examId + '/retry-status?student_id=' + encodeURIComponent(studentId) + '&student_name=' + encodeURIComponent(studentName) + '&student_section=' + encodeURIComponent(studentSection)),
  lookupStudent: (examId, studentId) => request('/exams/' + examId + '/student?student_id=' + encodeURIComponent(studentId)),
  // Attendance
  getAttendance: (examId) => request('/exams/' + examId + '/attendance', { credentials: 'include' }),
  // Standalone attendance sessions
  listAttendanceSessions: () => request('/attendance-sessions', { credentials: 'include' }),
  createAttendanceSession: (body) => request('/attendance-sessions', { method: 'POST', body: JSON.stringify(body), credentials: 'include' }),
  updateAttendanceSession: (id, body) => request('/attendance-sessions/' + id, { method: 'PUT', body: JSON.stringify(body), credentials: 'include' }),
  deleteAttendanceSession: (id) => request('/attendance-sessions/' + id, { method: 'DELETE', credentials: 'include' }),
  getAttendanceSession: (id) => request('/attendance-sessions/' + id),
  lookupAttendanceSession: (code) => request('/attendance-sessions/lookup', { method: 'POST', body: JSON.stringify({ code }) }),
  checkin: (id, body) => request('/attendance-sessions/' + id + '/checkin', { method: 'POST', body: JSON.stringify(body) }),
  getAttendanceSessionReport: (id) => request('/attendance-sessions/' + id + '/report', { credentials: 'include' }),
  // Classes & enrollments
  listClasses: () => request('/classes', { credentials: 'include' }),
  createClass: (body) => request('/classes', { method: 'POST', body: JSON.stringify(body), credentials: 'include' }),
  updateClass: (id, body) => request('/classes/' + id, { method: 'PUT', body: JSON.stringify(body), credentials: 'include' }),
  deleteClass: (id) => request('/classes/' + id, { method: 'DELETE', credentials: 'include' }),
  getClass: (id) => request('/classes/' + id, { credentials: 'include' }),
  getClassGradebook: (classId) => request('/classes/' + classId + '/gradebook', { credentials: 'include' }),
  getGradeCategories: (classId) => request('/classes/' + classId + '/grade-categories', { credentials: 'include' }),
  saveGradeCategories: (classId, categories) => request('/classes/' + classId + '/grade-categories', { method: 'PUT', body: JSON.stringify({ categories }), credentials: 'include' }),
  enrollStudents: (classId, students) => request('/classes/' + classId + '/enroll', { method: 'POST', body: JSON.stringify({ students }), credentials: 'include' }),
  removeStudent: (classId, studentId) => request('/classes/' + classId + '/enroll/' + encodeURIComponent(studentId), { method: 'DELETE', credentials: 'include' }),
  updateStudent: (classId, studentId, body) => request('/classes/' + classId + '/enroll/' + encodeURIComponent(studentId), { method: 'PUT', body: JSON.stringify(body), credentials: 'include' }),
  listStudents: () => request('/students', { credentials: 'include' }),
  // Class attendance
  getClassAttendance: (classId, date) => request('/classes/' + classId + '/attendance?date=' + encodeURIComponent(date), { credentials: 'include' }),
  saveClassAttendance: (classId, date, records) => request('/classes/' + classId + '/attendance', { method: 'POST', body: JSON.stringify({ date, records }), credentials: 'include' }),
  getClassAttendanceHistory: (classId) => request('/classes/' + classId + '/attendance/history', { credentials: 'include' }),
  // Student records portal
  getStudentRecords: (studentId, code) => request('/student/' + encodeURIComponent(studentId) + (code ? '?code=' + encodeURIComponent(code) : '')),
  // Notifications (§42-43)
  listNotifications: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request('/notifications' + (qs ? '?' + qs : ''));
  },
  listAdminNotifications: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request('/notifications' + (qs ? '?' + qs : ''), { credentials: 'include' });
  },
  createNotification: (body) => request('/notifications', { method: 'POST', body: JSON.stringify(body), credentials: 'include' }),
  deleteNotification: (id) => request('/notifications/' + id, { method: 'DELETE', credentials: 'include' }),
  getUnreadCount: (studentId) => request('/notifications/unread-count?student_id=' + encodeURIComponent(studentId)),
  markRead: (id, studentId) => request('/notifications/' + id + '/read', { method: 'POST', body: JSON.stringify({ student_id: studentId }) }),
  markAllRead: (studentId) => request('/notifications/read-all', { method: 'POST', body: JSON.stringify({ student_id: studentId }) }),
  getVapidPublicKey: () => request('/push/vapid-public-key'),
  pushSubscribe: (studentId, subscription) => request('/push/subscribe', { method: 'POST', body: JSON.stringify({ student_id: studentId, subscription }) }),
  pushUnsubscribe: (studentId, endpoint) => request('/push/unsubscribe', { method: 'POST', body: JSON.stringify({ student_id: studentId, endpoint }) }),
  // Exam Templates (§66)
  listTemplates: () => request('/templates', { credentials: 'include' }),
  getTemplate: (id) => request('/templates/' + id, { credentials: 'include' }),
  createTemplate: (body) => request('/templates', { method: 'POST', body: JSON.stringify(body), credentials: 'include' }),
  updateTemplate: (id, body) => request('/templates/' + id, { method: 'PUT', body: JSON.stringify(body), credentials: 'include' }),
  deleteTemplate: (id) => request('/templates/' + id, { method: 'DELETE', credentials: 'include' }),
  useTemplate: (id, body={}) => request('/templates/' + id + '/use', { method: 'POST', body: JSON.stringify(body), credentials: 'include' }),
  // Class self-enrollment (student-facing)
  lookupClassCode: (code) => request('/classes/code/' + encodeURIComponent(code)),
  enrollByCode: (body) => request('/classes/enroll', { method: 'POST', body: JSON.stringify(body) }),
  // Admin auth (Finding 1 fix — HttpOnly cookie)
  adminLogin: (password) => request('/admin/login', { method: 'POST', body: JSON.stringify({ password }), credentials: 'include' }),
  adminLogout: () => request('/admin/logout', { method: 'POST', credentials: 'include' }),
  adminMe: () => request('/admin/me', { credentials: 'include' }),
};
