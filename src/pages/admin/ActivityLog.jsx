import { useState, useEffect } from 'react';
import { api } from '../../api';
import AdminLayout from '../../components/AdminLayout';
import { PageHeader, Badge, EmptyState, Button } from '../../components/ui';
import { Clock, RefreshCw, History } from 'lucide-react';

const actionMap = {
  exam_created: 'Exam Created',
  exam_updated: 'Exam Updated',
  exam_deleted: 'Exam Deleted',
  bank_added: 'Bank Question Added',
  bank_updated: 'Bank Question Updated',
  bank_deleted: 'Bank Question Deleted',
  bulk_import: 'Bulk Import',
  regrade: 'Regrade',
};

function actionTone(action) {
  if (action.includes('deleted')) return 'danger';
  if (action.includes('created') || action.includes('added')) return 'success';
  if (action === 'regrade') return 'warning';
  return 'info';
}

export default function ActivityLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api.getLogs().then(setLogs).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  return (
    <AdminLayout title="Activity Log">
      <main className="max-w-[800px] mx-auto px-4 py-6">
        <PageHeader
          eyebrow="System"
          title="Activity Log"
          subtitle={`${logs.length} recorded admin action${logs.length !== 1 ? 's' : ''}`}
          icon={History}
          actions={
            <Button variant="outline" size="sm" icon={RefreshCw} onClick={load} disabled={loading}>
              Refresh
            </Button>
          }
        />

        {loading ? (
          <div className="text-center text-muted py-10">Loading...</div>
        ) : !logs.length ? (
          <EmptyState icon={Clock} title="No activity yet" body="Admin actions will be logged here." />
        ) : (
          <div className="flex flex-col gap-1.5">
            {logs.map(log => (
              <div key={log.id} className="flex items-center gap-3 bg-surface border border-border rounded-lg px-4 py-3 text-[13px] shadow-card">
                <Badge tone={actionTone(log.action)}>
                  {actionMap[log.action] || log.action}
                </Badge>
                <span className="flex-1 text-muted min-w-0 truncate">{log.details}</span>
                <span className="text-[11px] text-faint whitespace-nowrap font-mono">
                  <Clock size={11} className="inline -mt-0.5 mr-1" />
                  {new Date(log.created_at + 'Z').toLocaleString('en-PH', {
                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                  })}
                </span>
              </div>
            ))}
            <div className="text-[11px] text-faint flex items-center gap-1.5 mt-1">
              <History size={11} /> {logs.length} log entry{logs.length !== 1 ? 'ies' : ''}
            </div>
          </div>
        )}
      </main>
    </AdminLayout>
  );
}