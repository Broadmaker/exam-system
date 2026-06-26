import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import '../styles.css';
import { Trophy, RefreshCw, ArrowLeft, ChevronDown } from 'lucide-react';

export default function Leaderboard() {
  const [exams, setExams] = useState([]);
  const [examId, setExamId] = useState('');
  const [entries, setEntries] = useState([]);
  const [examTitle, setExamTitle] = useState('');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    api.listExams().then(setExams).catch(() => {});
    const saved = localStorage.getItem('lb_exam');
    if (saved) setExamId(saved);
  }, []);

  useEffect(() => {
    if (!examId) return;
    localStorage.setItem('lb_exam', examId);
    api.getExam(examId).then(d => setExamTitle(d.title)).catch(() => {});
    refresh();
    const iv = setInterval(refresh, 15000);
    return () => clearInterval(iv);
  }, [examId]);

  async function refresh() {
    if (!examId) return;
    try {
      const data = await api.getLeaderboard(examId);
      setEntries(data);
    } catch (e) {}
  }

  return (
    <div>
      <header className="app-header">
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Trophy size={20} /> Live Scoreboard</h1>
          <p style={{ fontSize: 13, color: '#9ab', marginTop: 4 }}>{examTitle || 'Select an exam'}</p>
        </div>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 4 }}><ArrowLeft size={14} /> Home</Link>
      </header>

      <main style={{ maxWidth: 800, margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <button type="button" onClick={() => setOpen(!open)}
              onBlur={e => { setTimeout(() => setOpen(false), 150); e.currentTarget.style.borderColor = '#d0ddf0'; e.currentTarget.style.boxShadow = '0 1px 4px rgba(15,32,68,.06)'; }}
              style={{
                width: '100%', padding: '11px 40px 11px 16px', borderRadius: 10, fontSize: 14,
                fontFamily: 'inherit', border: '2px solid #d0ddf0', background: '#f5f8ff',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                color: examId ? '#1a2a3a' : '#9ab', fontWeight: examId ? 500 : 400,
                transition: 'border-color .2s, box-shadow .2s',
                boxShadow: '0 1px 4px rgba(15,32,68,.06)',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = '#1a4fad'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(26,79,173,.12)'; }}>
              <span>{examId ? (examTitle || 'Loading...') : '— Select an exam —'}</span>
              <ChevronDown size={18} style={{ transition: 'transform .2s', transform: open ? 'rotate(180deg)' : 'none' }} />
            </button>
            {open && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
                background: '#fff', border: '1.5px solid #d0ddf0', borderRadius: 10,
                boxShadow: '0 8px 24px rgba(15,32,68,.12)', zIndex: 50, overflow: 'hidden',
              }}>
                {exams.length === 0 ? (
                  <div style={{ padding: '14px 16px', color: '#9ab', fontSize: 13, textAlign: 'center' }}>No exams available</div>
                ) : (
                    exams.map(e => (
                      <div key={e.id} onMouseDown={() => { setExamId(e.id); setOpen(false); }}
                      style={{
                        padding: '11px 16px', cursor: 'pointer', fontSize: 14,
                        background: e.id === examId ? '#ddeeff' : 'transparent',
                        color: e.id === examId ? '#1a4fad' : '#1a2a3a',
                        fontWeight: e.id === examId ? 600 : 400,
                        borderBottom: '1px solid #eef2f7', transition: 'background .1s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f5f8ff'}
                      onMouseLeave={e => e.currentTarget.style.background = e.id === examId ? '#ddeeff' : 'transparent'}>
                      {e.title}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
          <button onClick={refresh} className="btn"><RefreshCw size={14} /> Refresh</button>
          <span style={{ fontSize: 13, color: '#5a7090' }}>{entries.length} participant(s)</span>
        </div>

        {!entries.length ? (
          <div style={{ textAlign: 'center', color: '#5a7090', padding: '60px 20px', fontSize: 15 }}>
            No scores yet. Be the first to take the exam!
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', border: '1px solid #c8d8f0', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 12px rgba(15,32,68,.06)' }}>
            <thead>
              <tr style={{ background: '#0f2044', color: '#fff', fontSize: 10, textTransform: 'uppercase', letterSpacing: '.08em' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left' }}>#</th>
                <th style={{ padding: '12px 16px', textAlign: 'left' }}>Student</th>
                <th style={{ padding: '12px 16px', textAlign: 'left' }}>Section</th>
                <th style={{ padding: '12px 16px', textAlign: 'center' }}>Score</th>
                <th style={{ padding: '12px 16px', textAlign: 'left' }}>Time</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e, i) => {
                const mins = Math.floor(e.time_taken / 60);
                const secs = e.time_taken % 60;
                const pct = ((e.score / e.total) * 100).toFixed(0);
                const rankColor = i === 0 ? '#e8a020' : i === 1 ? '#5a7090' : i === 2 ? '#b87333' : '#0f2044';
                return (
                  <tr key={i} style={{ borderTop: '1px solid #c8d8f0' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: rankColor, fontFamily: "'IBM Plex Mono', monospace", fontSize: 16 }}>{i + 1}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 600 }}>{e.student_name}</td>
                    <td style={{ padding: '12px 16px' }}>{e.student_section}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <span style={{ display: 'inline-block', background: '#d4f5e2', color: '#1a7a4a', fontWeight: 700, padding: '4px 14px', borderRadius: 20, fontSize: 15 }}>
                        {e.score}/{e.total}
                      </span>
                      <div style={{ height: 4, background: '#e0e8f4', borderRadius: 2, marginTop: 4, overflow: 'hidden' }}>
                        <div style={{ height: '100%', background: '#1a4fad', borderRadius: 2, width: pct + '%' }} />
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>{mins}:{String(secs).padStart(2, '0')}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        <div style={{ textAlign: 'center', fontSize: 11, color: '#5a7090', marginTop: 16 }}>
          Live — refreshes automatically
        </div>
      </main>
      <div style={{ textAlign: 'center', fontSize: 11, color: '#5a7090', padding: '20px 24px' }}>
        Exam System v1.0 &nbsp;·&nbsp; © {new Date().getFullYear()} M.K Sanig. All rights reserved.
      </div>
    </div>
  );
}
