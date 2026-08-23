import { useState } from 'react';
import { api } from '../api';
import { examTypeLabel } from '../utils';
import { Button, Card, Input, Badge, EmptyState, Spinner } from '../components/ui';
import PublicLayout from '../components/PublicLayout';
import { Search, User, GraduationCap, ClipboardList, CalendarCheck, UserRound, CheckCircle, BookOpen, TrendingUp, Target, History, XCircle, ShieldCheck } from 'lucide-react';

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
    <PublicLayout>
      {/* Hero */}
      <section className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0b1b3a 0%, #143a8a 45%, #1a4fad 100%)' }}>
        <div className="absolute inset-0 pointer-events-none opacity-40" style={{ backgroundImage: 'radial-gradient(700px 340px at 78% -8%, rgba(255,255,255,.14), transparent 60%), radial-gradient(520px 280px at 8% 108%, rgba(232,160,32,.18), transparent 60%)' }} />
        <div className="absolute inset-0 pointer-events-none opacity-[0.06]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
        <div className="relative max-w-[800px] mx-auto px-4 py-8 sm:py-10">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur border border-white/10 rounded-full px-3 py-1 text-[11px] font-semibold text-accent mb-4">
            <ShieldCheck size={12} /> Records are tied to your Student ID
          </div>
          <div className="flex items-start gap-3">
            <span className="hidden sm:flex w-11 h-11 rounded-xl bg-white/10 border border-white/10 text-white items-center justify-center shrink-0"><GraduationCap size={20} /></span>
            <div className="flex-1 min-w-0">
              <h1 className="text-white text-[26px] sm:text-[30px] font-bold leading-tight tracking-tight">Student Records</h1>
              <p className="text-white/70 text-[13px] sm:text-[14px] leading-relaxed mt-1">View your exam results, attendance, and competency breakdown.</p>
            </div>
          </div>

          <div className="mt-6 bg-surface rounded-[16px] shadow-modal border border-border p-4 sm:p-5 flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
            <div className="flex-1">
              <Input label="Student ID" value={studentId} onChange={e => setStudentId(e.target.value.toUpperCase())}
                placeholder="e.g. 2019-12345" icon={Search} className="!font-mono !uppercase !tracking-wide !bg-canvas focus:!bg-surface"
                onKeyDown={e => e.key === 'Enter' && look(e)} />
            </div>
            <Button onClick={look} loading={loading} icon={loading ? null : Search} className="!py-3 sm:!py-2.5 !text-[14px] shrink-0">
              {loading ? 'Searching…' : 'View Records'}
            </Button>
          </div>
          {error && <div className="mt-3 text-[12px] text-white bg-danger/90 border border-white/10 rounded-xl px-3.5 py-2.5 inline-flex items-center gap-2">{error}</div>}
        </div>
      </section>

      <main className="max-w-[800px] mx-auto px-4 py-6 sm:py-8 w-full flex-1">
        {loading ? (
          <Spinner label="Loading records..." />
        ) : data ? (
          <div style={{ animation: 'fadeInUp .3s' }}>
            <Card className="!mb-4 !p-4 flex items-center gap-3 flex-wrap">
              <span className="w-11 h-11 rounded-full bg-navy-900 text-white flex items-center justify-center"><User size={20} /></span>
              <div className="flex-1 min-w-[180px]">
                <div className="text-[16px] font-bold text-navy-800">{data.student_name}</div>
                <div className="text-[12px] text-muted">{data.student_id}{data.student_section ? ' · ' + data.student_section : ''}</div>
              </div>
              <div className="text-[13px] text-muted text-right">
                <span className="font-semibold text-navy-800">{data.exams.length}</span> exam{data.exams.length !== 1 ? 's' : ''} taken
              </div>
            </Card>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-4">
              <div className="flex items-center gap-2.5 bg-surface border border-border rounded-[12px] px-3.5 py-3.5 shadow-card">
                <span className="w-8 h-8 rounded-lg bg-navy-100 text-navy-700 flex items-center justify-center shrink-0"><BookOpen size={15} /></span>
                <div>
                  <div className="text-[11px] text-muted font-medium">Exams taken</div>
                  <div className="text-[16px] font-bold text-navy-800 leading-tight">{data.exams.length}</div>
                </div>
              </div>
              <div className="flex items-center gap-2.5 bg-surface border border-border rounded-[12px] px-3.5 py-3.5 shadow-card">
                <span className="w-8 h-8 rounded-lg bg-success-bg text-success flex items-center justify-center shrink-0"><CheckCircle size={15} /></span>
                <div>
                  <div className="text-[11px] text-muted font-medium">Classes</div>
                  <div className="text-[16px] font-bold text-navy-800 leading-tight">{data.classes.length}</div>
                </div>
              </div>
              <div className="flex items-center gap-2.5 bg-surface border border-border rounded-[12px] px-3.5 py-3.5 shadow-card col-span-2 sm:col-span-1">
                <span className="w-8 h-8 rounded-lg bg-purple-bg text-purple flex items-center justify-center shrink-0"><CalendarCheck size={15} /></span>
                <div>
                  <div className="text-[11px] text-muted font-medium">Attendance rate</div>
                  <div className="text-[16px] font-bold text-navy-800 leading-tight">
                    {(() => {
                      const total = data.classes.reduce((a, c) => a + (c.attendance.total || 0), 0);
                      const present = data.classes.reduce((a, c) => a + (c.attendance.present || 0), 0);
                      return total ? Math.round((present / total) * 100) : 0;
                    })()}%
                  </div>
                </div>
              </div>
            </div>

            {/* Performance trend */}
            {data.trend && data.trend.length > 1 && (
              <Card className="!mb-4" title="Performance Trend" icon={TrendingUp}
                actions={<span className="text-[11px] text-muted">Last {data.trend.length} assessments</span>}>
                <div className="flex items-end gap-1.5 h-32 overflow-x-auto pb-1">
                  {data.trend.map((t, i) => {
                    const color = t.pct >= 60 ? 'bg-success' : t.pct >= 40 ? 'bg-accent' : 'bg-danger';
                    return (
                      <div key={i} className="flex flex-col items-center gap-1 min-w-[34px]" title={`${t.label}: ${t.pct}%`}>
                        <span className="text-[10px] font-semibold text-navy-800">{t.pct}%</span>
                        <div className={`w-6 rounded-t ${color}`} style={{ height: Math.max(4, (t.pct / 100) * 88) }} />
                        <span className="text-[9px] text-faint max-w-[34px] truncate">
                          {t.submitted_at ? new Date(t.submitted_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '—'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            {/* Competency breakdown */}
            {data.competencies && data.competencies.length > 0 && (
              <Card className="!mb-4" title="Competency Breakdown" icon={Target}>
                <div className="flex flex-col gap-3">
                  {data.competencies.map(c => (
                    <div key={c.competency}>
                      <div className="flex items-center justify-between text-[13px] mb-1">
                        <span className="font-medium text-navy-800">{c.competency}</span>
                        <span className="text-muted font-mono text-[12px]">{c.correct}/{c.total} ({c.pct}%)</span>
                      </div>
                      <div className="h-2 bg-border/50 rounded-full overflow-hidden">
                        <div className={`h-full rounded ${c.pct >= 60 ? 'bg-success' : c.pct >= 40 ? 'bg-accent' : 'bg-danger'}`}
                          style={{ width: c.pct + '%', minWidth: c.pct > 0 ? 3 : 0 }} />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Assessment timeline */}
            {data.timeline && data.timeline.length > 0 && (
              <Card className="!mb-4" title="Assessment Timeline" icon={History}
                actions={<span className="text-[11px] text-muted">{data.timeline.length} assessment{data.timeline.length !== 1 ? 's' : ''}</span>}>
                <div className="flex flex-col">
                  {data.timeline.map((t, i) => (
                    <div key={i} className="flex items-center gap-3 px-1 py-2.5 border-b border-border last:border-0 text-[13px]">
                      <span className="w-8 h-8 rounded-lg bg-navy-100 text-navy-700 flex items-center justify-center shrink-0">
                        {t.passed ? <CheckCircle size={15} /> : <XCircle size={15} className="text-danger" />}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-navy-800 truncate">{t.title}</div>
                        <div className="text-[11px] text-faint flex items-center gap-2 flex-wrap">
                          {t.class_name && <span>{t.class_name}</span>}
                          {t.type && <span>{examTypeLabel(t.type)}</span>}
                          {t.submitted_at && <span>{new Date(t.submitted_at).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-bold">{t.pct}%</div>
                        <div className="text-[11px] text-faint"><span className="font-mono">{t.score}/{t.total}</span></div>
                      </div>
                      <Badge tone={t.passed ? 'success' : 'danger'}>{t.passed ? 'PASSED' : 'FAILED'}</Badge>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {data.classes.map(klass => (
              <Card key={klass.class_id} className="!mb-4">
                <div className="flex items-center gap-2.5 mb-3.5 flex-wrap">
                  <span className="w-8 h-8 rounded-lg bg-navy-100 flex items-center justify-center"><GraduationCap size={16} className="text-navy-700" /></span>
                  <div className="flex-1 min-w-[180px]">
                    <div className="text-[15px] font-bold text-navy-800">{klass.name}</div>
                    <div className="text-[12px] text-muted">
                      {[klass.subject, klass.section].filter(Boolean).join(' · ')}{klass.instructor ? ' · ' + klass.instructor : ''}
                    </div>
                  </div>
                  {klass.attendance.total > 0 && (
                    <div className="text-[12px] flex items-center gap-1.5">
                      <CalendarCheck size={14} className="text-success" />
                      <span className="text-success font-semibold">{klass.attendance.present} present</span>
                      <span className="text-muted">/ {klass.attendance.total} session{klass.attendance.total !== 1 ? 's' : ''}</span>
                    </div>
                  )}
                </div>

                {klass.attendance.total > 0 && (
                  <div className="mb-3.5 flex flex-wrap gap-1.5">
                    {klass.attendance.records.map((r, i) => (
                      <Badge key={i} tone={r.status === 'absent' ? 'danger' : 'success'}>
                        {r.date} · {r.status}{r.source === 'exam' ? ' (exam)' : ''}
                      </Badge>
                    ))}
                  </div>
                )}

                {klass.exam_results.length > 0 && (
                  <div>
                    <div className="text-[12px] font-semibold text-muted mb-2 flex items-center gap-1.5">
                      <ClipboardList size={13} /> Exam Results
                    </div>
                    <div className="flex flex-col gap-1.5">
                      {klass.exam_results.map(r => (
                        <div key={r.exam_id} className="flex items-center gap-3 px-3 py-2.5 border border-border rounded-lg bg-navy-50 text-[13px]">
                          <span className="flex-1 font-medium truncate">{r.title}</span>
                          {r.type && <Badge tone="info">{examTypeLabel(r.type)}</Badge>}
                          <span className="font-mono text-[12px] text-muted shrink-0">{(r.time_taken / 60).toFixed(1)} min</span>
                          <Badge tone={r.passed ? 'success' : 'danger'}>{r.score}/{r.total}</Badge>
                          <span className="text-[11px] text-faint shrink-0">{r.submitted_at ? new Date(r.submitted_at).toLocaleDateString() : ''}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            ))}

            {data.exams.filter(e => !e.class_name).length > 0 && (
              <Card className="!mb-4">
                <div className="text-[15px] font-bold text-navy-800 mb-3 flex items-center gap-2">
                  <ClipboardList size={17} className="text-navy-700" /> Standalone Exams
                </div>
                <div className="flex flex-col gap-1.5">
                  {data.exams.filter(e => !e.class_name).map(r => (
                    <div key={r.exam_id} className="flex items-center gap-3 px-3 py-2.5 border border-border rounded-lg bg-navy-50 text-[13px]">
                      <span className="flex-1 font-medium truncate">{r.title}</span>
                      {r.type && <Badge tone="info">{examTypeLabel(r.type)}</Badge>}
                      <Badge tone={r.passed ? 'success' : 'danger'}>{r.score}/{r.total}</Badge>
                      <span className="text-[11px] text-faint shrink-0">{r.submitted_at ? new Date(r.submitted_at).toLocaleDateString() : ''}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        ) : !error ? (
          <EmptyState icon={UserRound} title="Search your records" body="Enter your student ID above to see your exam results and attendance." />
        ) : null}
      </main>
    </PublicLayout>
  );
}
