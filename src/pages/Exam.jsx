import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { hashStr, shuffleWithSeed, matchesAnswer, examTypeLabel } from '../utils';
import { saveOfflineQuiz, loadOfflineQuiz, offlineQuizToExamData, isOfflineWindowOpen, offlineQuizSummary } from '../offline';
import ToastContainer, { toast } from '../components/Toast';
import Timer from '../components/Timer';
import QuestionCard from '../components/QuestionCard';
import PublicLayout from '../components/PublicLayout';
import { Button, Input, ConfirmDialog } from '../components/ui';
import { AlertTriangle, Ban, ClipboardList, Trophy, CheckCircle, Book, XCircle, ArrowLeft, WifiOff, ShieldCheck, Shuffle, Timer as TimerIcon, Calendar, Scan, Clock, Lock } from 'lucide-react';

export default function Exam() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const examId = params.get('id');

  const [examData, setExamData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [loadAttempt, setLoadAttempt] = useState(0);

  // Gate fields
  const [name, setName] = useState('');
  const [section, setSection] = useState('');
  const [date, setDate] = useState(() => new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
  const [studentId, setStudentId] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [gateError, setGateError] = useState('');
  const [lookupState, setLookupState] = useState('idle'); // idle | loading | found | notfound
  const [rosterInfo, setRosterInfo] = useState(null);

  // Exam state
  const [started, setStarted] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitReason, setSubmitReason] = useState('manual');
  const [seed, setSeed] = useState(0);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [answeredSet, setAnsweredSet] = useState(new Set());
  const [tabSwitches, setTabSwitches] = useState(0);
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [results, setResults] = useState(() => {
    try {
      const cached = localStorage.getItem('exam_results_' + new URLSearchParams(window.location.search).get('id'));
      return cached ? JSON.parse(cached) : null;
    } catch { return null; }
  });
  const perQMap = useMemo(() => {
    const m = {};
    (results?.perQuestion || []).forEach(p => { m[p.question_id] = p; });
    return m;
  }, [results]);
  // Correct answers are withheld until the exam can no longer be taken. The
  // server enforces this; these flags keep the UI honest and unlock later.
  const showAnswersPref = !!examData && Number(examData.show_answers) !== 0;
  const answersRevealed = showAnswersPref && (
    examData?.answers_revealed === true ||
    results?.answers_revealed === true ||
    ['closed', 'archived'].includes(examData?.status) ||
    !!(examData?.deadline && new Date(examData.deadline).getTime() <= Date.now())
  );
  const [showConfirm, setShowConfirm] = useState(false);
  const [reviewMode, setReviewMode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [offline, setOffline] = useState(!navigator.onLine);
  const [pendingSubmit, setPendingSubmit] = useState(null);
  const [pendingRetryTick, setPendingRetryTick] = useState(0);
  const [pendingRetryExhausted, setPendingRetryExhausted] = useState(false);
  const [syncRetryTick, setSyncRetryTick] = useState(0);
  const [serverRetry, setServerRetry] = useState(false);
  // Preloaded offline quiz (docs/OFFLINE_QUIZ.md)
  const [offlineStart, setOfflineStart] = useState(false);
  const [offlineSynced, setOfflineSynced] = useState(false);
  const [preloadState, setPreloadState] = useState('idle'); // idle | loading | ready | error
  const [preloadError, setPreloadError] = useState('');
  const [preloadInfo, setPreloadInfo] = useState(() => offlineQuizSummary(loadOfflineQuiz(examId)));
  const [nowTick, setNowTick] = useState(() => Date.now());
  const [qPage, setQPage] = useState(0);
  const QUESTIONS_PER_PAGE = 15;
  useEffect(() => { setQPage(0); }, [examId]);

  const cooldownRef = useRef(false);
  const resizeCooldownRef = useRef(false);
  const resizeTimerRef = useRef(null);
  const startTimeRef = useRef(null);
  const handleSubmitRef = useRef(null);
  const submittingRef = useRef(false);
  const fsWasActiveRef = useRef(false);
  const fsSupportedRef = useRef(typeof document !== 'undefined' && !!document.fullscreenEnabled);
  const [fsBlocked, setFsBlocked] = useState(false);
  const [sessionId, setSessionId] = useState(() => localStorage.getItem('exam_session_' + examId) || '');
  const sessionIdRef = useRef(sessionId);
  const [kicked, setKicked] = useState(false);
  const kickedRef = useRef(false);
  const deviceId = useMemo(() => {
    let d = localStorage.getItem('device_id');
    if (!d) { d = 'dev-' + Math.random().toString(36).slice(2, 14); localStorage.setItem('device_id', d); }
    return d;
  }, []);
  // Keep a ref to latest answers so heartbeat/kick auto-submit doesn't use a stale closure
  const answersRef = useRef(answers);
  useEffect(() => { answersRef.current = answers; }, [answers]);
  const answeredSetRef = useRef(answeredSet);
  useEffect(() => { answeredSetRef.current = answeredSet; }, [answeredSet]);
  const questionsRef = useRef(questions);
  useEffect(() => { questionsRef.current = questions; }, [questions]);
  const lastPersistRef = useRef(0);
  const offlinePkgRef = useRef(loadOfflineQuiz(examId));
  const offlineAttemptIdRef = useRef('');
  const offlineStartRef = useRef(false);
  const offlineSyncedRef = useRef(false);
  const preloadInflightRef = useRef(false);
  const preloadPromiseRef = useRef(null);
  const preloadRetryRef = useRef(0);
  const reconnectGraceUntilRef = useRef(0);
  const pendingAttemptsRef = useRef(0);
  const syncAttemptsRef = useRef(0);
  const reviewFetchedRef = useRef('');
  const offlineStateFields = () => ({
    offlineStart: offlineStartRef.current,
    offlineAttemptId: offlineAttemptIdRef.current,
    offlineSynced: offlineSyncedRef.current,
    preloadedPackageHash: offlinePkgRef.current?.package_hash || '',
  });

  const enterFullscreen = useCallback(() => {
    if (!fsSupportedRef.current) return;
    const el = document.documentElement;
    const req = el.requestFullscreen || el.webkitRequestFullscreen;
    if (req) {
      try {
        const p = req.call(el);
        if (p && p.catch) p.catch(() => {});
      } catch {}
    }
  }, []);

  useEffect(() => {
    if (!examId) { setLoading(false); setError('No exam ID provided'); return; }
    setLoading(true);
    setError('');
    localStorage.setItem('exam_id', examId);
    api.getExam(examId).then(data => {
      setExamData(data);
      setTotalSeconds(data.time_limit * 60);
      setLoading(false);
      try { localStorage.setItem('cached_exam_' + examId, JSON.stringify(data)); } catch {}
      // Only cache an unlocked, non-empty question set. A locked fetch (scheduled,
      // class-linked before verification, wrong code) must never wipe a good preload.
      if (!data.questions_locked && data.questions?.length) {
        const pkg = saveOfflineQuiz(examId, {
          exam: data,
          questions: data.questions,
          not_before: data.start_at ? new Date(data.start_at).getTime() : Date.now(),
          package_hash: `${data.updated_at || ''}:${data.questions.length}:${data.questions[data.questions.length - 1]?.id || ''}`,
          student: { id: studentId.trim().toUpperCase(), name: name.trim(), section: section.trim() },
          device_id: deviceId,
        });
        if (pkg) {
          offlinePkgRef.current = pkg;
          setPreloadInfo(offlineQuizSummary(pkg));
          // A plain GET cache is not server-proof; only a real /preload (or a
          // prior one preserved) marks the package ready for offline start.
          if (pkg.preloaded) setPreloadState('ready');
        }
      } else if (offlinePkgRef.current) {
        setPreloadInfo(offlineQuizSummary(offlinePkgRef.current));
      }
    }).catch((e) => {
      // If the code isn't an exam, it might be a class code → send the student to enrollment.
      if (e.status === 404) {
        api.lookupClassCode(examId).then(() => {
          navigate('/enroll?code=' + encodeURIComponent(examId));
        }).catch(() => {
          setError('Exam not found. Double-check the ID, or ask your instructor.');
          setLoading(false);
        });
        return;
      }
      // Prefer the offline quiz package (full questions + window metadata).
      const pkg = loadOfflineQuiz(examId);
      if (pkg) {
        const data = offlineQuizToExamData(pkg);
        offlinePkgRef.current = pkg;
        setExamData(data);
        setTotalSeconds((data.time_limit || 60) * 60);
        setPreloadInfo(offlineQuizSummary(pkg));
        if (pkg.preloaded) setPreloadState('ready');
        setLoading(false);
        setOffline(true);
        return;
      }
      const cached = localStorage.getItem('cached_exam_' + examId);
      if (cached) {
        try {
          const data = JSON.parse(cached);
          setExamData(data);
          setTotalSeconds(data.time_limit * 60);
          setLoading(false);
          setOffline(true);
        } catch {
          setError('No internet — cached exam data is corrupted.');
          setLoading(false);
        }
      } else {
        setError('No internet connection and no cached exam data available.');
        setLoading(false);
      }
    });
  }, [examId, loadAttempt]);

  // Restore saved state
  useEffect(() => {
    if (!examData) return;
    try {
      const saved = JSON.parse(localStorage.getItem('exam_state_' + examId));
      const storedPkg = loadOfflineQuiz(examId);
      if (storedPkg) {
        offlinePkgRef.current = storedPkg;
        setPreloadInfo(offlineQuizSummary(storedPkg));
        if (storedPkg.preloaded) setPreloadState(prev => prev === 'idle' ? 'ready' : prev);
      }
      if (saved && saved.name) {
        setName(saved.name);
        setSection(saved.section || '');
        if (saved.studentId) setStudentId(saved.studentId);
        if (saved.sessionId) { sessionIdRef.current = saved.sessionId; setSessionId(saved.sessionId); }
        if (saved.accessCode) setAccessCode(saved.accessCode);
        if (saved.answers) setAnswers(saved.answers);
        if (saved.answered) setAnsweredSet(new Set(saved.answered));
        if (saved.tabSwitches) setTabSwitches(saved.tabSwitches);
        if (saved.totalSeconds) setTotalSeconds(saved.totalSeconds);
        if (saved.startedAt) startTimeRef.current = saved.startedAt;
        if (saved.submitReason) setSubmitReason(saved.submitReason);
        if (saved.offlineStart) {
          setOfflineStart(true);
          offlineStartRef.current = true;
          offlineSyncedRef.current = !!saved.offlineSynced;
          setOfflineSynced(!!saved.offlineSynced);
          offlineAttemptIdRef.current = saved.offlineAttemptId || '';
        }
        // Rebuild seed + shuffled questions (client questions were stripped of answers but still needed for display)
        const buildFrom = (qsList) => {
          try {
            if (!qsList?.length) return false;
            const s = hashStr((saved.name || '').toLowerCase().replace(/\s/g, '') + (saved.section || '').toLowerCase() + examId);
            setSeed(s);
            setQuestions(shuffleWithSeed(qsList, s));
            return true;
          } catch { return false; }
        };
        if (saved.submitted) {
          setSubmitted(true);
          setStarted(true);
          if (!(examData.questions || []).length) {
            const pkg = offlinePkgRef.current || loadOfflineQuiz(examId);
            buildFrom(pkg?.questions || []);
          }
        } else if (saved.startedAt && saved.studentId) {
          // Mid-exam back-swipe / reload — auto-resume without re-scanning
          setStarted(true);
          // Prefer questions already in memory, then the preloaded offline package,
          // then a proof-based refetch (code + student_id) when online.
          const pkg = offlinePkgRef.current || loadOfflineQuiz(examId);
          if (!buildFrom(examData.questions || []) && !buildFrom(pkg?.questions || [])) {
            api.getExam(examId, (saved.accessCode || '').trim(), (saved.studentId || '').trim().toUpperCase())
              .then(refreshed => {
                if (refreshed.questions?.length) {
                  setExamData(refreshed);
                  buildFrom(refreshed.questions);
                }
              }).catch(() => {});
          }
        }
      }
    } catch (e) {}
  }, [examData]);

  // Online/offline detection
  useEffect(() => {
    const onOnline = () => {
      preloadRetryRef.current = 0;
      syncAttemptsRef.current = 0;
      reconnectGraceUntilRef.current = Date.now() + 4000;
      setOffline(false);
    };
    const onOffline = () => setOffline(true);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => { window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline); };
  }, []);

  // Retry pending submission on mount / when coming back online
  useEffect(() => {
    const stored = localStorage.getItem('pending_submission_' + examId);
    if (stored) {
      try {
        setPendingSubmit(JSON.parse(stored));
      } catch {}
    }
  }, [examId]);

  useEffect(() => {
    if (!pendingSubmit || offline) return;
    let cancelled = false;
    let timer = null;
    const retry = async () => {
      if (cancelled) return;
      try {
        const res = await api.submitScore(pendingSubmit);
        // Server is authoritative — update local score if it recomputed differently
        if (res && typeof res.score === 'number') {
          let serverPartScores = null;
          if (res.perQuestion) {
            const qsForParts = questionsRef.current?.length ? questionsRef.current : questions;
            const partMap = new Map((qsForParts || []).map(q => [q.id, q.part]));
            if (partMap.size) {
              serverPartScores = {};
              res.perQuestion.forEach(p => {
                const part = partMap.get(p.question_id);
                if (part === undefined) return;
                const add = typeof p.score === 'number' ? p.score : (p.correct ? 1 : 0);
                if (add) serverPartScores[part] = (serverPartScores[part] || 0) + add;
              });
            }
          }
          setResults(prev => {
            if (!prev) return prev;
            const next = { ...prev, total: res.score, totalQ: res.total ?? prev.totalQ, answers_revealed: !!res.answers_revealed };
            if (res.perQuestion) next.perQuestion = res.perQuestion;
            if (serverPartScores) next.partScores = serverPartScores;
            try { localStorage.setItem('exam_results_' + examId, JSON.stringify(next)); } catch {}
            return next;
          });
        }
        localStorage.removeItem('pending_submission_' + examId);
        // Keep a backup of the now-confirmed submission
        try { localStorage.setItem('exam_backup_' + examId, JSON.stringify({ answers: pendingSubmit.answers, at: Date.now() })); } catch {}
        pendingAttemptsRef.current = 0;
        setPendingRetryExhausted(false);
        setPendingSubmit(null);
        toast('Submission saved!', 'Your score has been recorded.');
      } catch (e) {
        // Server guard for empty overwrite → previous non-zero preserved, clear stale pending
        if (e.status === 400 && e.message && e.message.toLowerCase().includes('no answers')) {
          localStorage.removeItem('pending_submission_' + examId);
          setPendingSubmit(null);
          toast('Previous score preserved', e.message);
          return;
        }
        // Authoritative rejection (offline start disabled/window/proof). Keep the
        // local draft but stop retrying a payload the server will never accept.
        if (e.status === 403) {
          localStorage.removeItem('pending_submission_' + examId);
          setPendingSubmit(null);
          setPendingRetryExhausted(false);
          toast('Submission rejected', e.message || 'Your offline attempt could not be accepted. Ask your instructor.');
          return;
        }
        // Already recorded / retry cap — stop resending the same payload.
        if (e.status === 409) {
          localStorage.removeItem('pending_submission_' + examId);
          setPendingSubmit(null);
          setPendingRetryExhausted(false);
          toast('Submission recorded', e.message || 'This attempt was already submitted.');
          return;
        }
        const attempts = pendingAttemptsRef.current + 1;
        pendingAttemptsRef.current = attempts;
        if (attempts >= 5) {
          setPendingRetryExhausted(true);
          toast('Sync paused', 'Still cannot reach the server. Tap Retry now once your connection is back.');
          return;
        }
        const delay = Math.min(16000, 1000 * Math.pow(2, attempts - 1)) + Math.floor(Math.random() * 400);
        timer = setTimeout(() => { if (!cancelled) setPendingRetryTick(t => t + 1); }, delay);
      }
    };
    retry();
    const backOnline = () => {
      pendingAttemptsRef.current = 0;
      setPendingRetryExhausted(false);
      if (timer) clearTimeout(timer);
      retry();
    };
    window.addEventListener('online', backOnline);
    window.addEventListener('focus', backOnline);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      window.removeEventListener('online', backOnline);
      window.removeEventListener('focus', backOnline);
    };
  }, [pendingSubmit, offline, examId, pendingRetryTick]);

  // When the student has already submitted, check with the server whether a
  // retry is currently allowed (auto-submitted, or granted by the proctor).
  // PWA-friendly: polls + checks on focus/visibility so "Allow Retry" appears without hard refresh.
  useEffect(() => {
    if (!submitted || !name || !studentId) return;
    let cancelled = false;
    const check = () => {
      if (cancelled || document.hidden) return;
      api.getRetryStatus(examId, studentId.trim().toUpperCase(), name.trim(), section.trim())
        .then(r => { if (!cancelled) setServerRetry(!!r.allowed); })
        .catch(() => { if (!cancelled) setServerRetry(false); });
    };
    check();
    const t = setInterval(check, 15000);
    const onVis = () => { if (!document.hidden) check(); };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('focus', check);
    return () => { cancelled = true; clearInterval(t); document.removeEventListener('visibilitychange', onVis); window.removeEventListener('focus', check); };
  }, [submitted, examId, name, section, studentId]);

  const checkRetryNow = useCallback(() => {
    if (!examId || !studentId) return;
    api.getRetryStatus(examId, studentId.trim().toUpperCase(), name.trim(), section.trim())
      .then(r => {
        setServerRetry(!!r.allowed);
        if (r.capped) toast('Retry limit reached', `You have used ${r.retry_count}/${2} retries. Ask your proctor to reset.`);
        else if (r.allowed) toast('Retake granted', `Your instructor has allowed you to retry${r.remaining !== undefined ? ` — ${r.remaining} left` : ''}. Tap Retry Exam.`);
        else toast('Not yet allowed', 'Your instructor has not granted a retake. Please wait.');
      })
      .catch(() => toast('Cannot check', 'Could not reach the server. Check your connection.'));
  }, [examId, studentId, name, section]);

  // Repair old cached results that have perQuestion but no partScores (bug: local grading had no answer keys)
  useEffect(() => {
    if (!results?.perQuestion || results.partScores) return;
    if (!questions.length) return;
    const partMap = new Map(questions.map(q => [q.id, q.part]));
    if (!partMap.size) return;
    const repaired = {};
    results.perQuestion.forEach(p => {
      const part = partMap.get(p.question_id);
      if (part === undefined) return;
      const add = typeof p.score === 'number' ? p.score : (p.correct ? 1 : 0);
      if (add) repaired[part] = (repaired[part] || 0) + add;
    });
    const next = { ...results, partScores: repaired };
    setResults(next);
    try { localStorage.setItem('exam_results_' + examId, JSON.stringify(next)); } catch {}
  }, [results, questions, examId]);

  // Once the exam is no longer live, pull the answer keys for review. Early
  // submissions intentionally cache no keys, so this fills them in on revisit.
  useEffect(() => {
    if (!submitted || !answersRevealed || !examId) return;
    const sid = studentId.trim().toUpperCase();
    if (!name.trim() || !section.trim()) return;
    const key = examId + ':' + (sid || name.trim().toLowerCase() + '|' + section.trim().toLowerCase());
    if (reviewFetchedRef.current === key) return;
    reviewFetchedRef.current = key;
    api.getMyReview(examId, { studentId: sid, studentName: name.trim(), studentSection: section.trim() })
      .then(data => {
        if (!data?.perQuestion?.length) return;
        setResults(prev => {
          const base = prev || { total: data.score, totalQ: data.total, perQuestion: data.perQuestion, timeTaken: 0 };
          const next = { ...base, perQuestion: data.perQuestion, answers_revealed: true };
          try { localStorage.setItem('exam_results_' + examId, JSON.stringify(next)); } catch {}
          return next;
        });
      })
      .catch(() => { reviewFetchedRef.current = ''; });
  }, [submitted, answersRevealed, examId, studentId, name, section]);

  // Keep checking for the exam to close so the review unlocks without a reload.
  useEffect(() => {
    if (!submitted || !examId || !showAnswersPref || answersRevealed) return;
    let cancelled = false;
    const refresh = () => {
      if (cancelled || document.hidden) return;
      api.getExam(examId).then(d => {
        if (cancelled) return;
        setExamData(prev => prev ? { ...prev, status: d.status ?? prev.status, answers_revealed: d.answers_revealed === true } : prev);
      }).catch(() => {});
    };
    const t = setInterval(refresh, 30000);
    const onVis = () => { if (!document.hidden) refresh(); };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('focus', refresh);
    return () => { cancelled = true; clearInterval(t); document.removeEventListener('visibilitychange', onVis); window.removeEventListener('focus', refresh); };
  }, [submitted, examId, showAnswersPref, answersRevealed]);

  // Heartbeat: keeps the live session alive and detects admin kicks.
  useEffect(() => {
    if (!started || submitted || !sessionIdRef.current || !examId) return;
    // Offline-started attempts use a local pseudo-session until /session/sync registers it.
    if (offlineStart && !offlineSynced) return;
    const beat = async () => {
      if (kickedRef.current) return;
      try {
        const res = await api.heartbeat(examId, { session_id: sessionIdRef.current, tab_switches: tabSwitches });
        if (res.kicked && !kickedRef.current) {
          kickedRef.current = true;
          setKicked(true);
          // Don't auto-submit an empty payload — it would be rejected by the server
          // guard and could overwrite a prior non-zero score. Preserve previous.
          const curAns = answersRef.current || {};
          const curCount = Object.keys(curAns).filter(k => String(curAns[k] ?? '').trim() !== '').length;
          if (curCount === 0) {
            toast('Session ended by proctor', 'Your previous submission is preserved — no new answers to submit.');
            return;
          }
          toast('Session ended by proctor', 'The exam was closed by the administrator. Your answers were submitted.');
          setTimeout(() => handleSubmitRef.current('kick'), 800);
        }
      } catch (e) {
        if (e && (e.status === 401 || e.status === 403)) {
          // Session expired or invalid — treat as kick to preserve work
          if (!kickedRef.current) {
            kickedRef.current = true;
            setKicked(true);
            toast('Session expired', 'Your session is no longer valid. Please re-enter the exam.');
          }
        }
      }
    };
    beat();
    const t = setInterval(beat, 15000);
    return () => clearInterval(t);
  }, [started, submitted, examId, tabSwitches, offline, offlineStart, offlineSynced]);

  // Tab switch & split-screen detection
  useEffect(() => {
    if (!started || submitted) return;
    const trigger = (source) => {
      if (cooldownRef.current) return;
      if (Date.now() < reconnectGraceUntilRef.current) return;
      cooldownRef.current = true;
      setTimeout(() => { cooldownRef.current = false; }, 1000);
      setTabSwitches(prev => {
        const next = prev + 1;
        if (next >= 3) {
          toast('3rd Violation — Exam Auto-Submitted', 'You switched away too many times.');
          // Flush latest draft to localStorage before auto-submit so handleSubmit fallback can recover it.
          try {
            localStorage.setItem('exam_state_' + examId, JSON.stringify({
              name, section, studentId: studentId.trim().toUpperCase(), sessionId: sessionIdRef.current, accessCode: accessCode.trim(), answers: answersRef.current, answered: Array.from(answeredSetRef.current || []),
              tabSwitches: next, totalSeconds, startedAt: startTimeRef.current, submitted: false, submitReason: 'tab',
              ...offlineStateFields(),
            }));
          } catch {}
          setTimeout(() => handleSubmitRef.current('tab'), 1500);
        } else {
          toast('You ' + source + '!', 'Violation #' + next + ' of 3 — Next will auto-submit.');
        }
        return next;
      });
    };
    const ua = navigator.userAgent || '';
    const isMobile = /Android|iPhone|iPad|iPod|Mobile|Windows Phone/i.test(ua) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    let blurTimer = null;
    // iOS/mobile Safari fires blur for system UI, rotation, and the on-screen
    // keyboard. Ignore those; genuine app switches still fire visibilitychange.
    let orientationUntil = 0;
    // On iPhone a tilt/rotation (or system UI such as the keyboard/URL bar) can
    // surface a transient visibilitychange with document.hidden === true even
    // though the student never left the tab. Track when we went hidden and only
    // count a violation once the page has stayed hidden long enough and no
    // orientation change is in progress.
    let hiddenAt = 0;
    let visTimer = null;
    const markOrientation = () => { orientationUntil = Date.now() + 2500; };
    const onVis = () => {
      if (document.hidden) {
        if (visTimer) { clearTimeout(visTimer); visTimer = null; }
        if (isMobile) hiddenAt = Date.now();
        else trigger('left the exam tab');
        return;
      }
      if (!isMobile || !hiddenAt) return;
      const away = Date.now() - hiddenAt;
      hiddenAt = 0;
      // Ignore the brief hidden→visible flicker that iOS produces for a tilt,
      // rotation, or system UI. Only a sustained absence counts; then wait a
      // beat so a trailing orientationchange can arm the grace window first.
      if (away < 1200) return;
      if (visTimer) clearTimeout(visTimer);
      visTimer = setTimeout(() => {
        visTimer = null;
        if (!document.hidden && Date.now() >= orientationUntil) trigger('left the exam tab');
      }, 400);
    };
    const onBlur = () => {
      if (isMobile || blurTimer) return;
      blurTimer = setTimeout(() => {
        blurTimer = null;
        if (!document.hasFocus()) trigger('switched away from the exam window');
      }, 1200);
    };
    const onFocus = () => {
      if (blurTimer) { clearTimeout(blurTimer); blurTimer = null; }
    };
    const onOrientation = () => { markOrientation(); };
    const onFSChange = () => {
      if (Date.now() < orientationUntil) return;
      if (document.fullscreenElement) {
        fsWasActiveRef.current = true;
        setFsBlocked(false);
      } else if (fsSupportedRef.current && fsWasActiveRef.current) {
        setFsBlocked(true);
        trigger('exited fullscreen mode');
      }
    };
    const onResize = () => {
      if (Date.now() < orientationUntil || resizeCooldownRef.current) return;
      const ratio = window.outerWidth / window.screen.availWidth;
      if (window.screen.availWidth >= 1024 && ratio < 0.55) {
        resizeCooldownRef.current = true;
        setTimeout(() => { resizeCooldownRef.current = false; }, 5000);
        trigger('resized the window (possible split-screen)');
      }
    };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('blur', onBlur);
    window.addEventListener('focus', onFocus);
    window.addEventListener('orientationchange', onOrientation);
    // Modern iOS/Android expose orientation via screen.orientation, while
    // orientationchange is deprecated — listen to both so the grace window is
    // armed no matter which one fires.
    const orientationApi = window.screen && window.screen.orientation;
    if (orientationApi && orientationApi.addEventListener) {
      orientationApi.addEventListener('change', onOrientation);
    }
    window.addEventListener('resize', onResize);
    document.addEventListener('fullscreenchange', onFSChange);
    return () => {
      if (blurTimer) clearTimeout(blurTimer);
      if (visTimer) clearTimeout(visTimer);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('orientationchange', onOrientation);
      if (orientationApi && orientationApi.removeEventListener) {
        orientationApi.removeEventListener('change', onOrientation);
      }
      window.removeEventListener('resize', onResize);
      document.removeEventListener('fullscreenchange', onFSChange);
    };
  }, [started, submitted]);

  // Disable right-click, copy/paste shortcuts, devtools during exam
  useEffect(() => {
    if (!started || submitted) return;
    document.body.classList.add('exam-active');

    const onContextMenu = (e) => { e.preventDefault(); };
    const onKeyDown = (e) => {
      const ctrl = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();
      if (ctrl && ['c', 'v', 'x', 'a', 'u', 's', 'p'].includes(key)) {
        e.preventDefault();
      }
      if (e.key === 'F12' || (ctrl && e.shiftKey && ['i', 'j'].includes(key))) {
        e.preventDefault();
      }
    };
    const onCopy = (e) => e.preventDefault();
    const onCut = (e) => e.preventDefault();
    const onPaste = (e) => e.preventDefault();
    const onSelectStart = (e) => {
      if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault();
      }
    };
    const onDragStart = (e) => e.preventDefault();

    document.addEventListener('contextmenu', onContextMenu);
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('copy', onCopy);
    document.addEventListener('cut', onCut);
    document.addEventListener('paste', onPaste);
    document.addEventListener('selectstart', onSelectStart, true);
    document.addEventListener('dragstart', onDragStart);

    return () => {
      document.body.classList.remove('exam-active');
      document.removeEventListener('contextmenu', onContextMenu);
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('copy', onCopy);
      document.removeEventListener('cut', onCut);
      document.removeEventListener('paste', onPaste);
      document.removeEventListener('selectstart', onSelectStart, true);
      document.removeEventListener('dragstart', onDragStart);
    };
  }, [started, submitted]);

  const lookupRoster = async () => {
    if (!examData?.class_id) return;
    if (!studentId.trim()) { setLookupState('notfound'); setRosterInfo(null); return; }
    setLookupState('loading');
    try {
      const res = await api.lookupStudent(examId, studentId.trim().toUpperCase());
      setRosterInfo(res);
      setName(res.student_name);
      setSection(res.student_section || '');
      setLookupState('found');
      setGateError('');
      // Verified in the class roster — preload the quiz for offline use.
      setPreloadState('idle');
      preloadQuiz({
        studentId: studentId.trim().toUpperCase(),
        name: res.student_name,
        section: res.student_section || '',
        lookupState: 'found',
      }).catch(() => {});
    } catch (e) {
      setLookupState('notfound');
      setRosterInfo(null);
      setGateError(e.message || 'Student not found in the class roster.');
    }
  };

  // Download the quiz package for offline use. Verified students can do this
  // before the scheduled open time; questions stay hidden until start.
  const preloadQuiz = useCallback((opts = {}) => {
    if (!examId || offline) return Promise.resolve(null);
    if (preloadInflightRef.current) return preloadPromiseRef.current || Promise.resolve(null);
    const openNow = !examData?.start_at || new Date(examData.start_at).getTime() <= Date.now();
    const earlyOk = !!examData?.allow_offline_start && !!(examData?.class_id || examData?.has_access_code);
    if (!openNow && !earlyOk) return Promise.resolve(null);
    const sid = String(opts.studentId ?? studentId).trim().toUpperCase();
    if (!sid) return Promise.resolve(null);
    const cls = opts.classId ?? examData?.class_id;
    const verified = (opts.lookupState ?? lookupState) === 'found';
    if (cls && !verified) return Promise.resolve(null);
    const needCode = !!(opts.hasAccessCode ?? examData?.has_access_code);
    const code = String(opts.accessCode ?? accessCode).trim();
    if (needCode && !code) return Promise.resolve(null);
    const nm = String(opts.name ?? name).trim();
    const sec = String(opts.section ?? section).trim();
    if (!cls && (!nm || !sec)) return Promise.resolve(null);

    preloadInflightRef.current = true;
    setPreloadState('loading');
    setPreloadError('');
    const job = (async () => {
      try {
        const res = await api.preloadExam(examId, { code, studentId: sid, studentName: nm, studentSection: sec, deviceId });
        const pkg = saveOfflineQuiz(examId, {
          exam: res.exam,
          questions: res.questions,
          not_before: res.not_before,
          package_hash: res.package_hash,
          student: res.student,
          device_id: deviceId,
          preloaded: true,
        });
        if (!pkg) {
          setPreloadState('error');
          setPreloadError('Could not save the offline copy on this device.');
          return null;
        }
        offlinePkgRef.current = pkg;
        setPreloadInfo(offlineQuizSummary(pkg));
        setPreloadState('ready');
        const count = res.questions?.length || pkg.questions?.length || 0;
        toast('All questions preloaded', `${count} item${count === 1 ? '' : 's'} ready on this device. You can start the exam.`);
        // Refresh non-question metadata only — never mount questions before start.
        setExamData(prev => prev ? ({
          ...prev,
          allow_offline_start: res.exam?.allow_offline_start ?? prev.allow_offline_start,
          start_at: res.exam?.start_at ?? prev.start_at,
          deadline: res.exam?.deadline ?? prev.deadline,
          status: res.exam?.status ?? prev.status,
        }) : prev);
        return pkg;
      } catch (e) {
        setPreloadState('error');
        setPreloadError(e.message || 'Could not preload this quiz.');
        return null;
      } finally {
        preloadInflightRef.current = false;
        preloadPromiseRef.current = null;
      }
    })();
    preloadPromiseRef.current = job;
    return job;
  }, [examId, offline, studentId, name, section, accessCode, lookupState, examData, deviceId]);

  // Auto-preload once the student has supplied the required proof.
  useEffect(() => {
    if (!examData || offline || started || submitted) return;
    const openNow = !examData.start_at || new Date(examData.start_at).getTime() <= Date.now();
    const earlyOk = !!examData.allow_offline_start && !!(examData.class_id || examData.has_access_code);
    if (!openNow && !earlyOk) return;
    if (preloadState !== 'idle' && preloadState !== 'error') return;
    const sid = studentId.trim().toUpperCase();
    if (!sid) return;
    if (examData.class_id && lookupState !== 'found') return;
    if (!examData.class_id && (!name.trim() || !section.trim())) return;
    if (examData.has_access_code && !accessCode.trim()) return;
    if (preloadState === 'idle') preloadRetryRef.current = 0;
    if (preloadState === 'error' && preloadRetryRef.current >= 4) return;
    const delay = preloadState === 'error'
      ? Math.min(20000, 3000 * Math.pow(2, preloadRetryRef.current)) + Math.floor(Math.random() * 500)
      : 700;
    if (preloadState === 'error') preloadRetryRef.current += 1;
    const t = setTimeout(() => { preloadQuiz().catch(() => {}); }, delay);
    return () => clearTimeout(t);
  }, [examData, offline, started, submitted, preloadState, studentId, lookupState, name, section, accessCode, preloadQuiz]);

  // Register an offline-started session once the connection returns.
  useEffect(() => {
    if (!started || submitted || !offlineStart || offline || offlineSynced) return;
    const attemptId = offlineAttemptIdRef.current;
    if (!attemptId) return;
    let cancelled = false;
    let timer = null;
    const sync = async () => {
      if (cancelled) return;
      try {
        const res = await api.syncOfflineStart(examId, {
          student_id: studentId.trim().toUpperCase(),
          student_name: name.trim(),
          student_section: section.trim(),
          device_id: deviceId,
          offline_attempt_id: attemptId,
          started_at: startTimeRef.current || 0,
          package_hash: offlinePkgRef.current?.package_hash || '',
        });
        if (cancelled) return;
        syncAttemptsRef.current = 0;
        offlineSyncedRef.current = true;
        setOfflineSynced(true);
        if (res?.session_id) {
          sessionIdRef.current = res.session_id;
          setSessionId(res.session_id);
          try { localStorage.setItem('exam_session_' + examId, res.session_id); } catch {}
        }
        if (res?.student_name) setName(res.student_name);
        if (res?.student_section) setSection(res.student_section);
        try {
          const raw = localStorage.getItem('exam_state_' + examId);
          if (raw) {
            const saved = JSON.parse(raw);
            localStorage.setItem('exam_state_' + examId, JSON.stringify({ ...saved, offlineSynced: true, sessionId: sessionIdRef.current }));
          }
        } catch {}
        if (res?.flagged) toast('Synced — flagged for proctor', 'You started offline. Your work is saved and will be reviewed.');
        else toast('Back online', 'Your offline session was synced.');
      } catch (e) {
        if (cancelled) return;
        // Authoritative rejection (window/proof/disabled) — retrying will never help.
        if (e && e.status === 403) {
          toast('Offline session not accepted', e.message || 'Ask your proctor to verify your attempt.');
          return;
        }
        syncAttemptsRef.current += 1;
        if (syncAttemptsRef.current >= 6) {
          toast('Sync paused', 'Your offline session will retry when you reconnect or reopen the app.');
          return;
        }
        const delay = Math.min(16000, 1000 * Math.pow(2, syncAttemptsRef.current - 1)) + Math.floor(Math.random() * 400);
        timer = setTimeout(() => { if (!cancelled) setSyncRetryTick(t => t + 1); }, delay);
      }
    };
    sync();
    const onBackOnline = () => {
      syncAttemptsRef.current = 0;
      if (timer) clearTimeout(timer);
      sync();
    };
    window.addEventListener('online', onBackOnline);
    window.addEventListener('focus', onBackOnline);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      window.removeEventListener('online', onBackOnline);
      window.removeEventListener('focus', onBackOnline);
    };
  }, [started, submitted, offlineStart, offline, offlineSynced, examId, studentId, name, section, deviceId, syncRetryTick]);

  // Tick the gate clock so a scheduled quiz unlocks without a page refresh.
  useEffect(() => {
    if (!examData || started || submitted) return;
    const t = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(t);
  }, [examData, started, submitted]);

  const startExam = async () => {
    // Deadline is enforced server-side with retry grace (canRetryAfterClose).
    // Don't hard-block here — let POST /api/exams/:id/session/start decide so
    // students you flagged "Allow Retry" can still start after the deadline.
    // We only show a soft warning if the deadline passed and they have no retry.
    if (examData?.deadline && new Date(examData.deadline).getTime() <= Date.now() && !serverRetry) {
      // still allow the attempt — server will return the authoritative error
      // but we keep the gate message for fresh students without retry
    }
    if (!studentId.trim()) {
      setGateError('Please enter your Student ID.');
      return;
    }
    if (!examData?.class_id && (!name.trim() || !section.trim())) {
      setGateError('Please fill in your name and section.');
      return;
    }

    if (!offline && preloadState !== 'ready') {
      await preloadQuiz().catch(() => null);
    }

    // ── Offline start (docs/OFFLINE_QUIZ.md) ──
    if (offline) {
      const pkg = offlinePkgRef.current || loadOfflineQuiz(examId);
      if (!pkg) {
        setGateError('Connect to the internet to start — there is no preloaded copy on this device.');
        return;
      }
      if (!pkg.preloaded) {
        setGateError('Connect once to verify your details and save the offline copy before starting.');
        return;
      }
      if (!pkg.allow_offline_start) {
        setGateError('Offline start is disabled for this quiz. Connect to start — your preloaded copy is ready.');
        return;
      }
      const pkgStudent = pkg.student || {};
      const offName = (name.trim() || pkgStudent.name || '').trim();
      const offSection = (section.trim() || pkgStudent.section || '').trim();
      const offId = (studentId.trim() || pkgStudent.id || '').toUpperCase();
      if (!offId || !offName || !offSection) {
        setGateError('Please enter your details to start offline.');
        return;
      }
      if (nowTick < Number(pkg.not_before || 0)) {
        setGateError('This quiz has not opened yet. It unlocks ' + new Date(pkg.not_before).toLocaleString() + '.');
        return;
      }
      if (pkg.deadline && nowTick > Number(pkg.deadline)) {
        setGateError('This quiz has already closed.');
        return;
      }
      if (!isOfflineWindowOpen(pkg, nowTick)) {
        setGateError('Offline start is not available right now. Reconnect to continue.');
        return;
      }
      const oid = 'off-' + (typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : (Date.now() + '-' + Math.random().toString(36).slice(2)));
      offlineAttemptIdRef.current = oid;
      offlineStartRef.current = true;
      offlineSyncedRef.current = false;
      setOfflineStart(true);
      setOfflineSynced(false);
      offlinePkgRef.current = pkg;
      setPreloadInfo(offlineQuizSummary(pkg));
      if (!name) setName(offName);
      if (!section) setSection(offSection);
      if (!studentId) setStudentId(offId);
      sessionIdRef.current = oid;
      setSessionId(oid);
      setGateError('');
      const offSeconds = (pkg.exam?.time_limit || examData.time_limit || 60) * 60;
      const s = hashStr(offName.toLowerCase().replace(/\s/g, '') + offSection.toLowerCase() + examId);
      setSeed(s);
      setQuestions(shuffleWithSeed(pkg.questions, s));
      startTimeRef.current = Date.now();
      setSubmitted(false);
      setResults(null);
      setReviewMode(false);
      setKicked(false);
      kickedRef.current = false;
      setTotalSeconds(offSeconds);
      setStarted(true);
      enterFullscreen();
      try {
        localStorage.setItem('exam_state_' + examId, JSON.stringify({
          name: offName, section: offSection, studentId: offId, sessionId: oid, accessCode: accessCode.trim(),
          answers, answered: Array.from(answeredSet), tabSwitches, totalSeconds: offSeconds, startedAt: startTimeRef.current,
          submitted: false, submitReason: 'manual', offlineStart: true, offlineAttemptId: oid, offlineSynced: false,
          preloadedPackageHash: pkg.package_hash || '',
        }));
      } catch {}
      toast('Offline exam started', 'Answers are saved on this device and will sync when you reconnect.');
      return;
    }

    let effName = name.trim();
    let effSection = section.trim();
    try {
      let startedAtForGrace = startTimeRef.current;
      try {
        if (!startedAtForGrace) {
          const saved = JSON.parse(localStorage.getItem('exam_state_' + examId) || 'null');
          if (saved?.startedAt) startedAtForGrace = saved.startedAt;
        }
        const pending = JSON.parse(localStorage.getItem('pending_submission_' + examId) || 'null');
        if (pending?.started_at && (!startedAtForGrace || pending.started_at < startedAtForGrace)) startedAtForGrace = pending.started_at;
      } catch {}
      const res = await api.startSession(examId, {
        student_id: studentId.trim().toUpperCase(),
        student_name: name.trim(),
        student_section: section.trim(),
        access_code: accessCode.trim(),
        device_id: deviceId,
        started_at: startedAtForGrace || 0,
      });
      // For class-linked exams the server returns the roster name/section; use them.
      if (res.student_name) { setName(res.student_name); effName = res.student_name; }
      if (res.student_section) { setSection(res.student_section); effSection = res.student_section; }
      sessionIdRef.current = res.session_id;
      setSessionId(res.session_id);
      localStorage.setItem('exam_session_' + examId, res.session_id);
    } catch (e) {
      setGateError(e.message || 'Could not start the exam session.');
      return;
    }
    setGateError('');
    // Finding 3+2 fix: if questions were locked (access_code/status/enrollment), re-fetch with code+student proof
    let qsSource = examData.questions || [];
    if (!qsSource.length || examData.questions_locked) {
      try {
        const refreshed = await api.getExam(examId, accessCode.trim(), studentId.trim().toUpperCase());
        if (refreshed.questions?.length) {
          setExamData(refreshed);
          qsSource = refreshed.questions;
        } else if (refreshed.questions_locked) {
          setGateError('This exam is not yet open, is closed, or the access code is incorrect.');
          return;
        }
      } catch (e) {
        setGateError(e.message || 'Could not load exam questions.');
        return;
      }
    }
    if (!qsSource.length && (examData.questions_locked || !qsSource.length)) {
      setGateError('This exam is not yet available — check schedule, access code, or enrollment.');
      return;
    }
    // Refresh the offline package now that we have proof-based questions.
    try {
      const pkg = saveOfflineQuiz(examId, {
        exam: examData,
        questions: qsSource,
        not_before: offlinePkgRef.current?.not_before || (examData.start_at ? new Date(examData.start_at).getTime() : Date.now()),
        package_hash: offlinePkgRef.current?.package_hash || `${examData.updated_at || ''}:${qsSource.length}:${qsSource[qsSource.length - 1]?.id || ''}`,
        student: { id: studentId.trim().toUpperCase(), name: effName, section: effSection },
        device_id: deviceId,
        preloaded: true,
      });
      if (pkg) { offlinePkgRef.current = pkg; setPreloadInfo(offlineQuizSummary(pkg)); setPreloadState('ready'); }
    } catch {}
    const s = hashStr(effName.toLowerCase().replace(/\s/g, '') + effSection.toLowerCase() + examId);
    setSeed(s);
    setQuestions(shuffleWithSeed(qsSource, s));
    startTimeRef.current = Date.now();
    setStarted(true);
    enterFullscreen();
    // Preserve any restored draft (closing the browser keeps answers in localStorage).
    // For a truly fresh start answers/answeredSet are empty anyway.
    try {
      localStorage.setItem('exam_state_' + examId, JSON.stringify({ name: effName, section: effSection, studentId: studentId.trim().toUpperCase(), sessionId: sessionIdRef.current, accessCode: accessCode.trim(), answers, answered: Array.from(answeredSet), tabSwitches, totalSeconds: examData.time_limit * 60, startedAt: startTimeRef.current, submitted: false, submitReason: 'manual', ...offlineStateFields() }));
    } catch {}
  };

  const handleAnswer = useCallback((qid, displayKey) => {
    const empty = displayKey === undefined || String(displayKey).trim() === '';
    // Build next values synchronously so refs are fresh before React flushes state
    const cur = answersRef.current || {};
    const next = { ...cur };
    if (empty) delete next[qid];
    else next[qid] = displayKey;
    answersRef.current = next;
    setAnswers(next);
    const curSet = answeredSetRef.current || new Set();
    const n = new Set(curSet);
    if (empty) n.delete(qid);
    else n.add(qid);
    answeredSetRef.current = n;
    setAnsweredSet(n);
  }, []);

  // Persist draft immediately on answer change so closing the browser/PWA doesn't lose work
  useEffect(() => {
    if (!started || submitted || !examId) return;
    try {
      localStorage.setItem('exam_state_' + examId, JSON.stringify({
        name, section, studentId: studentId.trim().toUpperCase(), sessionId: sessionIdRef.current, accessCode: accessCode.trim(), answers, answered: Array.from(answeredSet),
        tabSwitches, totalSeconds, startedAt: startTimeRef.current, submitted: false, submitReason,
        ...offlineStateFields(),
      }));
    } catch {}
    // Keep pending_submission in sync so a retry doesn't revive stale A after B
    try {
      const raw = localStorage.getItem('pending_submission_' + examId);
      if (raw) {
        const pending = JSON.parse(raw);
        const curCount = Object.keys(answers).filter(k => String(answers[k] ?? '').trim() !== '').length;
        // Only refresh if we have at least as many answers as the pending (avoid clobbering a fuller queue with empty)
        const pendingCount = pending.answers ? Object.keys(pending.answers).filter(k => String(pending.answers[k] ?? '').trim() !== '').length : 0;
        if (curCount >= pendingCount) {
          const updated = { ...pending, answers };
          localStorage.setItem('pending_submission_' + examId, JSON.stringify(updated));
          setPendingSubmit(updated);
        }
      }
    } catch {}
  }, [answers, answeredSet, examId, started, submitted, name, section, studentId, accessCode, tabSwitches, totalSeconds, submitReason]);

  // If they close the tab/PWA, try to beacon the current answers so the server
  // has a draft even before they hit Submit (best-effort, no UI).
  useEffect(() => {
    if (!examId) return;
    const onBeforeUnload = () => {
      if (!started || submitted) return;
      try {
        const cur = answersRef.current || {};
        const cnt = Object.keys(cur).filter(k => String(cur[k] ?? '').trim() !== '').length;
        if (cnt === 0) return;
        // Also ensure localStorage draft is flushed (already handled above)
      } catch {}
    };
    const onVisibilityHide = () => {
      if (document.visibilityState === 'hidden' && started && !submitted) {
        try {
          localStorage.setItem('exam_state_' + examId, JSON.stringify({
            name, section, studentId: studentId.trim().toUpperCase(), sessionId: sessionIdRef.current, accessCode: accessCode.trim(), answers: answersRef.current, answered: Array.from(answeredSetRef.current || []),
            tabSwitches, totalSeconds, startedAt: startTimeRef.current, submitted: false, submitReason,
            ...offlineStateFields(),
          }));
        } catch {}
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    document.addEventListener('visibilitychange', onVisibilityHide);
    return () => { window.removeEventListener('beforeunload', onBeforeUnload); document.removeEventListener('visibilitychange', onVisibilityHide); };
  }, [examId, started, submitted, name, section, studentId, accessCode, tabSwitches, totalSeconds, submitReason]);

  const handleTimerTick = useCallback((s) => {
    setTotalSeconds(s);
    // Throttle localStorage writes to 5s (P2) + use refs to avoid stale A overwrite
    if (started && !submitted) {
      const now = Date.now();
      if (now - lastPersistRef.current < 5000) return;
      lastPersistRef.current = now;
      localStorage.setItem('exam_state_' + examId, JSON.stringify({
        name, section: section, studentId: studentId.trim().toUpperCase(), sessionId: sessionIdRef.current, accessCode: accessCode.trim(), answers: answersRef.current, answered: Array.from(answeredSetRef.current || []),
        tabSwitches, totalSeconds: s, startedAt: startTimeRef.current, submitted: false, submitReason,
        ...offlineStateFields(),
      }));
    }
  }, [started, submitted, name, section, studentId, tabSwitches, accessCode, submitReason, examId]);

  const handleSubmit = useCallback(async (reason = 'manual') => {
    if (submitted || submittingRef.current) return;
    // Always read from refs so A->B flicker in the same tick is not lost.
    // Fallback to localStorage exam_state if refs are transiently empty (e.g. tab auto-submit
    // racing with fill_blank onChange commit) - prevents the 1/60 single-answer loss.
    let curAnswers = answersRef.current || answers;
    let curAnsweredSet = answeredSetRef.current || answeredSet;
    try {
      const raw = localStorage.getItem('exam_state_' + examId);
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved && saved.answers && typeof saved.answers === 'object') {
          const savedCount = Object.keys(saved.answers).filter(k => String(saved.answers[k] ?? '').trim() !== '').length;
          const curCount = Object.keys(curAnswers || {}).filter(k => String(curAnswers[k] ?? '').trim() !== '').length;
          if (savedCount > curCount) {
            curAnswers = saved.answers;
            curAnsweredSet = new Set(saved.answered || Object.keys(saved.answers));
          }
        }
      }
    } catch {}
    // Guard: manual submit with zero answers is almost always a bug (retry wipe + kick)
    const curAnswerCount = Object.keys(curAnswers).filter(k => String(curAnswers[k] ?? '').trim() !== '').length;
    if (reason === 'manual' && curAnswerCount === 0) {
      toast('No answers yet', 'Please answer at least one question before submitting.');
      setSubmitting(false);
      return;
    }

    setSubmitReason(reason);
    setSubmitting(true);
    setShowConfirm(false);

    let total = 0;
    const partScores = {};
    const qs = questionsRef.current || questions;
    qs.forEach((q, idx) => {
      const qType = q.type || 'multiple_choice';
      let isCorrect = false;
      if (qType === 'fill_blank') {
        isCorrect = matchesAnswer(curAnswers[q.id], q.answer);
      } else {
        // Choices are displayed in fixed (DB) order; the recorded answer is the
        // canonical choice key, so compare it directly against the answer key.
        isCorrect = !!curAnswers[q.id] && curAnswers[q.id] === q.answer;
      }
      if (isCorrect) {
        total++;
        partScores[q.part] = (partScores[q.part] || 0) + 1;
      }
    });

    const timeTaken = startTimeRef.current
      ? Math.floor((Date.now() - startTimeRef.current) / 1000)
      : examData.time_limit * 60 - totalSeconds;
    // Optimistic local result — will be corrected by server authoritative score
    setResults({ total, totalQ: qs.length, partScores, timeTaken });

    try {
      localStorage.setItem('exam_state_' + examId, JSON.stringify({
        name, section, studentId: studentId.trim().toUpperCase(), sessionId: sessionIdRef.current, accessCode: accessCode.trim(), answers: curAnswers, answered: Array.from(curAnsweredSet),
        tabSwitches, totalSeconds, startedAt: startTimeRef.current, submitted: true, submitReason: reason,
        offlineStart: offlineStartRef.current, offlineAttemptId: offlineAttemptIdRef.current, offlineSynced: offlineSyncedRef.current,
        preloadedPackageHash: offlinePkgRef.current?.package_hash || '',
      }));
    } catch {}

    const payload = {
      exam_id: examId, student_name: name, student_section: section, student_id: studentId.trim().toUpperCase(),
      seed: String(seed), answers: curAnswers, score: total, total: qs.length,
      tab_switches: tabSwitches, time_taken: timeTaken, started_at: startTimeRef.current || 0, reason,
      answer_scheme: 'fixed',
      offline_attempt_id: offlineAttemptIdRef.current || '',
      offline_start: offlineStartRef.current ? 1 : 0,
      device_id: deviceId,
      preloaded_package_hash: offlinePkgRef.current?.package_hash || '',
    };

    try {
      const res = await api.submitScore(payload);
      // Server recomputes score authoritatively — includes AI full credit (≥0.85) — update UI if it differs
      if (res && typeof res.score === 'number') {
        // Derive partScores from server perQuestion — client questions have no answer key (stripped for anti-cheat),
        // so local partScores were always 0. Server perQuestion is authoritative.
        let serverPartScores = null;
        if (res.perQuestion) {
          serverPartScores = {};
          const qsForParts = qs.length ? qs : (questionsRef.current || questions);
          const partMap = new Map(qsForParts.map(q => [q.id, q.part]));
          res.perQuestion.forEach(p => {
            const part = partMap.get(p.question_id);
            if (part === undefined) return;
            const add = typeof p.score === 'number' ? p.score : (p.correct ? 1 : 0);
            if (add) serverPartScores[part] = (serverPartScores[part] || 0) + add;
          });
        }
        if (res.score !== total || res.perQuestion || serverPartScores) {
          setResults(prev => {
            const base = prev || { total, totalQ: qs.length, partScores, timeTaken };
            return { ...base, total: res.score, totalQ: res.total ?? base.totalQ, perQuestion: res.perQuestion || base.perQuestion, partScores: serverPartScores || base.partScores, timeTaken, answers_revealed: !!res.answers_revealed };
          });
        }
        total = res.score;
        // Keep perQuestion + partScores for Review My Answers display and reload persistence
        if (res.perQuestion) {
          try { localStorage.setItem('exam_results_' + examId, JSON.stringify({ total: res.score, totalQ: res.total, perQuestion: res.perQuestion, partScores: serverPartScores, timeTaken, answers_revealed: !!res.answers_revealed })); } catch {}
        }
      }
      if (sessionIdRef.current) api.endSession(examId, { session_id: sessionIdRef.current }).catch(() => {});
      sessionIdRef.current = '';
      localStorage.removeItem('exam_session_' + examId);
      localStorage.removeItem('pending_submission_' + examId);
      setPendingSubmit(null);
      // Backup confirmed answers so a later retry wipe can be recovered if needed
      try { localStorage.setItem('exam_backup_' + examId, JSON.stringify({ answers: curAnswers, at: Date.now(), score: total })); } catch {}
      setSubmitting(false);
      setSubmitted(true);
      return;
    } catch (e) {
      if (e.message && e.message.toLowerCase().includes('ended')) {
        toast('Exam ended', 'The exam deadline has passed, so your score could not be recorded.');
        setSubmitting(false);
        setSubmitted(true);
        return;
      }
      // Server guard for empty payload preserving previous non-zero score
      if (e.status === 400 && e.message && e.message.toLowerCase().includes('no answers')) {
        toast('Not submitted — previous score preserved', e.message);
        // Revert optimistic submitted flag so they can keep answering
        localStorage.setItem('exam_state_' + examId, JSON.stringify({
          name, section, studentId: studentId.trim().toUpperCase(), sessionId: sessionIdRef.current, accessCode: accessCode.trim(), answers: curAnswers, answered: Array.from(curAnsweredSet),
          tabSwitches, totalSeconds, startedAt: startTimeRef.current, submitted: false, submitReason: reason,
          ...offlineStateFields(),
        }));
        setSubmitting(false);
        return;
      }
      if (e.status === 409) {
        const isCapped = e.message && e.message.toLowerCase().includes('retry limit');
        toast(isCapped ? 'Retry limit reached' : 'Already submitted', e.message || 'You have already submitted. Ask your instructor to allow a retry.');
        setSubmitting(false);
        setSubmitted(true);
        return;
      }
      if (e.status === 403) {
        toast('Submission rejected', e.message || 'This attempt could not be recorded. Ask your proctor.');
        setSubmitting(false);
        setSubmitted(true);
        return;
      }
      localStorage.setItem('pending_submission_' + examId, JSON.stringify(payload));
      setPendingSubmit(payload);
      toast('Submission queued', 'You are offline or the server is unreachable — answers saved locally and will sync when online.');
    }
    setSubmitting(false);
    setSubmitted(true);
  }, [submitted, questions, answers, name, section, seed, tabSwitches, totalSeconds, answeredSet, accessCode, examId]);

  // Re-open a session so the student can continue or retry an auto-submitted exam.
  const reopenSession = async () => {
    if (sessionIdRef.current) await api.endSession(examId, { session_id: sessionIdRef.current }).catch(() => {});
    // Send started_at so the server can grant deadline grace for pending offline submits
    let startedAtForGrace = startTimeRef.current;
    try {
      if (!startedAtForGrace) {
        const saved = JSON.parse(localStorage.getItem('exam_state_' + examId) || 'null');
        if (saved?.startedAt) startedAtForGrace = saved.startedAt;
      }
      const pending = JSON.parse(localStorage.getItem('pending_submission_' + examId) || 'null');
      if (pending?.started_at && (!startedAtForGrace || pending.started_at < startedAtForGrace)) startedAtForGrace = pending.started_at;
    } catch {}
    const res = await api.startSession(examId, {
      student_id: studentId.trim().toUpperCase(),
      student_name: name.trim(),
      student_section: section.trim(),
      access_code: accessCode.trim(),
      device_id: deviceId,
      started_at: startedAtForGrace || 0,
    });
    if (res.student_name) setName(res.student_name);
    if (res.student_section) setSection(res.student_section);
    sessionIdRef.current = res.session_id;
    setSessionId(res.session_id);
    localStorage.setItem('exam_session_' + examId, res.session_id);
    // A normal online session replaces any local offline attempt marker.
    offlineStartRef.current = false;
    offlineAttemptIdRef.current = '';
    offlineSyncedRef.current = false;
    setOfflineStart(false);
    setOfflineSynced(false);
    return res.session_id;
  };

  const saveExamState = (overrides) => {
    try {
      localStorage.setItem('exam_state_' + examId, JSON.stringify({
        name, section, studentId: studentId.trim().toUpperCase(), sessionId: sessionIdRef.current, accessCode: accessCode.trim(),
        answers, answered: Array.from(answeredSet), tabSwitches, totalSeconds, startedAt: startTimeRef.current,
        submitted: false, submitReason: 'manual', ...offlineStateFields(), ...overrides,
      }));
    } catch {}
  };

  const resolveExamQuestions = () => {
    if (examData?.questions?.length) return { list: examData.questions, shuffle: true };
    const pkgQs = offlinePkgRef.current?.questions;
    if (pkgQs?.length) return { list: pkgQs, shuffle: true };
    return { list: questionsRef.current || [], shuffle: false };
  };

  const continueExam = async () => {
    const qs = resolveExamQuestions();
    if (!qs.list.length) {
      toast('Questions unavailable', 'Your questions could not be loaded. Reconnect and reload the exam before continuing.');
      return;
    }
    const limitSec = (Number(examData?.time_limit) || 0) * 60;
    if (limitSec) {
      const remainingSec = Math.max(0, Math.min(limitSec, Number(totalSeconds) || 0));
      startTimeRef.current = Date.now() - (limitSec - remainingSec) * 1000;
    }
    try {
      await reopenSession();
    } catch (e) {
      toast('Cannot continue', e.message || 'Could not resume your session. Please try again.');
      return;
    }
    // The seed is deterministic per student, so rebuild it to restore the same
    // question/choice order the answers were recorded against.
    const s = hashStr(name.toLowerCase().replace(/\s/g, '') + section.toLowerCase() + examId);
    setSeed(s);
    setQuestions(qs.shuffle ? shuffleWithSeed(qs.list, s) : qs.list);
    // Keep pending_submission if it was a real offline queue, but a retry wipes it —
    // continue preserves it so they can finish answering.
    if (!pendingSubmit) {
      localStorage.removeItem('pending_submission_' + examId);
      setPendingSubmit(null);
    }
    setResults(null);
    setSubmitted(false);
    setSubmitReason('manual');
    setReviewMode(false);
    setKicked(false);
    kickedRef.current = false;
    setTabSwitches(0);
    enterFullscreen();
    saveExamState({ answers, answered: Array.from(answeredSet), tabSwitches: 0 });
  };

  const retryExam = async () => {
    const qs = resolveExamQuestions();
    if (!qs.list.length) {
      toast('Questions unavailable', 'Your questions could not be loaded. Reconnect and reload the exam before retrying.');
      return;
    }
    // Backup current answers before wiping — server guard prevents empty overwrite,
    // but this lets the student recover if they tapped retry by mistake.
    try {
      const backup = { answers, answered: Array.from(answeredSet), tabSwitches, totalSeconds, at: Date.now(), score: results?.total ?? null };
      localStorage.setItem('exam_backup_' + examId, JSON.stringify(backup));
    } catch {}
    try {
      await reopenSession();
    } catch (e) {
      toast('Cannot retry', e.message || 'Could not restart the exam. Please try again.');
      return;
    }
    const s = hashStr(name.toLowerCase().replace(/\s/g, '') + section.toLowerCase() + examId);
    setSeed(s);
    setQuestions(qs.shuffle ? shuffleWithSeed(qs.list, s) : qs.list);
    setAnswers({});
    setAnsweredSet(new Set());
    setTabSwitches(0);
    setTotalSeconds(examData.time_limit * 60);
    startTimeRef.current = Date.now();
    localStorage.removeItem('pending_submission_' + examId);
    setPendingSubmit(null);
    setResults(null);
    setSubmitted(false);
    setSubmitReason('manual');
    setReviewMode(false);
    setKicked(false);
    kickedRef.current = false;
    enterFullscreen();
    saveExamState({ answers: {}, answered: [], tabSwitches: 0, totalSeconds: examData.time_limit * 60, startedAt: Date.now() });
    toast('Retake started', 'Your previous score is preserved on the server until you submit new answers.');
  };

  // After submit, trap phone back/swipe so students can't go back to editable exam.
  // Results/Review is terminal until Allow Retry — server also blocks resubmit (409) at worker/index.js:880.
  useEffect(() => {
    if (!submitted) return;
    try { history.pushState({ examSubmitted: true }, ''); } catch {}
    const onPop = () => {
      try { history.pushState({ examSubmitted: true }, ''); } catch {}
      toast('Already submitted', 'Use Review My Answers or Back to Home. Ask proctor to Allow Retry to retake.');
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [submitted]);

  // Keep ref in sync with latest handleSubmit
  useEffect(() => { handleSubmitRef.current = handleSubmit; }, [handleSubmit]);

  const answeredCount = answeredSet.size;
  const totalQ = questions.length;

  if (loading) {
    return <div className="min-h-screen bg-canvas flex items-center justify-center text-[18px] text-muted">Loading exam...</div>;
  }
  if (error) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center px-5">
        <div className="w-full max-w-md rounded-xl border border-border bg-surface p-6 text-center shadow-sm">
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-danger-bg text-danger">
            <WifiOff size={20} />
          </div>
          <h2 className="text-[17px] font-bold text-navy-800">Couldn’t load the exam</h2>
          <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{error}</p>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <Button className="flex-1" onClick={() => setLoadAttempt(a => a + 1)}>Try again</Button>
            <Button variant="outline" className="flex-1" onClick={() => navigate('/')}>
              <ArrowLeft size={15} /> Home
            </Button>
          </div>
          <p className="mt-3 text-[11px] text-faint">On a slow connection, wait a few seconds then tap Try again.</p>
        </div>
      </div>
    );
  }

  // ── Deadline / Lifecycle Check ──
  let resumedInProgress = false;
  try {
    const saved = JSON.parse(localStorage.getItem('exam_state_' + examId));
    if (saved && !saved.submitted && saved.startedAt) {
      const dlMs = examData?.deadline ? new Date(examData.deadline).getTime() : Infinity;
      if (saved.startedAt < dlMs) resumedInProgress = true;
      // If they have a local draft/pending after the exam was closed, still let
      // them reach the gate so the server can grant the retry/started-before-deadline grace
      if (!resumedInProgress && saved.startedAt) resumedInProgress = true;
    }
    if (!resumedInProgress && localStorage.getItem('pending_submission_' + examId)) resumedInProgress = true;
  } catch {}
  const expired = !!(examData?.deadline && new Date(examData.deadline).getTime() <= Date.now()) && !resumedInProgress;
  if (expired) {
    return (
      <PublicLayout>
        <div className="flex-1 flex items-center justify-center px-5 py-8"
          style={{ background: 'linear-gradient(135deg, #0b1b3a 0%, #1a4fad 100%)' }}>
          <div className="bg-surface rounded-[16px] max-w-[440px] w-full text-center shadow-modal px-8 py-10">
            <span className="w-14 h-14 rounded-full bg-danger-bg flex items-center justify-center mx-auto mb-4"><Ban size={30} className="text-danger" /></span>
            <h1 className="text-[22px] font-bold text-navy-800 mb-2.5">Exam Ended</h1>
            <p className="text-[14px] text-muted mb-2 leading-relaxed">{examData?.title}</p>
            <p className="text-[14px] text-muted mb-6 leading-relaxed">
              The deadline for this exam has passed.<br />It is no longer available for students.
            </p>
            <Button onClick={() => window.location.href = '/'} icon={ArrowLeft} className="!px-10 !py-3.5">Back to Home</Button>
          </div>
        </div>
      </PublicLayout>
    );
  }

  // ── Lifecycle Status Gate ──
  const status = examData?.status || 'active';
  const scheduledFuture = !!(status === 'scheduled' && examData?.start_at && new Date(examData.start_at).getTime() > nowTick);
  const isClosedStatus = status === 'draft' || status === 'archived' || status === 'closed';
  // Don't block students mid-session: they must be able to finish even if the
  // instructor closes/archives the exam while they are taking it.
  if (isClosedStatus && !started && !resumedInProgress) {
    let title = 'Exam Not Available';
    let body = 'This exam is not currently open for students.';
    if (status === 'draft') { title = 'Exam Not Published'; body = 'This exam is a draft and has not been published yet.'; }
    if (status === 'archived') { title = 'Exam Archived'; body = 'This exam has been archived and is no longer available.'; }
    if (status === 'closed') { title = 'Exam Closed'; body = 'The instructor has closed this exam.'; }
    if (status === 'scheduled') { title = 'Exam Not Open Yet'; body = examData?.start_at ? `This exam opens at ${new Date(examData.start_at).toLocaleString()}.` : 'This exam is scheduled and not open yet.'; }
    return (
      <PublicLayout>
        <div className="flex-1 flex items-center justify-center px-5 py-8"
          style={{ background: 'linear-gradient(135deg, #0b1b3a 0%, #1a4fad 100%)' }}>
          <div className="bg-surface rounded-[16px] max-w-[440px] w-full text-center shadow-modal px-8 py-10">
            <span className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 ${status === 'scheduled' ? 'bg-info-bg' : 'bg-danger-bg'}`}>{status === 'scheduled' ? <ClipboardList size={30} className="text-info" /> : <Ban size={30} className="text-danger" />}</span>
            <h1 className="text-[22px] font-bold text-navy-800 mb-2.5">{title}</h1>
            <p className="text-[14px] text-muted mb-2 leading-relaxed">{examData?.title}</p>
            <p className="text-[14px] text-muted mb-6 leading-relaxed">
              {body}<br />Please check back later or ask your instructor.
            </p>
            <Button onClick={() => window.location.href = '/'} icon={ArrowLeft} className="!px-10 !py-3.5">Back to Home</Button>
          </div>
        </div>
      </PublicLayout>
    );
  }
  if (!started) {
    const offlinePkg = offlinePkgRef.current;
    const offlineReady = !!(offlinePkg && offlinePkg.questions?.length && offlinePkg.preloaded);
    const offlineAllowed = !!(examData?.allow_offline_start || offlinePkg?.allow_offline_start);
    const offlineWindowReady = offlinePkg ? isOfflineWindowOpen(offlinePkg, nowTick) : false;
    const canStartOffline = offline && offlineReady && offlineAllowed && offlineWindowReady;
    const preloadBusy = !offline && preloadState === 'loading';
    const preloadDone = preloadState === 'ready' || offlineReady;
    const preloadCount = preloadInfo?.count || offlinePkg?.questions?.length || examData?.questions?.length || 0;
    const opensAt = examData?.start_at ? new Date(examData.start_at) : (offlinePkg?.not_before ? new Date(offlinePkg.not_before) : null);
    return (
      <PublicLayout>
        <div className="flex-1 flex items-stretch justify-center relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #0b1b3a 0%, #143a8a 45%, #1a4fad 100%)' }}>
          <div className="absolute inset-0 pointer-events-none opacity-40" style={{ backgroundImage: 'radial-gradient(700px 340px at 78% -8%, rgba(255,255,255,.14), transparent 60%), radial-gradient(520px 280px at 8% 108%, rgba(232,160,32,.18), transparent 60%)' }} />
          <div className="absolute inset-0 pointer-events-none opacity-[0.06]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
          <div className="relative max-w-[1000px] mx-auto w-full px-4 py-8 sm:py-10 grid lg:grid-cols-[1fr_480px] gap-6 lg:gap-8 items-start lg:items-center">
            {/* Exam info panel — white hero like Home, always visible */}
            <div className="text-white text-center lg:text-left">
              <span className="hidden lg:inline-flex items-center gap-2 bg-white/10 backdrop-blur border border-white/10 rounded-full px-3 py-1.5 text-[11px] font-semibold text-accent mb-4">
                <ShieldCheck size={12} /> Secure, randomized exam
              </span>
              <span className="hidden lg:flex w-12 h-12 rounded-xl bg-white/10 items-center justify-center mb-5"><ClipboardList size={24} className="text-accent" /></span>
              <div className="font-mono text-[11px] tracking-[.14em] text-accent uppercase">{examId?.slice(0, 8)}</div>
              <h1 className="text-white text-[26px] sm:text-[30px] lg:text-[32px] font-bold leading-tight tracking-tight mt-1">{examData?.title}</h1>
              <p className="text-white/70 text-[13px] sm:text-[14px] leading-relaxed mt-3 max-w-[380px] mx-auto lg:mx-0">
                {(examData?.questions?.length || 0)} items · {examData?.time_limit} minutes
                {examData?.type && <span className="block mt-1 text-white/60">· {examTypeLabel(examData.type)}</span>}
                {examData?.deadline && <span className="block mt-1 text-white/60">Deadline: {new Date(examData.deadline).toLocaleString()}</span>}
              </p>
              <div className="hidden lg:block bg-white/5 border border-white/10 rounded-xl px-5 py-4 mt-6 text-[13px] text-white/80 leading-relaxed text-left">
                <strong className="flex items-center gap-1.5 mb-2 text-white text-[11px] tracking-[.08em] uppercase"><ShieldCheck size={14} /> Exam Rules</strong>
                Answer all items. Questions are randomized per student.<br />
                You may not go back once the exam is submitted.<br />
                <span className="inline-flex items-center gap-1.5 mt-1.5"><Ban size={13} className="text-warning" /> Locked to fullscreen — exiting counts as a violation.</span><br />
                <span className="inline-flex items-center gap-1.5"><Ban size={13} className="text-warning" /> Leaving this tab 3 times auto-submits.</span>
              </div>
              <div className="hidden lg:flex flex-col gap-2.5 max-w-[380px] mt-6">
                <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-left">
                  <span className="w-8 h-8 rounded-lg bg-success-bg text-success flex items-center justify-center shrink-0"><Shuffle size={16} /></span>
                  <div>
                    <div className="text-[13px] font-semibold">Randomized per student</div>
                    <div className="text-[11px] text-white/50">Question order is shuffled; answer choices keep their letter (A, B, C, D) fixed.</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-left">
                  <span className="w-8 h-8 rounded-lg bg-warning-bg text-warning flex items-center justify-center shrink-0"><TimerIcon size={16} /></span>
                  <div>
                    <div className="text-[13px] font-semibold">{examData?.time_limit} minute limit</div>
                    <div className="text-[11px] text-white/50">The timer runs continuously once you start.</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Gate form */}
            <div className="bg-surface rounded-[20px] w-full shadow-modal border border-border p-6 sm:p-8">
              <h2 className="text-[17px] font-bold text-navy-800 mb-1.5">
                {scheduledFuture ? 'Quiz not open yet' : canStartOffline ? 'Start offline' : 'Start the exam'}
              </h2>
              <p className="text-[13px] text-muted mb-6 leading-relaxed">
                {scheduledFuture
                  ? <>Preload now so you can start with a weak signal.{opensAt ? <> Questions unlock {opensAt.toLocaleString()}.</> : null}</>
                  : canStartOffline
                    ? 'Your preloaded quiz is ready. Answers are saved on this device and sync when you reconnect.'
                    : preloadBusy
                      ? 'Downloading all questions so your exam opens instantly.'
                      : preloadDone
                        ? 'All questions are ready. Starting the exam will be instant.'
                        : 'Enter your details to begin. Keep your ID handy.'}
              </p>

              {preloadDone && (
                <div className="flex items-start gap-2 bg-success-bg border border-success/20 rounded-xl px-3.5 py-2.5 mb-3 text-[12px] text-success">
                  <CheckCircle size={14} className="shrink-0 mt-0.5" />
                  <span>
                    <strong>All questions preloaded</strong> — {preloadCount} item{preloadCount === 1 ? '' : 's'} ready on this device
                    {preloadInfo?.cachedAt ? <> · {new Date(preloadInfo.cachedAt).toLocaleString()}</> : null}.
                    {scheduledFuture && opensAt ? <> They unlock {opensAt.toLocaleString()}.</> : ' You can start the exam.'}
                  </span>
                </div>
              )}
              {preloadBusy && (
                <div className="flex items-center gap-2 bg-info-bg border border-info/15 rounded-xl px-3.5 py-2.5 mb-3 text-[12px] text-info">
                  <Clock size={14} /> Preloading all questions… Please wait before starting.
                </div>
              )}
              {!preloadDone && preloadState === 'error' && (
                <div className="flex items-start gap-2 bg-warning-bg border border-warning/20 rounded-xl px-3.5 py-2.5 mb-3 text-[12px] text-warning">
                  <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                  <span className="flex-1">{preloadError || 'Could not preload all questions.'} You can still start — questions will load when you begin.</span>
                  <button type="button" onClick={() => { setPreloadState('idle'); preloadQuiz().catch(() => {}); }} className="font-semibold underline shrink-0">Retry</button>
                </div>
              )}

              {offline && (
                <div className="flex items-center gap-2 bg-warning-bg border border-warning/15 rounded-xl px-3.5 py-2.5 mb-5 text-[12px] text-warning">
                  <WifiOff size={14} />
                  {offlineReady
                    ? (canStartOffline
                      ? 'You are offline — your preloaded quiz is ready to start.'
                      : offlineAllowed && scheduledFuture
                        ? 'You are offline — the quiz is preloaded and will unlock at the scheduled time.'
                        : 'You are offline — connect once to start. Your preloaded copy is saved.')
                    : 'You are offline — your answers will be saved locally and submitted when connection restores.'}
                </div>
              )}
              <div className="flex flex-col gap-3.5 mb-6">
                {examData?.class_id ? (
                  <>
                    <div>
                      <label className="label mb-1.5">Student ID Number</label>
                      <div className="flex gap-2">
                        <input
                          value={studentId}
                          onChange={e => { setStudentId(e.target.value.toUpperCase()); setLookupState('idle'); setPreloadState('idle'); }}
                          onBlur={lookupRoster}
                          placeholder="e.g. 2019-12345" autoComplete="off"
                          className="input !font-mono !tracking-wide flex-1 !bg-canvas focus:!bg-surface"
                        />
                        <Button variant={lookupState === 'found' ? 'success' : 'outline'} size="md"
                          loading={lookupState === 'loading'} onClick={lookupRoster}
                          disabled={lookupState === 'found'}>
                          {lookupState === 'found' ? 'Verified' : 'Verify'}
                        </Button>
                      </div>
                      {lookupState === 'notfound' && (
                        <div className="text-[12px] text-danger mt-1.5 flex items-center gap-1.5">
                          <AlertTriangle size={12} /> This ID is not enrolled in the linked class.
                        </div>
                      )}
                      {lookupState === 'found' && rosterInfo && (
                        <div className="bg-success-bg border border-success/15 rounded-xl px-3.5 py-2.5 mt-2 text-[13px]">
                          <div className="font-semibold text-success">{rosterInfo.student_name}</div>
                          <div className="text-[12px] text-muted">{rosterInfo.student_id}{rosterInfo.student_section ? ' · ' + rosterInfo.student_section : ''}</div>
                        </div>
                      )}
                    </div>
                    {examData?.has_access_code && (
                      <Input label="Access Code" value={accessCode} onChange={e => { setAccessCode(e.target.value); setPreloadState('idle'); }}
                        placeholder="Ask your proctor for the code" autoComplete="off" className="!font-mono !uppercase !tracking-wide !bg-canvas focus:!bg-surface" />
                    )}
                  </>
                ) : (
                  <>
                    <Input label="Student ID Number" value={studentId} onChange={e => { setStudentId(e.target.value); setPreloadState('idle'); }}
                      placeholder="e.g. 2019-12345" autoComplete="off" className="!font-mono !tracking-wide !bg-canvas focus:!bg-surface" />
                    <Input label="Full Name (Last Name, First Name, M.I.)" value={name} onChange={e => setName(e.target.value)}
                      placeholder="e.g. Dela Cruz, Juan A." autoComplete="off" className="!bg-canvas focus:!bg-surface" />
                    <Input label="Section" value={section} onChange={e => setSection(e.target.value)}
                      placeholder="e.g. BSCS 2-A" autoComplete="off" className="!bg-canvas focus:!bg-surface" />
                    {examData?.has_access_code && (
                      <Input label="Access Code" value={accessCode} onChange={e => { setAccessCode(e.target.value); setPreloadState('idle'); }}
                        placeholder="Ask your proctor for the code" autoComplete="off" className="!font-mono !uppercase !tracking-wide !bg-canvas focus:!bg-surface" />
                    )}
                  </>
                )}
              </div>
              <div className="flex items-center gap-2 text-[12px] text-faint mb-4">
                <Calendar size={13} /> {date}
              </div>
              {gateError && <div className="text-[12px] text-danger mb-3 flex items-center gap-1.5"><AlertTriangle size={12} /> {gateError}</div>}
              {scheduledFuture ? (
                <Button className="!w-full !py-3.5 !text-[15px]" disabled>
                  Opens {opensAt ? opensAt.toLocaleString() : 'soon'} →
                </Button>
              ) : offline && !canStartOffline ? (
                <Button className="!w-full !py-3.5 !text-[15px]" disabled>
                  Connect once to start →
                </Button>
              ) : preloadBusy ? (
                <Button className="!w-full !py-3.5 !text-[15px]" disabled>
                  Preloading questions…
                </Button>
              ) : (
                <Button className="!w-full !py-3.5 !text-[15px]" onClick={startExam}>
                  {canStartOffline ? 'Start Offline →' : 'Start Exam →'}
                </Button>
              )}
              <button onClick={() => navigate('/scan')} className="w-full mt-2.5 inline-flex items-center justify-center gap-1.5 bg-canvas border border-border hover:bg-navy-50 text-navy-700 rounded-xl py-2.5 text-[13px] font-semibold transition-colors cursor-pointer">
                <Scan size={14} /> Scan QR instead
              </button>
            </div>
          </div>
        </div>
      </PublicLayout>
    );
  }

  // ── Results Overlay ──
  if ((submitted || submitting) && results && !reviewMode) {
    const pct = ((results.total / results.totalQ) * 100).toFixed(1);
    const passingPct = Number(examData?.passing_score ?? 60);
    const parts = [...new Set(questions.map(q => q.part))].sort((a,b)=>a-b);
    const partCounts = {};
    questions.forEach(q => { partCounts[q.part] = (partCounts[q.part] || 0) + 1; });
    // Fallback when questions not yet loaded (e.g., reload) — derive counts from totalQ evenly
    const fallbackQpp = parts.length ? Math.ceil(results.totalQ / parts.length) : results.totalQ;
    return (
      <div className="min-h-screen flex items-center justify-center px-4 pt-safe pb-safe bg-[rgba(10,20,40,.7)]">
        <div className="bg-surface rounded-[16px] max-w-[520px] w-full text-center shadow-modal max-h-[90vh] overflow-y-auto px-6 sm:px-8 py-8">
          <div className="font-mono text-[11px] tracking-[.12em] text-muted uppercase mb-4">{name} · {section}</div>
          <div className="relative w-36 h-36 mx-auto mb-4">
            <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
              <circle cx="60" cy="60" r="52" fill="none" stroke="var(--color-border)" strokeWidth="10" />
              <circle cx="60" cy="60" r="52" fill="none" stroke={results.total >= results.totalQ * 0.7 ? 'var(--color-success)' : results.total >= results.totalQ * 0.5 ? 'var(--color-warning)' : 'var(--color-danger)'}
                strokeWidth="10" strokeLinecap="round" strokeDasharray={`${(results.total / results.totalQ) * 326.7} 326.7`} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[34px] font-bold text-navy-800 leading-none">{results.total}<span className="text-[18px] text-muted">/{results.totalQ}</span></span>
              <span className={`text-[16px] font-semibold ${results.total >= results.totalQ * 0.7 ? 'text-success' : results.total >= results.totalQ * 0.5 ? 'text-warning' : 'text-danger'}`}>{pct}%</span>
            </div>
          </div>
          <div className="flex items-center justify-center gap-1.5 text-[14px] text-muted mb-6 leading-relaxed">
            {results.total >= results.totalQ * 0.9 ? <><Trophy size={16} /> Excellent!</> :
             results.total >= results.totalQ * 0.8 ? <><CheckCircle size={16} /> Very Good!</> :
             results.total >= results.totalQ * 0.7 ? <><Book size={16} /> Good.</> :
             results.total >= results.totalQ * 0.5 ? <><AlertTriangle size={16} /> Needs Improvement.</> : <><XCircle size={16} /> Below passing.</>}
          </div>
          <div className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[12px] font-bold mb-6 ${pct >= passingPct ? 'bg-success-bg text-success' : 'bg-danger-bg text-danger'}`}>
            {pct >= passingPct ? <><CheckCircle size={13} /> PASSED</> : <><XCircle size={13} /> FAILED</>}
            <span className="font-normal text-muted">· passing at {passingPct}%</span>
          </div>
          <div className="text-left border border-border rounded-[10px] overflow-hidden mb-6">
            <table className="w-full border-collapse text-[13px]">
              <thead><tr className="bg-navy-900 text-white">
                <th className="px-3.5 py-2 text-left font-mono text-[10px] tracking-[.08em]">Part</th>
                <th className="px-3.5 py-2 text-left">Score</th>
              </tr></thead>
              <tbody>
                {parts.map(p => {
                  const sc = results.partScores?.[p] ?? 0;
                  const tot = partCounts[p] ?? fallbackQpp;
                  const pct2 = tot ? (sc / tot) * 100 : 0;
                  return (
                    <tr key={p} className="border-t border-border">
                      <td className="px-3.5 py-2.5 font-semibold">Part {p}</td>
                      <td className="px-3.5 py-2.5">
                        {Number.isInteger(sc) ? sc : sc.toFixed(1)}/{tot}
                        <div className="h-1.5 bg-border rounded-full overflow-hidden mt-1">
                          <div className="h-full bg-navy-700 rounded-full transition-all duration-500" style={{ width: pct2 + '%' }} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {showAnswersPref && !answersRevealed && (
            <div className="flex items-center justify-center gap-1.5 text-[12px] text-muted mb-5">
              <Lock size={12} /> Correct answers unlock after the exam closes.
            </div>
          )}
          {pendingSubmit && (
            <div className="flex flex-col items-center gap-2 mb-3">
              <div className="flex items-center justify-center gap-1.5 text-[12px] text-warning">
                <WifiOff size={14} /> {pendingRetryExhausted ? 'Sync paused — answers are saved on this device.' : 'Score saved locally — will sync when connection restores.'}
              </div>
              {pendingRetryExhausted && (
                <button type="button" onClick={() => { pendingAttemptsRef.current = 0; setPendingRetryExhausted(false); setPendingRetryTick(t => t + 1); }} className="text-[12px] font-semibold text-navy-700 underline">
                  Retry now
                </button>
              )}
            </div>
          )}
          {serverRetry && !submitting && !pendingSubmit && (
            <div className="flex flex-col gap-2.5 mb-5">
              <div className="flex items-center justify-center gap-1.5 text-[12px] text-warning">
                <AlertTriangle size={13} /> {submitReason === 'tab' ? 'Tab switch — retake granted by proctor' : submitReason === 'timeout' ? 'Time ran out — retake granted' : submitReason === 'kick' ? 'Session closed by proctor — retake granted' : 'Retake granted by proctor'}.
              </div>
              {(submitReason === 'tab' || submitReason === 'kick') && (
                <Button variant="outline" onClick={continueExam}>Continue Exam</Button>
              )}
              <Button onClick={retryExam}>Retry Exam</Button>
            </div>
          )}
          {(submitReason === 'tab' || submitReason === 'timeout' || submitReason === 'kick') && !serverRetry && !submitting && !pendingSubmit && (
            <div className="flex flex-col gap-2.5 mb-5">
              <div className="flex items-center justify-center gap-1.5 text-[12px] text-warning">
                <AlertTriangle size={13} /> This exam was submitted automatically ({submitReason === 'tab' ? 'tab switch' : submitReason === 'timeout' ? 'time ran out' : 'session closed by proctor'}). Ask your proctor to allow a retry.
              </div>
              <Button variant="outline" onClick={checkRetryNow}>Check for retake permission</Button>
            </div>
          )}
          <div className="flex gap-2.5 justify-center flex-wrap">
            <Button onClick={() => setReviewMode(true)}>Review My Answers</Button>
            <Button variant="outline" onClick={() => window.location.href = '/'}>Back to Home</Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Already Submitted (revisit, no saved results) ──
  if (submitted && !results) {
    return (
      <PublicLayout>
        <div className="flex-1 flex items-center justify-center px-5 py-8"
          style={{ background: 'linear-gradient(135deg, #0b1b3a 0%, #1a4fad 100%)' }}>
          <div className="bg-surface rounded-[16px] max-w-[440px] w-full text-center shadow-modal px-8 py-10">
            <span className="w-14 h-14 rounded-full bg-navy-100 flex items-center justify-center mx-auto mb-4"><ClipboardList size={30} className="text-navy-700" /></span>
            <h1 className="text-[22px] font-bold text-navy-800 mb-2.5">
              {submitReason === 'tab' || submitReason === 'timeout' || submitReason === 'kick' ? 'Exam Auto-Submitted' : 'Already Submitted'}
            </h1>
            <p className="text-[14px] text-muted mb-6 leading-relaxed">
              {submitReason === 'tab'
                ? <>You switched away from the exam too many times, so it was submitted automatically.<br />{serverRetry ? <>You may continue or retry.</> : <>Ask your proctor to allow a retake.</>}</>
                : submitReason === 'timeout'
                  ? <>Time ran out and your exam was submitted automatically.<br />{serverRetry ? <>You may retry.</> : <>Ask your proctor to allow a retake.</>}</>
                  : submitReason === 'kick'
                    ? <>Your session was closed by the proctor, so your answers were submitted.<br />{serverRetry ? <>You may continue or retry.</> : <>Ask your proctor to allow a retake.</>}</>
                    : serverRetry
                      ? <>Your instructor has granted you a retake.<br />You may continue or retry.</>
                      : <>You have already submitted this exam.<br />You cannot retake it.</>}
            </p>
            {pendingSubmit && (
              <div className="flex flex-col items-center gap-2 mb-4">
                <div className="flex items-center justify-center gap-1.5 text-[12px] text-warning">
                  <WifiOff size={14} /> {pendingRetryExhausted ? 'Sync paused — answers are saved on this device.' : 'Score not yet synced — will upload when connected.'}
                </div>
                {pendingRetryExhausted && (
                  <Button variant="outline" onClick={() => { pendingAttemptsRef.current = 0; setPendingRetryExhausted(false); setPendingRetryTick(t => t + 1); }}>
                    Retry now
                  </Button>
                )}
              </div>
            )}
            {serverRetry && !pendingSubmit && (
              <div className="flex flex-col gap-2.5 mb-6">
                {(submitReason === 'tab' || submitReason === 'kick' || serverRetry) && (
                  <Button variant="outline" onClick={continueExam}>Continue Exam</Button>
                )}
                <Button onClick={retryExam}>Retry Exam</Button>
              </div>
            )}
            {!serverRetry && !pendingSubmit && (
              <div className="flex flex-col gap-2.5 mb-6">
                <p className="text-[11px] text-faint leading-relaxed">If your instructor just allowed a retake, tap to check — no hard refresh needed.</p>
                <Button variant="outline" onClick={checkRetryNow}>Check for retake permission</Button>
              </div>
            )}
            <Button onClick={() => window.location.href = '/'} icon={ArrowLeft} className="!px-10 !py-3.5">Back to Home</Button>
          </div>
        </div>
      </PublicLayout>
    );
  }

  // ── Exam Screen ──
  return (
    <div className="min-h-screen bg-canvas">
      <ToastContainer />
      {kicked && !submitted && (
        <div className="fixed inset-0 bg-[rgba(10,20,40,.94)] z-[400] flex items-center justify-center px-6 pt-safe pb-safe">
          <div className="bg-surface rounded-[14px] px-6 sm:px-8 py-9 max-w-[400px] w-full text-center shadow-modal">
            <span className="w-12 h-12 rounded-full bg-danger-bg flex items-center justify-center mx-auto mb-3"><Ban size={24} className="text-danger" /></span>
            <h3 className="text-[18px] text-navy-800 mb-2.5">Session Closed by Proctor</h3>
            <p className="text-[13px] text-muted mb-6 leading-relaxed">
              An administrator ended your exam session.<br />
              Your answers up to this point have been recorded.
            </p>
            {submitting && <p className="text-[12px] text-navy-700 mb-4">Submitting your answers…</p>}
            {!submitting && (
              <Button className="!w-full !py-3.5" onClick={() => window.location.href = '/'}>Back to Home</Button>
            )}
          </div>
        </div>
      )}
      {fsBlocked && !submitting && !submitted && (
        <div className="fixed inset-0 bg-[rgba(10,20,40,.93)] z-[400] flex items-center justify-center px-6 pt-safe pb-safe">
          <div className="bg-surface rounded-[14px] px-6 sm:px-8 py-9 max-w-[400px] w-full text-center shadow-modal">
            <span className="w-12 h-12 rounded-full bg-danger-bg flex items-center justify-center mx-auto mb-3"><Ban size={24} className="text-danger" /></span>
            <h3 className="text-[18px] text-navy-800 mb-2.5">Fullscreen Required</h3>
            <p className="text-[13px] text-muted mb-6 leading-relaxed">
              You exited fullscreen mode, which is not allowed during the exam.<br />
              Return to fullscreen to continue.
            </p>
            <Button className="!w-full !py-3.5" onClick={enterFullscreen}>Return to Fullscreen</Button>
          </div>
        </div>
      )}
      {offline && (
        <div className="bg-warning text-white px-4 py-2.5 text-center text-[12px] font-semibold flex items-center justify-center gap-1.5 sticky top-0 z-[90]">
          <WifiOff size={14} /> You are offline — answers are saved locally. Connect to submit.
        </div>
      )}
      <header className="sticky top-0 z-[100] bg-navy-900 text-white border-b border-white/10 shadow-card">
        <div className="max-w-[860px] mx-auto px-4 sm:px-6 py-3 flex items-center gap-3 sm:gap-4">
          <div className="flex-1 min-w-0 flex items-center gap-2.5">
            <span className="hidden sm:flex w-8 h-8 rounded-lg bg-white/10 border border-white/10 items-center justify-center shrink-0">
              <ClipboardList size={14} className="text-accent" />
            </span>
            <div className="min-w-0">
              <div className="font-mono text-[10px] tracking-[.12em] uppercase text-accent truncate leading-none">{examData?.title}</div>
              <div className="text-[13px] font-semibold leading-tight truncate">{name} <span className="font-normal text-white/60 hidden sm:inline">· {section}</span></div>
              <div className="text-[11px] text-white/50 sm:hidden truncate">{section}</div>
            </div>
          </div>
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            {tabSwitches > 0 && (
              <span className="hidden lg:inline-flex items-center gap-1 text-[11px] font-semibold bg-warning/15 text-warning border border-warning/20 rounded-full px-2.5 py-1">
                <AlertTriangle size={11} /> {tabSwitches}/3
              </span>
            )}
            <div className="hidden sm:block text-right">
              <div className="text-[11px] font-medium text-white/70 leading-none">{answeredCount}/{totalQ}</div>
              <div className="w-24 h-1.5 bg-white/15 rounded-full overflow-hidden mt-1.5">
                <div className="h-full bg-accent rounded-full transition-all duration-300" style={{ width: totalQ > 0 ? ((answeredCount / totalQ) * 100) + '%' : '0%' }} />
              </div>
            </div>
            {!submitted && (
              <Timer
                initialSeconds={totalSeconds}
                deadlineAt={startTimeRef.current ? startTimeRef.current + (Number(examData?.time_limit) || 0) * 60 * 1000 : undefined}
                onExpire={() => handleSubmit('timeout')}
                onTick={handleTimerTick}
              />
            )}
          </div>
        </div>
        {/* Mobile progress */}
        <div className="sm:hidden px-4 pb-3">
          <div className="flex items-center justify-between text-[11px] text-white/60 mb-1.5">
            <span>{answeredCount}/{totalQ} answered</span>
            <span className="text-accent font-semibold">{totalQ ? Math.round((answeredCount / totalQ) * 100) : 0}%</span>
          </div>
          <div className="h-1.5 bg-white/15 rounded-full overflow-hidden">
            <div className="h-full bg-accent rounded-full transition-all duration-300" style={{ width: totalQ > 0 ? ((answeredCount / totalQ) * 100) + '%' : '0%' }} />
          </div>
          {tabSwitches > 0 && (
            <div className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-warning">
              <AlertTriangle size={11} /> {tabSwitches}/3 violations — next triggers auto-submit
            </div>
          )}
        </div>
      </header>

      {/* Question jump nav */}
      {!reviewMode && (() => {
        const totalPages = Math.max(1, Math.ceil(questions.length / QUESTIONS_PER_PAGE));
        return (
        <div className="max-w-[860px] mx-auto px-4 pt-3 sm:pt-4 sticky top-[57px] sm:top-[64px] z-[20] bg-canvas/95 backdrop-blur supports-[backdrop-filter]:bg-canvas/80">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-2">
            <span className="text-[11px] font-semibold tracking-[.08em] uppercase text-faint shrink-0 mr-1">Jump:</span>
            {questions.map((q, i) => {
              const isAnswered = answeredSet.has(q.id);
              const pageOf = Math.floor(i / QUESTIONS_PER_PAGE);
              const isCurrentPage = pageOf === qPage;
              return (
                <button
                  key={q.id}
                  onClick={() => {
                    const targetPage = Math.floor(i / QUESTIONS_PER_PAGE);
                    if (targetPage !== qPage) setQPage(targetPage);
                    setTimeout(() => document.getElementById(`q-${q.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
                  }}
                  className={`shrink-0 w-8 h-8 rounded-full border text-[12px] font-bold transition-colors ${
                    isAnswered ? 'bg-navy-700 text-white border-navy-700 shadow-sm' : isCurrentPage ? 'bg-navy-50 text-navy-800 border-navy-300' : 'bg-surface text-muted border-border hover:border-navy-700/30 hover:text-navy-800'
                  }`}
                  aria-label={`Go to question ${i + 1}`}
                >
                  {i + 1}
                </button>
              );
            })}
            <span className="ml-2 text-[11px] text-faint shrink-0">{answeredCount}/{totalQ} done{Math.ceil(questions.length / QUESTIONS_PER_PAGE) > 1 ? ` · page ${qPage + 1}/${totalPages}` : ''}</span>
          </div>
        </div>
        );
      })()}

      <main className="max-w-[860px] mx-auto px-4 py-6">
        {reviewMode && showAnswersPref && !answersRevealed && (
          <div className="mb-4 flex items-center gap-2 text-[12.5px] text-muted bg-canvas border border-border rounded-xl px-4 py-3">
            <Lock size={13} className="shrink-0" /> Correct answers unlock after the exam closes. Your responses and score breakdown are still available.
          </div>
        )}
        <div className="flex flex-col gap-4">
          {questions.slice(qPage * QUESTIONS_PER_PAGE, (qPage + 1) * QUESTIONS_PER_PAGE).map((q, idx) => {
            const i = qPage * QUESTIONS_PER_PAGE + idx;
            const grading = perQMap[q.id];
            return (
            <div key={q.id} id={`q-${q.id}`} className="scroll-mt-28">
              <QuestionCard
                question={q}
                index={i}
                seed={seed}
                onAnswer={handleAnswer}
                submitted={submitted || reviewMode}
                chosenKey={answers[q.id]}
                showAnswers={answersRevealed}
                grading={grading}
              />
            </div>
            );
          })}
        </div>
        {Math.ceil(questions.length / QUESTIONS_PER_PAGE) > 1 && (
          <div className="flex items-center justify-between gap-3 mt-4 bg-surface border border-border rounded-xl px-4 py-3">
            <button onClick={() => setQPage(p => Math.max(0, p - 1))} disabled={qPage === 0} className="px-3 py-1.5 rounded-lg border text-sm bg-surface border-border disabled:opacity-40">← Prev</button>
            <span className="text-[12px] font-semibold text-navy-800">Page {qPage + 1} of {Math.ceil(questions.length / QUESTIONS_PER_PAGE)} · {questions.slice(qPage * QUESTIONS_PER_PAGE, (qPage + 1) * QUESTIONS_PER_PAGE).length} questions</span>
            <button onClick={() => setQPage(p => Math.min(Math.ceil(questions.length / QUESTIONS_PER_PAGE) - 1, p + 1))} disabled={qPage >= Math.ceil(questions.length / QUESTIONS_PER_PAGE) - 1} className="px-3 py-1.5 rounded-lg border text-sm bg-surface border-border disabled:opacity-40">Next →</button>
          </div>
        )}

        {(() => {
          const totalPages = Math.ceil(questions.length / QUESTIONS_PER_PAGE);
          const isLastPage = totalPages <= 1 || qPage === totalPages - 1;
          return (
            <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-surface border border-border rounded-[16px] p-4 shadow-card sm:mt-8 sm:rounded-[14px]">
              <div className="text-[13px] text-muted">
                <span className="font-semibold text-navy-800">{answeredCount}</span>/{totalQ} answered
                {totalQ - answeredCount > 0 ? <span className="text-warning font-medium"> · {totalQ - answeredCount} unanswered</span> : <span className="text-success font-medium"> · All done</span>}
                {tabSwitches > 0 && <span className="hidden sm:inline text-faint"> · {tabSwitches}/3 violations</span>}
                {!isLastPage && !submitted && !reviewMode && <span className="block sm:inline text-[12px] text-faint mt-1 sm:mt-0 sm:ml-2">· Go to page {totalPages} to submit</span>}
              </div>
              <div className="flex gap-2">
                {!submitted && !submitting && isLastPage && (
                  <Button className="!flex-1 sm:!flex-none !px-8 !py-3 !text-[15px]" onClick={() => setShowConfirm(true)}>Submit Exam</Button>
                )}
                {!submitted && !submitting && !isLastPage && (
                  <Button className="!flex-1 sm:!flex-none" variant="outline" onClick={() => setQPage(totalPages - 1)}>Go to last page →</Button>
                )}
                {reviewMode && (
                  <Button variant="outline" icon={ArrowLeft} className="!flex-1 sm:!flex-none" onClick={() => setReviewMode(false)}>Back to Results</Button>
                )}
              </div>
            </div>
          );
        })()}
      </main>

      <ConfirmDialog
        open={showConfirm}
        title="Submit Exam?"
        body={totalQ - answeredCount > 0
          ? `You have ${totalQ - answeredCount} unanswered item(s). Are you sure?`
          : 'All items answered. Ready to submit?'}
        confirmLabel="Yes, Submit"
        tone="primary"
        loading={submitting}
        onConfirm={() => handleSubmit('manual')}
        onClose={() => setShowConfirm(false)}
      />
    </div>
  );
}
