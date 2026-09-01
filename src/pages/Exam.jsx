import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { hashStr, shuffleWithSeed, matchesAnswer, examTypeLabel } from '../utils';
import ToastContainer, { toast } from '../components/Toast';
import Timer from '../components/Timer';
import QuestionCard from '../components/QuestionCard';
import PublicLayout from '../components/PublicLayout';
import { Button, Input, ConfirmDialog } from '../components/ui';
import { AlertTriangle, Ban, ClipboardList, Trophy, CheckCircle, Book, XCircle, ArrowLeft, WifiOff, ShieldCheck, Shuffle, Timer as TimerIcon, Calendar } from 'lucide-react';

export default function Exam() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const examId = params.get('id');

  const [examData, setExamData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
  const [results, setResults] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [reviewMode, setReviewMode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [offline, setOffline] = useState(!navigator.onLine);
  const [pendingSubmit, setPendingSubmit] = useState(null);
  const [serverRetry, setServerRetry] = useState(false);
  const [qPage, setQPage] = useState(0);
  const QUESTIONS_PER_PAGE = 15;
  useEffect(() => { setQPage(0); }, [examId]);

  const cooldownRef = useRef(false);
  const resizeCooldownRef = useRef(false);
  const resizeTimerRef = useRef(null);
  const startTimeRef = useRef(null);
  const handleSubmitRef = useRef(null);
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
  const lastPersistRef = useRef(0);

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
    localStorage.setItem('exam_id', examId);
    api.getExam(examId).then(data => {
      setExamData(data);
      setTotalSeconds(data.time_limit * 60);
      setLoading(false);
      localStorage.setItem('cached_exam_' + examId, JSON.stringify(data));
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
  }, [examId]);

  // Restore saved state
  useEffect(() => {
    if (!examData) return;
    try {
      const saved = JSON.parse(localStorage.getItem('exam_state_' + examId));
      if (saved && saved.name) {
        setName(saved.name);
        setSection(saved.section || '');
        if (saved.studentId) setStudentId(saved.studentId);
        if (saved.sessionId) { sessionIdRef.current = saved.sessionId; setSessionId(saved.sessionId); }
        if (saved.accessCode) setAccessCode(saved.accessCode);
        // Don't restore date from saved state since it's a new day
        if (saved.answers) setAnswers(saved.answers);
        if (saved.answered) setAnsweredSet(new Set(saved.answered));
        if (saved.tabSwitches) setTabSwitches(saved.tabSwitches);
        if (saved.totalSeconds) setTotalSeconds(saved.totalSeconds);
        if (saved.startedAt) startTimeRef.current = saved.startedAt;
        if (saved.submitReason) setSubmitReason(saved.submitReason);
        if (saved.submitted) {
          setSubmitted(true);
          setStarted(true);
        }
      }
    } catch (e) {}
  }, [examData]);

  // Online/offline detection
  useEffect(() => {
    const onOnline = () => setOffline(false);
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
    const retry = async () => {
      try {
        const res = await api.submitScore(pendingSubmit);
        // Server is authoritative — update local score if it recomputed differently
        if (res && typeof res.score === 'number') {
          setResults(prev => prev ? { ...prev, total: res.score, totalQ: res.total ?? prev.totalQ } : prev);
        }
        localStorage.removeItem('pending_submission_' + examId);
        // Keep a backup of the now-confirmed submission
        try { localStorage.setItem('exam_backup_' + examId, JSON.stringify({ answers: pendingSubmit.answers, at: Date.now() })); } catch {}
        setPendingSubmit(null);
        toast('Submission saved!', 'Your score has been recorded.');
      } catch (e) {
        // Server guard for empty overwrite → previous non-zero preserved, clear stale pending
        if (e.status === 400 && e.message && e.message.toLowerCase().includes('no answers')) {
          localStorage.removeItem('pending_submission_' + examId);
          setPendingSubmit(null);
          toast('Previous score preserved', e.message);
        }
      }
    };
    retry();
  }, [pendingSubmit, offline, examId]);

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
        if (r.allowed) toast('Retake granted', 'Your instructor has allowed you to retry. Tap Retry Exam.');
        else toast('Not yet allowed', 'Your instructor has not granted a retake. Please wait.');
      })
      .catch(() => toast('Cannot check', 'Could not reach the server. Check your connection.'));
  }, [examId, studentId, name, section]);

  // Heartbeat: keeps the live session alive and detects admin kicks.
  useEffect(() => {
    if (!started || submitted || !sessionIdRef.current || !examId) return;
    const beat = async () => {
      if (kickedRef.current || document.hidden) return;
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
      } catch {}
    };
    beat();
    const t = setInterval(beat, 15000);
    return () => clearInterval(t);
  }, [started, submitted, examId, tabSwitches, offline]);

  // Tab switch & split-screen detection
  useEffect(() => {
    if (!started || submitted) return;
    const trigger = (source) => {
      if (cooldownRef.current) return;
      cooldownRef.current = true;
      setTimeout(() => { cooldownRef.current = false; }, 1000);
      setTabSwitches(prev => {
        const next = prev + 1;
        if (next >= 3) {
          toast('3rd Violation — Exam Auto-Submitted', 'You switched away too many times.');
          setTimeout(() => handleSubmitRef.current('tab'), 1500);
        } else {
          toast('You ' + source + '!', 'Violation #' + next + ' of 3 — Next will auto-submit.');
        }
        return next;
      });
    };
    const onVis = () => { if (document.hidden) trigger('left the exam tab'); };
    const onBlur = () => trigger('switched away from the exam window');
    const onFSChange = () => {
      if (document.fullscreenElement) {
        fsWasActiveRef.current = true;
        setFsBlocked(false);
      } else if (fsSupportedRef.current && fsWasActiveRef.current) {
        setFsBlocked(true);
        trigger('exited fullscreen mode');
      }
    };
    const onResize = () => {
      if (resizeCooldownRef.current) return;
      const ratio = window.outerWidth / window.screen.availWidth;
      if (window.screen.availWidth >= 1024 && ratio < 0.55) {
        resizeCooldownRef.current = true;
        setTimeout(() => { resizeCooldownRef.current = false; }, 5000);
        trigger('resized the window (possible split-screen)');
      }
    };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('blur', onBlur);
    window.addEventListener('resize', onResize);
    document.addEventListener('fullscreenchange', onFSChange);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('blur', onBlur);
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
    } catch (e) {
      setLookupState('notfound');
      setRosterInfo(null);
      setGateError(e.message || 'Student not found in the class roster.');
    }
  };

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
    // Finding 3 fix: if questions were locked (access_code/status), re-fetch with code to get them
    let qsSource = examData.questions || [];
    if ((!qsSource.length || examData.questions_locked) && examData.has_access_code) {
      try {
        const refreshed = await api.getExam(examId, accessCode.trim());
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
    if (!qsSource.length && examData.questions_locked) {
      setGateError('This exam is not yet available — please check the schedule or access code.');
      return;
    }
    const s = hashStr(effName.toLowerCase().replace(/\s/g, '') + effSection.toLowerCase() + examId);
    setSeed(s);
    const qs = qsSource;
    startTimeRef.current = Date.now();
    setStarted(true);
    enterFullscreen();
    // Preserve any restored draft (closing the browser keeps answers in localStorage).
    // For a truly fresh start answers/answeredSet are empty anyway.
    localStorage.setItem('exam_state_' + examId, JSON.stringify({ name: effName, section: effSection, studentId: studentId.trim().toUpperCase(), sessionId: sessionIdRef.current, accessCode: accessCode.trim(), answers, answered: Array.from(answeredSet), tabSwitches, totalSeconds: examData.time_limit * 60, startedAt: startTimeRef.current, submitted: false, submitReason: 'manual' }));
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
    localStorage.setItem('exam_state_' + examId, JSON.stringify({
      name, section, studentId: studentId.trim().toUpperCase(), sessionId: sessionIdRef.current, accessCode: accessCode.trim(), answers, answered: Array.from(answeredSet),
      tabSwitches, totalSeconds, startedAt: startTimeRef.current, submitted: false, submitReason,
    }));
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
      }));
    }
  }, [started, submitted, name, section, studentId, tabSwitches, accessCode, submitReason, examId]);

  const handleSubmit = useCallback(async (reason = 'manual') => {
    if (submitted) return;
    // Always read from refs so A->B flicker in the same tick is not lost
    const curAnswers = answersRef.current || answers;
    const curAnsweredSet = answeredSetRef.current || answeredSet;
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
    const qs = questions;
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

    localStorage.setItem('exam_state_' + examId, JSON.stringify({
      name, section, studentId: studentId.trim().toUpperCase(), sessionId: sessionIdRef.current, accessCode: accessCode.trim(), answers: curAnswers, answered: Array.from(curAnsweredSet),
      tabSwitches, totalSeconds, startedAt: startTimeRef.current, submitted: true, submitReason: reason,
    }));

    const payload = {
      exam_id: examId, student_name: name, student_section: section, student_id: studentId.trim().toUpperCase(),
      seed: String(seed), answers: curAnswers, score: total, total: qs.length,
      tab_switches: tabSwitches, time_taken: timeTaken, started_at: startTimeRef.current || 0, reason,
      answer_scheme: 'fixed',
    };

    try {
      const res = await api.submitScore(payload);
      // Server recomputes score authoritatively — update UI if it differs (fill_blank parity, tamper)
      if (res && typeof res.score === 'number' && res.score !== total) {
        setResults(prev => prev ? { ...prev, total: res.score, totalQ: res.total ?? prev.totalQ } : prev);
        total = res.score;
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
        }));
        setSubmitting(false);
        return;
      }
      if (e.status === 409) {
        toast('Already submitted', e.message || 'You have already submitted. Ask your instructor to allow a retry.');
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
    return res.session_id;
  };

  const saveExamState = (overrides) => {
    localStorage.setItem('exam_state_' + examId, JSON.stringify({
      name, section, studentId: studentId.trim().toUpperCase(), sessionId: sessionIdRef.current, accessCode: accessCode.trim(),
      answers, answered: Array.from(answeredSet), tabSwitches, totalSeconds, startedAt: startTimeRef.current,
      submitted: false, submitReason: 'manual', ...overrides,
    }));
  };

  const continueExam = async () => {
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
    setQuestions(shuffleWithSeed(examData.questions || [], s));
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
    enterFullscreen();
    saveExamState({ answers, answered: Array.from(answeredSet) });
  };

  const retryExam = async () => {
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
    setQuestions(shuffleWithSeed(examData.questions || [], s));
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

  // Keep ref in sync with latest handleSubmit
  useEffect(() => { handleSubmitRef.current = handleSubmit; }, [handleSubmit]);

  const answeredCount = answeredSet.size;
  const totalQ = questions.length;

  if (loading) {
    return <div className="min-h-screen bg-canvas flex items-center justify-center text-[18px] text-muted">Loading exam...</div>;
  }
  if (error) {
    return <div className="min-h-screen bg-canvas flex items-center justify-center text-[18px] text-danger px-6 text-center">Error: {error}</div>;
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
  const isClosedStatus = status === 'draft' || status === 'archived' || status === 'closed' ||
    (status === 'scheduled' && examData?.start_at && new Date(examData.start_at).getTime() > Date.now());
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
              <h2 className="text-[17px] font-bold text-navy-800 mb-1.5">Start the exam</h2>
              <p className="text-[13px] text-muted mb-6 leading-relaxed">Enter your details to begin. Keep your ID handy.</p>

              {offline && (
                <div className="flex items-center gap-2 bg-warning-bg border border-warning/15 rounded-xl px-3.5 py-2.5 mb-5 text-[12px] text-warning">
                  <WifiOff size={14} /> You are offline — your answers will be saved locally and submitted when connection restores.
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
                          onChange={e => { setStudentId(e.target.value.toUpperCase()); setLookupState('idle'); }}
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
                      <Input label="Access Code" value={accessCode} onChange={e => setAccessCode(e.target.value)}
                        placeholder="Ask your proctor for the code" autoComplete="off" className="!font-mono !uppercase !tracking-wide !bg-canvas focus:!bg-surface" />
                    )}
                  </>
                ) : (
                  <>
                    <Input label="Student ID Number" value={studentId} onChange={e => setStudentId(e.target.value)}
                      placeholder="e.g. 2019-12345" autoComplete="off" className="!font-mono !tracking-wide !bg-canvas focus:!bg-surface" />
                    <Input label="Full Name (Last Name, First Name, M.I.)" value={name} onChange={e => setName(e.target.value)}
                      placeholder="e.g. Dela Cruz, Juan A." autoComplete="off" className="!bg-canvas focus:!bg-surface" />
                    <Input label="Section" value={section} onChange={e => setSection(e.target.value)}
                      placeholder="e.g. BSCS 2-A" autoComplete="off" className="!bg-canvas focus:!bg-surface" />
                    {examData?.has_access_code && (
                      <Input label="Access Code" value={accessCode} onChange={e => setAccessCode(e.target.value)}
                        placeholder="Ask your proctor for the code" autoComplete="off" className="!font-mono !uppercase !tracking-wide !bg-canvas focus:!bg-surface" />
                    )}
                  </>
                )}
              </div>
              <div className="flex items-center gap-2 text-[12px] text-faint mb-4">
                <Calendar size={13} /> {date}
              </div>
              {gateError && <div className="text-[12px] text-danger mb-3 flex items-center gap-1.5"><AlertTriangle size={12} /> {gateError}</div>}
              <Button className="!w-full !py-3.5 !text-[15px]" onClick={startExam}>Start Exam →</Button>
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
    const parts = [...new Set(questions.map(q => q.part))].sort();
    const qpp = Math.ceil(results.totalQ / parts.length);
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
                  const sc = results.partScores[p] || 0;
                  const pct2 = (sc / qpp) * 100;
                  return (
                    <tr key={p} className="border-t border-border">
                      <td className="px-3.5 py-2.5 font-semibold">Part {p}</td>
                      <td className="px-3.5 py-2.5">
                        {sc}/{qpp}
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
          {pendingSubmit && (
            <div className="flex items-center justify-center gap-1.5 text-[12px] text-warning mb-3">
              <WifiOff size={14} /> Score saved locally — will sync when connection restores.
            </div>
          )}
          {(serverRetry || submitReason === 'tab' || submitReason === 'timeout' || submitReason === 'kick') && !submitting && !pendingSubmit && (
            <div className="flex flex-col gap-2.5 mb-5">
              <div className="flex items-center justify-center gap-1.5 text-[12px] text-warning">
                <AlertTriangle size={13} /> This exam was submitted automatically ({submitReason === 'tab' ? 'tab switch' : submitReason === 'timeout' ? 'time ran out' : submitReason === 'kick' ? 'session closed by proctor' : 'retry granted by proctor'}).
              </div>
              {(submitReason === 'tab' || submitReason === 'kick') && (
                <Button variant="outline" onClick={continueExam}>Continue Exam</Button>
              )}
              <Button onClick={retryExam}>Retry Exam</Button>
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
              {serverRetry || submitReason === 'tab' || submitReason === 'timeout' || submitReason === 'kick' ? 'Exam Auto-Submitted' : 'Already Submitted'}
            </h1>
            <p className="text-[14px] text-muted mb-6 leading-relaxed">
              {submitReason === 'tab'
                ? <>You switched away from the exam too many times, so it was submitted automatically.<br />You may continue or retry if you like.</>
                : submitReason === 'timeout'
                  ? <>Time ran out and your exam was submitted automatically.<br />You may retry if you like.</>
                  : submitReason === 'kick'
                    ? <>Your session was closed by the proctor, so your answers were submitted.<br />You may continue or retry if you like.</>
                    : serverRetry
                      ? <>Your instructor has granted you a retake.<br />You may continue or retry if you like.</>
                      : <>You have already submitted this exam.<br />You cannot retake it.</>}
            </p>
            {pendingSubmit && (
              <div className="flex items-center justify-center gap-1.5 text-[12px] text-warning mb-4">
                <WifiOff size={14} /> Score not yet synced — will upload when connected.
              </div>
            )}
            {(serverRetry || submitReason === 'tab' || submitReason === 'timeout' || submitReason === 'kick') && !pendingSubmit && (
              <div className="flex flex-col gap-2.5 mb-6">
                {(submitReason === 'tab' || submitReason === 'kick' || serverRetry) && (
                  <Button variant="outline" onClick={continueExam}>Continue Exam</Button>
                )}
                <Button onClick={retryExam}>Retry Exam</Button>
              </div>
            )}
            {!serverRetry && submitReason !== 'tab' && submitReason !== 'timeout' && submitReason !== 'kick' && !pendingSubmit && (
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
            {!submitted && <Timer initialSeconds={totalSeconds} onExpire={() => handleSubmit('timeout')} onTick={handleTimerTick} />}
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

      <main className="max-w-[860px] mx-auto px-4 py-6 pb-28">
        <div className="flex flex-col gap-4">
          {questions.slice(qPage * QUESTIONS_PER_PAGE, (qPage + 1) * QUESTIONS_PER_PAGE).map((q, idx) => {
            const i = qPage * QUESTIONS_PER_PAGE + idx;
            return (
            <div key={q.id} id={`q-${q.id}`} className="scroll-mt-28">
              <QuestionCard
                question={q}
                index={i}
                seed={seed}
                onAnswer={handleAnswer}
                submitted={submitted || reviewMode}
                chosenKey={answers[q.id]}
                showAnswers={examData?.show_answers !== 0}
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

        <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-surface border border-border rounded-[16px] p-4 shadow-card sticky bottom-4 sm:static sm:mt-8 sm:rounded-[14px]">
          <div className="text-[13px] text-muted">
            <span className="font-semibold text-navy-800">{answeredCount}</span>/{totalQ} answered
            {totalQ - answeredCount > 0 ? <span className="text-warning font-medium"> · {totalQ - answeredCount} unanswered</span> : <span className="text-success font-medium"> · All done</span>}
            {tabSwitches > 0 && <span className="hidden sm:inline text-faint"> · {tabSwitches}/3 violations</span>}
          </div>
          <div className="flex gap-2">
            {!submitted && !submitting && (
              <Button className="!flex-1 sm:!flex-none !px-8 !py-3 !text-[15px]" onClick={() => setShowConfirm(true)}>Submit Exam</Button>
            )}
            {reviewMode && (
              <Button variant="outline" icon={ArrowLeft} className="!flex-1 sm:!flex-none" onClick={() => setReviewMode(false)}>Back to Results</Button>
            )}
          </div>
        </div>
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
