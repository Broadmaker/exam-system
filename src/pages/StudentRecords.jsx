import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { Search, User, GraduationCap, ClipboardList, CalendarCheck, Home } from 'lucide-react';

const inputStyle = {
  width: '100%', border: '1.5px solid #c8d8f0', borderRadius: 8,
  padding: '10px 14px', fontSize: 14, fontFamily: 'inherit', outline: 'none',
};

export default function StudentRecords() {
  const [studentId, setStudentId] = useState('');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const look = async (e) => {
    if (e) e.preventDefault();
    if (!studentId.trim()) return;
    setLoading(true); setError(''); setData(null);
    try {
      const res = await api.getStudentRecords(studentId.trim());
      if (!res.exams.length && !res.classes.length) {
        setError('No records found for that Student ID.');
      } else {
        setData(res);
      }
    } catch (err) {
      setError(err.message || 'Could not load records.');
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#eef3fb', padding: '40px 16px' }}>
      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(-6px); } }`}</style>
      <main style={{ maxWidth: 800, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#0f2044' }}>
            <GraduationCap size={26} />
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 700 }}>Student Records</h2>
              <p style={{ fontSize: 12, color: '#5a7090' }}>View your exam results and attendance</p>
            </div>
          </div>
          <Link to="/" style={{ textDecoration: 'none', color: '#1a4fad', fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <Home size={14} /> Back to home
          </Link>
        </div>

        <form onSubmit={look} className="card" style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#0f2044', marginBottom: 6 }}>Student ID</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ab' }} />
              <input value={studentId} onChange={e => setStudentId(e.target.value.toUpperCase())}
                placeholder="e.g. 2019-12345"
                style={{ ...inputStyle, paddingLeft: 38, fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '.04em', textTransform: 'uppercase' }}
                autoFocus />
            </div>
            <button type="submit" className="btn" disabled={loading} style={{ opacity: loading ? .7 : 1, display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
              <Search size={15} /> {loading ? 'Searching…' : 'View Records'}
            </button>
          </div>
          {error && <p style={{ color: '#c0392b', fontSize: 13, marginTop: 10 }}>{error}</p>}
        </form>

        {data && (
          <div style={{ animation: 'fadeIn .3s' }}>
            <div className="card" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#1a4fad', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <User size={20} />
              </div>
              <div style={{ flex: 1, minWidth: 180 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#0f2044' }}>{data.student_name}</div>
                <div style={{ fontSize: 12, color: '#5a7090' }}>{data.student_id}{data.student_section ? ' · ' + data.student_section : ''}</div>
              </div>
              <div style={{ fontSize: 13, color: '#5a7090', textAlign: 'right' }}>
                {data.exams.length} exam{data.exams.length !== 1 ? 's' : ''} taken
              </div>
            </div>

            {data.classes.map(klass => (
              <div key={klass.class_id} className="card" style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
                  <GraduationCap size={18} color="#1a4fad" />
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#0f2044' }}>{klass.name}</div>
                    <div style={{ fontSize: 12, color: '#5a7090' }}>
                      {[klass.subject, klass.section].filter(Boolean).join(' · ')}{klass.instructor ? ' · ' + klass.instructor : ''}
                    </div>
                  </div>
                  {klass.attendance.total > 0 && (
                    <div style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <CalendarCheck size={14} color="#1a7a4a" />
                      <span style={{ color: '#1a7a4a', fontWeight: 600 }}>{klass.attendance.present} present</span>
                      <span style={{ color: '#5a7090' }}>/ {klass.attendance.total} session{klass.attendance.total !== 1 ? 's' : ''}</span>
                    </div>
                  )}
                </div>

                {klass.attendance.total > 0 && (
                  <div style={{ marginBottom: 14, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {klass.attendance.records.map((r, i) => (
                      <span key={i} style={{
                        fontSize: 11, padding: '3px 10px', borderRadius: 999,
                        background: r.status === 'absent' ? '#fdecea' : '#e6f6ec',
                        color: r.status === 'absent' ? '#c0392b' : '#1a7a4a',
                        fontWeight: 600,
                      }}>
                        {r.date} · {r.status}{r.source === 'exam' ? ' (exam)' : ''}
                      </span>
                    ))}
                  </div>
                )}

                {klass.exam_results.length > 0 && (
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#5a7090', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <ClipboardList size={13} /> Exam Results
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {klass.exam_results.map(r => (
                        <div key={r.exam_id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', border: '1px solid #eef3fb', borderRadius: 8, background: '#f5f8ff', fontSize: 13 }}>
                          <span style={{ flex: 1, fontWeight: 500 }}>{r.title}</span>
                          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: '#5a7090' }}>{(r.time_taken / 60).toFixed(1)} min</span>
                          <span style={{ fontSize: 14, fontWeight: 700, color: r.score / r.total >= 0.6 ? '#1a7a4a' : '#c0392b' }}>{r.score}<span style={{ color: '#9ab', fontWeight: 400 }}>/{r.total}</span></span>
                          <span style={{ fontSize: 11, color: '#9ab' }}>
                            {r.submitted_at ? new Date(r.submitted_at).toLocaleDateString() : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {data.exams.filter(e => !e.class_name).length > 0 && (
              <div className="card" style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#0f2044', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ClipboardList size={17} color="#1a4fad" /> Standalone Exams
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {data.exams.filter(e => !e.class_name).map(r => (
                    <div key={r.exam_id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', border: '1px solid #eef3fb', borderRadius: 8, background: '#f5f8ff', fontSize: 13 }}>
                      <span style={{ flex: 1, fontWeight: 500 }}>{r.title}</span>
                      <span style={{ fontSize: 14, fontWeight: 700, color: r.score / r.total >= 0.6 ? '#1a7a4a' : '#c0392b' }}>{r.score}<span style={{ color: '#9ab', fontWeight: 400 }}>/{r.total}</span></span>
                      <span style={{ fontSize: 11, color: '#9ab' }}>{r.submitted_at ? new Date(r.submitted_at).toLocaleDateString() : ''}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}