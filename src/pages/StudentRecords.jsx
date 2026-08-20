import { useState } from 'react';
import { api } from '../api';
import { Button, Card, Input, Badge, EmptyState, Spinner } from '../components/ui';
import PublicLayout from '../components/PublicLayout';
import { Search, User, GraduationCap, ClipboardList, CalendarCheck, UserRound, CheckCircle, BookOpen } from 'lucide-react';

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
      <main className="max-w-[800px] mx-auto px-4 py-8 w-full flex-1">
        <div className="flex items-center gap-2.5 mb-6">
          <span className="w-10 h-10 rounded-lg bg-navy-100 text-navy-700 flex items-center justify-center"><GraduationCap size={20} /></span>
          <div>
            <h2 className="text-[20px] font-bold text-navy-800 leading-tight">Student Records</h2>
            <p className="text-[12px] text-muted">View your exam results and attendance</p>
          </div>
        </div>

        <Card className="!mb-6">
          <Input label="Student ID" value={studentId} onChange={e => setStudentId(e.target.value.toUpperCase())}
            placeholder="e.g. 2019-12345" icon={Search} className="!font-mono !uppercase !tracking-wide"
            onKeyDown={e => e.key === 'Enter' && look(e)} />
          <div className="flex items-center gap-3 mt-3 flex-wrap">
            <Button type="submit" icon={loading ? null : Search} onClick={look} loading={loading}>
              {loading ? 'Searching…' : 'View Records'}
            </Button>
            {error && <span className="text-[13px] text-danger">{error}</span>}
          </div>
        </Card>

        {loading ? (
          <Spinner label="Loading records..." />
        ) : data && (
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
              <div className="flex items-center gap-2.5 bg-surface border border-border rounded-[10px] px-3.5 py-3">
                <span className="w-8 h-8 rounded-lg bg-navy-100 text-navy-700 flex items-center justify-center shrink-0"><BookOpen size={15} /></span>
                <div>
                  <div className="text-[11px] text-muted font-medium">Exams taken</div>
                  <div className="text-[16px] font-bold text-navy-800 leading-tight">{data.exams.length}</div>
                </div>
              </div>
              <div className="flex items-center gap-2.5 bg-surface border border-border rounded-[10px] px-3.5 py-3">
                <span className="w-8 h-8 rounded-lg bg-success-bg text-success flex items-center justify-center shrink-0"><CheckCircle size={15} /></span>
                <div>
                  <div className="text-[11px] text-muted font-medium">Classes</div>
                  <div className="text-[16px] font-bold text-navy-800 leading-tight">{data.classes.length}</div>
                </div>
              </div>
              <div className="flex items-center gap-2.5 bg-surface border border-border rounded-[10px] px-3.5 py-3 col-span-2 sm:col-span-1">
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
                          <span className="font-mono text-[12px] text-muted shrink-0">{(r.time_taken / 60).toFixed(1)} min</span>
                          <Badge tone={r.score / r.total >= 0.6 ? 'success' : 'danger'}>{r.score}/{r.total}</Badge>
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
                      <Badge tone={r.score / r.total >= 0.6 ? 'success' : 'danger'}>{r.score}/{r.total}</Badge>
                      <span className="text-[11px] text-faint shrink-0">{r.submitted_at ? new Date(r.submitted_at).toLocaleDateString() : ''}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        )}

        {!loading && !data && !error && (
          <EmptyState icon={UserRound} title="Search your records" body="Enter your student ID above to see your exam results and attendance." />
        )}
      </main>
    </PublicLayout>
  );
}