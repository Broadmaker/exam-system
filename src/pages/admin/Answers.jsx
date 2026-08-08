import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../api';
import AdminLayout from '../../components/AdminLayout';
import { shuffleWithSeed, parseChoices, matchesAnswer } from '../../utils';
import '../../styles.css';
import { Search, RefreshCw, Eye, CheckCircle, XCircle, User, Download } from 'lucide-react';

export default function Answers() {
  return <AdminLayout title="Student Answers"><AnswersInner /></AdminLayout>;
}

// Rebuild each submission's per-question answer info, restoring the exact
// shuffled question order / per-student choice order used at grading time.
function buildCells(questions, sub) {
  const stored = typeof sub.answers === 'string' ? JSON.parse(sub.answers || '{}') : (sub.answers || {});
  const seed = Number(sub.seed);
  const shuffledQs = shuffleWithSeed(questions, seed);
  const seeds = {};
  shuffledQs.forEach((q, idx) => { seeds[q.id] = seed + idx * 7919; });

  return questions.map(q => {
    const isBlank = (q.type || 'multiple_choice') === 'fill_blank';
    const raw = (stored[q.id] || '');

    if (isBlank) {
      const text = raw.trim();
      return {
        type: 'fill_blank',
        chosen: text || null,
        correct: matchesAnswer(text, q.answer),
        answerKey: q.answer,
        answerText: q.answer,
        choiceText: '',
      };
    }

    const choices = parseChoices(q.choices);
    const shuffled = shuffleWithSeed(choices, seeds[q.id]).map((c, ci) => ({
      ...c, displayKey: String.fromCharCode(65 + ci),
    }));
    const picked = shuffled.find(c => c.displayKey === raw);
    const correctChoice = choices.find(c => c.key === q.answer) || {};
    return {
      type: 'multiple_choice',
      chosen: raw || null,
      correct: !!picked && picked.key === q.answer,
      answerKey: q.answer,
      choiceText: picked ? picked.text : '',
      answerText: correctChoice.text || '',
    };
  });
}

function cellText(cell) {
  if (cell.type === 'fill_blank') return (cell.chosen || '—');
  if (cell.chosen) return `${cell.chosen} ${cell.choiceText || ''}`.trim();
  return '—';
}

function cellColor(cell) {
  if (cell.correct) return { bg: '#d4f5e2', color: '#1a7a4a' };
  if (cell.chosen === null) return { bg: '#eef2f7', color: '#9ab' };
  return { bg: '#ffe0e0', color: '#c0392b' };
}

function plainText(html) {
  return String(html || '').replace(/<[^>]+>/g, '').trim();
}

