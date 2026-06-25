import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../../api';
import AuthGate from '../../components/AuthGate';
import { parseChoices } from '../../utils';
import '../../styles.css';
import { FileText, ArrowLeft } from 'lucide-react';

export default function Preview() {
  return <AuthGate><PreviewInner /></AuthGate>;
}

function PreviewInner() {
  const [params] = useSearchParams();
  const examId = params.get('id');
  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!examId) return;
    api.getExam(examId).then(data => {
      setExam(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [examId]);

  if (loading) return <div style={{ textAlign: 'center', padding: 60, color: '#5a7090' }}>Loading exam...</div>;
  if (!exam) return <div style={{ textAlign: 'center', padding: 60, color: '#c0392b' }}>Exam not found</div>;

  const parts = [...new Set((exam.questions || []).map(q => q.part))].sort();

  return (
    <div>
      <header className="app-header">
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 8 }}><FileText size={20} /> {exam.title}</h1>
          <p style={{ fontSize: 13, color: '#9ab', marginTop: 4 }}>
            {exam.questions?.length || 0} questions · {exam.time_limit} minutes · Preview only
          </p>
        </div>
        <Link to="/admin" style={{ display: 'flex', alignItems: 'center', gap: 4 }}><ArrowLeft size={14} /> Dashboard</Link>
      </header>

      <main style={{ maxWidth: 860, margin: '0 auto', padding: '32px 24px' }}>
        {exam.description && (
          <div style={{ background: '#f5f8ff', border: '1px solid #c8d8f0', borderRadius: 10, padding: '16px 20px', marginBottom: 24, fontSize: 13, color: '#5a7090' }}>
            {exam.description}
          </div>
        )}

        {!exam.questions?.length ? (
          <div style={{ textAlign: 'center', color: '#5a7090', padding: '60px 20px' }}>No questions in this exam.</div>
        ) : (
          parts.map(part => (
            <div key={part} style={{ marginBottom: 28 }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14,
                paddingBottom: 8, borderBottom: '2px solid #0f2044',
              }}>
                <span style={{
                  background: '#0f2044', color: '#fff', fontSize: 10, fontWeight: 700,
                  padding: '2px 10px', borderRadius: 4, letterSpacing: '.06em',
                }}>PART {part}</span>
                <span style={{ fontSize: 12, color: '#5a7090' }}>
                  {exam.questions.filter(q => q.part === part).length} question{exam.questions.filter(q => q.part === part).length !== 1 ? 's' : ''}
                </span>
              </div>

              {exam.questions
                .filter(q => q.part === part)
                .sort((a, b) => a.sort_order - b.sort_order)
                .map((q, i) => {
                  const choices = parseChoices(q.choices);
                  return (
                    <div key={q.id} style={{
                      background: '#fff', border: '1px solid #c8d8f0',
                      borderRadius: 10, padding: '20px 22px', marginBottom: 12,
                    }}>
                      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: '#5a7090', marginBottom: 8, letterSpacing: '.03em' }}>
                        Q{i + 1}
                      </div>
                      <div style={{ fontSize: 14.5, lineHeight: 1.6, marginBottom: 14 }}
                        dangerouslySetInnerHTML={{ __html: q.text }} />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {choices.map(c => (
                          <div key={c.key} style={{
                            display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                            border: `1.5px solid ${c.key === q.answer ? '#1a7a4a' : '#c8d8f0'}`,
                            borderRadius: 6, fontSize: 14,
                            background: c.key === q.answer ? '#d4f5e2' : '#f8faff',
                            color: c.key === q.answer ? '#1a7a4a' : '#1a2a3a',
                            fontWeight: c.key === q.answer ? 600 : 400,
                          }}>
                            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, fontWeight: 700, minWidth: 18 }}>
                              {c.key})
                            </span>
                            <span>{c.text}</span>
                            {c.key === q.answer && <span style={{ marginLeft: 'auto', fontSize: 12 }}>✓</span>}
                          </div>
                        ))}
                      </div>
                      {q.explain && (
                        <div style={{
                          marginTop: 12, fontSize: 12, color: '#1a4fad', lineHeight: 1.5,
                          padding: '8px 14px', background: '#ddeeff', borderRadius: 6,
                        }}>
                          💡 {q.explain}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          ))
        )}
      </main>

      <div style={{ textAlign: 'center', fontSize: 11, color: '#5a7090', padding: '20px 24px' }}>
        Exam System v1.0 &nbsp;·&nbsp; © {new Date().getFullYear()} M.K Sanig. All rights reserved.
      </div>
    </div>
  );
}
