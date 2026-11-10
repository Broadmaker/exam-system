// Offline quiz package helpers — see docs/OFFLINE_QUIZ.md.
// Keeps a client-safe copy of a quiz (questions stripped of answer keys by the
// worker) so a verified student can resume or start offline inside the window.

const PREFIX = 'offline_quiz_v2_';
const LEGACY_PREFIX = 'cached_exam_';
const MAX_PACKAGES = 10;

function storage() {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

function keyFor(examId) {
  return PREFIX + examId;
}

function toMs(value) {
  if (!value) return 0;
  const t = new Date(value).getTime();
  return isNaN(t) ? 0 : t;
}

export function saveOfflineQuiz(examId, payload) {
  if (!examId || !payload) return null;
  const questions = Array.isArray(payload.questions) ? payload.questions : [];
  if (!questions.length) return null; // never overwrite a good package with an empty one
  const store = storage();
  const existing = loadOfflineQuiz(examId);
  const exam = payload.exam || existing?.exam || {};
  const pkg = {
    v: 2,
    exam_id: examId,
    exam_updated_at: exam.updated_at || existing?.exam_updated_at || '',
    not_before: Number(payload.not_before) || toMs(exam.start_at) || Date.now(),
    deadline: toMs(exam.deadline),
    allow_offline_start: !!(payload.allow_offline_start ?? exam.allow_offline_start),
    status: exam.status || existing?.status || 'active',
    package_hash: payload.package_hash || existing?.package_hash || '',
    preloaded: !!(payload.preloaded ?? existing?.preloaded),
    cached_at: Date.now(),
    student: payload.student || existing?.student || null,
    device_id: payload.device_id || existing?.device_id || '',
    exam,
    questions,
  };
  if (!store) return pkg;
  try {
    store.setItem(keyFor(examId), JSON.stringify(pkg));
    // Legacy fallback used by the current Exam.jsx resume path.
    try {
      store.setItem(LEGACY_PREFIX + examId, JSON.stringify({ ...exam, questions }));
    } catch {}
    pruneOfflineQuizzes(examId);
    return pkg;
  } catch (e) {
    // Quota exceeded — prune aggressively and retry once.
    try {
      pruneOfflineQuizzes(examId, 1);
      store.setItem(keyFor(examId), JSON.stringify(pkg));
      return pkg;
    } catch {
      return null;
    }
  }
}

export function loadOfflineQuiz(examId) {
  const store = storage();
  if (!store || !examId) return null;
  try {
    const raw = store.getItem(keyFor(examId));
    if (!raw) return null;
    const pkg = JSON.parse(raw);
    if (!pkg || pkg.v !== 2 || !Array.isArray(pkg.questions) || !pkg.questions.length) return null;
    return pkg;
  } catch {
    return null;
  }
}

export function hasOfflineQuiz(examId) {
  return !!loadOfflineQuiz(examId);
}

export function clearOfflineQuiz(examId) {
  const store = storage();
  if (!store || !examId) return;
  try { store.removeItem(keyFor(examId)); } catch {}
}

// Merge a package into the shape Exam.jsx expects from GET /exams/:id.
export function offlineQuizToExamData(pkg) {
  if (!pkg) return null;
  return { ...(pkg.exam || {}), questions: pkg.questions || [], questions_locked: false };
}

// App-level unlock check. The server still validates started_at on sync/submit.
export function isOfflineWindowOpen(pkg, now = Date.now()) {
  if (!pkg || !pkg.allow_offline_start) return false;
  if (['draft', 'archived', 'closed'].includes(pkg.status)) return false;
  if (pkg.not_before && now < Number(pkg.not_before)) return false;
  if (pkg.deadline && now > Number(pkg.deadline)) return false;
  return true;
}

export function offlineQuizSummary(pkg) {
  if (!pkg) return null;
  return {
    count: pkg.questions?.length || 0,
    cachedAt: pkg.cached_at || 0,
    notBefore: pkg.not_before || 0,
    deadline: pkg.deadline || 0,
    allowOfflineStart: !!pkg.allow_offline_start,
    packageHash: pkg.package_hash || '',
  };
}

export function pruneOfflineQuizzes(keepExamId = '', keep = MAX_PACKAGES) {
  const store = storage();
  if (!store) return;
  try {
    const entries = [];
    for (let i = 0; i < store.length; i++) {
      const k = store.key(i);
      if (!k || !k.startsWith(PREFIX)) continue;
      let cachedAt = 0;
      try {
        const p = JSON.parse(store.getItem(k) || 'null');
        cachedAt = Number(p?.cached_at) || 0;
      } catch {}
      entries.push({ k, cachedAt });
    }
    entries.sort((a, b) => b.cachedAt - a.cachedAt);
    const keepSet = new Set(entries.slice(0, Math.max(1, keep)).map(e => e.k));
    if (keepExamId) keepSet.add(keyFor(keepExamId));
    for (const e of entries) {
      if (!keepSet.has(e.k)) store.removeItem(e.k);
    }
  } catch {}
}
