import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../api';
import AdminLayout from '../../components/AdminLayout';
import '../../styles.css';
import { ClipboardList, BarChart3, Trophy, TrendingDown, Search, RefreshCw, Inbox, Download, PieChart, HelpCircle } from 'lucide-react';

export default function Results() {
  return <AdminLayout title="Exam Results"><ResultsInner /></AdminLayout>;
}

function ResultsInner() {
  const [params] = useSearchParams();
  const examId = params.get('id');
  const [exam, setExam] = useState(null);
  const [subs, setSubs] = useState([]);
  const [analytics, setAnalytics] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!examId) return;
    setLoading(true);
    const [examData, subsData, analyticsData] = await Promise.all([
      api.getExam(examId).catch(() => null),
      api.getSubmissions(examId).catch(() => []),
      api.getAnalytics(examId).catch(() => []),
    ]);
    setExam(examData);
    setSubs(subsData);
    setAnalytics(analyticsData);
    setLoading(false);
  };

  useEffect(() => { load(); }, [examId]);

  const total = subs.length;
  const avg = total ? (subs.reduce((s, r) => s + r.score, 0) / total) : 0;
  const best = total ? Math.max(...subs.map(r => r.score)) : 0;
  const worst = total ? Math.min(...subs.map(r => r.score)) : 0;
  const maxTotal = subs[0]?.total || 0;

  // Score distribution (buckets of 10%)
  const buckets = Array(10).fill(0);
  subs.forEach(r => {
    const pct = (r.score / r.total) * 100;
    const idx = Math.min(9, Math.floor(pct / 10));
    buckets[idx]++;
  });

  const filtered = subs
    .filter(r => r.student_name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => b.score - a.score || a.time_taken - b.time_taken);

  const scoreColor = (pct) => {
    if (pct >= 80) return { bg: '#d4f5e2', text: '#1a7a4a' };
    if (pct >= 60) return { bg: '#fff3d4', text: '#b8860b' };
    return { bg: '#ffe0e0', text: '#c0392b' };
  };

  // CSV Export
  const exportCSV = () => {
    const header = 'Student,Section,Score,Total,Percentage,Tab Switches,Time (min),Submitted';
    const rows = subs.map(r => {
      const pct = ((r.score / r.total) * 100).toFixed(1);
      const mins = Math.floor(r.time_taken / 60);
      const secs = r.time_taken % 60;
      const time = mins + ':' + String(secs).padStart(2, '0');
      const date = new Date(r.submitted_at + 'Z').toLocaleString('en-PH');
      return `"${r.student_name}","${r.student_section}",${r.score},${r.total},${pct},${r.tab_switches},"${time}","${date}"`;
    }).join('\n');
    const blob = new Blob([header + '\n' + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = (exam?.title || 'results') + '.csv';
    a.click(); URL.revokeObjectURL(url);
  };

  if (!examId) return <div style={{ textAlign: 'center', padding: 60, fontSize: 14, color: '#5a7090' }}>Select an exam from the Dashboard to view results.</div>;
  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 60, fontSize: 14, color: '#5a7090' }}>Loading results...</div>
    );
  }

  return (
    <div>
      <main style={{ maxWidth: 1000, margin: '0 auto', padding: '24px 16px' }}>
        {/* Stats Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14, marginBottom: 24 }}>
          {[
            { icon: ClipboardList, num: total, label: 'Submissions', color: '#1a4fad' },
            { icon: BarChart3, num: total ? avg.toFixed(1) : '—', label: 'Average Score', color: '#1a7a4a', suffix: total ? `/ ${maxTotal}` : '' },
            { icon: Trophy, num: best, label: 'Highest Score', color: '#e8a020', suffix: best ? `/ ${maxTotal}` : '' },
            { icon: TrendingDown, num: total > 1 ? worst : '—', label: 'Lowest Score', color: '#c0392b', suffix: worst ? `/ ${maxTotal}` : '' },
          ].map(s => (
            <div key={s.label} style={{
              background: '#fff', border: '1px solid #c8d8f0', borderRadius: 12,
              padding: '20px 20px', textAlign: 'center',
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

        {/* Per-Question Analytics */}
        {analytics.length > 0 && (
          <div className="card" style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <HelpCircle size={18} color="#1a4fad" />
              <h3 style={{ fontSize: 15, color: '#0f2044' }}>Question Analytics</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {analytics.map((q, qi) => (
                <div key={q.questionId} style={{
                  background: '#f8faff', border: '1px solid #c8d8f0', borderRadius: 8, padding: '14px 16px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{
                      background: '#0f2044', color: '#fff', fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 3,
                    }}>Q{qi + 1}</span>
                    <span style={{ fontSize: 11, color: '#5a7090' }}>
                      {q.correct}/{q.total} correct ({Math.round((q.correct / q.total) * 100)}%)
                    </span>
                  </div>
                  <div style={{ fontSize: 13, lineHeight: 1.5, marginBottom: 10, color: '#1a2a3a' }}
                    dangerouslySetInnerHTML={{ __html: q.text }} />
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {q.choices.map(c => {
                      const pct = q.total ? Math.round((c.count / q.total) * 100) : 0;
                      return (
                        <div key={c.key} style={{
                          display: 'flex', alignItems: 'center', gap: 6,
                          padding: '6px 10px', borderRadius: 6, fontSize: 12,
                          background: c.correct ? '#d4f5e2' : '#fff',
                          border: `1.5px solid ${c.correct ? '#1a7a4a' : '#c8d8f0'}`,
                          color: c.correct ? '#1a7a4a' : '#1a2a3a',
                          fontWeight: c.correct ? 600 : 400,
                        }}>
                          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, fontSize: 11, minWidth: 14 }}>
                            {c.key})
                          </span>
                          <span>{c.text}</span>
                          <span style={{
                            marginLeft: 4, background: c.correct ? '#1a7a4a' : '#eef2f7', color: c.correct ? '#fff' : '#5a7090',
                            borderRadius: 10, padding: '1px 8px', fontSize: 10, fontWeight: 600,
                          }}>
                            {c.count} ({pct}%)
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Score Distribution Chart */}
        {total > 0 && (
          <div className="card" style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <PieChart size={18} color="#1a4fad" />
              <h3 style={{ fontSize: 15, color: '#0f2044' }}>Score Distribution</h3>
              <span style={{ fontSize: 11, color: '#5a7090', marginLeft: 'auto' }}>
                {total} student{total !== 1 ? 's' : ''}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {buckets.map((count, i) => {
                const pct = total ? (count / total) * 100 : 0;
                const labelLow = i * 10;
                const labelHigh = i === 9 ? '100' : (i + 1) * 10;
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12 }}>
                    <span style={{ minWidth: 52, textAlign: 'right', color: '#5a7090', fontFamily: "'IBM Plex Mono', monospace", fontSize: 11 }}>
                      {labelLow}–{labelHigh}%
                    </span>
                    <div style={{ flex: 1, height: 20, background: '#eef2f7', borderRadius: 4, overflow: 'hidden', position: 'relative' }}>
                      <div style={{
                        height: '100%', width: pct + '%', borderRadius: 4,
                        background: i >= 8 ? '#1a7a4a' : i >= 6 ? '#e8a020' : '#c0392b',
                        transition: 'width .4s',
                        minWidth: count > 0 ? 4 : 0,
                      }} />
                    </div>
                    <span style={{ minWidth: 24, fontWeight: 600, color: '#1a2a3a', fontFamily: "'IBM Plex Mono', monospace" }}>
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Search & Export */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, position: 'relative', minWidth: 180 }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', display: 'flex', color: '#9ab' }}><Search size={14} /></span>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by student name..."
              style={{
                width: '100%', border: '1.5px solid #c8d8f0', borderRadius: 8,
                padding: '10px 14px 10px 36px', fontSize: 14, fontFamily: 'inherit', outline: 'none',
              }} />
          </div>
          <button onClick={load} className="btn btn-outline" style={{ whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 6 }}><RefreshCw size={14} /> Refresh</button>
          {subs.length > 0 && (
            <button onClick={exportCSV} className="btn" style={{ whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Download size={14} /> CSV
            </button>
          )}
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
                        <span style={{ color: r.tab_switches > 0 ? '#e8a020' : '#5a7090', fontWeight: r.tab_switches > 0 ? 600 : 400 }}>
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

    </div>
  );
}