function AnswersInner() {
  const [params] = useSearchParams();
  const examId = params.get('id');
  const [exam, setExam] = useState(null);
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [openSub, setOpenSub] = useState(null);

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

  const qs = exam?.questions || [];
  const rows = subs.map(sub => ({ sub, cells: buildCells(qs, sub) }));
  const filtered = rows
    .filter(r => r.sub.student_name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => b.sub.score - a.sub.score);
  const open = openSub ? rows.find(r => r.sub.id === openSub) : null;

  const exportCSV = () => {
    const header = ['Student', 'Section', 'Score', 'Total'];
    qs.forEach((_, i) => header.push(`Q${i + 1}`));
    const lines = filtered.map(r =>
      [r.sub.student_name, r.sub.student_section, r.sub.score, r.sub.total]
        .concat(r.cells.map(c => cellText(c)))
        .join(',')
    );
    const blob = new Blob([header.join(',') + '\n' + lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = (exam?.title || 'answers') + '-answers.csv';
    a.click(); URL.revokeObjectURL(url);
  };

  if (!examId) return <div style={{ textAlign: 'center', padding: 60, fontSize: 14, color: '#5a7090' }}>Select an exam from the Dashboard to review answers.</div>;
  if (loading) return <div style={{ textAlign: 'center', padding: 60, fontSize: 14, color: '#5a7090' }}>Loading answers...</div>;

  return (
    <div>
      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 style={{ fontSize: 20, color: '#0f2044' }}>{exam?.title}</h2>
            <p style={{ fontSize: 13, color: '#5a7090', marginTop: 6 }}>
              Review how each student answered, Google Forms-style.
              {' '}{subs.length} submission{subs.length !== 1 ? 's' : ''} ·{' '}
              {qs.length} question{qs.length !== 1 ? 's' : ''}.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={load} className="btn btn-outline btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <RefreshCw size={13} /> Refresh
            </button>
            {subs.length > 0 && (
              <button onClick={exportCSV} className="btn btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <Download size={13} /> Export answers
              </button>
            )}
          </div>
        </div>

        <div style={{ position: 'relative', marginBottom: 16, maxWidth: 380 }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', display: 'flex', color: '#9ab' }}>
            <Search size={14} />
          </span>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by student name..."
            style={{
              width: '100%', border: '1.5px solid #c8d8f0', borderRadius: 8,
              padding: '10px 14px 10px 36px', fontSize: 14, fontFamily: 'inherit', outline: 'none',
            }} />
        </div>

        {!subs.length ? (
          <div style={{ textAlign: 'center', color: '#5a7090', padding: '80px 20px', background: '#fff', borderRadius: 12, border: '2px dashed #c8d8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}><Eye size={48} /></div>
            <p style={{ fontSize: 16, fontWeight: 600, color: '#0f2044', marginBottom: 4 }}>No submissions yet</p>
            <p style={{ fontSize: 13 }}>Students' individual answers will appear here once they take the exam.</p>
          </div>
        ) : !filtered.length ? (
          <div style={{ textAlign: 'center', color: '#5a7090', padding: '60px 20px', background: '#fff', borderRadius: 12, border: '1px solid #c8d8f0' }}>
            No results match "<strong>{search}</strong>"
          </div>
        ) : (
          <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid #c8d8f0', background: '#fff' }}>
            <table style={{ borderCollapse: 'collapse', fontSize: 12, minWidth: 'max-content' }}>
              <thead>
                <tr style={{ background: '#0f2044', color: '#fff' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', position: 'sticky', left: 0, background: '#0f2044', zIndex: 2, minWidth: 180 }}>Student</th>
                  {qs.map((q, qi) => (
                    <th key={q.id} title={plainText(q.text)} style={{ padding: '10px 10px', textAlign: 'center', fontSize: 11, fontWeight: 600 }}>
                      <div>Q{qi + 1}</div>
                      <div style={{ fontSize: 10, color: '#9ab', marginTop: 2 }}>
                        {q.type === 'fill_blank' ? 'fill' : 'ans: ' + q.answer}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => {
                  const rowIdx = filtered.indexOf(r);
                  return (
                    <tr key={r.sub.id} onClick={() => setOpenSub(r.sub.id)}
                      style={{ borderTop: '1px solid #eef2f7', cursor: 'pointer', background: rowIdx % 2 === 0 ? '#fff' : '#f8faff' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#ddeeff'}
                      onMouseLeave={e => e.currentTarget.style.background = rowIdx % 2 === 0 ? '#fff' : '#f8faff'}>
                      <td style={{ padding: '10px 16px', position: 'sticky', left: 0, zIndex: 1, minWidth: 180, background: rowIdx % 2 === 0 ? '#fff' : '#f8faff' }}>
                        <div style={{ fontWeight: 600, color: '#0f2044' }}>{r.sub.student_name}</div>
                        <div style={{ fontSize: 11, color: '#9ab', marginTop: 2 }}>{r.sub.student_section} · {r.sub.score}/{r.sub.total}</div>
                      </td>
                      {r.cells.map((cell, ci) => {
                        const col = cellColor(cell);
                        return (
                          <td key={ci} title={cellText(cell)} style={{ padding: '8px 10px', textAlign: 'center', minWidth: 92, maxWidth: 170, verticalAlign: 'top' }}>
                            <div style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                              background: col.bg, color: col.color, borderRadius: 6,
                              padding: '4px 8px', fontSize: 11, minHeight: 26,
                              fontWeight: cell.correct ? 600 : 400,
                            }}>
                              {cell.type === 'fill_blank' ? (
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>{cell.chosen || '—'}</span>
                              ) : (
                                <>
                                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, fontSize: 11 }}>{cell.chosen || '—'}</span>
                                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 130, fontSize: 11 }}>{cell.choiceText}</span>
                                </>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div style={{ padding: '10px 16px', fontSize: 11, color: '#9ab', borderTop: '1px solid #eef2f7', background: '#f8faff' }}>
              Green = correct · Red = wrong · Gray = unanswered. Click a row for the student's full individual answer.
            </div>
          </div>
        )}
      </main>

      {/* Individual student drill-down */}
      {open && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(10,20,40,.6)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, maxWidth: 760, width: '100%', maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,.35)', position: 'relative' }}>
            <div style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 2, padding: '24px 28px 16px', borderBottom: '1px solid #c8d8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <User size={16} color="#1a4fad" />
                    <h3 style={{ fontSize: 18, color: '#0f2044' }}>{open.sub.student_name}</h3>
                  </div>
                  <div style={{ fontSize: 12, color: '#5a7090' }}>
                    {open.sub.student_section} · {open.sub.score}/{open.sub.total} · submitted {new Date(open.sub.submitted_at + 'Z').toLocaleString('en-PH')}
                    {open.sub.tab_switches > 0 && ` · ${open.sub.tab_switches} tab switch${open.sub.tab_switches !== 1 ? 'es' : ''}`}
                  </div>
                </div>
                <button onClick={() => setOpenSub(null)}
                  style={{ background: 'none', border: '1.5px solid #c8d8f0', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#0f2044', flexShrink: 0 }}>
                  ✕ Close
                </button>
              </div>
            </div>

            <div style={{ padding: '20px 28px 30px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {qs.map((q, i) => {
                const cell = open.cells[i];
                const statusColor = cell.correct ? '#1a7a4a' : cell.chosen === null ? '#9ab' : '#c0392b';
                return (
                  <div key={q.id} style={{ border: '1px solid #c8d8f0', borderRadius: 10, padding: '14px 16px', background: cell.correct ? '#f0faf4' : '#fff' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: 8 }}>
                      <span style={{ fontSize: 10, background: '#0f2044', color: '#fff', padding: '2px 8px', borderRadius: 4, fontWeight: 700 }}>
                        Q{i + 1} · Part {q.part}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, color: statusColor }}>
                        {cell.correct
                          ? <><CheckCircle size={14} /> Correct</>
                          : cell.chosen === null
                            ? <><XCircle size={14} /> Unanswered</>
                            : <><XCircle size={14} /> Wrong</>}
                      </span>
                    </div>
                    <div style={{ fontSize: 13.5, lineHeight: 1.6, marginBottom: 10, color: '#1a2a3a' }} dangerouslySetInnerHTML={{ __html: q.text }} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, borderTop: '1px solid #eef2f7', paddingTop: 10 }}>
                      <div style={{ color: '#5a7090' }}>
                        Student's answer:{' '}
                        <strong style={{ color: statusColor }}>{cellText(cell)}</strong>
                      </div>
                      <div style={{ color: '#5a7090' }}>
                        Correct answer:{' '}
                        <strong style={{ color: '#1a4fad' }}>
                          {cell.type === 'fill_blank' ? (cell.answerText || q.answer || '—') : `${cell.answerKey}${cell.answerText ? ' · ' + cell.answerText : ''}`}
                        </strong>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}