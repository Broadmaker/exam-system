import { useState, useEffect } from 'react';
import { api } from '../../api';
import AdminLayout from '../../components/AdminLayout';
import { Button, Card, Select, Badge, PageHeader } from '../../components/ui';
import { RotateCcw, CheckCircle, AlertTriangle, Loader2, TrendingUp, Minus } from 'lucide-react';

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
      const data = await api.regrade(selectedId);
      setResult(data);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  return (
    <AdminLayout title="Regrade Submissions">
      <main className="max-w-[700px] mx-auto px-4 py-6">
        <PageHeader
          eyebrow="Exams"
          title="Regrade Submissions"
          subtitle="Recalculate scores for past submissions using the fixed grading logic."
          icon={RotateCcw}
        />
        <Card className="!p-7">
          <p className="text-[13px] text-muted mb-5 leading-relaxed">
            Recalculates scores for all past submissions using the fixed grading logic.
            Only run this once after deploying the scoring fix.
          </p>

          <div className="mb-5">
            <Select
              label="Select Exam"
              value={selectedId}
              onChange={e => { setSelectedId(e.target.value); setResult(null); setError(''); }}
            >
              <option value="">— Choose an exam —</option>
              {exams.map(e => (
                <option key={e.id} value={e.id}>
                  {e.title} ({e.submission_count || 0} submissions)
                </option>
              ))}
            </Select>
          </div>

          <Button onClick={doRegrade} disabled={!selectedId || loading} loading={loading} icon={loading ? null : RotateCcw}>
            {loading ? 'Regrading...' : 'Run Regrade'}
          </Button>
        </Card>

        {error && (
          <div className="mt-4 flex items-center gap-2 bg-danger-bg border border-danger rounded-[10px] px-4 py-3.5 text-[13px] text-danger">
            <AlertTriangle size={16} /> {error}
          </div>
        )}

        {result && (
          <div className="mt-5">
            <div className="flex items-center gap-2 bg-success-bg border border-success rounded-[10px] px-4 py-3.5 mb-4 text-[14px] text-success font-semibold">
              <CheckCircle size={18} /> {result.regraded} submission(s) regraded
            </div>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Section</th>
                    <th style={{ textAlign: 'center' }}>Old Score</th>
                    <th style={{ textAlign: 'center' }}>New Score</th>
                    <th style={{ textAlign: 'center' }}>Change</th>
                  </tr>
                </thead>
                <tbody>
                  {result.results.map((r, i) => {
                    const diff = r.new_score - r.old_score;
                    return (
                      <tr key={i} className={diff > 0 ? '!bg-success-bg/40' : ''}>
                        <td className="font-semibold">{r.name}</td>
                        <td className="text-muted">{r.section}</td>
                        <td style={{ textAlign: 'center' }}>{r.old_score}/{r.total}</td>
                        <td style={{ textAlign: 'center' }} className={diff > 0 ? 'text-success font-semibold' : ''}>{r.new_score}/{r.total}</td>
                        <td style={{ textAlign: 'center' }}>
                          {diff > 0 ? <Badge tone="success"><TrendingUp size={11} /> +{diff}</Badge> : diff === 0 ? <Minus size={14} className="text-faint" /> : diff}
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