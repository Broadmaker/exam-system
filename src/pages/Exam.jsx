import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { hashStr, shuffleWithSeed, parseChoices, matchesAnswer } from '../utils';
import ToastContainer, { toast } from '../components/Toast';
import Timer from '../components/Timer';
import QuestionCard from '../components/QuestionCard';
import PublicLayout from '../components/PublicLayout';
import { Button, Input, ConfirmDialog } from '../components/ui';
import '../styles.css';
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
        await api.submitScore(pendingSubmit);
        localStorage.removeItem('pending_submission_' + examId);
        setPendingSubmit(null);
        toast('Submission saved!', 'Your score has been recorded.');
      } catch {}
    };
    retry();
  }, [pendingSubmit, offline, examId]);

  // When the student has already submitted, check with the server whether a
  // retry is currently allowed (auto-submitted, or granted by the proctor).
  useEffect(() => {
    if (!submitted || !name || !studentId) return;
    api.getRetryStatus(examId, studentId.trim().toUpperCase(), name.trim(), section.trim())
      .then(r => setServerRetry(!!r.allowed))
      .catch(() => setServerRetry(false));
  }, [submitted, examId, name, section, studentId]);

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
    if (examData?.deadline && new Date(examData.deadline).getTime() <= Date.now()) {
      setGateError('This exam has already ended. The deadline has passed.');
      return;
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
      const res = await api.startSession(examId, {
        student_id: studentId.trim().toUpperCase(),
        student_name: name.trim(),
        student_section: section.trim(),
        access_code: accessCode.trim(),
        device_id: deviceId,
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
    const s = hashStr(effName.toLowerCase().replace(/\s/g, '') + effSection.toLowerCase() + examId);
    setSeed(s);
    const qs = examData.questions || [];
    setQuestions(shuffleWithSeed(qs, s));
    startTimeRef.current = Date.now();
    setStarted(true);
    enterFullscreen();
    localStorage.setItem('exam_state_' + examId, JSON.stringify({ name: effName, section: effSection, studentId: studentId.trim().toUpperCase(), sessionId: sessionIdRef.current, accessCode: accessCode.trim(), answers, answered: [], tabSwitches: 0, totalSeconds: examData.time_limit * 60, startedAt: startTimeRef.current, submitted: false, submitReason: 'manual' }));
  };

  const handleAnswer = useCallback((qid, displayKey) => {
    const empty = displayKey === undefined || String(displayKey).trim() === '';
    setAnswers(prev => {
      const next = { ...prev };
      if (empty) delete next[qid];
      else next[qid] = displayKey;
      return next;
    });
    setAnsweredSet(prev => {
      const n = new Set(prev);
      if (empty) n.delete(qid);
      else n.add(qid);
      return n;
    });
  }, []);

  const handleTimerTick = useCallback((s) => {
    setTotalSeconds(s);
    // Debounced save
    if (started && !submitted) {
      localStorage.setItem('exam_state_' + examId, JSON.stringify({
        name, section: section, studentId: studentId.trim().toUpperCase(), sessionId: sessionIdRef.current, accessCode: accessCode.trim(), answers, answered: Array.from(answeredSet),
        tabSwitches, totalSeconds: s, startedAt: startTimeRef.current, submitted: false, submitReason,
      }));
    }
  }, [started, submitted, name, section, studentId, answers, answeredSet, tabSwitches, accessCode, submitReason, examId]);

  const handleSubmit = useCallback(async (reason = 'manual') => {
    if (submitted) return;
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
        isCorrect = matchesAnswer(answers[q.id], q.answer);
      } else {
        const choices = parseChoices(q.choices);
        const choiceSeed = Number(seed) + idx * 7919;
        const shuffled = shuffleWithSeed(choices, choiceSeed).map((c, ci) => ({
          ...c, displayKey: String.fromCharCode(65 + ci),
        }));
        const correctDisplayKey = shuffled.find(c => c.key === q.answer).displayKey;
        const chosen = answers[q.id];
        isCorrect = chosen === correctDisplayKey;
      }
      if (isCorrect) {
        total++;
        partScores[q.part] = (partScores[q.part] || 0) + 1;
      }
    });

    const timeTaken = startTimeRef.current
      ? Math.floor((Date.now() - startTimeRef.current) / 1000)
      : examData.time_limit * 60 - totalSeconds;
    setResults({ total, totalQ: qs.length, partScores, timeTaken });

    localStorage.setItem('exam_state_' + examId, JSON.stringify({
      name, section, studentId: studentId.trim().toUpperCase(), sessionId: sessionIdRef.current, accessCode: accessCode.trim(), answers, answered: Array.from(answeredSet),
      tabSwitches, totalSeconds, startedAt: startTimeRef.current, submitted: true, submitReason: reason,
    }));

    const payload = {
      exam_id: examId, student_name: name, student_section: section, student_id: studentId.trim().toUpperCase(),
      seed: String(seed), answers, score: total, total: qs.length,
      tab_switches: tabSwitches, time_taken: timeTaken, started_at: startTimeRef.current || 0, reason,
    };

    try {
      await api.submitScore(payload);
      if (sessionIdRef.current) api.endSession(examId, { session_id: sessionIdRef.current }).catch(() => {});
      sessionIdRef.current = '';
      localStorage.removeItem('exam_session_' + examId);
    } catch (e) {
      if (e.message && e.message.toLowerCase().includes('ended')) {
        toast('Exam ended', 'The exam deadline has passed, so your score could not be recorded.');
      } else {
        localStorage.setItem('pending_submission_' + examId, JSON.stringify(payload));
        setPendingSubmit(payload);
      }
    }
    setSubmitting(false);
    setSubmitted(true);
  }, [submitted, questions, answers, name, section, seed, tabSwitches, totalSeconds, answeredSet, accessCode, examId]);

  // Re-open a session so the student can continue or retry an auto-submitted exam.
  const reopenSession = async () => {
    if (sessionIdRef.current) await api.endSession(examId, { session_id: sessionIdRef.current }).catch(() => {});
    const res = await api.startSession(examId, {
      student_id: studentId.trim().toUpperCase(),
      student_name: name.trim(),
      student_section: section.trim(),
      access_code: accessCode.trim(),
      device_id: deviceId,
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
    localStorage.removeItem('pending_submission_' + examId);
    setPendingSubmit(null);
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

  // ── Deadline Check ──
  let resumedInProgress = false;
  try {
    const saved = JSON.parse(localStorage.getItem('exam_state_' + examId));
    if (saved && !saved.submitted && saved.startedAt) {
      const dlMs = examData?.deadline ? new Date(examData.deadline).getTime() : Infinity;
      if (saved.startedAt < dlMs) resumedInProgress = true;
    }
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

  // ── Gate Screen ──
  if (!started) {
    return (
      <PublicLayout>
        <div className="flex-1 flex items-stretch justify-center"
          style={{ background: 'linear-gradient(135deg, #0b1b3a 0%, #1a4fad 100%)' }}>
          <div className="max-w-[1000px] mx-auto w-full px-4 py-10 grid lg:grid-cols-[1fr_480px] gap-8 items-center">
            {/* Exam info panel */}
            <div className="text-white hidden lg:block">
              <span className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center mb-5"><ClipboardList size={24} className="text-accent" /></span>
              <div className="text-[11px] font-mono tracking-[.14em] text-accent uppercase mb-2">{examId?.slice(0, 8)}</div>
              <h1 className="text-[34px] font-bold leading-tight mb-3">{examData?.title}</h1>
              <p className="text-white/70 text-[15px] leading-relaxed mb-8">
                {(examData?.questions?.length || 0)} items · {examData?.time_limit} minutes
                {examData?.deadline && <span className="block mt-1">Deadline: {new Date(examData.deadline).toLocaleString()}</span>}
              </p>
              <div className="bg-white/5 border border-white/10 rounded-xl px-5 py-4 mb-8 text-[13px] text-white/80 leading-relaxed">
                <strong className="flex items-center gap-1.5 mb-2 text-white text-[11px] tracking-[.08em] uppercase"><ShieldCheck size={14} /> Exam Rules</strong>
                Answer all items. Questions are randomized per student.<br />
                You may not go back once the exam is submitted.<br />
                <span className="inline-flex items-center gap-1.5 mt-1.5"><Ban size={13} className="text-warning" /> Locked to fullscreen — exiting counts as a violation.</span><br />
                <span className="inline-flex items-center gap-1.5"><Ban size={13} className="text-warning" /> Leaving this tab 3 times auto-submits.</span>
              </div>
              <div className="flex flex-col gap-2.5 max-w-[380px]">
                <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                  <span className="w-8 h-8 rounded-lg bg-success-bg text-success flex items-center justify-center shrink-0"><Shuffle size={16} /></span>
                  <div>
                    <div className="text-[13px] font-semibold">Randomized per student</div>
                    <div className="text-[11px] text-white/50">Order and choices are shuffled by your seed.</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                  <span className="w-8 h-8 rounded-lg bg-warning-bg text-warning flex items-center justify-center shrink-0"><TimerIcon size={16} /></span>
                  <div>
                    <div className="text-[13px] font-semibold">{examData?.time_limit} minute limit</div>
                    <div className="text-[11px] text-white/50">The timer runs continuously once you start.</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Gate form */}
            <div className="bg-surface rounded-[18px] w-full shadow-modal p-6 sm:p-8">
              <div className="lg:hidden font-mono text-[11px] tracking-[.14em] text-navy-700 uppercase mb-2">{examId?.slice(0, 8)}</div>
              <h1 className="lg:hidden text-[24px] font-semibold text-navy-800 mb-1.5">{examData?.title}</h1>
              <p className="lg:hidden text-[13px] text-muted mb-6 leading-relaxed">{(examData?.questions?.length || 0)} items · {examData?.time_limit} minutes</p>
              <h2 className="text-[17px] font-bold text-navy-800 mb-1.5">Start the exam</h2>
              <p className="text-[13px] text-muted mb-6 leading-relaxed">Enter your details to begin. Keep your ID handy.</p>

              {offline && (
                <div className="flex items-center gap-2 bg-warning-bg border-[1.5px] border-warning rounded-lg px-3.5 py-2.5 mb-5 text-[12px] text-warning">
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
                          className="input !font-mono !tracking-wide flex-1"
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
                        <div className="bg-success-bg border border-success rounded-lg px-3.5 py-2.5 mt-2 text-[13px]">
                          <div className="font-semibold text-success">{rosterInfo.student_name}</div>
                          <div className="text-[12px] text-muted">{rosterInfo.student_id}{rosterInfo.student_section ? ' · ' + rosterInfo.student_section : ''}</div>
                        </div>
                      )}
                    </div>
                    {examData?.has_access_code && (
                      <Input label="Access Code" value={accessCode} onChange={e => setAccessCode(e.target.value)}
                        placeholder="Ask your proctor for the code" autoComplete="off" className="!font-mono !uppercase !tracking-wide" />
                    )}
                  </>
                ) : (
                  <>
                    <Input label="Student ID Number" value={studentId} onChange={e => setStudentId(e.target.value)}
                      placeholder="e.g. 2019-12345" autoComplete="off" className="!font-mono !tracking-wide" />
                    <Input label="Full Name (Last Name, First Name, M.I.)" value={name} onChange={e => setName(e.target.value)}
                      placeholder="e.g. Dela Cruz, Juan A." autoComplete="off" />
                    <Input label="Section" value={section} onChange={e => setSection(e.target.value)}
                      placeholder="e.g. BSCS 2-A" autoComplete="off" />
                    {examData?.has_access_code && (
                      <Input label="Access Code" value={accessCode} onChange={e => setAccessCode(e.target.value)}
                        placeholder="Ask your proctor for the code" autoComplete="off" className="!font-mono !uppercase !tracking-wide" />
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
            <Button onClick={() => window.location.href = '/'} icon={ArrowLeft} className="!px-10 !py-3.5">Back to Home</Button>
          </div>
        </div>
      </PublicLayout>
    );
  }

  // ── Exam Screen ──
  return (
    <div>
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
        <div className="bg-warning text-white px-4 py-2 text-center text-[12px] font-semibold flex items-center justify-center gap-1.5">
          <WifiOff size={14} /> You are offline — answers are saved locally. Connect to submit.
        </div>
      )}
      <header className="bg-navy-900 text-white px-4 sm:px-6 pb-4 pt-safe flex items-center justify-between gap-4 sticky top-0 z-[100] shadow-card flex-wrap">
        <div className="min-w-0">
          <div className="font-mono text-[10px] tracking-[.12em] text-accent uppercase mb-0.5 truncate max-w-[180px]">
            {examData?.title}
          </div>
          <div className="text-[15px] font-semibold">{name}</div>
          <div className="text-[11px] text-white/50">{section}</div>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="text-right">
            <div className="text-[10px] text-white/50 mb-1">{answeredCount} / {totalQ} answered</div>
            <div className="bg-white/15 rounded h-1.5 w-[120px] overflow-hidden">
              <div className="h-full bg-accent rounded transition-all duration-300" style={{ width: totalQ > 0 ? ((answeredCount / totalQ) * 100) + '%' : '0%' }} />
            </div>
          </div>
          {!submitted && <Timer initialSeconds={totalSeconds} onExpire={() => handleSubmit('timeout')} onTick={handleTimerTick} />}
        </div>
      </header>

      <main className="max-w-[860px] mx-auto px-4 py-6 pb-20">
        {questions.map((q, i) => (
          <QuestionCard
            key={q.id}
            question={q}
            index={i}
            seed={seed}
            onAnswer={handleAnswer}
            submitted={submitted || reviewMode}
            chosenKey={answers[q.id]}
            showAnswers={examData?.show_answers !== 0}
          />
        ))}
        <div className="text-center mt-12">
          {!submitted && !submitting && (
            <Button className="!px-12 !py-4 !text-[16px]" onClick={() => setShowConfirm(true)}>Submit Exam</Button>
          )}
          {reviewMode && (
            <Button variant="outline" icon={ArrowLeft} className="mt-3" onClick={() => setReviewMode(false)}>Back to Results</Button>
          )}
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
