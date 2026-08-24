import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api';
import AdminLayout from '../../components/AdminLayout';
import {
  PageHeader, Card, Button, Input, Select, TextArea, Badge, EmptyState, Spinner, Modal, ConfirmDialog, useToast,
} from '../../components/ui';
import QRCode from 'qrcode';
import {
  Users, Plus, Pencil, Trash2, ArrowLeft, CalendarCheck, ClipboardList,
  X, Search, UserPlus, BookOpen, Save, History, Download, Copy,
  QrCode, Link2, Eye, School, User, Key, ArrowRight, CheckCircle, XCircle, Info, UserCheck,
  BarChart3, Settings, Scale, Layers, AlertTriangle,
} from 'lucide-react';

import { exportCSV, EXAM_TYPE_LABELS } from '../../utils';

export default function Classes() {
  const [classes, setClasses] = useState([]);
  const [selected, setSelected] = useState(null);
  const toast = useToast();

  const load = useCallback(() => {
    api.listClasses().then(setClasses).catch(e => toast.error(e.message));
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  return (
    <AdminLayout title="Classes">
      <main className="max-w-[1000px] mx-auto px-4 py-6">
        {selected ? (
          <ClassDetail klass={selected} onBack={() => { setSelected(null); load(); }} onChanged={load} />
        ) : (
          <ClassesList classes={classes} onOpen={setSelected} onChanged={load} />
        )}
      </main>
    </AdminLayout>
  );
}

function ClassesList({ classes, onOpen, onChanged }) {
  const [creating, setCreating] = useState(false);
  const [editId, setEditId] = useState(null);
  const [cName, setCName] = useState('');
  const [cSubject, setCSubject] = useState('');
  const [cSection, setCSection] = useState('');
  const [cInstructor, setCInstructor] = useState('');
  const [cCode, setCCode] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const toast = useToast();

  const openForm = (k) => {
    if (k) { setEditId(k.id); setCName(k.name); setCSubject(k.subject || ''); setCSection(k.section || ''); setCInstructor(k.instructor || ''); setCCode(k.access_code || ''); setCreating(true); }
    else { setEditId(null); setCName(''); setCSubject(''); setCSection(''); setCInstructor(''); setCCode(''); setCreating(true); }
  };

  const save = async () => {
    if (!cName.trim()) { toast.error('Class name is required'); return; }
    setSaving(true);
    const body = { name: cName.trim(), subject: cSubject.trim(), section: cSection.trim(), instructor: cInstructor.trim(), access_code: cCode.trim() };
    try {
      if (editId) {
        const res = await api.updateClass(editId, body);
        setCCode(res.access_code || cCode);
        toast.success('Class updated');
      } else {
        const res = await api.createClass(body);
        setCCode(res.access_code || '');
        toast.success('Class created — share enrollment code ' + (res.access_code || ''));
      }
      setCreating(false);
      onChanged();
    } catch (e) { toast.error(e.message); }
    setSaving(false);
  };

  const del = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.deleteClass(deleteTarget.id);
      toast.success('Class deleted');
      setDeleteTarget(null);
      onChanged();
    } catch (e) { toast.error(e.message); }
    setDeleting(false);
  };

  return (
    <>
      <PageHeader
        eyebrow="Classes & Students"
        title="Classes"
        subtitle={`${classes.length} class${classes.length !== 1 ? 'es' : ''} total`}
        icon={Users}
        actions={<Button icon={Plus} onClick={() => openForm(null)}>New Class</Button>}
      />

      {creating && (
        <Card eyebrow="Class Setup" title={editId ? 'Edit Class' : 'Create Class'} icon={editId ? Pencil : Plus} className="!border-navy-700 !mb-5">
          <div className="flex flex-col gap-3">
            <Input label="Class Name" icon={School} value={cName} onChange={e => setCName(e.target.value)} placeholder="e.g. BSCS 2-A" />
            <div className="grid sm:grid-cols-2 gap-3">
              <Input label="Subject" icon={BookOpen} value={cSubject} onChange={e => setCSubject(e.target.value)} placeholder="e.g. Statistics" />
              <Input label="Section" icon={Users} value={cSection} onChange={e => setCSection(e.target.value)} placeholder="e.g. BSCS 2-A" />
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <Input label="Instructor" icon={User} value={cInstructor} onChange={e => setCInstructor(e.target.value)} placeholder="e.g. Prof. Sanig" />
              <Input label="Enrollment Code" icon={Key} value={cCode} onChange={e => setCCode(e.target.value)} placeholder="Auto-generated if blank" className="!font-mono !uppercase !tracking-wide" hint="Students use this code to join at /enroll — leave blank to auto-generate." />
            </div>
            <div className="flex gap-2 pt-1">
              <Button size="sm" onClick={save} loading={saving} icon={Save}>{saving ? 'Saving…' : 'Save Class'}</Button>
              <Button size="sm" variant="outline" onClick={() => setCreating(false)}>Cancel</Button>
            </div>
          </div>
        </Card>
      )}

      {!classes.length ? (
        <EmptyState icon={Users} title="No classes yet" body="Create a class, enroll your students, then build exams for it."
          action={<Button icon={Plus} onClick={() => openForm(null)}>Create Your First Class</Button>} />
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3">
          {classes.map(k => (
            <Card key={k.id} className="!p-5 !mb-0 card-hover flex flex-col gap-2.5 cursor-pointer" onClick={() => onOpen(k)}>
              <div className="flex justify-between items-start">
                <div className="text-[16px] font-bold text-navy-800">{k.name}</div>
                <div className="flex gap-0.5">
                  <button onClick={(e) => { e.stopPropagation(); openForm(k); }} className="p-1.5 rounded-md text-navy-700 hover:bg-navy-50 cursor-pointer"><Pencil size={14} /></button>
                  <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(k); }} className="p-1.5 rounded-md text-faint hover:bg-danger-bg hover:text-danger cursor-pointer"><Trash2 size={14} /></button>
                </div>
              </div>
              <div className="text-[13px] text-muted">{k.subject || '—'}{k.section ? ' · ' + k.section : ''}</div>
              <button
                onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(k.access_code || ''); toast.info('Enrollment code copied!'); }}
                className="inline-flex items-center gap-1.5 bg-navy-100 text-navy-700 px-3 py-1 rounded-md cursor-pointer self-start hover:bg-navy-100/70 transition-colors"
                title="Click to copy">
                <span className="text-[10px] font-bold tracking-[.12em] font-mono">{k.access_code}</span>
                <Copy size={11} />
              </button>
              {k.instructor && <div className="text-[12px] text-faint">{k.instructor}</div>}
              <div className="flex gap-4 text-[12px] text-muted border-t border-border pt-2.5">
                <span className="inline-flex items-center gap-1"><Users size={12} /> {k.student_count || 0} students</span>
                <span className="inline-flex items-center gap-1"><ClipboardList size={12} /> {k.exam_count || 0} exams</span>
              </div>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Class?"
        body={deleteTarget ? <>Delete <strong>{deleteTarget.name}</strong>? Its enrollments and attendance will be removed (exams are kept).</> : ''}
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={del}
      />
    </>
  );
}

function TabBtn({ active, onClick, icon, label }) {
  return (
    <button onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[13px] font-semibold cursor-pointer font-sans whitespace-nowrap transition-all duration-150 ${active ? 'bg-navy-700 text-white shadow-card' : 'bg-surface border border-border text-muted hover:bg-navy-50 hover:text-navy-800'}`}>
      <span className={active ? 'text-white' : 'text-navy-700'}>{icon}</span> {label}
    </button>
  );
}

function ClassDetail({ klass, onBack, onChanged }) {
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('enrollments');
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const load = useCallback(() => {
    api.getClass(klass.id).then(d => { setData(d); setLoading(false); }).catch(e => toast.error(e.message));
  }, [klass.id, toast]);

  useEffect(() => { load(); }, [load]);

  return (
    <>
      <Button variant="outline" size="sm" icon={ArrowLeft} onClick={onBack} className="!mb-4">All Classes</Button>

      <Card className="!mb-5">
        <div className="flex justify-between items-start flex-wrap gap-3">
          <div>
            <h3 className="text-xl font-bold text-navy-800">{data?.name || klass.name}</h3>
            <div className="text-[13px] text-muted mt-1">
              {[data?.subject, data?.section].filter(Boolean).join(' · ') || '—'}
              {data?.instructor && <span className="ml-3">{data.instructor}</span>}
            </div>
            {data?.access_code && (
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                <Badge tone="info" className="!tracking-[.08em] !font-mono">{data.access_code}</Badge>
                <button onClick={() => { navigator.clipboard.writeText(data.access_code); toast.info('Enrollment code copied!'); }}
                  className="text-[11px] text-navy-700 bg-none border-none cursor-pointer font-semibold inline-flex items-center gap-1">
                  <Copy size={11} /> copy
                </button>
                <span className="text-[11px] text-muted">Students enroll with this code at <strong className="font-mono">/enroll</strong></span>
              </div>
            )}
          </div>
          <Button icon={Plus} to={"/admin/create?class=" + klass.id}>Create Exam for this Class</Button>
        </div>
      </Card>

      <div className="flex gap-1.5 mb-5 flex-wrap">
        <TabBtn active={tab === 'enrollments'} onClick={() => setTab('enrollments')} icon={<Users size={14} />} label={`Enrollments (${data?.enrollments?.length || 0})`} />
        <TabBtn active={tab === 'attendance'} onClick={() => setTab('attendance')} icon={<CalendarCheck size={14} />} label="Take Attendance" />
        <TabBtn active={tab === 'history'} onClick={() => setTab('history')} icon={<History size={14} />} label="Attendance History" />
        <TabBtn active={tab === 'checkins'} onClick={() => setTab('checkins')} icon={<QrCode size={14} />} label={`Check-in Sessions (${data?.sessions?.length || 0})`} />
        <TabBtn active={tab === 'exams'} onClick={() => setTab('exams')} icon={<ClipboardList size={14} />} label={`Exams (${data?.exams?.length || 0})`} />
        <TabBtn active={tab === 'gradebook'} onClick={() => setTab('gradebook')} icon={<BarChart3 size={14} />} label="Gradebook" />
      </div>

      {loading ? (
        <Spinner label="Loading..." />
      ) : tab === 'enrollments' ? (
        <EnrollmentsTab classId={klass.id} enrollments={data.enrollments} onChanged={load} />
      ) : tab === 'attendance' ? (
        <AttendanceTab classId={klass.id} onChanged={load} />
      ) : tab === 'history' ? (
        <HistoryTab classId={klass.id} />
      ) : tab === 'checkins' ? (
        <CheckinSessionsTab classId={klass.id} sessions={data.sessions || []} onChanged={load} />
      ) : tab === 'exams' ? (
        <ExamsTab classId={klass.id} exams={data.exams} />
      ) : (
        <GradebookTab classId={klass.id} />
      )}
    </>
  );
}

function EnrollmentsTab({ classId, enrollments, onChanged }) {
  const [paste, setPaste] = useState('');
  const [known, setKnown] = useState([]);
  const [query, setQuery] = useState('');
  const [adding, setAdding] = useState(false);
  const [removeTarget, setRemoveTarget] = useState(null);
  const [removing, setRemoving] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [editForm, setEditForm] = useState({ student_id: '', student_name: '', student_section: '' });
  const [savingEdit, setSavingEdit] = useState(false);
  const toast = useToast();

  const loadKnown = () => api.listStudents().then(setKnown).catch(() => {});
  useEffect(() => { loadKnown(); }, []);

  const enrolledIds = new Set(enrollments.map(e => e.student_id));

  const addPasted = async () => {
    const students = paste.split('\n').map(l => l.trim()).filter(Boolean).map(line => {
      const parts = line.split(',').map(p => p.trim());
      return { student_id: (parts[0] || '').toUpperCase(), student_name: parts[1] || '', student_section: parts[2] || '' };
    }).filter(s => s.student_id && s.student_name);
    if (!students.length) { toast.error('Enter at least one Student ID and Name per line'); return; }
    setAdding(true);
    try {
      const res = await api.enrollStudents(classId, students);
      toast.success(`Enrolled ${res.added} student(s)` + (res.skipped ? `, ${res.skipped} already enrolled` : ''));
      setPaste('');
      onChanged();
    } catch (e) { toast.error(e.message); }
    setAdding(false);
  };

  const addKnown = async (s) => {
    try {
      await api.enrollStudents(classId, [{ student_id: s.student_id, student_name: s.student_name, student_section: s.student_section }]);
      toast.success(`${s.student_name} enrolled`);
      onChanged();
    } catch (e) { toast.error(e.message); }
  };

  const remove = async () => {
    if (!removeTarget) return;
    setRemoving(true);
    try {
      await api.removeStudent(classId, removeTarget.student_id);
      toast.success('Student removed');
      setRemoveTarget(null);
      onChanged();
    } catch (e) { toast.error(e.message); }
    setRemoving(false);
  };

  const openEdit = (e) => {
    setEditForm({ student_id: e.student_id, student_name: e.student_name, student_section: e.student_section || '' });
    setEditTarget(e);
  };

  const saveEdit = async () => {
    if (!editTarget) return;
    if (!editForm.student_id.trim() || !editForm.student_name.trim()) {
      toast.error('Student ID and name are required');
      return;
    }
    setSavingEdit(true);
    try {
      await api.updateStudent(classId, editTarget.student_id, {
        student_id: editForm.student_id.trim().toUpperCase(),
        student_name: editForm.student_name.trim(),
        student_section: editForm.student_section.trim(),
      });
      toast.success('Student updated');
      setEditTarget(null);
      onChanged();
    } catch (e) { toast.error(e.message); }
    setSavingEdit(false);
  };

  const filtered = known.filter(s =>
    !enrolledIds.has(s.student_id) &&
    (!query.trim() || s.student_name.toLowerCase().includes(query.toLowerCase()) || s.student_id.toLowerCase().includes(query.toLowerCase()))
  );

  return (
    <Card eyebrow="Students" title="Enroll Students" icon={UserPlus} actions={<Badge tone="info">{enrollments.length} enrolled</Badge>}>

      <div className="grid lg:grid-cols-2 gap-3 mb-4">
        <div className="border border-border rounded-lg p-3.5 bg-canvas/50 min-w-0">
          <div className="flex items-center gap-2 mb-2.5">
            <span className="w-6 h-6 rounded-md bg-navy-100 text-navy-700 flex items-center justify-center shrink-0"><ClipboardList size={13} /></span>
            <span className="text-[13px] font-semibold text-navy-800">Bulk enroll</span>
          </div>
          <TextArea label="Paste list — Student ID, Full Name, Section (one per line)"
            value={paste} onChange={e => setPaste(e.target.value)}
            placeholder={'2019-12345, Dela Cruz, Juan A., BSCS 2-A\n2019-23456, Santos, Maria B., BSCS 2-A'}
            className="!font-mono !text-[13px]" style={{ minHeight: 90, resize: 'vertical' }} />
          <Button size="sm" className="!mt-2" onClick={addPasted} loading={adding} icon={UserPlus}>
            {adding ? 'Enrolling…' : 'Enroll from List'}
          </Button>
        </div>

        {known.length > 0 && (
          <div className="border border-border rounded-lg p-3.5 bg-canvas/50 min-w-0">
            <div className="flex items-center gap-2 mb-2.5">
              <span className="w-6 h-6 rounded-md bg-navy-100 text-navy-700 flex items-center justify-center shrink-0"><Search size={13} /></span>
              <span className="text-[13px] font-semibold text-navy-800">Add from known students</span>
            </div>
            <div className="relative mb-2 min-w-0">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search name or ID…" className="input !pl-9" />
            </div>
            <div className="max-h-[200px] overflow-y-auto overflow-x-hidden flex flex-col gap-1.5">
              {filtered.slice(0, 30).map(s => (
                <div key={s.student_id} className="flex items-center gap-2.5 px-3 py-2 border border-border rounded-md bg-surface text-[13px] min-w-0">
                  <span className="w-7 h-7 rounded-full bg-navy-100 text-navy-700 flex items-center justify-center text-[11px] font-bold shrink-0">
                    {(s.student_name || '?').charAt(0).toUpperCase()}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block font-medium truncate">{s.student_name}</span>
                    <span className="block text-[11px] text-muted font-mono truncate">{s.student_id}</span>
                  </span>
                  <Button size="sm" variant="soft" className="!px-2.5 !py-0.5 !text-[11px] !shrink-0" icon={Plus} onClick={() => addKnown(s)}>Add</Button>
                </div>
              ))}
              {!filtered.length && <p className="text-[12px] text-faint">No matching un-enrolled students.</p>}
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-border pt-3.5">
        <div className="flex items-center gap-2 mb-2.5">
          <span className="w-6 h-6 rounded-md bg-navy-100 text-navy-700 flex items-center justify-center shrink-0"><Users size={13} /></span>
          <h4 className="text-[13px] text-navy-800 font-semibold">Enrolled ({enrollments.length})</h4>
        </div>
        {!enrollments.length ? (
          <p className="text-[13px] text-muted">No students enrolled yet.</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {enrollments.map(e => (
              <div key={e.student_id} className="flex items-center gap-2.5 px-3 py-2 border border-border rounded-md bg-surface text-[13px] hover:bg-navy-50 transition-colors min-w-0">
                <span className="w-7 h-7 rounded-full bg-navy-100 text-navy-700 flex items-center justify-center text-[11px] font-bold shrink-0">
                  {(e.student_name || '?').charAt(0).toUpperCase()}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block font-medium truncate">{e.student_name}</span>
                  <span className="block text-[11px] text-muted font-mono truncate">{e.student_id}{e.student_section ? ' · ' + e.student_section : ''}</span>
                </span>
                <button onClick={() => openEdit(e)} title="Edit student details" className="bg-none border-none text-faint hover:text-navy-700 cursor-pointer p-1.5 rounded-md hover:bg-navy-50 shrink-0"><Pencil size={14} /></button>
                <button onClick={() => setRemoveTarget(e)} title="Remove from class" className="bg-none border-none text-faint hover:text-danger cursor-pointer p-1.5 rounded-md hover:bg-danger-bg shrink-0"><X size={15} /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!removeTarget}
        onClose={() => setRemoveTarget(null)}
        title="Remove Student?"
        body={removeTarget ? <>Remove <strong>{removeTarget.student_name}</strong> from this class?</> : ''}
        confirmLabel="Remove"
        loading={removing}
        onConfirm={remove}
      />

      <Modal
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        title="Edit Student"
        icon={Pencil}
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditTarget(null)}>Cancel</Button>
            <Button icon={Save} loading={savingEdit} onClick={saveEdit}>Save Changes</Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <Input label="Student ID" value={editForm.student_id}
            onChange={e => setEditForm({ ...editForm, student_id: e.target.value.toUpperCase() })}
            placeholder="e.g. 2019-12345" autoComplete="off" className="!font-mono" />
          <Input label="Full Name" value={editForm.student_name}
            onChange={e => setEditForm({ ...editForm, student_name: e.target.value })}
            placeholder="e.g. Dela Cruz, Juan A." autoComplete="off" />
          <Input label="Section" value={editForm.student_section}
            onChange={e => setEditForm({ ...editForm, student_section: e.target.value })}
            placeholder="e.g. BSCS 2-A" autoComplete="off" />
          <p className="text-[11px] text-faint">Changing the ID or name also updates their submissions, attendance, and class attendance records.</p>
        </div>
      </Modal>
    </Card>
  );
}

function AttendanceTab({ classId, onChanged }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [data, setData] = useState(null);
  const [marks, setMarks] = useState({});
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const load = useCallback(() => {
    api.getClassAttendance(classId, date).then(d => {
      setData(d);
      const m = {};
      d.students.forEach(s => { m[s.student_id] = s.status; });
      setMarks(m);
    }).catch(e => toast.error(e.message));
  }, [classId, date, toast]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!data) return;
    const records = data.students.map(s => ({
      student_id: s.student_id, student_name: s.student_name, status: marks[s.student_id] || 'absent',
    }));
    setSaving(true);
    try {
      await api.saveClassAttendance(classId, date, records);
      toast.success('Attendance saved');
      onChanged();
      load();
    } catch (e) { toast.error(e.message); }
    setSaving(false);
  };

  const setAll = (status) => {
    if (!data) return;
    const m = {};
    data.students.forEach(s => { m[s.student_id] = status; });
    setMarks(m);
  };

  return (
    <Card eyebrow="Attendance" title="Take Attendance" icon={CalendarCheck}
        actions={<input type="date" value={date} onChange={e => setDate(e.target.value)} className="input !max-w-[200px] !w-auto" />}>

      {!data ? (
        <Spinner label="Loading..." />
      ) : (
        <>
          <div className="flex gap-1.5 mb-3 items-center flex-wrap">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-success-bg text-success text-[12px] font-semibold">✓ {data.present} present</span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-danger-bg text-danger text-[12px] font-semibold">✗ {data.absent} absent</span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-info-bg text-info text-[12px] font-semibold" title="Auto-recorded from taking a class exam">Exam auto {data.students.filter(s => s.source === 'exam').length}</span>
            <div className="ml-auto flex gap-1.5">
              <Button size="sm" variant="soft" icon={CheckCircle} onClick={() => setAll('present')}>All Present</Button>
              <Button size="sm" variant="dangerSoft" icon={XCircle} onClick={() => setAll('absent')}>All Absent</Button>
            </div>
          </div>

          {!data.students.length ? (
            <p className="text-[13px] text-muted">No students enrolled. Add students in the Enrollments tab first.</p>
          ) : (
            <>
              <div className="flex flex-col gap-1.5 mb-4">
                {data.students.map(s => {
                  const st = marks[s.student_id] || 'absent';
                  return (
                    <div key={s.student_id} className="flex items-center gap-2.5 px-3 py-2 border border-border rounded-md bg-surface text-[13px] hover:bg-navy-50 transition-colors min-w-0">
                      <span className="w-7 h-7 rounded-full bg-navy-100 text-navy-700 flex items-center justify-center text-[11px] font-bold shrink-0">
                        {(s.student_name || '?').charAt(0).toUpperCase()}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block font-medium truncate">{s.student_name}</span>
                        <span className="block text-[11px] text-muted font-mono truncate">{s.student_id}{s.student_section ? ' · ' + s.student_section : ''}</span>
                      </span>
                      {s.source === 'exam' && (
                        <Badge tone="info" className="!text-[10px] !px-2 !py-0.5 shrink-0" title="Auto-recorded from taking the exam">Exam</Badge>
                      )}
                      {s.source === 'checkin' && (
                        <Badge tone="purple" className="!text-[10px] !px-2 !py-0.5 shrink-0" title="Auto-recorded from QR check-in">Check-in</Badge>
                      )}
                      <div className="flex gap-1 shrink-0">
                        {[['present', 'Present', 'text-success'], ['late', 'Late', 'text-warning'], ['absent', 'Absent', 'text-danger']].map(([val, label, cls]) => (
                          <button key={val} onClick={() => setMarks({ ...marks, [s.student_id]: val })}
                            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold cursor-pointer transition-all ${st === val ? `${cls} bg-navy-100` : 'text-faint hover:text-navy-800 hover:bg-navy-50'}`}>
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
              <Button onClick={save} loading={saving} icon={Save}>{saving ? 'Saving…' : 'Save Attendance'}</Button>
            </>
          )}
        </>
      )}
    </Card>
  );
}

