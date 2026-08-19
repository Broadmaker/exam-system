import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api';
import AdminLayout from '../../components/AdminLayout';
import '../../styles.css';
import {
  Users, Plus, Pencil, Trash2, ArrowLeft, CalendarCheck, ClipboardList,
  X, Search, UserPlus, BookOpen, Clock, Save, UserCheck, UserX, Ban, Copy, History, Download,
  QrCode, Link2, Eye,
} from 'lucide-react';
import QRCode from 'qrcode';

const inputStyle = {
  width: '100%', border: '1.5px solid #c8d8f0', borderRadius: 8,
  padding: '10px 14px', fontSize: 14, fontFamily: 'inherit', outline: 'none',
};
const labelStyle = { display: 'block', fontSize: 12, fontWeight: 600, color: '#0f2044', marginBottom: 4 };

export default function Classes() {
  const [classes, setClasses] = useState([]);
  const [toast, setToast] = useState('');
  const [selected, setSelected] = useState(null);

  const showToast = useCallback((m) => { setToast(m); setTimeout(() => setToast(''), 2500); }, []);

  const load = useCallback(() => {
    api.listClasses().then(setClasses).catch(e => showToast(e.message));
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  return (
    <AdminLayout title="Classes">
      {toast && (
        <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', background: '#1a7a4a', color: '#fff', padding: '12px 28px', borderRadius: 8, fontSize: 14, fontWeight: 600, zIndex: 300, animation: 'fadeIn .3s', boxShadow: '0 8px 24px rgba(0,0,0,.2)' }}>
          {toast}
          <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } }`}</style>
        </div>
      )}

      <main style={{ maxWidth: 1000, margin: '0 auto', padding: '24px 16px' }}>
        {selected ? (
          <ClassDetail klass={selected} onBack={() => { setSelected(null); load(); }} showToast={showToast} onChanged={load} />
        ) : (
          <ClassesList classes={classes} onOpen={setSelected} onChanged={load} showToast={showToast} />
        )}
      </main>
    </AdminLayout>
  );
}

function ClassesList({ classes, onOpen, onChanged, showToast }) {
  const [creating, setCreating] = useState(false);
  const [editId, setEditId] = useState(null);
  const [cName, setCName] = useState('');
  const [cSubject, setCSubject] = useState('');
  const [cSection, setCSection] = useState('');
  const [cInstructor, setCInstructor] = useState('');
  const [cCode, setCCode] = useState('');
  const [saving, setSaving] = useState(false);

  const openForm = (k) => {
    if (k) { setEditId(k.id); setCName(k.name); setCSubject(k.subject || ''); setCSection(k.section || ''); setCInstructor(k.instructor || ''); setCCode(k.access_code || ''); setCreating(true); }
    else { setEditId(null); setCName(''); setCSubject(''); setCSection(''); setCInstructor(''); setCCode(''); setCreating(true); }
  };

  const save = async () => {
    if (!cName.trim()) return showToast('Class name is required');
    setSaving(true);
    const body = { name: cName.trim(), subject: cSubject.trim(), section: cSection.trim(), instructor: cInstructor.trim(), access_code: cCode.trim() };
    try {
      if (editId) {
        const res = await api.updateClass(editId, body);
        setCCode(res.access_code || cCode);
        showToast('Class updated');
      } else {
        const res = await api.createClass(body);
        setCCode(res.access_code || '');
        showToast('Class created — share enrollment code ' + (res.access_code || ''));
      }
      setCreating(false);
      onChanged();
    } catch (e) { showToast(e.message); }
    setSaving(false);
  };

  const del = async (k) => {
    if (!window.confirm('Delete this class? Its enrollments and attendance will be removed (exams are kept).')) return;
    try {
      await api.deleteClass(k.id);
      showToast('Class deleted');
      onChanged();
    } catch (e) { showToast(e.message); }
  };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 20, color: '#0f2044', display: 'flex', alignItems: 'center', gap: 8 }}><Users size={20} /> Classes</h2>
          <p style={{ fontSize: 13, color: '#5a7090', marginTop: 4 }}>{classes.length} class{classes.length !== 1 ? 'es' : ''} total</p>
        </div>
        <button onClick={() => openForm(null)} className="btn" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Plus size={16} /> New Class
        </button>
      </div>

      {creating && (
        <div className="card" style={{ marginBottom: 20, border: '1.5px solid #1a4fad' }}>
          <h3 style={{ fontSize: 15, color: '#0f2044', marginBottom: 16 }}>{editId ? 'Edit Class' : 'Create Class'}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={labelStyle}>Class Name</label>
              <input value={cName} onChange={e => setCName(e.target.value)} placeholder="e.g. BSCS 2-A" style={inputStyle} />
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 200px' }}>
                <label style={labelStyle}>Subject</label>
                <input value={cSubject} onChange={e => setCSubject(e.target.value)} placeholder="e.g. Statistics" style={inputStyle} />
              </div>
              <div style={{ flex: '1 1 200px' }}>
                <label style={labelStyle}>Section</label>
                <input value={cSection} onChange={e => setCSection(e.target.value)} placeholder="e.g. BSCS 2-A" style={inputStyle} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 200px' }}>
                <label style={labelStyle}>Instructor</label>
                <input value={cInstructor} onChange={e => setCInstructor(e.target.value)} placeholder="e.g. Prof. Sanig" style={inputStyle} />
              </div>
              <div style={{ flex: '1 1 200px' }}>
                <label style={labelStyle}>Enrollment Code <span style={{ fontWeight: 400, color: '#5a7090' }}>(auto-generated if blank — students use this to join)</span></label>
                <input value={cCode} onChange={e => setCCode(e.target.value)} placeholder="e.g. BSCS2A" style={{ ...inputStyle, textTransform: 'uppercase', fontFamily: "'IBM Plex Mono', monospace" }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={save} className="btn btn-sm" disabled={saving} style={{ opacity: saving ? .7 : 1 }}>{saving ? 'Saving…' : 'Save Class'}</button>
              <button onClick={() => setCreating(false)} className="btn btn-outline btn-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {!classes.length ? (
        <div style={{ textAlign: 'center', color: '#5a7090', padding: '80px 20px', background: '#fff', borderRadius: 12, border: '2px dashed #c8d8f0' }}>
          <div style={{ fontSize: 48, marginBottom: 16, display: 'flex', justifyContent: 'center' }}><Users size={48} /></div>
          <p style={{ marginBottom: 8, fontSize: 16, fontWeight: 600, color: '#0f2044' }}>No classes yet</p>
          <p style={{ fontSize: 13 }}>Create a class, enroll your students, then build exams for it.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
          {classes.map(k => (
            <div key={k.id} className="card" style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 10, cursor: 'pointer' }}
              onClick={() => onOpen(k)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#0f2044' }}>{k.name}</div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button onClick={(e) => { e.stopPropagation(); openForm(k); }} style={{ background: 'none', border: 'none', color: '#1a4fad', cursor: 'pointer', padding: 2 }}><Pencil size={14} /></button>
                  <button onClick={(e) => { e.stopPropagation(); del(k); }} style={{ background: 'none', border: 'none', color: '#9ab', cursor: 'pointer', padding: 2 }}><Trash2 size={14} /></button>
                </div>
              </div>
              <div style={{ fontSize: 13, color: '#5a7090' }}>
                {k.subject || '—'}{k.section ? ' · ' + k.section : ''}
              </div>
              <div onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(k.access_code || ''); showToast('Enrollment code copied!'); }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#ddeeff', color: '#1a4fad', padding: '4px 12px', borderRadius: 6, cursor: 'pointer', alignSelf: 'flex-start' }}
                title="Click to copy">
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.12em', fontFamily: "'IBM Plex Mono', monospace" }}>{k.access_code}</span>
                <Copy size={11} />
              </div>
              {k.instructor && <div style={{ fontSize: 12, color: '#9ab' }}>{k.instructor}</div>}
              <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#5a7090', borderTop: '1px solid #eef3fb', paddingTop: 10 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Users size={12} /> {k.student_count || 0} students</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><ClipboardList size={12} /> {k.exam_count || 0} exams</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function ClassDetail({ klass, onBack, showToast, onChanged }) {
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('enrollments');
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    api.getClass(klass.id).then(d => { setData(d); setLoading(false); }).catch(e => showToast(e.message));
  }, [klass.id, showToast]);

  useEffect(() => { load(); }, [load]);

  return (
    <>
      <button onClick={onBack} className="btn btn-outline btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
        <ArrowLeft size={14} /> All Classes
      </button>

      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h3 style={{ fontSize: 20, fontWeight: 700, color: '#0f2044' }}>{data?.name || klass.name}</h3>
            <div style={{ fontSize: 13, color: '#5a7090', marginTop: 4 }}>
              {[data?.subject, data?.section].filter(Boolean).join(' · ') || '—'}
              {data?.instructor && <span style={{ marginLeft: 12 }}>{data.instructor}</span>}
            </div>
            {data?.access_code && (
              <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#1a4fad', background: '#ddeeff', display: 'inline-block', padding: '3px 10px', borderRadius: 5, letterSpacing: '.08em', fontFamily: "'IBM Plex Mono', monospace" }}>
                  {data.access_code}
                </span>
                <button onClick={() => { navigator.clipboard.writeText(data.access_code); showToast('Enrollment code copied!'); }}
                  style={{ fontSize: 11, color: '#1a4fad', background: 'none', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                  <Copy size={11} /> copy
                </button>
                <span style={{ fontSize: 11, color: '#5a7090' }}>Students enroll with this code at <strong>/enroll</strong></span>
              </div>
            )}
          </div>
          <Link to={"/admin/create?class=" + klass.id} className="btn" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Plus size={16} /> Create Exam for this Class
          </Link>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        <TabBtn active={tab === 'enrollments'} onClick={() => setTab('enrollments')} icon={<Users size={14} />} label={`Enrollments (${data?.enrollments?.length || 0})`} />
        <TabBtn active={tab === 'attendance'} onClick={() => setTab('attendance')} icon={<CalendarCheck size={14} />} label="Take Attendance" />
        <TabBtn active={tab === 'history'} onClick={() => setTab('history')} icon={<History size={14} />} label="Attendance History" />
        <TabBtn active={tab === 'checkins'} onClick={() => setTab('checkins')} icon={<QrCode size={14} />} label={`Check-in Sessions (${data?.sessions?.length || 0})`} />
        <TabBtn active={tab === 'exams'} onClick={() => setTab('exams')} icon={<ClipboardList size={14} />} label={`Exams (${data?.exams?.length || 0})`} />
      </div>

      {loading ? (
        <p style={{ fontSize: 13, color: '#5a7090' }}>Loading…</p>
      ) : tab === 'enrollments' ? (
        <EnrollmentsTab classId={klass.id} enrollments={data.enrollments} onChanged={load} showToast={showToast} />
      ) : tab === 'attendance' ? (
        <AttendanceTab classId={klass.id} showToast={showToast} onChanged={load} />
      ) : tab === 'history' ? (
        <HistoryTab classId={klass.id} showToast={showToast} />
      ) : tab === 'checkins' ? (
        <CheckinSessionsTab classId={klass.id} sessions={data.sessions || []} onChanged={load} showToast={showToast} />
      ) : (
        <ExamsTab classId={klass.id} exams={data.exams} />
      )}
    </>
  );
}

function TabBtn({ active, onClick, icon, label }) {
  return (
    <button onClick={onClick} style={{
      display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 8,
      fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
      border: `2px solid ${active ? '#1a4fad' : '#c8d8f0'}`,
      background: active ? '#ddeeff' : '#fff', color: active ? '#1a4fad' : '#5a7090',
    }}>
      {icon} {label}
    </button>
  );
}

function EnrollmentsTab({ classId, enrollments, onChanged, showToast }) {
  const [paste, setPaste] = useState('');
  const [known, setKnown] = useState([]);
  const [query, setQuery] = useState('');
  const [adding, setAdding] = useState(false);

  const loadKnown = () => api.listStudents().then(setKnown).catch(() => {});
  useEffect(() => { loadKnown(); }, []);

  const enrolledIds = new Set(enrollments.map(e => e.student_id));

  const addPasted = async () => {
    const students = paste.split('\n').map(l => l.trim()).filter(Boolean).map(line => {
      const parts = line.split(',').map(p => p.trim());
      return { student_id: (parts[0] || '').toUpperCase(), student_name: parts[1] || '', student_section: parts[2] || '' };
    }).filter(s => s.student_id && s.student_name);
    if (!students.length) return showToast('Enter at least one Student ID and Name per line');
    setAdding(true);
    try {
      const res = await api.enrollStudents(classId, students);
      showToast(`Enrolled ${res.added} student(s)` + (res.skipped ? `, ${res.skipped} already enrolled` : ''));
      setPaste('');
      onChanged();
    } catch (e) { showToast(e.message); }
    setAdding(false);
  };

  const addKnown = async (s) => {
    try {
      await api.enrollStudents(classId, [{ student_id: s.student_id, student_name: s.student_name, student_section: s.student_section }]);
      showToast(`${s.student_name} enrolled`);
      onChanged();
    } catch (e) { showToast(e.message); }
  };

  const remove = async (sid) => {
    if (!window.confirm('Remove this student from the class?')) return;
    try {
      await api.removeStudent(classId, sid);
      showToast('Student removed');
      onChanged();
    } catch (e) { showToast(e.message); }
  };

  const filtered = known.filter(s =>
    !enrolledIds.has(s.student_id) &&
    (!query.trim() || s.student_name.toLowerCase().includes(query.toLowerCase()) || s.student_id.toLowerCase().includes(query.toLowerCase()))
  );

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <UserPlus size={18} color="#1a4fad" />
        <h3 style={{ fontSize: 15, color: '#0f2044' }}>Enroll Students</h3>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Paste list — Student ID, Full Name, Section (one per line)</label>
        <textarea value={paste} onChange={e => setPaste(e.target.value)}
          placeholder={'2019-12345, Dela Cruz, Juan A., BSCS 2-A\n2019-23456, Santos, Maria B., BSCS 2-A'}
          style={{ ...inputStyle, resize: 'vertical', minHeight: 90, fontFamily: "'IBM Plex Mono', monospace", fontSize: 13 }} />
        <button onClick={addPasted} disabled={adding} className="btn btn-sm" style={{ marginTop: 8, opacity: adding ? .7 : 1, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <UserPlus size={14} /> {adding ? 'Enrolling…' : 'Enroll from List'}
        </button>
      </div>

      {known.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Or add from known students</label>
          <div style={{ position: 'relative', marginBottom: 8 }}>
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search name or ID…" style={{ ...inputStyle, paddingLeft: 38 }} />
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ab' }} />
          </div>
          <div style={{ maxHeight: 180, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {filtered.slice(0, 30).map(s => (
              <div key={s.student_id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', border: '1px solid #c8d8f0', borderRadius: 6, background: '#fff', fontSize: 13 }}>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: '#5a7090', minWidth: 110 }}>{s.student_id}</span>
                <span style={{ flex: 1 }}>{s.student_name}</span>
                <button onClick={() => addKnown(s)} className="btn btn-sm btn-outline" style={{ padding: '3px 10px', fontSize: 11 }}>Add</button>
              </div>
            ))}
            {!filtered.length && <p style={{ fontSize: 12, color: '#9ab' }}>No matching un-enrolled students.</p>}
          </div>
        </div>
      )}

      <div style={{ borderTop: '1px solid #eef3fb', paddingTop: 14 }}>
        <h4 style={{ fontSize: 14, color: '#0f2044', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Users size={15} /> Enrolled ({enrollments.length})
        </h4>
        {!enrollments.length ? (
          <p style={{ fontSize: 13, color: '#5a7090' }}>No students enrolled yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {enrollments.map(e => (
              <div key={e.student_id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', border: '1px solid #eef3fb', borderRadius: 6, background: '#f5f8ff', fontSize: 13 }}>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: '#5a7090', minWidth: 110 }}>{e.student_id}</span>
                <span style={{ flex: 1, fontWeight: 500 }}>{e.student_name}</span>
                <span style={{ color: '#5a7090', fontSize: 12 }}>{e.student_section}</span>
                <button onClick={() => remove(e.student_id)} style={{ background: 'none', border: 'none', color: '#9ab', cursor: 'pointer' }}><X size={15} /></button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AttendanceTab({ classId, showToast }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [data, setData] = useState(null);
  const [marks, setMarks] = useState({});
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    api.getClassAttendance(classId, date).then(d => {
      setData(d);
      const m = {};
      d.students.forEach(s => { m[s.student_id] = s.status; });
      setMarks(m);
    }).catch(e => showToast(e.message));
  }, [classId, date, showToast]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!data) return;
    const records = data.students.map(s => ({
      student_id: s.student_id, student_name: s.student_name, status: marks[s.student_id] || 'absent',
    }));
    setSaving(true);
    try {
      await api.saveClassAttendance(classId, date, records);
      showToast('Attendance saved');
      load();
    } catch (e) { showToast(e.message); }
    setSaving(false);
  };

  const setAll = (status) => {
    if (!data) return;
    const m = {};
    data.students.forEach(s => { m[s.student_id] = status; });
    setMarks(m);
  };

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <CalendarCheck size={18} color="#1a4fad" />
        <h3 style={{ fontSize: 15, color: '#0f2044' }}>Take Attendance</h3>
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          style={{ ...inputStyle, maxWidth: 200, marginLeft: 'auto' }} />
      </div>

      {!data ? (
        <p style={{ fontSize: 13, color: '#5a7090' }}>Loading…</p>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: '#5a7090' }}>
              <span style={{ color: '#1a7a4a', fontWeight: 600 }}>{data.present} present</span>
              {' · '}<span style={{ color: '#c0392b', fontWeight: 600 }}>{data.absent} absent</span>
            </span>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
              <button onClick={() => setAll('present')} className="btn btn-outline btn-sm">All Present</button>
              <button onClick={() => setAll('absent')} className="btn btn-outline btn-sm">All Absent</button>
            </div>
          </div>

          {!data.students.length ? (
            <p style={{ fontSize: 13, color: '#5a7090' }}>No students enrolled. Add students in the Enrollments tab first.</p>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
                {data.students.map(s => (
                  <div key={s.student_id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', border: '1px solid #eef3fb', borderRadius: 6, background: '#f5f8ff', fontSize: 13 }}>
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: '#5a7090', minWidth: 110 }}>{s.student_id}</span>
                    <span style={{ flex: 1, fontWeight: 500 }}>{s.student_name}</span>
                    <span style={{ color: '#5a7090', fontSize: 12 }}>{s.student_section}</span>
                    <select value={marks[s.student_id] || 'absent'} onChange={e => setMarks({ ...marks, [s.student_id]: e.target.value })}
                      style={{
                        padding: '6px 10px', borderRadius: 6, border: '1.5px solid #c8d8f0', fontSize: 12,
                        fontFamily: 'inherit', outline: 'none', background: '#fff', cursor: 'pointer',
                        fontWeight: 600,
                        color: (marks[s.student_id] || 'absent') === 'present' ? '#1a7a4a' : (marks[s.student_id] || 'absent') === 'late' ? '#b8860b' : '#c0392b',
                      }}>
                      <option value="present">Present</option>
                      <option value="late">Late</option>
                      <option value="absent">Absent</option>
                    </select>
                  </div>
                ))}
              </div>
              <button onClick={save} disabled={saving} className="btn" style={{ opacity: saving ? .7 : 1, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Save size={15} /> {saving ? 'Saving…' : 'Save Attendance'}
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
}

function CheckinSessionsTab({ classId, sessions, onChanged, showToast }) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [code, setCode] = useState('');
  const [expiry, setExpiry] = useState('');
  const [creating, setCreating] = useState(false);
  const [qrSession, setQrSession] = useState(null);
  const [qr, setQr] = useState('');
  const [reportSession, setReportSession] = useState(null);
  const [report, setReport] = useState(null);

  useEffect(() => {
    if (!qrSession) { setQr(''); return; }
    QRCode.toDataURL(window.location.origin + '/checkin?id=' + encodeURIComponent(qrSession.id), {
      width: 260, margin: 1, color: { dark: '#0f2044', light: '#ffffff' },
    }).then(setQr).catch(() => setQr(''));
  }, [qrSession]);

  const create = async () => {
    if (!title.trim()) return showToast('Title is required');
    if (expiry && new Date(expiry) <= Date.now()) return showToast('Expiry must be in the future');
    setCreating(true);
    try {
      await api.createAttendanceSession({
        title: title.trim(), date,
        access_code: code.trim().toUpperCase(),
        class_id: classId,
        expires_at: expiry ? new Date(expiry).toISOString() : '',
      });
      showToast('Check-in session created');
      setTitle(''); setCode(''); setExpiry('');
      onChanged();
    } catch (e) { showToast(e.message); }
    setCreating(false);
  };

  const del = async (s) => {
    if (!window.confirm('Delete this check-in session and all its check-ins?')) return;
    try {
      await api.deleteAttendanceSession(s.id);
      showToast('Session deleted');
      setReportSession(null);
      onChanged();
    } catch (e) { showToast(e.message); }
  };

  const openReport = async (s) => {
    setReportSession(s);
    setReport(null);
    try { const r = await api.getAttendanceSessionReport(s.id); setReport(r); } catch (e) { showToast(e.message); }
  };

  const copyLink = (s) => {
    navigator.clipboard.writeText(window.location.origin + '/checkin?id=' + s.id);
    showToast('Check-in link copied');
  };

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <QrCode size={18} color="#1a4fad" />
        <h3 style={{ fontSize: 15, color: '#0f2044' }}>Check-in Sessions</h3>
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
        <div style={{ flex: '1 1 180px' }}>
          <label style={labelStyle}>Session Title</label>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Lecture / Quiz Day" style={inputStyle} />
        </div>
        <div style={{ flex: '1 1 130px' }}>
          <label style={labelStyle}>Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ ...inputStyle, maxWidth: 180 }} />
        </div>
        <div style={{ flex: '1 1 130px' }}>
          <label style={labelStyle}>Access Code <span style={{ fontWeight: 400, color: '#5a7090' }}>(optional)</span></label>
          <input value={code} onChange={e => setCode(e.target.value)} placeholder="e.g. LEC1" style={{ ...inputStyle, maxWidth: 180, textTransform: 'uppercase', fontFamily: "'IBM Plex Mono', monospace" }} />
        </div>
        <div style={{ flex: '1 1 170px' }}>
          <label style={labelStyle}>Expires At <span style={{ fontWeight: 400, color: '#5a7090' }}>(optional)</span></label>
          <input type="datetime-local" value={expiry} onChange={e => setExpiry(e.target.value)} style={{ ...inputStyle, maxWidth: 220 }} />
        </div>
      </div>
      <div style={{ fontSize: 11, color: '#5a7090', marginBottom: 12 }}>
        Students scan the QR or open the link to check in. Check-ins mark this class <strong>present</strong> for that date.
        {expiry && <span style={{ marginLeft: 8, color: '#b8860b' }}>QR stops working at {new Date(expiry).toLocaleString()}.</span>}
      </div>
      <button onClick={create} disabled={creating} className="btn btn-sm" style={{ opacity: creating ? .7 : 1, display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 20 }}>
        <Plus size={14} /> {creating ? 'Creating…' : 'Create Session'}
      </button>

      {!sessions.length ? (
        <p style={{ fontSize: 13, color: '#5a7090' }}>No check-in sessions yet. Create one above to let students self-check-in via QR code.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {sessions.map(s => {
            const expired = s.expires_at && new Date(s.expires_at).getTime() <= Date.now();
            return (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', border: '1px solid #eef3fb', borderRadius: 8, background: '#f5f8ff', fontSize: 13, flexWrap: 'wrap' }}>
              <QrCode size={15} color="#5a7090" />
              <div style={{ flex: 1, minWidth: 150 }}>
                <div style={{ fontWeight: 600, color: '#0f2044' }}>
                  {s.title}
                  {expired && <span style={{ marginLeft: 8, fontSize: 10, background: '#fdecea', color: '#c0392b', padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>Expired</span>}
                </div>
                <div style={{ fontSize: 11, color: '#5a7090' }}>
                  {s.date} · {s.checkin_count || 0} checked in
                  {s.access_code && <span style={{ marginLeft: 8, fontFamily: "'IBM Plex Mono', monospace", color: '#1a4fad', fontWeight: 600 }}>{s.access_code}</span>}
                  {s.expires_at && <span style={{ marginLeft: 8 }}>{expired ? 'stopped ' : 'open until '}<strong>{new Date(s.expires_at).toLocaleString()}</strong></span>}
                </div>
              </div>
              <button onClick={() => setQrSession(s)} className="btn btn-outline btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <QrCode size={13} /> QR
              </button>
              <button onClick={() => copyLink(s)} className="btn btn-outline btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Link2 size={13} /> Link
              </button>
              <button onClick={() => openReport(s)} className="btn btn-outline btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Eye size={13} /> Report
              </button>
              <button onClick={() => del(s)} style={{ background: 'none', border: 'none', color: '#c0392b', cursor: 'pointer', padding: 4 }}><Trash2 size={14} /></button>
            </div>
            );
          })}
        </div>
      )}

      {qrSession && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(10,20,40,.55)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setQrSession(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, padding: '28px 32px', maxWidth: 340, width: '100%', textAlign: 'center', boxShadow: '0 24px 64px rgba(0,0,0,.3)', animation: 'fadeIn .25s' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ fontSize: 15, color: '#0f2044' }}>{qrSession.title}</h3>
              <button onClick={() => setQrSession(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ab' }}><X size={18} /></button>
            </div>
            <p style={{ fontSize: 12, color: '#5a7090', marginBottom: 16 }}>
              {qrSession.date}{qrSession.access_code && <> · Code <strong style={{ letterSpacing: '.08em', fontFamily: "'IBM Plex Mono', monospace" }}>{qrSession.access_code}</strong></>}
            </p>
            {qr ? <img src={qr} alt="QR" style={{ width: 240, height: 240, borderRadius: 8 }} /> : <div style={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ab', fontSize: 12 }}>Generating…</div>}
            <p style={{ fontSize: 11, color: '#5a7090', marginTop: 14 }}>Students scan this to check in.</p>
          </div>
        </div>
      )}

      {reportSession && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(10,20,40,.55)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setReportSession(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, padding: '24px 28px', maxWidth: 420, width: '100%', maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,.3)', animation: 'fadeIn .25s' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ fontSize: 15, color: '#0f2044' }}>Report — {reportSession.title}</h3>
              <button onClick={() => setReportSession(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ab' }}><X size={18} /></button>
            </div>
            <p style={{ fontSize: 12, color: '#5a7090', marginBottom: 12 }}>{reportSession.date}</p>
            {!report ? (
              <p style={{ fontSize: 13, color: '#5a7090' }}>Loading…</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {report.students.map(s => (
                  <div key={s.student_id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', border: '1px solid #eef3fb', borderRadius: 6, fontSize: 13 }}>
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: '#5a7090', minWidth: 100 }}>{s.student_id}</span>
                    <span style={{ flex: 1, fontWeight: 500 }}>{s.student_name}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: s.checked_in ? '#1a7a4a' : '#c0392b' }}>{s.checked_in ? 'Present' : 'Absent'}</span>
                  </div>
                ))}
                {report.walkIns.map(s => (
                  <div key={s.student_id + '-w'} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', border: '1px solid #ddeeff', borderRadius: 6, fontSize: 13, background: '#f5f8ff' }}>
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: '#5a7090', minWidth: 100 }}>{s.student_id}</span>
                    <span style={{ flex: 1, fontWeight: 500 }}>{s.student_name}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#1a4fad' }}>Walk-in</span>
                  </div>
                ))}
                {!report.students.length && !report.walkIns.length && <p style={{ fontSize: 13, color: '#5a7090' }}>No check-ins yet.</p>}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function HistoryTab({ classId, showToast }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    api.getClassAttendanceHistory(classId).then(d => { setData(d); setLoading(false); }).catch(e => { showToast(e.message); setLoading(false); });
  }, [classId, showToast]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <p style={{ fontSize: 13, color: '#5a7090' }}>Loading…</p>;
  if (!data || !data.dates.length) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '48px 20px', color: '#5a7090' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}><History size={40} /></div>
        <p style={{ fontSize: 15, fontWeight: 600, color: '#0f2044', marginBottom: 6 }}>No attendance records yet</p>
        <p style={{ fontSize: 13 }}>Use the "Take Attendance" tab to record a session, or share class exams — submissions auto-mark students present.</p>
      </div>
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
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <History size={18} color="#1a4fad" />
        <h3 style={{ fontSize: 15, color: '#0f2044' }}>Attendance History</h3>
        <button onClick={csv} className="btn btn-outline btn-sm" style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <Download size={13} /> Export CSV
        </button>
      </div>
      <p style={{ fontSize: 12, color: '#5a7090', marginBottom: 16 }}>
        {data.dates.length} session{data.dates.length !== 1 ? 's' : ''} recorded — from {data.dates[0]} to {data.dates[data.dates.length - 1]}
      </p>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 12 }}>
          <thead>
            <tr style={{ background: '#0f2044', color: '#fff' }}>
              <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600 }}>Student</th>
              {data.dates.map(d => (
                <th key={d} style={{ padding: '8px 6px', textAlign: 'center', fontWeight: 600, whiteSpace: 'nowrap', fontSize: 11 }}>{d}</th>
              ))}
              <th style={{ padding: '8px 6px', textAlign: 'center', fontWeight: 600 }}>✓ Present</th>
              <th style={{ padding: '8px 6px', textAlign: 'center', fontWeight: 600 }}>Late</th>
              <th style={{ padding: '8px 6px', textAlign: 'center', fontWeight: 600 }}>✗ Absent</th>
            </tr>
          </thead>
          <tbody>
            {data.students.map(s => {
              const sum = data.summary.find(x => x.student_id === s.student_id) || {};
              return (
                <tr key={s.student_id} style={{ borderBottom: '1px solid #eef3fb' }}>
                  <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>
                    <div style={{ fontWeight: 600, color: '#0f2044' }}>{s.student_name}</div>
                    <div style={{ fontSize: 11, color: '#5a7090', fontFamily: "'IBM Plex Mono', monospace" }}>{s.student_id}</div>
                  </td>
                  {data.dates.map(d => {
                    const r = data.records.find(x => x.date === d && x.student_id === s.student_id);
                    const bg = !r ? '#f8f9fb' : r.status === 'present' ? '#e6f6ec' : r.status === 'late' ? '#fff8e1' : '#fdecea';
                    const color = !r ? '#9ab' : r.status === 'present' ? '#1a7a4a' : r.status === 'late' ? '#b8860b' : '#c0392b';
                    return (
                      <td key={d} style={{ padding: '8px 6px', textAlign: 'center', background: bg, color, fontWeight: 600 }}>
                        {!r ? '—' : r.status === 'present' ? 'P' : r.status === 'late' ? 'L' : 'A'}
                        {r?.source === 'exam' && <span style={{ display: 'block', fontSize: 8, fontWeight: 400 }}>exam</span>}
                      </td>
                    );
                  })}
                  <td style={{ padding: '8px 6px', textAlign: 'center', color: '#1a7a4a', fontWeight: 700 }}>{sum.present || 0}</td>
                  <td style={{ padding: '8px 6px', textAlign: 'center', color: '#b8860b', fontWeight: 700 }}>{sum.late || 0}</td>
                  <td style={{ padding: '8px 6px', textAlign: 'center', color: '#c0392b', fontWeight: 700 }}>{sum.absent || 0}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{ background: '#f5f8ff', borderTop: '2px solid #c8d8f0', fontWeight: 600 }}>
              <td style={{ padding: '8px 10px' }}>Daily summary</td>
              {data.dates.map(d => {
                const by = data.byDate[d] || {};
                const attended = by.present || 0;
                return (
                  <td key={d} style={{ padding: '8px 6px', textAlign: 'center', fontSize: 11 }}>
                    <span style={{ color: '#1a7a4a' }}>{attended}✓</span>
                    <span style={{ color: '#c0392b' }}> {by.absent || 0}✗</span>
                    {(by.unrecorded || 0) > 0 && <span style={{ color: '#9ab' }}> {by.unrecorded}?</span>}
                  </td>
                );
              })}
              <td colSpan={3}></td>
            </tr>
          </tfoot>
        </table>
      </div>
      <div style={{ fontSize: 11, color: '#9ab', marginTop: 12 }}>
        P = present · L = late · A = absent · — = no record · "exam" = auto-recorded when the student submitted a class exam that day
      </div>
    </div>
  );
}

function ExamsTab({ classId, exams }) {
  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <ClipboardList size={18} color="#1a4fad" />
        <h3 style={{ fontSize: 15, color: '#0f2044' }}>Exams for this Class ({exams.length})</h3>
      </div>
      {!exams.length ? (
        <p style={{ fontSize: 13, color: '#5a7090' }}>No exams yet. Click "Create Exam for this Class" above to get started.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {exams.map(e => (
            <Link key={e.id} to={"/admin/create?id=" + e.id} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', border: '1px solid #eef3fb', borderRadius: 8, background: '#f5f8ff', fontSize: 13 }}>
                <ClipboardList size={15} color="#5a7090" />
                <span style={{ flex: 1, fontWeight: 500 }}>{e.title}</span>
                <span style={{ color: '#5a7090', fontSize: 12 }}>{e.submission_count || 0} submissions</span>
                <span style={{ fontSize: 11, color: e.deadline && new Date(e.deadline) <= Date.now() ? '#c0392b' : '#1a7a4a' }}>
                  {e.deadline ? (new Date(e.deadline) <= Date.now() ? 'closed' : 'open') : 'no deadline'}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}