import { useState, useEffect, useCallback } from 'react';
import { api } from '../../api';
import AdminLayout from '../../components/AdminLayout';
import { PageHeader, StatCard, Card, Badge, Button, ConfirmDialog, EmptyState, useToast } from '../../components/ui';
import { Plus, Users, ClipboardList, Clock, BarChart3, Eye, Pencil, Lock, FileText, Radio, Trash2, GraduationCap, Copy, TrendingUp } from 'lucide-react';

export default function Dashboard() {
  const [exams, setExams] = useState([]);
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const toast = useToast();

  const load = useCallback(() => {
    api.listExams().then(setExams).catch(e => toast.error(e.message));
    api.listClasses().then(setClasses).catch(() => {});
    api.listStudents().then(setStudents).catch(() => {});
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const totalSubs = exams.reduce((s, e) => s + (e.submission_count || 0), 0);
  const activeExams = exams.filter(e => !e.deadline || new Date(e.deadline).getTime() > Date.now()).length;

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    await api.deleteExam(deleteTarget.id).catch(e => toast.error(e.message));
    setDeleting(false);
    setDeleteTarget(null);
    toast.success('Exam deleted');
    load();
  };

  const copyId = (e) => {
    navigator.clipboard.writeText(e.id);
    toast.info('Exam ID copied');
  };

  const copyLink = (e) => {
    navigator.clipboard.writeText(window.location.origin + '/exam?id=' + e.id);
    toast.info('Exam link copied');
  };

  return (
    <AdminLayout title="Dashboard">
      <main className="max-w-[1100px] mx-auto px-4 py-6">
        {/* Hero */}
        <section className="flex flex-wrap items-end justify-between gap-4 mb-7">
          <div>
            <div className="text-[10px] font-semibold tracking-[.14em] uppercase text-faint mb-1.5">
              Workspace · Dashboard
            </div>
            <h1 className="text-[24px] sm:text-[28px] font-bold text-navy-800 leading-tight">
              Welcome back, <span className="text-navy-700">Admin</span>
            </h1>
            <p className="text-[13px] text-muted mt-1.5">
              <strong className="text-navy-800 font-semibold">{totalSubs}</strong> submission{totalSubs !== 1 ? 's' : ''} across{' '}
              <strong className="text-navy-800 font-semibold">{exams.length}</strong> exam{exams.length !== 1 ? 's' : ''} and{' '}
              <strong className="text-navy-800 font-semibold">{classes.length}</strong> class{classes.length !== 1 ? 'es' : ''}.
            </p>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <Button variant="outline" icon={Users} to="/admin/classes">Classes</Button>
            <Button icon={Plus} to="/admin/create">New Exam</Button>
          </div>
        </section>

        {/* KPI grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard icon={ClipboardList} value={exams.length} label="Total Exams" tone="navy"
            trend={{ dir: 'info', text: `${activeExams} open`, icon: <Radio size={11} /> }}
            note="Exams created across all subjects" />
          <StatCard icon={BarChart3} value={totalSubs} label="Total Submissions" tone="green"
            trend={{ dir: 'up', text: 'live', icon: <TrendingUp size={11} /> }}
            note="Answers received across all exams" />
          <StatCard icon={Users} value={students.length} label="Known Students" tone="accent"
            note="Registered student records" />
          <StatCard icon={GraduationCap} value={classes.length} label="Classes" tone="red"
            note="Class groups & rosters" />
        </div>

        <PageHeader
          eyebrow="Exams"
          title="All Exams"
          subtitle={`${exams.length} exam${exams.length !== 1 ? 's' : ''} total`}
        />

        {!exams.length ? (
          <EmptyState
            icon={ClipboardList}
            title="No exams yet"
            body="Create your first exam to get started."
            action={<Button icon={Plus} to="/admin/create">Create Your First Exam</Button>}
          />
        ) : (
          <div className="flex flex-col gap-3.5">
            {exams.map(e => (
              <Card key={e.id} padded={false} className="overflow-hidden card-hover">
                <div className="p-4 sm:p-5">
                  <div className="flex items-start gap-3">
                    <span className="w-10 h-10 rounded-xl bg-navy-100 text-navy-700 flex items-center justify-center shrink-0">
                      <FileText size={18} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-[15px] font-semibold text-navy-800 leading-tight">{e.title}</h3>
                        <Badge tone="info">{e.question_count || 0} Q</Badge>
                        <ExamStatus deadline={e.deadline} />
                      </div>
                      <div className="flex gap-4 text-[12px] text-muted mt-1.5 flex-wrap">
                        <span className="inline-flex items-center gap-1.5"><Clock size={12} /> {e.time_limit} min</span>
                        <span className="inline-flex items-center gap-1.5"><BarChart3 size={12} /> {e.submission_count || 0} submission{(e.submission_count || 0) !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer toolbar */}
                <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-2.5 bg-canvas/70 border-t border-border flex-wrap">
                  <div className="flex items-center gap-2.5 text-[11px] font-mono text-faint min-w-0">
                    <span className="truncate max-w-[200px]">{e.id}</span>
                    <span className="text-border-strong shrink-0">·</span>
                    <button onClick={() => copyId(e)} className="text-navy-700 hover:text-navy-800 font-sans cursor-pointer hover:underline shrink-0">copy ID</button>
                    <span className="text-border-strong shrink-0">·</span>
                    <button onClick={() => copyLink(e)} className="text-navy-700 hover:text-navy-800 font-sans cursor-pointer inline-flex items-center gap-1 hover:underline shrink-0">
                      <Copy size={11} /> link
                    </button>
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    <Button size="sm" variant="soft" title="Preview" icon={FileText} to={"/admin/preview?id=" + e.id} />
                    <Button size="sm" variant="soft" title="Student answers" icon={Eye} to={"/admin/answers?id=" + e.id} />
                    <Button size="sm" variant="soft" title="Live proctoring" icon={Radio} to={"/admin/proctor?id=" + e.id} />
                    <Button size="sm" variant="soft" title="Edit" icon={Pencil} to={"/admin/create?id=" + e.id} />
                    <Button size="sm" variant="soft" title="Scores" icon={BarChart3} to={"/admin/results?id=" + e.id} />
                    <Button size="sm" variant="dangerSoft" title="Delete" icon={Trash2} onClick={() => setDeleteTarget(e)} />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Exam?"
        body={
          <>
            You are about to delete <strong>{deleteTarget?.title}</strong>. This will also remove all
            questions and submissions.
          </>
        }
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={confirmDelete}
      />
    </AdminLayout>
  );
}

function ExamStatus({ deadline }) {
  if (!deadline) return <Badge tone="neutral">No deadline</Badge>;
  const expired = new Date(deadline).getTime() <= Date.now();
  return (
    <Badge tone={expired ? 'danger' : 'success'}>
      <Lock size={10} /> {expired ? 'Expired' : 'Open until'} {fmtDeadline(deadline)}
    </Badge>
  );
}

function fmtDeadline(deadline) {
  try {
    const d = new Date(deadline);
    if (isNaN(d.getTime())) return String(deadline).slice(0, 16).replace('T', ' ');
    return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  } catch { return String(deadline); }
}