function CheckinSessionsTab({ classId, sessions, onChanged }) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [code, setCode] = useState('');
  const [expiry, setExpiry] = useState('');
  const [creating, setCreating] = useState(false);
  const [qrSession, setQrSession] = useState(null);
  const [qr, setQr] = useState('');
  const [reportSession, setReportSession] = useState(null);
  const [report, setReport] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (!qrSession) { setQr(''); return; }
    QRCode.toDataURL(window.location.origin + '/checkin?id=' + encodeURIComponent(qrSession.id), {
      width: 260, margin: 1, color: { dark: '#0b1b3a', light: '#ffffff' },
    }).then(setQr).catch(() => setQr(''));
  }, [qrSession]);

  const create = async () => {
    if (!title.trim()) { toast.error('Title is required'); return; }
    if (expiry && new Date(expiry) <= Date.now()) { toast.error('Expiry must be in the future'); return; }
    setCreating(true);
    try {
      await api.createAttendanceSession({
        title: title.trim(), date,
        access_code: code.trim().toUpperCase(),
        class_id: classId,
        expires_at: expiry ? new Date(expiry).toISOString() : '',
      });
      toast.success('Check-in session created');
      setTitle(''); setCode(''); setExpiry('');
      onChanged();
    } catch (e) { toast.error(e.message); }
    setCreating(false);
  };

  const del = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.deleteAttendanceSession(deleteTarget.id);
      toast.success('Session deleted');
      setDeleteTarget(null);
      setReportSession(null);
      onChanged();
    } catch (e) { toast.error(e.message); }
    setDeleting(false);
  };

  const openReport = async (s) => {
    setReportSession(s);
    setReport(null);
    try { const r = await api.getAttendanceSessionReport(s.id); setReport(r); } catch (e) { toast.error(e.message); }
  };

  const copyLink = (s) => {
    navigator.clipboard.writeText(window.location.origin + '/checkin?id=' + s.id);
    toast.info('Check-in link copied');
  };

  return (
    <Card eyebrow="Check-in" title="Check-in Sessions" icon={QrCode}>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-2">
        <Input label="Session Title" icon={CalendarCheck} value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Lecture / Quiz Day" />
        <Input label="Date" type="date" value={date} onChange={e => setDate(e.target.value)} />
        <Input label="Access Code (optional)" value={code} onChange={e => setCode(e.target.value)} placeholder="e.g. LEC1" className="!font-mono !uppercase" />
        <Input label="Expires At (optional)" type="datetime-local" value={expiry} onChange={e => setExpiry(e.target.value)} />
      </div>
      <div className="flex items-start gap-2 text-[11px] text-muted mb-3 bg-canvas/60 border border-border rounded-lg px-3 py-2">
        <Info size={13} className="text-navy-700 shrink-0 mt-0.5" />
        <span>
          Students scan the QR or open the link to check in. Check-ins mark this class <strong>present</strong> for that date.
          {expiry && <span className="ml-1 text-warning">QR stops working at {new Date(expiry).toLocaleString()}.</span>}
        </span>
      </div>
      <Button size="sm" onClick={create} loading={creating} icon={Plus} className="!mb-5">{creating ? 'Creating…' : 'Create Session'}</Button>

      {!sessions.length ? (
        <p className="text-[13px] text-muted">No check-in sessions yet. Create one above to let students self-check-in via QR code.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {sessions.map(s => {
            const expired = s.expires_at && new Date(s.expires_at).getTime() <= Date.now();
            return (
              <div key={s.id} className="flex items-center gap-2.5 px-3 py-2 border border-border rounded-lg bg-surface text-[13px] hover:bg-navy-50 transition-colors">
                <span className="w-8 h-8 rounded-lg bg-navy-100 text-navy-700 flex items-center justify-center shrink-0"><QrCode size={15} /></span>
                <div className="flex-1 min-w-[150px]">
                  <div className="flex items-center gap-2 font-semibold text-navy-800">
                    {s.title}
                    {expired ? <Badge tone="danger">Expired</Badge> : <Badge tone="success">Open</Badge>}
                  </div>
                  <div className="text-[11px] text-muted flex flex-wrap gap-x-2 items-center">
                    <span>{s.date}</span>
                    <span className="inline-flex items-center gap-1"><UserCheck size={11} className="text-navy-700" /> {s.checkin_count || 0} checked in</span>
                    {s.access_code && <span className="font-mono text-navy-700 font-semibold">{s.access_code}</span>}
                    {s.expires_at && <span className={expired ? 'text-faint' : ''}>{expired ? 'stopped' : 'open until'}{!expired && ' '}<strong>{new Date(s.expires_at).toLocaleString()}</strong></span>}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button size="sm" variant="soft" icon={QrCode} onClick={() => setQrSession(s)}>QR</Button>
                  <Button size="sm" variant="soft" icon={Link2} onClick={() => copyLink(s)}>Link</Button>
                  <Button size="sm" variant="soft" icon={Eye} onClick={() => openReport(s)}>Report</Button>
                  <button onClick={() => setDeleteTarget(s)} className="text-danger bg-none border-none cursor-pointer p-2 hover:bg-danger-bg rounded-lg"><Trash2 size={14} /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* QR modal */}
      <Modal open={!!qrSession} onClose={() => setQrSession(null)} title={qrSession?.title} icon={QrCode} size="sm">
        <div className="text-center">
          <p className="text-[12px] text-muted mb-4">
            {qrSession?.date}{qrSession?.access_code && <> · Code <strong className="tracking-[.08em] font-mono">{qrSession.access_code}</strong></>}
          </p>
          {qr ? <img src={qr} alt="QR" className="w-[240px] h-[240px] rounded-lg mx-auto" /> : <div className="h-[240px] flex items-center justify-center text-faint text-[12px]">Generating…</div>}
          <p className="text-[11px] text-muted mt-3.5">Students scan this to check in.</p>
        </div>
      </Modal>

      {/* Report modal */}
      <Modal open={!!reportSession} onClose={() => setReportSession(null)} title={reportSession ? `Report — ${reportSession.title}` : ''} icon={Eye} size="md">
        <p className="text-[12px] text-muted mb-3">{reportSession?.date} · {report?.students?.filter(s => s.checked_in).length || 0} checked in{report?.walkIns?.length ? ` + ${report.walkIns.length} walk-in` : ''}</p>
        {!report ? (
          <Spinner label="Loading..." />
        ) : (
          <div className="flex flex-col gap-1.5">
            {report.students.map(s => (
              <div key={s.student_id} className="flex items-center gap-2.5 px-3 py-2 border border-border rounded-md bg-surface text-[13px]">
                <span className="w-7 h-7 rounded-full bg-navy-100 text-navy-700 flex items-center justify-center text-[11px] font-bold shrink-0">
                  {(s.student_name || '?').charAt(0).toUpperCase()}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block font-medium truncate">{s.student_name}</span>
                  <span className="block text-[11px] text-muted font-mono">{s.student_id}</span>
                </span>
                <Badge tone={s.checked_in ? 'success' : 'danger'}>{s.checked_in ? 'Present' : 'Absent'}</Badge>
              </div>
            ))}
            {report.walkIns.map(s => (
              <div key={s.student_id + '-w'} className="flex items-center gap-2.5 px-3 py-2 border border-navy-100 rounded-md text-[13px] bg-navy-50">
                <span className="w-7 h-7 rounded-full bg-navy-100 text-navy-700 flex items-center justify-center text-[11px] font-bold shrink-0">
                  {(s.student_name || '?').charAt(0).toUpperCase()}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block font-medium truncate">{s.student_name}</span>
                  <span className="block text-[11px] text-muted font-mono">{s.student_id}</span>
                </span>
                <Badge tone="info">Walk-in</Badge>
              </div>
            ))}
            {!report.students.length && !report.walkIns.length && <p className="text-[13px] text-muted">No check-ins yet.</p>}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Session?"
        body={deleteTarget ? <>Delete <strong>{deleteTarget.title}</strong> and all its check-ins?</> : ''}
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={del}
      />
    </Card>
  );
}

function HistoryTab({ classId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const load = useCallback(() => {
    api.getClassAttendanceHistory(classId).then(d => { setData(d); setLoading(false); }).catch(e => { toast.error(e.message); setLoading(false); });
  }, [classId, toast]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <Spinner label="Loading..." />;
  if (!data || !data.dates.length) {
    return (
      <EmptyState icon={History} title="No attendance records yet"
        body='Use the "Take Attendance" tab to record a session, or share class exams — submissions auto-mark students present.' />
    );
  }

  const csv = () => {
    const header = ['Student ID', 'Name', 'Section', ...data.dates.map(d => d), 'Present', 'Late', 'Absent'];
    const rows = data.students.map(s => {
      const sum = data.summary.find(x => x.student_id === s.student_id) || {};
      return [
        s.student_id, s.student_name, s.student_section,
        ...data.dates.map(d => {
          const r = data.records.find(x => x.date === d && x.student_id === s.student_id);
          return r ? r.status : '';
        }),
        sum.present || 0, sum.late || 0, sum.absent || 0,
      ];
    });
    const lines = [header, ...rows].map(row => row.map(v => {
      const s = String(v ?? '');
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    }).join(','));
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'attendance-history.csv';
    a.click();
  };

  return (
    <Card eyebrow="Attendance" title="Attendance History" icon={History}
        actions={<Button size="sm" variant="outline" icon={Download} onClick={csv}>Export CSV</Button>}>
      <p className="text-[12px] text-muted mb-4">
        {data.dates.length} session{data.dates.length !== 1 ? 's' : ''} recorded — from {data.dates[0]} to {data.dates[data.dates.length - 1]}
      </p>

      <div className="table-wrap">
        <table className="table !text-[12px]">
          <thead>
            <tr>
              <th style={{ whiteSpace: 'nowrap' }}>Student</th>
              {data.dates.map(d => (
                <th key={d} style={{ textAlign: 'center', whiteSpace: 'nowrap', fontSize: 11 }}>{d}</th>
              ))}
              <th style={{ textAlign: 'center' }}>✓ Present</th>
              <th style={{ textAlign: 'center' }}>Late</th>
              <th style={{ textAlign: 'center' }}>✗ Absent</th>
            </tr>
          </thead>
          <tbody>
            {data.students.map(s => {
              const sum = data.summary.find(x => x.student_id === s.student_id) || {};
              return (
                <tr key={s.student_id}>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <div className="font-semibold text-navy-800">{s.student_name}</div>
                    <div className="text-[11px] text-muted font-mono">{s.student_id}</div>
                  </td>
                  {data.dates.map(d => {
                    const r = data.records.find(x => x.date === d && x.student_id === s.student_id);
                    const cls = !r ? 'bg-canvas text-faint' : r.status === 'present' ? 'bg-success-bg text-success' : r.status === 'late' ? 'bg-warning-bg text-warning' : 'bg-danger-bg text-danger';
                    return (
                      <td key={d} style={{ textAlign: 'center', background: '', padding: 0 }}>
                        <div className={`py-2 font-semibold text-[12px] ${cls}`}>
                          {!r ? '—' : r.status === 'present' ? 'P' : r.status === 'late' ? 'L' : 'A'}
                          {r?.source === 'exam' && <span className="block text-[8px] font-normal">exam</span>}
                        </div>
                      </td>
                    );
                  })}
                  <td style={{ textAlign: 'center', color: 'var(--color-success)', fontWeight: 700 }}>{sum.present || 0}</td>
                  <td style={{ textAlign: 'center', color: 'var(--color-warning)', fontWeight: 700 }}>{sum.late || 0}</td>
                  <td style={{ textAlign: 'center', color: 'var(--color-danger)', fontWeight: 700 }}>{sum.absent || 0}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td>Daily summary</td>
              {data.dates.map(d => {
                const by = data.byDate[d] || {};
                const attended = by.present || 0;
                return (
                  <td key={d} style={{ textAlign: 'center', fontSize: 11 }}>
                    <span className="text-success">{attended}✓</span>
                    <span className="text-danger"> {by.absent || 0}✗</span>
                    {(by.unrecorded || 0) > 0 && <span className="text-faint"> {by.unrecorded}?</span>}
                  </td>
                );
              })}
              <td colSpan={3}></td>
            </tr>
          </tfoot>
        </table>
      </div>
      <div className="text-[11px] text-faint mt-3">
        P = present · L = late · A = absent · — = no record · "exam" = auto-recorded when the student submitted a class exam that day
      </div>
    </Card>
  );
}

function ExamsTab({ classId, exams }) {
  return (
    <Card eyebrow="Exams" title={`Exams for this Class (${exams.length})`} icon={ClipboardList}
        actions={<Button size="sm" variant="soft" icon={Plus} to={"/admin/create?class=" + classId}>New Exam</Button>}>
      {!exams.length ? (
        <p className="text-[13px] text-muted">No exams yet. Click "New Exam" above to get started.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {exams.map(e => {
            const closed = e.deadline && new Date(e.deadline) <= Date.now();
            return (
              <Link key={e.id} to={"/admin/create?id=" + e.id} className="text-inherit no-underline">
                <div className="flex items-center gap-2.5 px-3 py-2 border border-border rounded-lg bg-surface text-[13px] hover:bg-navy-50 transition-colors">
                  <span className="w-8 h-8 rounded-lg bg-navy-100 text-navy-700 flex items-center justify-center shrink-0"><ClipboardList size={15} /></span>
                  <span className="flex-1 min-w-0">
                    <span className="block font-medium text-navy-800 truncate">{e.title}</span>
                    <span className="block text-[11px] text-muted mt-0.5">{e.submission_count || 0} submissions{e.deadline ? (closed ? ' · closed' : ' · open until ' + new Date(e.deadline).toLocaleString()) : ' · no deadline'}</span>
                  </span>
                  <Badge tone={closed ? 'danger' : e.deadline ? 'success' : 'neutral'}>{closed ? 'Closed' : e.deadline ? 'Open' : 'No deadline'}</Badge>
                  <ArrowRight size={14} className="text-faint shrink-0" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </Card>
  );
}
function GradebookTab({ classId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCatModal, setShowCatModal] = useState(false);
  const toast = useToast();

  const load = useCallback(() => {
    setLoading(true); setError('');
    api.getClassGradebook(classId)
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [classId]);

  useEffect(() => { load(); }, [load]);

  const cellTone = (pct) => {
    if (pct === null) return 'bg-canvas text-faint';
    if (pct >= 60) return 'bg-success-bg text-success';
    if (pct >= 40) return 'bg-warning-bg text-warning';
    return 'bg-danger-bg text-danger';
  };
  const avgTone = (avg) => avg === null ? '' : (avg >= 60 ? 'text-success' : 'text-danger');
  const weightedTone = (avg) => avg === null ? '' : (avg >= 60 ? 'text-success' : avg >= 40 ? 'text-warning' : 'text-danger');

  const hasWeighted = !!(data?.categories?.length && (data?.totalWeight || 0) > 0);
  const categories = data?.categories || [];
  const activeCategories = data?.activeCategories || [];

  const exportGradebook = () => {
    if (!data) return;
    const baseHeader = ['Student ID', 'Student Name', 'Section', ...data.exams.map(e => `${e.title} (%)`)];
    const header = hasWeighted
      ? [...baseHeader, 'Average (%)', 'Weighted (%)', ...activeCategories.map(c => `${c.name} (${c.weight}%)`)]
      : [...baseHeader, 'Average (%)'];
    const fname = (data.class?.name || `class-${classId}`) + '-gradebook';
    const rows = data.rows.map(r => {
      const base = [r.student_id, r.student_name, r.student_section, ...r.cells.map(c => (c.pct === null ? '' : c.pct)), (r.average === null ? '' : r.average)];
      if (!hasWeighted) return base;
      const catVals = (r.categoryAverages || []).map(ca => ca.average);
      return [...base, (r.weightedAverage === null ? '' : r.weightedAverage), ...catVals];
    });
    exportCSV(fname, header, rows);
  };

  if (loading) return <Spinner label="Loading gradebook..." />;
  if (error) return <EmptyState icon={BarChart3} title="Couldn't load gradebook" body={error} />;

  return (
    <>
      <Card title="Gradebook" icon={BarChart3}
        actions={
          <div className="flex gap-1.5">
            <Button size="sm" variant="soft" icon={Settings} onClick={() => setShowCatModal(true)}>Grade Categories</Button>
            {data.rows.length > 0 && data.exams.length > 0 && (
              <Button size="sm" variant="outline" icon={Download} onClick={exportGradebook}>Export CSV</Button>
            )}
          </div>
        }>
        {/* Category summary bar */}
        {categories.length > 0 ? (
          <div className="mb-4 rounded-lg border border-border bg-canvas/40 px-3.5 py-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-7 h-7 rounded-md bg-navy-700 text-white flex items-center justify-center shrink-0"><Scale size={13} /></span>
              <span className="text-[13px] font-semibold text-navy-800">Grade Categories</span>
              <Badge tone={hasWeighted ? 'success' : 'neutral'} className="!text-[11px]">
                {categories.length} categor{categories.length === 1 ? 'y' : 'ies'} · {data.totalWeight}% total
              </Badge>
              {data.totalWeight !== 100 && data.totalWeight > 0 && (
                <Badge tone="warning" className="!text-[11px] gap-1"><AlertTriangle size={10} /> Weights sum to {data.totalWeight}% — aim for 100%</Badge>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {categories.map(cat => {
                const active = activeCategories.find(a => a.id === cat.id);
                const examCount = active ? active.examCount : 0;
                return (
                  <span key={cat.id} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${active ? 'bg-navy-900 text-white border-navy-900' : 'bg-surface text-muted border-border'}`}>
                    <Layers size={11} /> {cat.name} <span className="opacity-70">{cat.weight}%</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] ${active ? 'bg-white/15' : 'bg-navy-50'}`}>{examCount} exam{examCount !== 1 ? 's' : ''}</span>
                    {active?.average !== null && active?.average !== undefined && (
                      <span className={`font-bold ${active.average >= 60 ? 'text-success' : 'text-warning'}`}>{active.average}% avg</span>
                    )}
                    {!active && <span className="text-faint">(no exams yet)</span>}
                  </span>
                );
              })}
            </div>
            <div className="text-[11px] text-faint mt-2 flex flex-wrap gap-x-3">
              {categories.map(cat => (
                <span key={cat.id}>{cat.name}: <strong className="text-navy-800">{cat.types.length ? cat.types.map(t => EXAM_TYPE_LABELS[t] || t).join(', ') : '— no types —'}</strong></span>
              ))}
            </div>
            {hasWeighted && <p className="text-[11px] text-faint mt-2">Weighted grade = Σ (category average × weight) ÷ {data.totalWeight}%. Missing work in a category counts as 0% for that category. Ungrouped exams (types not in any category) only affect the simple average.</p>}
          </div>
        ) : (
          <div className="mb-4 rounded-lg border border-dashed border-border bg-canvas/30 px-3.5 py-3 flex items-center gap-3">
            <span className="w-7 h-7 rounded-md bg-navy-100 text-navy-700 flex items-center justify-center shrink-0"><Scale size={13} /></span>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-semibold text-navy-800">Weighted grades not configured</div>
              <div className="text-[11px] text-muted">Add categories like <em>Quizzes 20%, Major Exams 30%, Final 30%</em> to enable weighted averages per <strong>Upscale §41</strong>.</div>
            </div>
            <Button size="sm" variant="soft" icon={Plus} onClick={() => setShowCatModal(true)}>Configure</Button>
          </div>
        )}

        {!data.exams.length ? (
          <EmptyState icon={ClipboardList} title="No exams yet" body="Create an exam for this class to populate the gradebook." compact />
        ) : !data.rows.length ? (
          <EmptyState icon={Users} title="No students enrolled" body="Enroll students to build the gradebook." compact />
        ) : (
          <div className="overflow-auto">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="bg-navy-900 text-white">
                  <th className="px-3 py-2 text-left font-semibold sticky left-0 bg-navy-900 z-10">Student</th>
                  {data.exams.map(e => (
                    <th key={e.id} className="px-3 py-2 font-semibold min-w-[110px]" title={`${e.title} · ${EXAM_TYPE_LABELS[e.type] || e.type}`}>{e.title}<span className="block text-[10px] font-normal opacity-70">{EXAM_TYPE_LABELS[e.type] || e.type}</span></th>
                  ))}
                  <th className="px-3 py-2 font-semibold">Avg</th>
                  {hasWeighted && <th className="px-3 py-2 font-semibold bg-navy-800">Weighted</th>}
                  {hasWeighted && activeCategories.map(c => (
                    <th key={c.id} className="px-2 py-2 font-semibold text-[11px] bg-navy-800 min-w-[84px]" title={`${c.name} ${c.weight}%`}>{c.name}<span className="block text-[10px] font-normal opacity-70">{c.weight}%</span></th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.rows.map(r => (
                  <tr key={r.student_id} className="border-t border-border">
                    <td className="sticky left-0 bg-surface px-3 py-2 z-10">
                      <div className="font-semibold text-navy-800">{r.student_name}</div>
                      <div className="text-[11px] text-faint">{r.student_id}{r.student_section ? ' · ' + r.student_section : ''}</div>
                    </td>
                    {r.cells.map(c => (
                      <td key={c.examId} className="px-2 py-2 text-center">
                        <span className={`inline-block px-2.5 py-1 rounded-md font-semibold ${cellTone(c.pct)}`}>
                          {c.pct === null ? '—' : `${c.score}/${c.total}`}
                        </span>
                        {c.pct !== null && <div className="text-[10px] text-faint mt-0.5">{c.pct}%</div>}
                      </td>
                    ))}
                    <td className={`px-3 py-2 text-center font-bold ${avgTone(r.average)}`}>
                      {r.average === null ? '—' : r.average + '%'}
                    </td>
                    {hasWeighted && (
                      <td className={`px-3 py-2 text-center font-bold ${weightedTone(r.weightedAverage)}`}>
                        {r.weightedAverage === null ? '—' : r.weightedAverage + '%'}
                      </td>
                    )}
                    {hasWeighted && (r.categoryAverages || []).map(ca => (
                      <td key={ca.categoryId} className={`px-2 py-2 text-center font-semibold ${weightedTone(ca.average)}`}>
                        {ca.average}%<div className="text-[10px] text-faint font-normal">{ca.taken}/{ca.total}</div>
                      </td>
                    ))}
                  </tr>
                ))}
                <tr className="border-t border-border bg-navy-50">
                  <td className="sticky left-0 bg-navy-50 px-3 py-2 font-semibold text-navy-800 z-10">Class average</td>
                  {data.exams.map(e => (
                    <td key={e.id} className="px-3 py-2 text-center">
                      {e.average === null ? <span className="text-faint">—</span> : (
                        <span className="font-semibold text-navy-800">{e.average}%</span>
                      )}
                      <div className="text-[10px] text-faint">{e.submitted}/{data.rows.length} took</div>
                    </td>
                  ))}
                  <td className="px-3 py-2 text-center">
                    {(() => {
                      const avgs = data.exams.map(e => e.average).filter(a => a !== null);
                      const overall = avgs.length ? Math.round(avgs.reduce((a, b) => a + b, 0) / avgs.length * 10) / 10 : null;
                      return overall === null ? <span className="text-faint">—</span> : <span className={`font-bold ${overall >= 60 ? 'text-success' : 'text-danger'}`}>{overall}%</span>;
                    })()}
                  </td>
                  {hasWeighted && (
                    <td className="px-3 py-2 text-center">
                      {(() => {
                        const wAvgs = data.rows.map(r => r.weightedAverage).filter(v => v !== null);
                        const overallW = wAvgs.length ? Math.round(wAvgs.reduce((a, b) => a + b, 0) / wAvgs.length * 10) / 10 : null;
                        return overallW === null ? <span className="text-faint">—</span> : <span className={`font-bold ${overallW >= 60 ? 'text-success' : 'text-danger'}`}>{overallW}%</span>;
                      })()}
                    </td>
                  )}
                  {hasWeighted && activeCategories.map(c => (
                    <td key={c.id} className="px-2 py-2 text-center">
                      {c.average === null ? <span className="text-faint">—</span> : <span className={`font-semibold ${c.average >= 60 ? 'text-success' : 'text-warning'}`}>{c.average}%</span>}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}
        {data.exams.length > 0 && data.rows.length > 0 && (
          <p className="text-[11px] text-faint mt-3">
            {hasWeighted ? <>Weighted grade shown when categories configured. Simple average = mean of taken exams. Weighted = Σ (category avg × weight ÷ {data.totalWeight}%). Green ≥60%, amber 40–59%, red &lt;40%.</> : <>Scores show best attempt per exam. Green ≥60%, amber 40–59%, red &lt;40%. Simple average = mean of taken exams.</>}
          </p>
        )}
      </Card>
      <GradeCategoriesModal open={showCatModal} onClose={() => setShowCatModal(false)} classId={classId} initial={categories} onSaved={() => { setShowCatModal(false); toast.success('Grade categories saved'); load(); }} />
    </>
  );
}

function GradeCategoriesModal({ open, onClose, classId, initial, onSaved }) {
  const [cats, setCats] = useState([]);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (open) {
      setCats(initial.length ? initial.map((c, i) => ({ ...c, sort_order: i })) : [{ id: '', name: 'Quizzes', weight: 20, types: ['quiz'], sort_order: 0 }, { id: '', name: 'Major Exams', weight: 30, types: ['major_exam'], sort_order: 1 }, { id: '', name: 'Final Exam', weight: 30, types: ['final'], sort_order: 2 }].slice(0, initial.length ? initial.length : 2));
    }
  }, [open, initial]);

  const totalWeight = cats.reduce((a, c) => a + (Number(c.weight) || 0), 0);
  const typeOptions = Object.entries(EXAM_TYPE_LABELS);

  const add = () => setCats([...cats, { id: '', name: '', weight: 10, types: [], sort_order: cats.length }]);
  const remove = (idx) => setCats(cats.filter((_, i) => i !== idx));
  const update = (idx, patch) => setCats(cats.map((c, i) => i === idx ? { ...c, ...patch } : c));
  const toggleType = (idx, t) => {
    const cur = cats[idx].types || [];
    const next = cur.includes(t) ? cur.filter(x => x !== t) : [...cur, t];
    update(idx, { types: next });
  };

  const save = async () => {
    if (!cats.length) { toast.error('Add at least one category'); return; }
    for (const c of cats) if (!c.name.trim()) { toast.error('All categories need a name'); return; }
    if (cats.some(c => !Array.isArray(c.types) || c.types.length === 0)) { toast.error('Each category must include at least one assessment type'); return; }
    // Warn but allow total != 100
    setSaving(true);
    try {
      await api.saveGradeCategories(classId, cats.map((c, i) => ({ id: c.id || undefined, name: c.name.trim(), weight: Number(c.weight) || 0, types: c.types, sort_order: i })));
      onSaved();
    } catch (e) { toast.error(e.message); }
    setSaving(false);
  };

  return (
    <Modal open={open} onClose={onClose} title="Grade Categories" icon={Settings} size="lg"
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button icon={Save} loading={saving} onClick={save}>Save Categories</Button></>}>
      <div className="flex flex-col gap-4">
        <div className={`rounded-lg border px-3 py-2.5 text-[12px] flex items-start gap-2 ${totalWeight === 100 ? 'bg-success-bg border-success/20 text-success' : totalWeight > 100 ? 'bg-danger-bg border-danger/20 text-danger' : 'bg-warning-bg border-warning/20 text-warning'}`}>
          <Scale size={14} className="shrink-0 mt-0.5" />
          <span>Total weight: <strong>{totalWeight}%</strong> {totalWeight === 100 ? '✓ sums to 100% — good!' : totalWeight > 100 ? '— over 100%, reduce some weights.' : '— under 100%. Weighted grades will be out of ' + totalWeight + '% until you reach 100%.'}</span>
        </div>
        <p className="text-[11px] text-faint">Map each assessment <strong>type</strong> (Upscale §9) to a category. The gradebook groups exams by type and computes weighted averages. Example: <em>Quizzes 20% = all type Quiz exams averaged, then ×20%.</em> Types not in any category only count toward the simple average.</p>
        <div className="flex flex-col gap-3">
          {cats.map((cat, idx) => (
            <div key={idx} className="rounded-xl border border-border bg-canvas/40 p-3.5">
              <div className="grid sm:grid-cols-[1fr_110px_auto] gap-2.5 items-end">
                <Input label={`Category #${idx + 1} Name`} value={cat.name} onChange={e => update(idx, { name: e.target.value })} placeholder="e.g. Quizzes" />
                <Input label="Weight %" type="number" min={0} max={100} value={String(cat.weight)} onChange={e => update(idx, { weight: Number(e.target.value) })} />
                <Button size="sm" variant="dangerSoft" icon={Trash2} onClick={() => remove(idx)} className="sm:mb-0.5">Remove</Button>
              </div>
              <div className="mt-3">
                <div className="text-[11px] font-semibold text-navy-800 mb-1.5">Assessment types in this category</div>
                <div className="flex flex-wrap gap-1.5">
                  {typeOptions.map(([key, label]) => {
                    const active = (cat.types || []).includes(key);
                    return (
                      <button key={key} onClick={() => toggleType(idx, key)}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors cursor-pointer ${active ? 'bg-navy-900 text-white border-navy-900' : 'bg-surface text-muted border-border hover:border-navy-200'}`}>
                        {label}
                      </button>
                    );
                  })}
                </div>
                {!cat.types?.length && <p className="text-[11px] text-danger mt-1.5">Pick at least one type.</p>}
              </div>
            </div>
          ))}
        </div>
        <Button size="sm" variant="soft" icon={Plus} onClick={add}>Add Category</Button>
        <p className="text-[11px] text-faint">Tip: Common setup — Quizzes 20%, Major Exams 30%, Assignments 20%, Final 30% (weights must total 100% for a true final grade).</p>
      </div>
    </Modal>
  );
}
