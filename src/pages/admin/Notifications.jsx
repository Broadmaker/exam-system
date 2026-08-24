import { useState, useEffect, useCallback } from 'react';
import { api } from '../../api';
import AdminLayout from '../../components/AdminLayout';
import { PageHeader, Card, Button, Input, TextArea, Select, Badge, EmptyState, Spinner, Modal, ConfirmDialog, useToast } from '../../components/ui';
import { Bell, Plus, Trash2, Send, Info, Megaphone, GraduationCap, CalendarCheck, BookOpen, AlertTriangle, Eye } from 'lucide-react';

const TYPE_LABELS = {
  assessment_published: 'Assessment Published',
  assessment_reminder: 'Reminder',
  assessment_submitted: 'Submission',
  result_published: 'Result',
  grade_changed: 'Grade Changed',
  attendance_recorded: 'Attendance',
  announcement: 'Announcement',
};
const TYPE_TONES = {
  assessment_published: 'info',
  assessment_reminder: 'warning',
  grade_changed: 'warning',
  announcement: 'neutral',
  attendance_recorded: 'success',
  result_published: 'success',
};

export default function AdminNotifications() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [classes, setClasses] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const toast = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterType) params.type = filterType;
      if (filterClass) params.class_id = filterClass;
      const data = await api.listAdminNotifications(params);
      setItems(Array.isArray(data) ? data : []);
    } catch (e) { toast.error(e.message); }
    setLoading(false);
  }, [filterType, filterClass, toast]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { api.listClasses().then(setClasses).catch(() => {}); }, []);

  const del = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try { await api.deleteNotification(deleteTarget.id); toast.success('Deleted'); setDeleteTarget(null); load(); } catch (e) { toast.error(e.message); }
    setDeleting(false);
  };

  return (
    <AdminLayout title="Notifications">
      <main className="max-w-[900px] mx-auto px-4 py-6">
        <PageHeader
          eyebrow="Engagement"
          title="Notifications"
          subtitle={`${items.length} notification${items.length!==1?'s':''} · auto-generated on publish & grade changes (§42, §72)`}
          icon={Bell}
          actions={<Button icon={Plus} onClick={() => setShowCreate(true)}>New Notification</Button>}
        />

        <Card className="!mb-4">
          <div className="flex gap-2 flex-wrap items-end">
            <div className="min-w-[180px]">
              <label className="text-[11px] font-semibold text-faint tracking-[.08em] uppercase">Type</label>
              <select value={filterType} onChange={e=>setFilterType(e.target.value)} className="input">
                <option value="">All types</option>
                {Object.entries(TYPE_LABELS).map(([k,v])=><option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="min-w-[180px]">
              <label className="text-[11px] font-semibold text-faint tracking-[.08em] uppercase">Class</label>
              <select value={filterClass} onChange={e=>setFilterClass(e.target.value)} className="input">
                <option value="">All classes & global</option>
                {classes.map(c=> <option key={c.id} value={c.id}>{c.name} {c.section? '· '+c.section:''}</option>)}
              </select>
            </div>
            <Button variant="outline" size="sm" onClick={load}>Apply</Button>
          </div>
        </Card>

        {loading ? <Spinner label="Loading notifications..." /> : !items.length ? (
          <EmptyState icon={Bell} title="No notifications yet" body="Create an announcement or publish an exam — it will auto-notify enrolled students. Also triggers on grade changes." action={<Button icon={Plus} onClick={()=>setShowCreate(true)}>Create Notification</Button>} />
        ) : (
          <div className="flex flex-col gap-1.5">
            {items.map(n => (
              <div key={n.id} className="flex items-start gap-3 bg-surface border border-border rounded-lg px-4 py-3.5 shadow-card">
                <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${n.type==='grade_changed'?'bg-warning-bg text-warning': n.type==='assessment_published'?'bg-info-bg text-info':'bg-navy-100 text-navy-700'}`}>
                  {n.type==='announcement' ? <Megaphone size={14}/> : n.type==='grade_changed' ? <GraduationCap size={14}/> : <BookOpen size={14}/>}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge tone={TYPE_TONES[n.type]||'info'} className="!text-[10px]">{TYPE_LABELS[n.type]||n.type}</Badge>
                    {n.class_id && <Badge tone="neutral" className="!text-[10px]">{classes.find(c=>c.id===n.class_id)?.name || n.class_id.slice(0,8)}</Badge>}
                    {n.student_id && <Badge tone="warning" className="!text-[10px] font-mono">{n.student_id}</Badge>}
                    {n.exam_id && <Badge tone="neutral" className="!text-[10px]">exam {n.exam_id.slice(0,6)}</Badge>}
                  </div>
                  <div className="text-[13px] font-semibold text-navy-800 mt-1 truncate">{n.title}</div>
                  {n.body && <div className="text-[12px] text-muted mt-0.5 line-clamp-2">{n.body}</div>}
                  <div className="text-[11px] text-faint mt-1 flex items-center gap-2">
                    <span className="inline-flex items-center gap-1"><CalendarCheck size={11}/> {new Date(n.created_at+'Z').toLocaleString('en-PH',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}</span>
                  </div>
                </div>
                <button onClick={()=>setDeleteTarget(n)} className="p-1.5 rounded-md text-faint hover:text-danger hover:bg-danger-bg shrink-0 cursor-pointer"><Trash2 size={14}/></button>
              </div>
            ))}
          </div>
        )}

        <CreateModal open={showCreate} onClose={()=>setShowCreate(false)} classes={classes} onCreated={()=>{setShowCreate(false); load();}} />

        <ConfirmDialog open={!!deleteTarget} onClose={()=>setDeleteTarget(null)} title="Delete notification?" body={deleteTarget ? <>Delete <strong>{deleteTarget.title}</strong>? Enrolled students will no longer see it.</> : ''} confirmLabel="Delete" loading={deleting} onConfirm={del} />
      </main>
    </AdminLayout>
  );
}

function CreateModal({ open, onClose, classes, onCreated }) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [type, setType] = useState('announcement');
  const [classId, setClassId] = useState('');
  const [studentId, setStudentId] = useState('');
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const submit = async () => {
    if (!title.trim()) { toast.error('Title is required'); return; }
    setSaving(true);
    try {
      await api.createNotification({ title: title.trim(), body: body.trim(), type, class_id: classId, student_id: studentId.trim().toUpperCase(), exam_id: '' });
      toast.success('Notification sent');
      setTitle(''); setBody(''); setType('announcement'); setClassId(''); setStudentId('');
      onCreated();
    } catch (e) { toast.error(e.message); }
    setSaving(false);
  };

  return (
    <Modal open={open} onClose={onClose} title="New Notification" icon={Send} size="md"
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button icon={Send} loading={saving} onClick={submit}>Send Notification</Button></>}>
      <div className="flex flex-col gap-3">
        <Input label="Title" value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. New Biology Exam published" maxLength={120} />
        <TextArea label="Body" value={body} onChange={e=>setBody(e.target.value)} placeholder="Optional details — visible in the Notification Center" rows={3} maxLength={1000} />
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-semibold text-faint tracking-[.08em] uppercase">Type</label>
            <select value={type} onChange={e=>setType(e.target.value)} className="input">
              {Object.entries(TYPE_LABELS).map(([k,v])=><option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-faint tracking-[.08em] uppercase">Target Class (optional)</label>
            <select value={classId} onChange={e=>setClassId(e.target.value)} className="input">
              <option value="">Global — all students</option>
              {classes.map(c=> <option key={c.id} value={c.id}>{c.name} {c.section? '· '+c.section:''}</option>)}
            </select>
          </div>
        </div>
        <Input label="Target Student ID (optional — personal notification)" value={studentId} onChange={e=>setStudentId(e.target.value.toUpperCase())} placeholder="Leave blank for class/global broadcast" className="!font-mono !uppercase" hint="If set, only that student sees it (used for grade updates). Otherwise enrolled students in the class see it." />
        <div className="rounded-lg bg-canvas/60 border border-border px-3 py-2.5 text-[11px] text-muted flex gap-2">
          <Info size={13} className="text-navy-700 shrink-0 mt-0.5"/>
          <span>Auto-triggers exist: publishing an exam (`active`/`scheduled`) creates <strong>assessment_published</strong> for its class; manual regrade creates <strong>grade_changed</strong> for that student. Use this form for announcements.</span>
        </div>
      </div>
    </Modal>
  );
}
