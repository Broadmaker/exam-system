import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../api';
import AdminLayout from '../../components/AdminLayout';
import { PageHeader, StatCard, Card, Badge, Button, Table, EmptyState, Spinner, useToast } from '../../components/ui';
import DOMPurify from 'dompurify';
import { ClipboardList, BarChart3, Trophy, TrendingDown, Search, RefreshCw, Inbox, Download, PieChart, HelpCircle, FolderOpen, Repeat, CheckCircle2, XCircle } from 'lucide-react';

export default function Results() {
  return <AdminLayout title="Exam Results"><ResultsInner /></AdminLayout>;
}

function scoreTone(pct) {
  if (pct >= 80) return 'success';
  if (pct >= 60) return 'warning';
  return 'danger';
}

function ResultsInner() {
  const [params] = useSearchParams();
  const examId = params.get('id');
  const [exam, setExam] = useState(null);
  const [subs, setSubs] = useState([]);
  const [passingScore, setPassingScore] = useState(60);
  const [analytics, setAnalytics] = useState([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = async () => {
    if (!examId) return;
    setLoading(true);
    const [examData, subsData, analyticsData] = await Promise.all([
      api.getExam(examId).catch(() => null),
      api.getSubmissions(examId).catch(() => ({ passing_score: 60, results: [] })),
      api.getAnalytics(examId).catch(() => []),
    ]);
    setExam(examData);
    setSubs(subsData.results || []);
    if (subsData.passing_score !== undefined) setPassingScore(subsData.passing_score);
    setAnalytics(analyticsData);
    setLoading(false);
  };

  useEffect(() => { load(); }, [examId]);

  const toggleRetry = async (sub) => {
    const next = !sub.retry_allowed;
    try {
      await api.allowRetry(examId, sub.student_id, next);
      toast.success(`${sub.student_name}: retry ${next ? 'allowed' : 'revoked'}`);
      load();
    } catch (e) { toast.error(e.message); }
  };

  const total = subs.length;
  const avg = total ? (subs.reduce((s, r) => s + r.score, 0) / total) : 0;
  const best = total ? Math.max(...subs.map(r => r.score)) : 0;
  const worst = total ? Math.min(...subs.map(r => r.score)) : 0;
  const maxTotal = subs[0]?.total || 0;
  const passingRate = total ? Math.round((subs.filter(r => (r.total ? (r.score / r.total) * 100 : 0) >= passingScore).length / total) * 100) : 0;

  const buckets = Array(10).fill(0);
  subs.forEach(r => {
    const pct = (r.score / r.total) * 100;
    const idx = Math.min(9, Math.floor(pct / 10));
    buckets[idx]++;
  });

  const filtered = subs
    .filter(r => r.student_name.toLowerCase().includes(debouncedSearch.toLowerCase()))
    .sort((a, b) => b.score - a.score || a.time_taken - b.time_taken);

  const exportCSV = () => {
    const header = 'Student,Section,Score,Total,Percentage,Result,Tab Switches,Time (min),Status,Submitted';
    const rows = subs.map(r => {
      const pct = ((r.score / r.total) * 100).toFixed(1);
      const passed = pct >= passingScore;
      const mins = Math.floor(r.time_taken / 60);
      const secs = r.time_taken % 60;
      const time = mins + ':' + String(secs).padStart(2, '0');
      const date = new Date(r.submitted_at + 'Z').toLocaleString('en-PH');
      const status = r.retry_allowed ? 'retry' : (r.reason === 'manual' ? 'submitted' : r.reason + '-auto');
      return `"${r.student_name}","${r.student_section}",${r.score},${r.total},${pct},"${passed ? 'PASSED' : 'FAILED'}",${r.tab_switches},"${time}","${status}","${date}"`;
    }).join('\n');
    const blob = new Blob([header + '\n' + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = (exam?.title || 'results') + '.csv';
    a.click(); URL.revokeObjectURL(url);
  };

  if (!examId) return <main className="max-w-[1000px] mx-auto px-4 py-6"><EmptyState icon={FolderOpen} title="No exam selected" body="Select an exam from the Dashboard to view results." /></main>;
  if (loading) return <main className="max-w-[1000px] mx-auto px-4 py-6"><Spinner label="Loading results..." /></main>;

  return (
    <main className="max-w-[1000px] mx-auto px-4 py-6">
      <PageHeader
        eyebrow="Exam Results"
        title={exam?.title ? `Results — ${exam.title}` : 'Exam Results'}
        subtitle={`${subs.length} submission${subs.length !== 1 ? 's' : ''} recorded · passing at ${passingScore}%`}
      />

      {/* Stats tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6">
        <StatCard icon={ClipboardList} value={total} label="Submissions" tone="navy" />
        <StatCard icon={BarChart3} value={total ? avg.toFixed(1) : '—'} label="Average Score" tone="green" suffix={total ? `/ ${maxTotal}` : ''} />
        <StatCard icon={Trophy} value={best} label="Highest Score" tone="accent" suffix={best ? `/ ${maxTotal}` : ''} />
        <StatCard icon={TrendingDown} value={total > 1 ? worst : '—'} label="Lowest Score" tone="red" suffix={worst ? `/ ${maxTotal}` : ''} />
        <StatCard icon={CheckCircle2} value={passingRate} label="Passing Rate" suffix={total ? '%' : ''} tone={total ? (passingRate >= 60 ? 'green' : 'red') : 'navy'} />
      </div>

      {/* Per-question analytics */}
      {analytics.length > 0 && (
        <Card title="Question Analytics" icon={HelpCircle} className="mb-6">
          <div className="flex flex-col gap-3">
            {analytics.map((q, qi) => (
              <div key={q.questionId} className="bg-navy-50 border border-border rounded-lg p-3.5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-navy-900 text-white text-[9px] font-bold px-2 py-0.5 rounded-sm">Q{qi + 1}</span>
                  <span className="text-[11px] text-muted">
                    {q.correct}/{q.total} correct ({Math.round((q.correct / q.total) * 100)}%)
                  </span>
                </div>
                <div className="text-[13px] leading-relaxed mb-2.5" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(q.text) }} />
                {q.type === 'fill_blank' ? (
                  <div className="text-[12px] text-muted">Correct answer: <strong>{q.answer}</strong></div>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {(q.choices || []).map(c => {
                      const pct = q.total ? Math.round((c.count / q.total) * 100) : 0;
                      return (
                        <div key={c.key} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[12px] ${c.correct ? 'bg-success-bg border-[1.5px] border-success text-success font-semibold' : 'bg-surface border-[1.5px] border-border text-text'}`}>
                          <span className="font-mono font-bold text-[11px] min-w-[14px]">{c.key})</span>
                          <span>{c.text}</span>
                          <Badge tone={c.correct ? 'success' : 'neutral'} className="!px-2 !py-0 text-[10px]">{c.count} ({pct}%)</Badge>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Score distribution */}
      {total > 0 && (
        <Card title="Score Distribution" icon={PieChart} className="mb-6" actions={<span className="text-[11px] text-muted">{total} student{total !== 1 ? 's' : ''}</span>}>
          <div className="flex flex-col gap-1.5">
            {buckets.map((count, i) => {
              const pct = total ? (count / total) * 100 : 0;
              const labelLow = i * 10;
              const labelHigh = i === 9 ? '100' : (i + 1) * 10;
              const barColor = i >= 8 ? 'bg-success' : i >= 6 ? 'bg-accent' : 'bg-danger';
              return (
                <div key={i} className="flex items-center gap-2.5 text-[12px]">
                  <span className="min-w-[52px] text-right text-muted font-mono text-[11px]">{labelLow}–{labelHigh}%</span>
                  <div className="flex-1 h-5 bg-border/40 rounded overflow-hidden">
                    <div className={`h-full rounded ${barColor} transition-all duration-400`} style={{ width: pct + '%', minWidth: count > 0 ? 4 : 0 }} />
                  </div>
                  <span className="min-w-[24px] font-semibold font-mono">{count}</span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Search & export */}
      <div className="flex gap-3 mb-5 items-center flex-wrap">
        <div className="flex-1 relative min-w-[180px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by student name..."
            className="input !pl-9"
          />
        </div>
        <Button variant="outline" icon={RefreshCw} onClick={load}>Refresh</Button>
        {subs.length > 0 && <Button icon={Download} onClick={exportCSV}>CSV</Button>}
      </div>

      {!subs.length ? (
        <EmptyState icon={Inbox} title="No submissions yet" body="Results will appear here once students take the exam." />
      ) : !filtered.length ? (
        <EmptyState icon={Search} title="No matches" body={`No results match "${search}"`} compact />
      ) : (
        <>
          <Table
            columns={[
              { key: '#', header: '#', width: 40, render: (_, i) => <span className="font-bold text-muted text-[11px]">{i + 1}</span> },
              { key: 'name', header: 'Student', render: r => <span className="font-semibold">{r.student_name}</span> },
              { key: 'section', header: 'Section', render: r => <span className="text-muted">{r.student_section}</span> },
              {
                key: 'score', header: 'Score',
                render: r => {
                  const pct = ((r.score / r.total) * 100).toFixed(1);
                  return <Badge tone={scoreTone(pct)}>{r.score}/{r.total} ({pct}%)</Badge>;
                },
              },
              {
                key: 'passed', header: 'Result',
                render: r => {
                  const pct = r.total ? (r.score / r.total) * 100 : 0;
                  const passed = pct >= passingScore;
                  return (
                    <span className={`inline-flex items-center gap-1 font-semibold ${passed ? 'text-success' : 'text-danger'}`}>
                      {passed ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                      {passed ? 'PASSED' : 'FAILED'}
                    </span>
                  );
                },
              },
              {
                key: 'tab', header: 'Tab Switches', align: 'center',
                render: r => <span className={r.tab_switches > 0 ? 'text-warning font-semibold' : 'text-muted'}>{r.tab_switches}</span>,
              },
              {
                key: 'status', header: 'Status',
                render: r => (
                  <div className="flex flex-col gap-1 items-start">
                    <Badge tone={r.reason === 'manual' ? 'neutral' : r.reason === 'timeout' ? 'warning' : r.reason === 'tab' ? 'danger' : 'danger'}>
                      {r.reason === 'manual' ? 'Submitted' : r.reason === 'timeout' ? 'Timed out' : r.reason === 'tab' ? 'Tab switch' : 'Proctor end'}
                    </Badge>
                    {r.retry_allowed && <Badge tone="success">Retry allowed</Badge>}
                    <Button size="sm" variant={r.retry_allowed ? 'danger' : 'outline'} icon={Repeat}
                      onClick={() => toggleRetry(r)}>
                      {r.retry_allowed ? 'Revoke Retry' : 'Allow Retry'}
                    </Button>
                  </div>
                ),
              },
              {
                key: 'time', header: 'Time',
                render: r => {
                  const mins = Math.floor(r.time_taken / 60);
                  const secs = r.time_taken % 60;
                  return <span className="font-mono text-[12px] text-muted">{mins}:{String(secs).padStart(2, '0')}</span>;
                },
              },
              {
                key: 'submitted', header: 'Submitted',
                render: r => (
                  <span className="text-[11px] text-faint">
                    {new Date(r.submitted_at + 'Z').toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                ),
              },
            ]}
            data={filtered}
            footer={
              <tr>
                <td colSpan={9} className="!text-[11px] !text-faint !py-2.5 !px-4 !bg-canvas">
                  Showing {filtered.length} of {subs.length} submission{subs.length !== 1 ? 's' : ''}
                </td>
              </tr>
            }
          />
        </>
      )}
    </main>
  );
}