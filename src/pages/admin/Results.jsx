import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../../api';
import AuthGate from '../../components/AuthGate';
import '../../styles.css';
import { ClipboardList, BarChart3, Trophy, TrendingDown, Search, RefreshCw, Inbox, ArrowLeft } from 'lucide-react';

export default function Results() {
  return <AuthGate><ResultsInner /></AuthGate>;
}

function ResultsInner() {
  const [params] = useSearchParams();
  const examId = params.get('id');
  const [exam, setExam] = useState(null);
  const [subs, setSubs] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!examId) return;
    setLoading(true);
    const [examData, subsData] = await Promise.all([
      api.getExam(examId).catch(() => null),
      api.getSubmissions(examId).catch(() => []),
    ]);
    setExam(examData);
    setSubs(subsData);
    setLoading(false);
  };

  useEffect(() => { load(); }, [examId]);

  const total = subs.length;
  const avg = total ? (subs.reduce((s, r) => s + r.score, 0) / total) : 0;
  const best = total ? Math.max(...subs.map(r => r.score)) : 0;
  const worst = total ? Math.min(...subs.map(r => r.score)) : 0;

  const filtered = subs
    .filter(r => r.student_name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => b.score - a.score || a.time_taken - b.time_taken);

  const scoreColor = (pct) => {
    if (pct >= 80) return { bg: '#d4f5e2', text: '#1a7a4a' };
    if (pct >= 60) return { bg: '#fff3d4', text: '#b8860b' };
    return { bg: '#ffe0e0', text: '#c0392b' };
  };

  if (loading) {
    return (
      <AuthGate>
        <div style={{ textAlign: 'center', padding: 60, fontSize: 14, color: '#5a7090' }}>Loading results...</div>
      </AuthGate>
    );
  }

  return (
    <div>
      <header className="app-header">
        <h1>{exam ? exam.title : 'Exam Results'}</h1>
        <Link to="/admin" style={{ display: 'flex', alignItems: 'center', gap: 4 }}><ArrowLeft size={14} /> Dashboard</Link>
      </header>

      <main style={{ maxWidth: 1000, margin: '0 auto', padding: '32px 24px' }}>
        {/* Stats Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14, marginBottom: 24 }}>
          {[
            { icon: ClipboardList, num: total, label: 'Submissions', color: '#1a4fad' },
            { icon: BarChart3, num: total ? avg.toFixed(1) : '—', label: 'Average Score', color: '#1a7a4a', suffix: total ? `/ ${subs[0]?.total || 0}` : '' },
            { icon: Trophy, num: best, label: 'Highest Score', color: '#e8a020' },
            { icon: TrendingDown, num: total > 1 ? worst : '—', label: 'Lowest Score', color: '#c0392b' },
          ].map(s => (
            <div key={s.label} style={{
              background: '#fff', border: '1px solid #c8d8f0', borderRadius: 12,
              padding: '20px 20px', textAlign: 'center', transition: 'box-shadow .2s',
            }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(15,32,68,.08)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}><s.icon size={28} color={s.color} /></div>
              <div style={{ fontSize: 30, fontWeight: 700, color: s.num === '—' ? '#9ab' : s.color, lineHeight: 1.1 }}>
                {s.num}
                {s.suffix && <span style={{ fontSize: 14, color: '#5a7090', fontWeight: 400 }}>{s.suffix}</span>}
              </div>
              <div style={{ fontSize: 10, color: '#5a7090', textTransform: 'uppercase', letterSpacing: '.06em', marginTop: 6 }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {/* Search & Refresh */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', display: 'flex', color: '#9ab' }}><Search size={14} /></span>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by student name..."
              style={{
                width: '100%', border: '1.5px solid #c8d8f0', borderRadius: 8,
                padding: '10px 14px 10px 36px', fontSize: 14, fontFamily: 'inherit', outline: 'none',
              }} />
          </div>
          <button onClick={load} className="btn btn-outline" style={{ whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 6 }}><RefreshCw size={14} /> Refresh</button>
        </div>

        {!subs.length ? (
          <div style={{
            textAlign: 'center', color: '#5a7090', padding: '80px 20px',
            background: '#fff', borderRadius: 12, border: '2px dashed #c8d8f0',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}><Inbox size={48} /></div>
            <p style={{ fontSize: 16, fontWeight: 600, color: '#0f2044', marginBottom: 4 }}>No submissions yet</p>
            <p style={{ fontSize: 13 }}>Results will appear here once students take the exam.</p>
          </div>
        ) : !filtered.length ? (
          <div style={{
            textAlign: 'center', color: '#5a7090', padding: '60px 20px',
            background: '#fff', borderRadius: 12, border: '1px solid #c8d8f0',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}><Search size={32} /></div>
            <p style={{ fontSize: 14 }}>No results match "<strong>{search}</strong>"</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid #c8d8f0' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', fontSize: 13 }}>
              <thead>
                <tr style={{
                  background: '#0f2044', color: '#fff', fontSize: 10,
                  textTransform: 'uppercase', letterSpacing: '.08em',
                }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', width: 40 }}>#</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Student</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Section</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Score</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>Tab Switches</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Time</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Submitted</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => {
                  const mins = Math.floor(r.time_taken / 60);
                  const secs = r.time_taken % 60;
                  const pct = ((r.score / r.total) * 100).toFixed(1);
                  const colors = scoreColor(pct);
                  return (
                    <tr key={r.id} style={{
                      borderTop: '1px solid #eef2f7',
                      background: i % 2 === 0 ? '#fff' : '#f8faff',
                      transition: 'background .15s',
                    }}
                      onMouseEnter={e => e.currentTarget.style.background = '#ddeeff'}
                      onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? '#fff' : '#f8faff'}>
                      <td style={{ padding: '12px 16px', fontWeight: 700, color: '#5a7090', fontSize: 11 }}>{i + 1}</td>
                      <td style={{ padding: '12px 16px', fontWeight: 600 }}>{r.student_name}</td>
                      <td style={{ padding: '12px 16px', color: '#5a7090' }}>{r.student_section}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          display: 'inline-block', background: colors.bg, color: colors.text,
                          fontWeight: 600, padding: '3px 12px', borderRadius: 5, fontSize: 12,
                        }}>
                          {r.score}/{r.total} ({pct}%)
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <span style={{
                          color: r.tab_switches > 0 ? '#e8a020' : '#5a7090',
                          fontWeight: r.tab_switches > 0 ? 600 : 400,
                        }}>
                          {r.tab_switches}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: '#5a7090' }}>
                        {mins}:{String(secs).padStart(2, '0')}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 11, color: '#9ab' }}>
                        {new Date(r.submitted_at + 'Z').toLocaleString('en-PH', {
                          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div style={{
              padding: '10px 16px', fontSize: 11, color: '#9ab', borderTop: '1px solid #eef2f7',
              background: '#f8faff',
            }}>
              Showing {filtered.length} of {subs.length} submission{subs.length !== 1 ? 's' : ''}
            </div>
          </div>
        )}
      </main>

      <div style={{ textAlign: 'center', fontSize: 11, color: '#5a7090', padding: '20px 24px' }}>
        Exam System v1.0 &nbsp;·&nbsp; © {new Date().getFullYear()} M.K Sanig. All rights reserved.
      </div>
    </div>
  );
}
