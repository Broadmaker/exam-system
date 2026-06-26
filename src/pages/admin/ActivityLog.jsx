import { useState, useEffect } from 'react';
import { api } from '../../api';
import AdminLayout from '../../components/AdminLayout';
import '../../styles.css';
import { Clock, RefreshCw } from 'lucide-react';

export default function ActivityLog() {
  return <AdminLayout title="Activity Log"><LogInner /></AdminLayout>;
}

function LogInner() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api.getLogs().then(setLogs).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const actionLabel = (action) => {
    const map = {
      exam_created: 'Exam Created',
      exam_updated: 'Exam Updated',
      exam_deleted: 'Exam Deleted',
      bank_added: 'Bank Question Added',
      bank_updated: 'Bank Question Updated',
      bank_deleted: 'Bank Question Deleted',
      bulk_import: 'Bulk Import',
      regrade: 'Regrade',
    };
    return map[action] || action;
  };

  const actionColor = (action) => {
    if (action.includes('deleted')) return '#c0392b';
    if (action.includes('created') || action.includes('added')) return '#1a7a4a';
    if (action === 'regrade') return '#e8a020';
    return '#1a4fad';
  };

  return (
    <div>
      <main style={{ maxWidth: 800, margin: '0 auto', padding: '24px 16px' }}>
        <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={load} className="btn btn-outline btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
        {loading ? (
          <div style={{ textAlign: 'center', color: '#5a7090', padding: 40 }}>Loading...</div>
        ) : !logs.length ? (
          <div style={{ textAlign: 'center', color: '#5a7090', padding: '60px 20px', background: '#fff', borderRadius: 12, border: '2px dashed #c8d8f0' }}>
            <Clock size={40} style={{ opacity: .4, marginBottom: 12 }} />
            <p style={{ fontSize: 16, fontWeight: 600, color: '#0f2044' }}>No activity yet</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {logs.map(log => (
              <div key={log.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                background: '#fff', border: '1px solid #c8d8f0', borderRadius: 8,
                padding: '12px 16px', fontSize: 13,
              }}>
                <span style={{
                  fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 4,
                  background: actionColor(log.action) + '18',
                  color: actionColor(log.action), whiteSpace: 'nowrap',
                  fontFamily: "'IBM Plex Mono', monospace",
                }}>
                  {actionLabel(log.action)}
                </span>
                <span style={{ flex: 1, color: '#5a7090', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {log.details}
                </span>
                <span style={{ fontSize: 11, color: '#9ab', whiteSpace: 'nowrap', fontFamily: "'IBM Plex Mono', monospace" }}>
                  {new Date(log.created_at + 'Z').toLocaleString('en-PH', {
                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                  })}
                </span>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
