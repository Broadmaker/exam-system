import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api';
import AuthGate from '../../components/AuthGate';
import '../../styles.css';
import { Plus, ClipboardList, Trash2, Clock, BarChart3 } from 'lucide-react';

export default function Dashboard() {
  const [exams, setExams] = useState([]);
  const [toast, setToast] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);

  const showToast = useCallback((msg) => { setToast(msg); setTimeout(() => setToast(''), 2500); }, []);

  const load = () => api.listExams().then(setExams).catch(e => showToast(e.message));
  useEffect(() => { load(); }, []);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await api.deleteExam(deleteTarget.id).catch(e => showToast(e.message));
    setDeleteTarget(null);
    load();
  };

  return (
    <AuthGate>
      {toast && (
        <div style={{
          position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
          background: '#1a7a4a', color: '#fff', padding: '12px 28px', borderRadius: 8,
          fontSize: 14, fontWeight: 600, zIndex: 300, animation: 'fadeIn .3s',
          boxShadow: '0 8px 24px rgba(0,0,0,.2)',
        }}>
          {toast}
          <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } }`}</style>
        </div>
      )}

      <header className="app-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <h1>Exam Admin</h1>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Link to="/" style={{ color: '#e8a020', fontSize: 14, textDecoration: 'none' }}>Student Portal</Link>
          <span style={{ color: 'rgba(255,255,255,.2)' }}>|</span>
          <button onClick={() => { sessionStorage.removeItem('admin_auth'); window.location.reload(); }}
            style={{
              background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.25)',
              color: '#fff', borderRadius: 6, padding: '6px 14px', fontSize: 12, cursor: 'pointer', transition: 'background .2s',
            }}
            onMouseEnter={e => e.target.style.background = 'rgba(255,255,255,.2)'}
            onMouseLeave={e => e.target.style.background = 'rgba(255,255,255,.1)'}>
            Logout
          </button>
        </div>
      </header>

      <main style={{ maxWidth: 1000, margin: '0 auto', padding: '32px 24px' }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28,
        }}>
          <div>
            <h2 style={{ fontSize: 20, color: '#0f2044' }}>All Exams</h2>
            <p style={{ fontSize: 13, color: '#5a7090', marginTop: 4 }}>{exams.length} exam{exams.length !== 1 ? 's' : ''} total</p>
          </div>
          <Link to="/admin/create" className="btn" style={{ padding: '12px 24px', display: 'inline-flex', alignItems: 'center', gap: 6 }}><Plus size={16} /> New Exam</Link>
        </div>

        {!exams.length ? (
          <div style={{
            textAlign: 'center', color: '#5a7090', padding: '80px 20px',
            background: '#fff', borderRadius: 12, border: '2px dashed #c8d8f0',
          }}>
            <div style={{ fontSize: 48, marginBottom: 16, display: 'flex', justifyContent: 'center' }}><ClipboardList size={48} /></div>
            <p style={{ marginBottom: 8, fontSize: 16, fontWeight: 600, color: '#0f2044' }}>No exams yet</p>
            <p style={{ marginBottom: 20, fontSize: 13 }}>Create your first exam to get started.</p>
            <Link to="/admin/create" className="btn">Create Your First Exam</Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {exams.map(e => (
              <div key={e.id} className="card" style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                transition: 'box-shadow .2s, transform .15s',
              }}
                onMouseEnter={el => { el.currentTarget.style.boxShadow = '0 4px 20px rgba(15,32,68,.1)'; el.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={el => { el.currentTarget.style.boxShadow = 'none'; el.currentTarget.style.transform = 'none'; }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <h3 style={{ fontSize: 17, fontWeight: 600, color: '#0f2044' }}>{e.title}</h3>
                    <span style={{
                      fontSize: 10, background: '#ddeeff', color: '#1a4fad', padding: '2px 8px',
                      borderRadius: 4, fontWeight: 600, letterSpacing: '.03em',
                    }}>
                      {e.question_count || 0} Q
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#5a7090', flexWrap: 'wrap' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={12} /> {e.time_limit} min</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><BarChart3 size={12} /> {e.submission_count || 0} submission{(e.submission_count || 0) !== 1 ? 's' : ''}</span>
                  </div>
                  <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: '#9ab', fontFamily: "'IBM Plex Mono', monospace" }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>{e.id}</span>
                    <span onClick={() => { navigator.clipboard.writeText(e.id); showToast('Exam ID copied!'); }}
                      style={{ cursor: 'pointer', color: '#1a4fad', textDecoration: 'none', fontSize: 11 }}>
                      copy ID
                    </span>
                    <span onClick={() => { navigator.clipboard.writeText(window.location.origin + '/exam?id=' + e.id); showToast('Exam link copied!'); }}
                      style={{ cursor: 'pointer', color: '#1a4fad', textDecoration: 'none', fontSize: 11 }}>
                      copy link
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, marginLeft: 16 }}>
                  <Link to={"/admin/create?id=" + e.id} className="btn btn-outline btn-sm">Edit</Link>
                  <Link to={"/admin/results?id=" + e.id} className="btn btn-outline btn-sm">Results</Link>
                  <button onClick={() => setDeleteTarget(e)} className="btn btn-danger btn-sm"
                    style={{ background: '#e8a020', border: 'none' }}
                    onMouseEnter={e => e.target.style.background = '#d4901a'}
                    onMouseLeave={e => e.target.style.background = '#e8a020'}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Styled Delete Modal */}
      {deleteTarget && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(10,20,40,.55)', zIndex: 200,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        }}>
          <div style={{
            background: '#fff', borderRadius: 16, padding: '36px 32px 28px',
            maxWidth: 380, width: '100%', textAlign: 'center', boxShadow: '0 24px 64px rgba(0,0,0,.3)',
            animation: 'fadeIn .25s',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}><Trash2 size={40} /></div>
            <h3 style={{ fontSize: 18, color: '#0f2044', marginBottom: 8 }}>Delete Exam?</h3>
            <p style={{ fontSize: 13, color: '#5a7090', marginBottom: 4, lineHeight: 1.5 }}>
              You are about to delete <strong>{deleteTarget.title}</strong>.
            </p>
            <p style={{ fontSize: 12, color: '#c0392b', marginBottom: 24 }}>
              This will also remove all questions and submissions.
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setDeleteTarget(null)}
                style={{
                  flex: 1, padding: '12px 0', borderRadius: 8, fontSize: 14, fontWeight: 600,
                  cursor: 'pointer', border: '1.5px solid #c8d8f0', background: '#fff', color: '#0f2044',
                }}>
                Cancel
              </button>
              <button onClick={confirmDelete}
                style={{
                  flex: 1, padding: '12px 0', borderRadius: 8, fontSize: 14, fontWeight: 600,
                  cursor: 'pointer', border: 'none', background: '#c0392b', color: '#fff',
                }}
                onMouseEnter={e => e.target.style.background = '#e74c3c'}
                onMouseLeave={e => e.target.style.background = '#c0392b'}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ textAlign: 'center', fontSize: 11, color: '#5a7090', padding: '20px 24px' }}>
        Exam System v1.0 &nbsp;·&nbsp; © {new Date().getFullYear()} M.K Sanig. All rights reserved.
      </div>
    </AuthGate>
  );
}
