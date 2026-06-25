import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { hashStr, shuffleWithSeed, parseChoices } from '../utils';
import ToastContainer, { toast } from '../components/Toast';
import Timer from '../components/Timer';
import QuestionCard from '../components/QuestionCard';
import '../styles.css';
import { AlertTriangle, Ban, ClipboardList, Trophy, CheckCircle, Book, XCircle, ArrowLeft, WifiOff } from 'lucide-react';

export default function Exam() {
  const [params] = useSearchParams();
  const examId = params.get('id');

  const [examData, setExamData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Gate fields
  const [name, setName] = useState('');
  const [section, setSection] = useState('');
  const [date, setDate] = useState('');
  const [gateError, setGateError] = useState('');

  // Exam state
  const [started, setStarted] = useState(false);
  const [submitted, setSubmitted] = useState(false);
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

  const cooldownRef = useRef(false);
  const startTimeRef = useRef(null);

  useEffect(() => {
    if (!examId) { setLoading(false); setError('No exam ID provided'); return; }
    localStorage.setItem('exam_id', examId);
    api.getExam(examId).then(data => {
      setExamData(data);
      setTotalSeconds(data.time_limit * 60);
      setLoading(false);
      localStorage.setItem('cached_exam_' + examId, JSON.stringify(data));
    }).catch(() => {
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
        // Don't restore date from saved state since it's a new day
        if (saved.answers) setAnswers(saved.answers);
        if (saved.answered) setAnsweredSet(new Set(saved.answered));
        if (saved.tabSwitches) setTabSwitches(saved.tabSwitches);
        if (saved.totalSeconds) setTotalSeconds(saved.totalSeconds);
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

  // Tab switch detection
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
          setTimeout(() => handleSubmit(), 1500);
        } else {
          toast('You ' + source + '!', 'Violation #' + next + ' of 3 — Next will auto-submit.');
        }
        return next;
      });
    };
    const onVis = () => { if (document.hidden) trigger('left the exam tab'); };
    const onBlur = () => trigger('switched away from the exam window');
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('blur', onBlur);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('blur', onBlur);
    };
  }, [started, submitted]);

  const startExam = () => {
    if (!name.trim() || !section.trim() || !date.trim()) {
      setGateError('Please fill in all fields.');
      return;
    }
    setGateError('');
    const s = hashStr(name.toLowerCase().replace(/\s/g, '') + section.toLowerCase() + examId);
    setSeed(s);
    const qs = examData.questions || [];
    setQuestions(shuffleWithSeed(qs, s));
    startTimeRef.current = Date.now();
    setStarted(true);
    localStorage.setItem('exam_state_' + examId, JSON.stringify({ name, section, answers, answered: [], tabSwitches: 0, totalSeconds: examData.time_limit * 60, submitted: false }));
  };

  const handleAnswer = useCallback((qid, displayKey) => {
    setAnswers(prev => ({ ...prev, [qid]: displayKey }));
    setAnsweredSet(prev => { const n = new Set(prev); n.add(qid); return n; });
  }, []);

  const handleTimerTick = useCallback((s) => {
    setTotalSeconds(s);
    // Debounced save
    if (started && !submitted) {
      localStorage.setItem('exam_state_' + examId, JSON.stringify({
        name, section: section, answers, answered: Array.from(answeredSet),
        tabSwitches, totalSeconds: s, submitted: false,
      }));
    }
  }, [started, submitted, name, section, answers, answeredSet, tabSwitches, examId]);

  const handleSubmit = useCallback(async () => {
    if (submitted) return;
    setSubmitting(true);
    setShowConfirm(false);

    let total = 0;
    const partScores = {};
    const qs = questions;
    qs.forEach(q => {
      const qData = parseChoices(q.choices);
      const correctKey = qData.find(c => c.key === q.answer)?.key;
      const chosen = answers[q.id];
      const isCorrect = chosen === correctKey || chosen === q.answer;
      if (isCorrect) {
        total++;
        partScores[q.part] = (partScores[q.part] || 0) + 1;
      }
    });

    const timeTaken = Math.floor((Date.now() - startTimeRef.current) / 1000);
    setResults({ total, totalQ: qs.length, partScores, timeTaken });

    localStorage.setItem('exam_state_' + examId, JSON.stringify({
      name, section: '', answers, answered: Array.from(answeredSet),
      tabSwitches, totalSeconds, submitted: true,
    }));

    const payload = {
      exam_id: examId, student_name: name, student_section: section,
      seed: String(seed), answers, score: total, total: qs.length,
      tab_switches: tabSwitches, time_taken: timeTaken,
    };

    try {
      await api.submitScore(payload);
    } catch (e) {
      localStorage.setItem('pending_submission_' + examId, JSON.stringify(payload));
      setPendingSubmit(payload);
    }
    setSubmitting(false);
    setSubmitted(true);
  }, [submitted, questions, answers, name, section, seed, tabSwitches, totalSeconds, answeredSet, examId]);

  const answeredCount = answeredSet.size;
  const totalQ = questions.length;

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 60, fontSize: 18, color: '#5a7090' }}>Loading exam...</div>;
  }
  if (error) {
    return <div style={{ textAlign: 'center', padding: 60, fontSize: 18, color: '#c0392b' }}>Error: {error}</div>;
  }

  // ── Gate Screen ──
  if (!started) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 16px', background: 'linear-gradient(135deg, #0f2044 0%, #1a4fad 100%)' }}>
        <div style={{ background: '#fff', borderRadius: 18, padding: '48px 40px', maxWidth: 480, width: '100%', boxShadow: '0 24px 64px rgba(0,0,0,.35)' }}>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: '.14em', color: '#1a4fad', textTransform: 'uppercase', marginBottom: 8 }}>
            {examId?.slice(0, 8)}
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 600, color: '#0f2044', marginBottom: 6 }}>{examData?.title}</h1>
          <p style={{ fontSize: 13, color: '#5a7090', marginBottom: 32, lineHeight: 1.5 }}>
            {(examData?.questions?.length || 0)} items · {examData?.time_limit} minutes
          </p>
          <div style={{ background: '#ddeeff', border: '1px solid #c8d8f0', borderRadius: 10, padding: '16px 18px', marginBottom: 28, fontSize: 13, color: '#0f2044', lineHeight: 1.7 }}>
            <strong style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, color: '#1a4fad', fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase' }}><ClipboardList size={14} /> Exam Rules</strong>
            Answer all items. Questions are randomized per student.<br />
            You may not go back once the exam is submitted.<br />
            <Ban size={14} /> Leaving this tab 3 times will auto-submit your exam.
          </div>
          {offline && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fff3d4', border: '1px solid #e8a020', borderRadius: 8, padding: '10px 14px', marginBottom: 20, fontSize: 12, color: '#b8860b' }}>
              <WifiOff size={14} /> You are offline — your answers will be saved locally and submitted when connection restores.
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 28 }}>
            {[
              { label: 'Full Name (Last Name, First Name, M.I.)', val: name, set: setName, placeholder: 'e.g. Dela Cruz, Juan A.' },
              { label: 'Section', val: section, set: setSection, placeholder: 'e.g. BSCS 2-A' },
              { label: 'Date', val: date, set: setDate, placeholder: 'e.g. June 25, 2025' },
            ].map(f => (
              <label key={f.label} style={{ fontSize: 12, fontWeight: 600, color: '#0f2044', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {f.label}
                <input value={f.val} onChange={e => f.set(e.target.value)}
                  placeholder={f.placeholder} autoComplete="off"
                  style={{ border: '1.5px solid #c8d8f0', borderRadius: 8, fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 14, padding: '11px 14px', color: '#1a2a3a', outline: 'none' }} />
              </label>
            ))}
          </div>
          {gateError && <div style={{ fontSize: 12, color: '#c0392b', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 4 }}><AlertTriangle size={12} /> {gateError}</div>}
          <button onClick={startExam}
            style={{ width: '100%', background: '#0f2044', color: '#fff', border: 'none', borderRadius: 10, fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 15, fontWeight: 600, padding: 15, cursor: 'pointer' }}>
            Start Exam →
          </button>
        </div>
      </div>
    );
  }

  // ── Results Overlay ──
  if ((submitted || submitting) && results && !reviewMode) {
    const pct = ((results.total / results.totalQ) * 100).toFixed(1);
    const parts = [...new Set(questions.map(q => q.part))].sort();
    const qpp = Math.ceil(results.totalQ / parts.length);
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, background: 'rgba(10,20,40,.7)' }}>
        <div style={{ background: '#fff', borderRadius: 16, padding: '44px 36px', maxWidth: 520, width: '100%', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,.3)', maxHeight: '90vh', overflowY: 'auto' }}>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: '.12em', color: '#5a7090', textTransform: 'uppercase', marginBottom: 6 }}>{name} · {section}</div>
          <div style={{ fontSize: 68, fontWeight: 600, color: '#0f2044', lineHeight: 1, marginBottom: 4 }}>
            {results.total} <span style={{ fontSize: 28, color: '#5a7090' }}>/ {results.totalQ}</span>
          </div>
          <div style={{ fontSize: 26, fontWeight: 600, marginBottom: 16, color: results.total >= results.totalQ * 0.7 ? '#1a7a4a' : results.total >= results.totalQ * 0.5 ? '#e8a020' : '#c0392b' }}>
            {pct}%
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 14, color: '#5a7090', marginBottom: 24, lineHeight: 1.6 }}>
            {results.total >= results.totalQ * 0.9 ? <><Trophy size={16} /> Excellent!</> :
             results.total >= results.totalQ * 0.8 ? <><CheckCircle size={16} /> Very Good!</> :
             results.total >= results.totalQ * 0.7 ? <><Book size={16} /> Good.</> :
             results.total >= results.totalQ * 0.5 ? <><AlertTriangle size={16} /> Needs Improvement.</> : <><XCircle size={16} /> Below passing.</>}
          </div>
          <div style={{ textAlign: 'left', border: '1px solid #c8d8f0', borderRadius: 10, overflow: 'hidden', marginBottom: 24 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead><tr style={{ background: '#0f2044', color: '#fff' }}>
                <th style={{ padding: '8px 14px', textAlign: 'left', fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: '.08em' }}>Part</th>
                <th style={{ padding: '8px 14px', textAlign: 'left' }}>Score</th>
              </tr></thead>
              <tbody>
                {parts.map(p => {
                  const sc = results.partScores[p] || 0;
                  const pct2 = (sc / qpp) * 100;
                  return (
                    <tr key={p} style={{ borderTop: '1px solid #c8d8f0' }}>
                      <td style={{ padding: '9px 14px', fontWeight: 600 }}>Part {p}</td>
                      <td style={{ padding: '9px 14px' }}>
                        {sc}/{qpp}
                        <div style={{ height: 5, background: '#c8d8f0', borderRadius: 3, overflow: 'hidden', marginTop: 4 }}>
                          <div style={{ height: '100%', background: '#1a4fad', borderRadius: 3, width: pct2 + '%' }} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {pendingSubmit && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 12, color: '#e8a020', marginBottom: 12 }}>
              <WifiOff size={14} /> Score saved locally — will sync when connection restores.
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button onClick={() => setReviewMode(true)} className="btn">Review My Answers</button>
            <button onClick={() => window.location.href = '/'} className="btn btn-outline">Back to Home</button>
          </div>
        </div>
      </div>
    );
  }

  // ── Already Submitted (revisit, no saved results) ──
  if (submitted && !results) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, background: 'linear-gradient(135deg, #0f2044 0%, #1a4fad 100%)' }}>
        <div style={{ background: '#fff', borderRadius: 16, padding: '48px 40px', maxWidth: 440, width: '100%', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,.35)' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}><ClipboardList size={48} /></div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0f2044', marginBottom: 10 }}>Already Submitted</h1>
          <p style={{ fontSize: 14, color: '#5a7090', marginBottom: 24, lineHeight: 1.6 }}>
            You have already submitted this exam.<br />You cannot retake it.
          </p>
          {pendingSubmit && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 12, color: '#e8a020', marginBottom: 16 }}>
              <WifiOff size={14} /> Score not yet synced — will upload when connected.
            </div>
          )}
          <button onClick={() => window.location.href = '/'} className="btn" style={{ padding: '14px 40px', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <ArrowLeft size={14} /> Back to Home
          </button>
        </div>
      </div>
    );
  }

  // ── Exam Screen ──
  return (
    <div>
      <ToastContainer />
      {offline && (
        <div style={{ background: '#e8a020', color: '#fff', padding: '8px 16px', textAlign: 'center', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <WifiOff size={14} /> You are offline — answers are saved locally. Connect to submit.
        </div>
      )}
      <header style={{
        background: '#0f2044', color: '#fff', padding: '16px 32px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 20, position: 'sticky', top: 0, zIndex: 100,
        boxShadow: '0 2px 16px rgba(0,0,0,.3)',
      }}>
        <div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: '.12em', color: '#e8a020', textTransform: 'uppercase', marginBottom: 2 }}>
            {examData?.title}
          </div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>{name}</div>
          <div style={{ fontSize: 11, color: '#9ab' }}>{section}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 10, color: '#9ab', marginBottom: 4 }}>{answeredCount} / {totalQ} answered</div>
            <div style={{ background: 'rgba(255,255,255,.15)', borderRadius: 4, height: 5, width: 120, overflow: 'hidden' }}>
              <div style={{ height: '100%', background: '#e8a020', borderRadius: 4, transition: 'width .3s', width: totalQ > 0 ? ((answeredCount / totalQ) * 100) + '%' : '0%' }} />
            </div>
          </div>
          {!submitted && <Timer initialSeconds={totalSeconds} onExpire={handleSubmit} onTick={handleTimerTick} />}
        </div>
      </header>

      <main style={{ maxWidth: 860, margin: '0 auto', padding: '36px 24px 80px' }}>
        {questions.map((q, i) => (
          <QuestionCard
            key={q.id}
            question={q}
            index={i}
            seed={seed}
            onAnswer={handleAnswer}
            submitted={submitted || reviewMode}
            chosenKey={answers[q.id]}
          />
        ))}
        <div style={{ textAlign: 'center', marginTop: 48 }}>
          {!submitted && !submitting && (
            <button onClick={() => setShowConfirm(true)} className="btn" style={{ padding: '16px 48px', fontSize: 16 }}>
              Submit Exam
            </button>
          )}
          {reviewMode && (
            <button onClick={() => setReviewMode(false)} className="btn btn-outline" style={{ marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <ArrowLeft size={14} /> Back to Results
            </button>
          )}
        </div>
      </main>

      {/* Confirm modal */}
      {showConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(10,20,40,.6)', zIndex: 150, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 14, padding: '36px 32px', maxWidth: 380, width: '90%', textAlign: 'center' }}>
            <h3 style={{ fontSize: 18, color: '#0f2044', marginBottom: 10 }}>Submit Exam?</h3>
            <p style={{ fontSize: 13, color: '#5a7090', marginBottom: 24, lineHeight: 1.5 }}>
              {totalQ - answeredCount > 0
                ? `You have ${totalQ - answeredCount} unanswered item(s). Are you sure?`
                : 'All items answered. Ready to submit?'}
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setShowConfirm(false)}
                style={{ flex: 1, padding: 12, borderRadius: 8, fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 14, fontWeight: 600, cursor: 'pointer', border: 'none', background: '#c8d8f0', color: '#0f2044' }}>
                Go Back
              </button>
              <button onClick={handleSubmit}
                style={{ flex: 1, padding: 12, borderRadius: 8, fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 14, fontWeight: 600, cursor: 'pointer', border: 'none', background: '#0f2044', color: '#fff' }}>
                Yes, Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
