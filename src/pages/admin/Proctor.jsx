import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../../api';
import AdminLayout from '../../components/AdminLayout';
import QRCode from 'qrcode';
import '../../styles.css';
import { Radio, UserCheck, AlertTriangle, XCircle, CheckCircle, QrCode, Copy, RefreshCw, Ban, Clock } from 'lucide-react';

export default function Proctor() {
  const [params] = useSearchParams();
  const [exams, setExams] = useState([]);
  const [examId, setExamId] = useState(params.get('id') || '');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState('');
  const [qr, setQr] = useState('');
  const [qrOpen, setQrOpen] = useState(false);

  const showToast = useCallback((m) => { setToast(m); setTimeout(() => setToast(''), 2500); }, []);

  useEffect(() => { api.listExams().then(setExams).catch(e => showToast(e.message)); }, []);

  const load = useCallback(() => {
    if (!examId) return;
    setLoading(true);
    api.getProctor(examId).then(setData).catch(e => showToast(e.message)).finally(() => setLoading(false));
  }, [examId]);

  useEffect(() => {
    if (!examId) { setData(null); return; }
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [examId, load]);

  const exam = useMemo(() => exams.find(e => e.id === examId), [exams, examId]);

  useEffect(() => {
    if (!examId || !qrOpen) return;
    QRCode.toDataURL(window.location.origin + '/exam?id=' + encodeURIComponent(examId), {
      width: 280, margin: 1, color: { dark: '#0f2044', light: '#ffffff' },
    }).then(url => setQr(url)).catch(() => {});
  }, [examId, qrOpen]);

  const kick = async (sessionId) => {
    if (!window.confirm('End this student\'s exam session? Their current answers will be submitted.')) return;
    try {
      await api.kickStudent(examId, sessionId);
      showToast('Session ended');
      load();
    } catch (e) { showToast(e.message); }
  };

  const copyExamLink = () => {
    navigator.clipboard.writeText(window.location.origin + '/exam?id=' + encodeURIComponent(examId));
    showToast('Exam link copied');
  };

  const now = Date.now();
  const fmtLastSeen = (ts) => {
    const t = new Date(ts + (ts.includes('T') ? '' : 'Z'));
    const diff = Math.floor((now - t.getTime()) / 1000);
    if (diff < 60) return diff + 's ago';
    if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
    return t.toLocaleTimeString();
  };

  return (
    <AdminLayout title="Live Proctoring">
      {toast && (
        <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', background: '#1a7a4a', color: '#fff', padding: '12px 28px', borderRadius: 8, fontSize: 14, fontWeight: 600, zIndex: 300, animation: 'fadeIn .3s', boxShadow: '0 8px 24px rgba(0,0,0,.2)' }}>
          {toast}
          <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } }`}</style>
        </div>
      )}

      <main style={{ maxWidth: 1000, margin: '0 auto', padding: '24px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 style={{ fontSize: 20, color: '#0f2044', display: 'flex', alignItems: 'center', gap: 8 }}><Radio size={20} /> Live Proctoring</h2>
            <p style={{ fontSize: 13, color: '#5a7090', marginTop: 4 }}>Auto-refreshes every 5 seconds.</p>
          </div>
          <select value={examId} onChange={e => setExamId(e.target.value)}
            style={{ padding: '10px 14px', borderRadius: 8, border: '1.5px solid #c8d8f0', fontSize: 14, fontFamily: 'inherit', background: '#fff', outline: 'none', minWidth: 240 }}>
            <option value="" disabled>Select an exam…</option>
            {exams.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
          </select>
        </div>

        {!examId ? (
          <div style={{ textAlign: 'center', color: '#5a7090', padding: '80px 20px', background: '#fff', borderRadius: 12, border: '2px dashed #c8d8f0' }}>
            <div style={{ fontSize: 48, marginBottom: 16, display: 'flex', justifyContent: 'center' }}><Radio size={48} /></div>
            <p style={{ marginBottom: 8, fontSize: 16, fontWeight: 600, color: '#0f2044' }}>Select an exam to start monitoring</p>
            <p style={{ fontSize: 13 }}>Watch live sessions, violations, and kick students mid-exam.</p>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
              <button onClick={copyExamLink} className="btn btn-outline btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Copy size={14} /> Copy Exam Link
              </button>
              <button onClick={() => setQrOpen(!qrOpen)} className="btn btn-outline btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <QrCode size={14} /> {qrOpen ? 'Hide Check-in QR' : 'Show Check-in QR'}
              </button>
              <button onClick={load} className="btn btn-outline btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <RefreshCw size={14} /> Refresh Now
              </button>
              {exam?.access_code ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#1a4fad', background: '#ddeeff', border: '1px solid #c8d8f0', borderRadius: 6, padding: '6px 12px' }}>
                  <Clock size={13} /> Access Code: <strong style={{ letterSpacing: '.08em' }}>{exam.access_code}</strong>
                </span>
              ) : null}
            </div>

            {qrOpen && (
              <div style={{ marginBottom: 20, display: 'flex', gap: 20, alignItems: 'center', background: '#fff', border: '1px solid #c8d8f0', borderRadius: 12, padding: 20, flexWrap: 'wrap' }}>
                <div style={{ background: '#fff', padding: 10, borderRadius: 8, border: '1px solid #c8d8f0' }}>
                  {qr ? <img src={qr} alt="Check-in QR" style={{ display: 'block' }} /> : <div style={{ width: 280, height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ab', fontSize: 12 }}>Generating…</div>}
                </div>
                <div style={{ flex: 1, minWidth: 220 }}>
                  <h3 style={{ fontSize: 16, color: '#0f2044', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}><QrCode size={16} /> Check-in QR</h3>
                  <p style={{ fontSize: 13, color: '#5a7090', lineHeight: 1.6 }}>
                    Project this for students to scan. It opens the exam page where they enter their
                    Student ID, name, section, and the <strong>access code</strong>{' '}
                    {exam?.access_code ? (<span style={{ fontFamily: "'IBM Plex Mono', monospace", color: '#1a4fad' }}>“{exam.access_code}”</span>) : '(none set — add one in Edit Exam to require check-in)'}.
                  </p>
                </div>
              </div>
            )}

            {loading && <p style={{ fontSize: 13, color: '#5a7090' }}>Loading…</p>}

            {data && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* Active sessions */}
                <section className="card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <UserCheck size={18} color="#1a7a4a" />
                    <h3 style={{ fontSize: 15, color: '#0f2044' }}>Currently Taking ({data.active.length})</h3>
                  </div>
                  {!data.active.length ? (
                    <p style={{ fontSize: 13, color: '#5a7090' }}>No active sessions right now.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {data.active.map(s => (
                        <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', border: '1px solid #c8d8f0', borderRadius: 8, flexWrap: 'wrap', background: s.tab_switches > 0 ? '#fff8f0' : '#fff' }}>
                          <div style={{ flex: 1, minWidth: 180 }}>
                            <div style={{ fontWeight: 600, fontSize: 14, color: '#0f2044' }}>{s.student_name} <span style={{ fontWeight: 400, color: '#5a7090', fontSize: 12 }}>· {s.student_section}</span></div>
                            <div style={{ fontSize: 11, color: '#9ab', fontFamily: "'IBM Plex Mono', monospace" }}>{s.student_id} · started {fmtLastSeen(s.started_at)}</div>
                          </div>
                          {s.tab_switches > 0 && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: '#b8860b', background: '#fff3d4', border: '1px solid #e8a020', borderRadius: 6, padding: '4px 10px' }}>
                              <AlertTriangle size={13} /> {s.tab_switches} tab switch{s.tab_switches > 1 ? 'es' : ''}
                            </span>
                          )}
                          <span style={{ fontSize: 12, color: '#5a7090' }}>seen {fmtLastSeen(s.last_seen)}</span>
                          <button onClick={() => kick(s.id)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#c0392b', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                            <Ban size={13} /> Kick
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                {/* Stale sessions */}
                {data.stale.length > 0 && (
                  <section className="card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                      <AlertTriangle size={18} color="#e8a020" />
                      <h3 style={{ fontSize: 15, color: '#0f2044' }}>Stale / Disconnected ({data.stale.length})</h3>
                      <span style={{ fontSize: 11, color: '#5a7090' }}>no heartbeat for 75s+ (offline or closed)</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {data.stale.map(s => (
                        <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', border: '1px solid #e0e0e0', borderRadius: 8, flexWrap: 'wrap', background: '#fafafa', opacity: .85 }}>
                          <div style={{ flex: 1, minWidth: 180 }}>
                            <div style={{ fontWeight: 600, fontSize: 14, color: '#0f2044' }}>{s.student_name} <span style={{ fontWeight: 400, color: '#5a7090', fontSize: 12 }}>· {s.student_section}</span></div>
                            <div style={{ fontSize: 11, color: '#9ab', fontFamily: "'IBM Plex Mono', monospace" }}>{s.student_id}</div>
                          </div>
                          {s.tab_switches > 0 && <span style={{ fontSize: 12, color: '#b8860b' }}>{s.tab_switches} violation(s)</span>}
                          <span style={{ fontSize: 12, color: '#9ab' }}>last seen {fmtLastSeen(s.last_seen)}</span>
                          <button onClick={() => kick(s.id)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#c0392b', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                            <Ban size={13} /> Kick
                          </button>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Kicked */}
                {data.kicked.length > 0 && (
                  <section className="card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                      <XCircle size={18} color="#c0392b" />
                      <h3 style={{ fontSize: 15, color: '#0f2044' }}>Kicked Sessions ({data.kicked.length})</h3>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {data.kicked.map(s => (
                        <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', border: '1px solid #f0c0c0', borderRadius: 8, flexWrap: 'wrap', background: '#fff5f5' }}>
                          <div style={{ flex: 1, minWidth: 180 }}>
                            <div style={{ fontWeight: 600, fontSize: 14, color: '#0f2044' }}>{s.student_name} <span style={{ fontWeight: 400, color: '#5a7090', fontSize: 12 }}>· {s.student_section}</span></div>
                            <div style={{ fontSize: 11, color: '#9ab', fontFamily: "'IBM Plex Mono', monospace" }}>{s.student_id} · {s.tab_switches} violation(s)</div>
                          </div>
                          <span style={{ fontSize: 12, color: '#5a7090' }}>ended {fmtLastSeen(s.last_seen)}</span>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Submitted */}
                <section className="card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <CheckCircle size={18} color="#1a4fad" />
                    <h3 style={{ fontSize: 15, color: '#0f2044' }}>Recently Submitted ({data.submitted.length})</h3>
                  </div>
                  {!data.submitted.length ? (
                    <p style={{ fontSize: 13, color: '#5a7090' }}>No submissions yet.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {data.submitted.slice(0, 15).map((s, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', border: '1px solid #c8d8f0', borderRadius: 8, flexWrap: 'wrap' }}>
                          <div style={{ flex: 1, minWidth: 180 }}>
                            <div style={{ fontWeight: 600, fontSize: 14, color: '#0f2044' }}>{s.student_name} <span style={{ fontWeight: 400, color: '#5a7090', fontSize: 12 }}>· {s.student_section}</span></div>
                            <div style={{ fontSize: 11, color: '#9ab', fontFamily: "'IBM Plex Mono', monospace" }}>{s.student_id}</div>
                          </div>
                          {s.tab_switches > 0 && <span style={{ fontSize: 12, color: '#b8860b' }}>{s.tab_switches} violation(s)</span>}
                          <span style={{ fontSize: 14, fontWeight: 700, color: s.score >= s.total * 0.7 ? '#1a7a4a' : '#c0392b' }}>{s.score}/{s.total}</span>
                          <span style={{ fontSize: 12, color: '#5a7090' }}>{fmtLastSeen(s.submitted_at)}</span>
                          <Link to={"/admin/answers?id=" + examId} className="btn btn-sm btn-outline">View</Link>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            )}
          </>
        )}
      </main>
    </AdminLayout>
  );
}