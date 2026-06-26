import { useState, useEffect } from 'react';
import { api } from '../../api';
import AdminLayout from '../../components/AdminLayout';
import '../../styles.css';
import { RotateCcw, CheckCircle, AlertTriangle, Loader } from 'lucide-react';

const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || 'admin123';

export default function Regrade() {
  const [exams, setExams] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => { api.listExams().then(setExams).catch(() => {}); }, []);

  const doRegrade = async () => {
    if (!selectedId) return;
    setLoading(true);
    setResult(null);
    setError('');
    try {
      const data = await api.regrade(selectedId, ADMIN_PASSWORD);
      setResult(data);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  return (
    <AdminLayout title="Regrade Submissions">
      <main style={{ maxWidth: 700, margin: '0 auto', padding: '24px 16px' }}>
        <div className="card" style={{ padding: 28 }}>
          <p style={{ fontSize: 13, color: '#5a7090', marginBottom: 20, lineHeight: 1.6 }}>
            Recalculates scores for all past submissions using the fixed grading logic.
            Only run this once after deploying the scoring fix.
          </p>

          <label style={{ fontSize: 12, fontWeight: 600, color: '#0f2044', display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
            Select Exam
            <select value={selectedId} onChange={e => { setSelectedId(e.target.value); setResult(null); setError(''); }}
              style={{
                border: '1.5px solid #c8d8f0', borderRadius: 8, fontSize: 14,
                padding: '11px 14px', color: '#1a2a3a', outline: 'none', background: '#fff',
                fontFamily: "'IBM Plex Sans', sans-serif",
              }}>
              <option value="">— Choose an exam —</option>
              {exams.map(e => (
                <option key={e.id} value={e.id}>
                  {e.title} ({e.submission_count || 0} submissions)
                </option>
              ))}
            </select>
          </label>

          <button onClick={doRegrade} disabled={!selectedId || loading}
            className="btn" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            {loading ? <Loader size={16} /> : <RotateCcw size={16} />}
            {loading ? 'Regrading...' : 'Run Regrade'}
          </button>
        </div>

        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fff5f5', border: '1px solid #c0392b', borderRadius: 10, padding: '14px 18px', marginTop: 16, fontSize: 13, color: '#c0392b' }}>
            <AlertTriangle size={16} /> {error}
          </div>
        )}

        {result && (
          <div style={{ marginTop: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#d4f5e2', border: '1px solid #1a7a4a', borderRadius: 10, padding: '14px 18px', marginBottom: 16, fontSize: 14, color: '#1a7a4a', fontWeight: 600 }}>
              <CheckCircle size={18} /> {result.regraded} submission(s) regraded
            </div>
            <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid #c8d8f0' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead><tr style={{ background: '#0f2044', color: '#fff' }}>
                  <th style={{ padding: '10px 14px', textAlign: 'left' }}>Student</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left' }}>Section</th>
                  <th style={{ padding: '10px 14px', textAlign: 'center' }}>Old Score</th>
                  <th style={{ padding: '10px 14px', textAlign: 'center' }}>New Score</th>
                  <th style={{ padding: '10px 14px', textAlign: 'center' }}>Change</th>
                </tr></thead>
                <tbody>
                  {result.results.map((r, i) => {
                    const diff = r.new_score - r.old_score;
                    return (
                      <tr key={i} style={{ borderTop: '1px solid #c8d8f0', background: diff > 0 ? '#f0faf4' : 'transparent' }}>
                        <td style={{ padding: '9px 14px', fontWeight: 600 }}>{r.name}</td>
                        <td style={{ padding: '9px 14px', color: '#5a7090' }}>{r.section}</td>
                        <td style={{ padding: '9px 14px', textAlign: 'center' }}>{r.old_score}/{r.total}</td>
                        <td style={{ padding: '9px 14px', textAlign: 'center', fontWeight: 600, color: diff > 0 ? '#1a7a4a' : '#1a2a3a' }}>{r.new_score}/{r.total}</td>
                        <td style={{ padding: '9px 14px', textAlign: 'center', color: diff > 0 ? '#1a7a4a' : '#5a7090' }}>
                          {diff > 0 ? `+${diff}` : diff === 0 ? '—' : diff}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </AdminLayout>
  );
}
