import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../api';
import AdminLayout from '../../components/AdminLayout';
import { PageHeader, Card, Button, Input, Select, TextArea, Badge, EmptyState, ConfirmDialog, useToast } from '../../components/ui';
import { FileText, HelpCircle, Plus, Inbox, Lightbulb, X, Check, Upload, Library, Clock, Key, Users, CalendarClock, ListChecks, Type, GraduationCap, Pencil, Trash2, BarChart2 } from 'lucide-react';
import { EXAM_TYPE_LABELS } from '../../utils';

export default function CreateExam() {
  const [params] = useSearchParams();
  return <AdminLayout title={params.get('id') ? 'Edit Exam' : 'Create Exam'}><CreateExamInner /></AdminLayout>;
}

function toLocalInput(iso) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toIso(localInput) {
  if (!localInput) return '';
  const d = new Date(localInput);
  return isNaN(d.getTime()) ? '' : d.toISOString();
}

function Toggle({ checked, onChange, label }) {
  return (
    <label className="inline-flex items-center gap-2.5 cursor-pointer select-none">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`w-10 h-6 rounded-full relative transition-colors duration-200 shrink-0 cursor-pointer ${checked ? 'bg-navy-700' : 'bg-border-strong'}`}
      >
        <span className={`w-[18px] h-[18px] rounded-full bg-white absolute top-[3px] transition-all duration-200 shadow ${checked ? 'left-[19px]' : 'left-[3px]'}`} />
      </button>
      {label && <span className="text-[13px] font-medium text-navy-800">{label}</span>}
    </label>
  );
}

function TypeToggle({ value, onChange }) {
  const base = 'inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-[13px] font-semibold transition-all duration-150 cursor-pointer font-sans whitespace-nowrap';
  const active = 'bg-navy-700 text-white shadow-card';
  const idle = 'bg-surface border border-border text-muted hover:bg-navy-50 hover:text-navy-800';
  const iconCls = (t) => value === t ? 'text-white' : 'text-navy-700';
  return (
    <div className="flex gap-1.5">
      {[['multiple_choice', 'Multiple Choice', ListChecks], ['fill_blank', 'Fill in the Blank', Type]].map(([t, lbl, Icon]) => (
        <button key={t} type="button" onClick={() => onChange(t)} className={`${base} ${value === t ? active : idle}`}>
          <Icon size={14} className={iconCls(t)} /> {lbl}
        </button>
      ))}
    </div>
  );
}

function SectionTitle({ icon: Icon, children, count }) {
  return (
    <div className="flex items-center gap-2.5 mb-5 pb-4 border-b border-border">
      <span className="w-7 h-7 rounded-lg bg-navy-100 text-navy-700 flex items-center justify-center shrink-0"><Icon size={15} /></span>
      <h2 className="text-[15px] text-navy-800 font-semibold">{children}</h2>
      {count !== undefined && <Badge tone="info" className="!ml-auto">{count}</Badge>}
    </div>
  );
}

function ChoiceRows({ values, setValue, answer, setAnswer }) {
  return (
    <div>
      <span className="label">Choices</span>
      <div className="flex flex-col gap-2">
        {['A', 'B', 'C', 'D'].map(letter => (
          <div key={letter} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setAnswer(letter)}
              title={answer === letter ? 'Correct answer' : 'Mark as correct answer'}
              className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono text-[12px] font-bold shrink-0 cursor-pointer transition-all ${answer === letter ? 'bg-success text-white shadow-card' : 'bg-navy-100 text-navy-700 hover:bg-navy-700 hover:text-white'}`}
            >
              {letter}
            </button>
            <input
              value={values[letter] || ''}
              onChange={e => setValue(letter, e.target.value)}
              placeholder={`Choice ${letter}`}
              className={`input flex-1 ${answer === letter ? '!border-success !bg-success-bg/30' : ''}`}
            />
            {answer === letter && <Check size={15} className="text-success shrink-0" />}
          </div>
        ))}
      </div>
      <p className="text-[11px] text-faint mt-1.5">Click a letter chip to set the correct answer.</p>
    </div>
  );
}

function QuestionCard({ q, index, isEditing, editState, editActions, onEdit, onDelete, editSaving }) {
  const choices = typeof q.choices === 'string' ? JSON.parse(q.choices) : q.choices;
  const isFill = (q.type || 'multiple_choice') === 'fill_blank';

  return (
    <Card className={`!p-0 !mb-0 overflow-hidden ${isEditing ? '!border-navy-700 shadow-card' : ''}`}>
      <div className={`flex justify-between items-center gap-2 px-4 py-3 border-b border-border bg-canvas/60 ${isEditing ? '' : ''}`}>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge tone="info">Q{index + 1}</Badge>
          {isEditing ? (
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-muted">Part</span>
              <Input type="number" value={editState.part} onChange={e => editActions.setPart(Number(e.target.value))} min={1} className="!w-20 !m-0" />
            </div>
          ) : (
            <span className="text-[11px] text-muted">Part {q.part}{isFill ? ' · Fill-in-the-blank' : ''}</span>
          )}
        </div>
        <div className="flex gap-1.5 shrink-0">
          {isEditing ? (
            <>
              <Button size="sm" onClick={() => editActions.save(q)} loading={editSaving} icon={Check}>{editSaving ? 'Saving…' : 'Save'}</Button>
              <Button size="sm" variant="outline" onClick={editActions.cancel} icon={X}>Cancel</Button>
            </>
          ) : (
            <>
              <Button size="sm" variant="ghost" onClick={() => onEdit(q)} icon={Pencil}>Edit</Button>
              <Button size="sm" variant="dangerSoft" onClick={() => onDelete(q.id)} icon={Trash2}>Delete</Button>
            </>
          )}
        </div>
      </div>

      <div className={`${isEditing ? 'p-4' : 'px-4 py-3.5'}`}>
        {isEditing ? (
          <div className="flex flex-col gap-2.5">
            <TextArea value={editState.text} onChange={e => editActions.setText(e.target.value)} style={{ minHeight: 60, resize: 'vertical' }} />
            <TypeToggle value={editState.type} onChange={editActions.setType} />
            {editState.type === 'fill_blank' ? (
              <Input label="Correct Answer" icon={Key} value={editState.blankAnswer} onChange={e => editActions.setBlankAnswer(e.target.value)} placeholder="e.g. 42" />
            ) : (
              <>
                <ChoiceRows
                  values={editState.choices}
                  setValue={editActions.setChoice}
                  answer={editState.answer}
                  setAnswer={editActions.setAnswer}
                />
                <div className="grid sm:grid-cols-2 gap-3">
                  <Select label="Correct Answer" value={editState.answer} onChange={e => editActions.setAnswer(e.target.value)}>
                    <option value="" disabled>— Select —</option>
                    {['A', 'B', 'C', 'D'].map(k => <option key={k} value={k}>{k}</option>)}
                  </Select>
                  <Input label="Explanation" icon={Lightbulb} value={editState.explain} onChange={e => editActions.setExplain(e.target.value)} placeholder="Shown after submission" />
                </div>
              </>
            )}
          </div>
        ) : (
          <>
            <div className="text-[14px] leading-relaxed mb-2.5">{q.text}</div>
            {isFill ? (
              <div className="inline-flex items-center gap-1.5 text-[12px] text-navy-700 bg-navy-50 border border-border rounded-md px-2.5 py-1 mb-2">Answer: <strong className="font-mono">{q.answer}</strong></div>
            ) : (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {(choices || []).map(c => (
                  <Badge key={c.key} tone={c.key === q.answer ? 'success' : 'neutral'}>{c.key}. {c.text}</Badge>
                ))}
              </div>
            )}
            {q.explain && (
              <div className="flex items-center gap-1 text-[12px] text-navy-700 italic">
                <Lightbulb size={12} /> {q.explain}
              </div>
            )}
          </>
        )}
      </div>
    </Card>
  );
}

function CreateExamInner() {
  const [params] = useSearchParams();
  const examId = params.get('id');

  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [examType, setExamType] = useState('major_exam');
  const [status, setStatus] = useState('draft');
  const [passingScore, setPassingScore] = useState('60');
  const [startAt, setStartAt] = useState('');
  const [timeLimit, setTimeLimit] = useState(60);
  const [showAnswers, setShowAnswers] = useState(true);
  const [deadline, setDeadline] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [roster, setRoster] = useState('');
  const [classId, setClassId] = useState(params.get('class') || '');
  const [classes, setClasses] = useState([]);
  const [questions, setQuestions] = useState([]);
  const toast = useToast();

  const [qPart, setQPart] = useState(1);
  const [qType, setQType] = useState('multiple_choice');
  const [qText, setQText] = useState('');
  const [qChoices, setQChoices] = useState({ A: '', B: '', C: '', D: '' });
  const [qAnswer, setQAnswer] = useState('');
  const [qBlankAnswer, setQBlankAnswer] = useState('');
  const [qExplain, setQExplain] = useState('');
  const [saving, setSaving] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [editState, setEditState] = useState({
    part: 1, type: 'multiple_choice', text: '', choices: { A: '', B: '', C: '', D: '' },
    answer: '', blankAnswer: '', explain: '',
  });
  const [editSaving, setEditSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    api.listClasses().then(setClasses).catch(() => {});
  }, []);

  useEffect(() => {
    if (!classId) return;
    api.getClass(classId).then(d => {
      const rosterText = (d.enrollments || []).map(e => [e.student_id, e.student_name, e.student_section].filter(Boolean).join(', ')).join('\n');
      if (rosterText) setRoster(rosterText);
    }).catch(() => {});
  }, [classId]);

  useEffect(() => {
    if (!examId) return;
    api.getExam(examId).then(data => {
      setTitle(data.title);
      setDesc(data.description || '');
      setExamType(data.type || 'major_exam');
      setStatus(data.status || 'draft');
      setPassingScore(data.passing_score !== undefined ? String(data.passing_score) : '60');
      setStartAt(data.start_at ? toLocalInput(data.start_at) : '');
      setTimeLimit(data.time_limit);
      setShowAnswers(data.show_answers !== 0);
      setDeadline(data.deadline ? toLocalInput(data.deadline) : '');
      setAccessCode(data.access_code || '');
      setClassId(data.class_id || '');
      setRoster((data.roster || []).map(r => [r.id || r.student_id || '', r.name || r.student_name || '', r.section || r.student_section || ''].filter(Boolean).join(', ')).join('\n'));
      setQuestions(data.questions || []);
    });
  }, [examId]);

  const saveExam = async () => {
    if (!title.trim()) { toast.error('Title is required'); return; }
    const parsedRoster = roster.split('\n').map(l => l.trim()).filter(Boolean).map(line => {
      const parts = line.split(',').map(p => p.trim());
      return { id: parts[0] || '', name: parts[1] || '', section: parts[2] || '' };
    });
    setSaving(true);
    const trimmedPassing = String(passingScore).trim();
    const numPassing = trimmedPassing === '' ? NaN : Number(trimmedPassing);
    const effectivePassing = Number.isFinite(numPassing) ? numPassing : 60;
    const body = {
      title: title.trim(), description: desc.trim(), time_limit: timeLimit, show_answers: showAnswers,
      deadline: toIso(deadline), access_code: accessCode.trim().toUpperCase(), roster: parsedRoster,
      class_id: classId,
      type: examType, status: status, passing_score: effectivePassing, start_at: toIso(startAt),
    };
    try {
      if (examId) {
        await api.updateExam(examId, body);
        toast.success('Exam updated');
      } else {
        const data = await api.createExam(body);
        window.location.search = '?id=' + data.id;
      }
    } catch (e) { toast.error(e.message); }
    setSaving(false);
  };

  const addQuestion = async () => {
    if (!examId) { toast.error('Save the exam first'); return; }
    setAdding(true);
    try {
      if (qType === 'fill_blank') {
        if (!qText.trim() || !qBlankAnswer.trim()) { toast.error('Fill in question text and the correct answer'); return; }
        await api.addQuestion(examId, {
          type: 'fill_blank', part: qPart, text: qText.trim(),
          choices: [], answer: qBlankAnswer.trim(),
          explain: qExplain.trim(), sort_order: questions.length,
        });
        setQText(''); setQBlankAnswer(''); setQExplain('');
      } else {
        const choices = ['A', 'B', 'C', 'D'].filter(k => qChoices[k].trim()).map(k => ({ key: k, text: qChoices[k].trim() }));
        if (!qText.trim() || choices.length < 2 || !qAnswer.trim()) { toast.error('Fill in question text, at least 2 choices, and select the correct answer'); return; }
        if (!choices.find(c => c.key === qAnswer.trim().toUpperCase())) { toast.error('Answer key not found in choices'); return; }
        await api.addQuestion(examId, {
          type: 'multiple_choice', part: qPart, text: qText.trim(),
          choices, answer: qAnswer.trim().toUpperCase(),
          explain: qExplain.trim(), sort_order: questions.length,
        });
        setQText(''); setQChoices({ A: '', B: '', C: '', D: '' }); setQAnswer(''); setQExplain('');
      }
      toast.success('Question added');
      const data = await api.getExam(examId);
      setQuestions(data.questions || []);
    } catch (e) { toast.error(e.message); }
    setAdding(false);
  };

  const startEdit = (q) => {
    const t = q.type || 'multiple_choice';
    const choices = { A: '', B: '', C: '', D: '' };
    if (t !== 'fill_blank') {
      const ch = typeof q.choices === 'string' ? JSON.parse(q.choices) : q.choices;
      ch.forEach(c => { choices[c.key] = c.text; });
    }
    setEditState({
      part: q.part, type: t, text: q.text, choices,
      answer: t === 'fill_blank' ? '' : q.answer,
      blankAnswer: t === 'fill_blank' ? (q.answer || '') : '',
      explain: q.explain || '',
    });
    setEditingId(q.id);
  };

  const editActions = {
    setPart: (v) => setEditState(s => ({ ...s, part: v })),
    setType: (v) => setEditState(s => ({ ...s, type: v })),
    setText: (e) => setEditState(s => ({ ...s, text: e.target.value })),
    setChoice: (k, v) => setEditState(s => ({ ...s, choices: { ...s.choices, [k]: v } })),
    setAnswer: (e) => setEditState(s => ({ ...s, answer: e.target.value })),
    setBlankAnswer: (e) => setEditState(s => ({ ...s, blankAnswer: e.target.value })),
    setExplain: (e) => setEditState(s => ({ ...s, explain: e.target.value })),
    cancel: () => { setEditingId(null); },
    save: async (q) => {
      setEditSaving(true);
      try {
        if (editState.type === 'fill_blank') {
          if (!editState.text.trim() || !editState.blankAnswer.trim()) { toast.error('Fill in question text and the correct answer'); return; }
          await api.updateQuestion(editingId, {
            type: 'fill_blank', part: editState.part, text: editState.text.trim(),
            choices: [], answer: editState.blankAnswer.trim(),
            explain: editState.explain.trim(), sort_order: q.sort_order || 0,
          });
        } else {
          const choices = ['A', 'B', 'C', 'D'].filter(k => editState.choices[k].trim()).map(k => ({ key: k, text: editState.choices[k].trim() }));
          if (!editState.text.trim() || choices.length < 2 || !editState.answer.trim()) { toast.error('Fill in question text, at least 2 choices, and select the correct answer'); return; }
          if (!choices.find(c => c.key === editState.answer.trim().toUpperCase())) { toast.error('Answer key not found in choices'); return; }
          await api.updateQuestion(editingId, {
            type: 'multiple_choice', part: editState.part, text: editState.text.trim(),
            choices, answer: editState.answer.trim().toUpperCase(),
            explain: editState.explain.trim(), sort_order: q.sort_order || 0,
          });
        }
        toast.success('Question updated');
        const data = await api.getExam(examId);
        setQuestions(data.questions || []);
        setEditingId(null);
      } catch (e) { toast.error(e.message); }
      setEditSaving(false);
    },
  };

  const deleteQuestion = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.deleteQuestion(deleteTarget);
      setQuestions(prev => prev.filter(q => q.id !== deleteTarget));
      setDeleteTarget(null);
      toast.success('Question deleted');
    } catch (e) { toast.error(e.message); }
    setDeleting(false);
  };

  const refreshQuestions = () => { api.getExam(examId).then(d => setQuestions(d.questions || [])); };

  return (
    <main className="max-w-[860px] mx-auto px-4 py-6">
      <PageHeader
        eyebrow="Exams"
        title={examId ? 'Edit Exam' : 'Create Exam'}
        subtitle={examId ? 'Update exam details, add or edit questions.' : 'Set up your exam details first.'}
        icon={FileText}
      />

      {/* Exam Details */}
      <Card>
        <SectionTitle icon={FileText}>Exam Details</SectionTitle>
        {classId && (
          <div className="flex items-start gap-2 text-[12px] text-muted bg-navy-50 border border-navy-100 rounded-lg px-3 py-2 mb-4">
            <GraduationCap size={15} className="text-navy-700 shrink-0 mt-0.5" />
            <span>Linked to a class — the roster below is filled from its enrollments and submissions auto-mark students <strong className="text-navy-800">present</strong> for attendance records.</span>
          </div>
        )}
        <div className="flex flex-col gap-4">
          <Input label="Exam Title" icon={FileText} value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. STAT 120 Midterm" />
          <TextArea label="Description (optional)" value={desc} onChange={e => setDesc(e.target.value)} placeholder="Brief description of the exam" style={{ minHeight: 60, resize: 'vertical' }} />
          <div className="grid sm:grid-cols-2 gap-4">
            <Select label="Assessment Type" value={examType} onChange={e => setExamType(e.target.value)}>
              {Object.entries(EXAM_TYPE_LABELS).map(([v, lbl]) => <option key={v} value={v}>{lbl}</option>)}
            </Select>
            <Select label="Status" value={status} onChange={e => setStatus(e.target.value)}>
              <option value="draft">Draft</option>
              <option value="scheduled">Scheduled</option>
              <option value="active">Active</option>
              <option value="closed">Closed</option>
              <option value="archived">Archived</option>
            </Select>
            <Input label="Passing Score (%)" icon={BarChart2} type="number" value={passingScore} onChange={e => setPassingScore(e.target.value)} min={0} max={100} />
            <Input label="Scheduled Open (optional, when status = Scheduled)" icon={CalendarClock} type="datetime-local" value={startAt} onChange={e => setStartAt(e.target.value)} />
          </div>
          {(status === 'scheduled' && startAt) && (
            <p className="text-[11px] text-muted -mt-2">Students can't start until {new Date(startAt).toLocaleString()}.</p>
          )}
          <div className="grid sm:grid-cols-2 gap-4">
            <Input label="Time Limit (minutes)" icon={Clock} type="number" value={timeLimit} onChange={e => setTimeLimit(Number(e.target.value))} min={1} />
            <Input label="Access Code (optional, for live check-in)" icon={Key} value={accessCode} onChange={e => setAccessCode(e.target.value)}
              placeholder="e.g. MIDTERM25" className="!font-mono !tracking-[.08em] !uppercase" />
          </div>
          <div>
            <Input label="Deadline (optional)" icon={CalendarClock} type="datetime-local" value={deadline} onChange={e => setDeadline(e.target.value)} className="!max-w-[280px]" />
            {deadline && (
              <div className="text-[11px] text-muted mt-1 flex items-center gap-2">
                Students can no longer access or submit after this time.
                <Button size="sm" variant="outline" onClick={() => setDeadline('')} icon={X}>Remove</Button>
              </div>
            )}
          </div>
          <div>
            <Select label="Class (optional — links exam to a class for records & auto-attendance)" value={classId} onChange={e => setClassId(e.target.value)} className="!max-w-[360px]">
              <option value="">— No class —</option>
              {classes.map(k => <option key={k.id} value={k.id}>{k.name}{k.section ? ' · ' + k.section : ''}</option>)}
            </Select>
            {classId && (
              <p className="text-[11px] text-muted mt-1">
                The roster below was filled from this class's enrollments. Submissions automatically mark students <strong>present</strong> that day.
              </p>
            )}
          </div>
          <TextArea label="Class Roster (optional, for attendance & absentee reports)" value={roster} onChange={e => setRoster(e.target.value)}
            placeholder={'One student per line: Student ID, Full Name, Section\nExample:\n2019-12345, Dela Cruz, Juan A., BSCS 2-A\n2019-23456, Santos, Maria B., BSCS 2-A'}
            className="!font-mono !text-[13px]" style={{ minHeight: 110, resize: 'vertical' }} />
          <p className="text-[11px] text-muted -mt-2 flex items-center gap-1.5"><Users size={12} className="text-navy-700" /> Students in the roster who never start the exam appear as <strong>absent</strong> in the Attendance report.</p>
          <div className="flex items-center justify-between gap-3 border border-border rounded-lg px-3.5 py-3 bg-canvas/60">
            <Toggle checked={showAnswers} onChange={setShowAnswers} label="Show correct answers to students after submission" />
          </div>
          <div className="flex gap-2 pt-1">
            <Button onClick={saveExam} loading={saving} icon={FileText}>{saving ? 'Saving...' : examId ? 'Update Exam' : 'Save Exam'}</Button>
          </div>
        </div>
      </Card>

      {/* Add Question */}
      {examId && (
        <Card className="!mt-6">
          <SectionTitle icon={HelpCircle} count={`${questions.length} question${questions.length !== 1 ? 's' : ''} total`}>Add Question</SectionTitle>
          <div className="flex flex-col gap-4">
            <div className="grid sm:grid-cols-[auto_1fr] gap-4 items-end">
              <Input label="Part" icon={ListChecks} type="number" value={qPart} onChange={e => setQPart(Number(e.target.value))} min={1} className="!w-24" />
              <div>
                <span className="label">Question Type</span>
                <TypeToggle value={qType} onChange={setQType} />
              </div>
            </div>
            <TextArea label="Question Text (use {'{{DATA:1,2,3}}'} for datasets)" value={qText} onChange={e => setQText(e.target.value)} style={{ minHeight: 70, resize: 'vertical' }} />
            {qType === 'fill_blank' ? (
              <Input label="Correct Answer" icon={Key} value={qBlankAnswer} onChange={e => setQBlankAnswer(e.target.value)} placeholder="e.g. 42"
                hint='Matching is flexible: case-insensitive, ignores spacing, accepts equivalent math. Examples: "x = 2" ≈ "2"; "1/2" ≈ "0.5"; "(x-1)(x+2)" ≈ "x² + x - 2".' />
            ) : (
              <>
                <ChoiceRows values={qChoices} setValue={(k, v) => setQChoices(c => ({ ...c, [k]: v }))} answer={qAnswer} setAnswer={setQAnswer} />
                <div className="grid sm:grid-cols-2 gap-4">
                  <Select label="Correct Answer" value={qAnswer} onChange={e => setQAnswer(e.target.value)}>
                    <option value="" disabled>— Select —</option>
                    {['A', 'B', 'C', 'D'].map(k => <option key={k} value={k}>{k}</option>)}
                  </Select>
                  <Input label="Explanation (optional)" icon={Lightbulb} value={qExplain} onChange={e => setQExplain(e.target.value)} placeholder="Shown after submission" />
                </div>
              </>
            )}
            <div>
              <Button onClick={addQuestion} loading={adding} icon={Plus}>{adding ? 'Adding...' : 'Add Question'}</Button>
            </div>
          </div>
        </Card>
      )}

      {/* Import */}
      {examId && (
        <Card className="!mt-6">
          <SectionTitle icon={Upload} count="Bulk JSON · Question Bank">Import Questions</SectionTitle>
          <BulkImportSection examId={examId} onImported={() => { refreshQuestions(); toast.success('Questions imported!'); }} />
          <div className="my-3 flex items-center gap-3 text-[11px] text-faint">
            <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
          </div>
          <BankImportSection examId={examId} onImported={() => { refreshQuestions(); toast.success('Questions imported from bank!'); }} />
        </Card>
      )}

      {/* Questions List */}
      {examId && (
        <Card className="!mt-6">
          <SectionTitle icon={FileText} count={`${questions.length} question${questions.length !== 1 ? 's' : ''}`}>Questions</SectionTitle>
          {!questions.length ? (
            <EmptyState icon={Inbox} title="No questions yet" body="Add your first question above." compact />
          ) : (
            <div className="flex flex-col gap-2.5">
              {questions.map((q, i) => (
                <QuestionCard
                  key={q.id}
                  q={q}
                  index={i}
                  isEditing={editingId === q.id}
                  editState={editState}
                  editActions={editActions}
                  editSaving={editSaving}
                  onEdit={startEdit}
                  onDelete={(id) => setDeleteTarget(id)}
                />
              ))}
            </div>
          )}
        </Card>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Question?"
        body="This question will be removed from the exam."
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={deleteQuestion}
      />
    </main>
  );
}

function BulkImportSection({ examId, onImported }) {
  const [open, setOpen] = useState(false);
  const [json, setJson] = useState('');
  const [importing, setImporting] = useState(false);
  const toast = useToast();

  const doImport = async () => {
    let questions;
    try { questions = JSON.parse(json); } catch { toast.error('Invalid JSON'); return; }
    if (!Array.isArray(questions) || !questions.length) { toast.error('Provide an array of questions'); return; }
    setImporting(true);
    try {
      await api.bulkImportQuestions(examId, questions, 0);
      setJson(''); setOpen(false);
      onImported();
    } catch (e) { toast.error(e.message); }
    setImporting(false);
  };

  const count = (() => { try { const q = JSON.parse(json); return Array.isArray(q) ? q.length : 0; } catch { return 0; } })();

  return (
    <div className="mb-1">
      <Button size="sm" variant="soft" icon={open ? X : Upload} onClick={() => setOpen(!open)}>
        {open ? 'Close Bulk Import' : 'Bulk Import JSON'}
      </Button>
      {open && (
        <div className="mt-3 border border-border rounded-lg p-3.5 bg-canvas/50">
          <p className="text-[12px] text-muted mb-2">
            Paste a JSON array of questions. Each object: <code className="font-mono text-[11px]">{"{ \"text\": \"...\", \"choices\": [{\"key\":\"A\",\"text\":\"...\"},...], \"answer\": \"A\", \"part\": 1, \"explain\": \"...\", \"type\": \"multiple_choice\" }"}</code>. For fill-in-the-blank, use <code className="font-mono text-[11px]">{"{ \"text\": \"...\", \"type\": \"fill_blank\", \"choices\": [], \"answer\": \"correct answer\", \"part\": 1 }"}</code>.
          </p>
          <TextArea value={json} onChange={e => setJson(e.target.value)}
            placeholder='[{"text":"What is 2+2?","choices":[{"key":"A","text":"3"},{"key":"B","text":"4"},{"key":"C","text":"5"}],"answer":"B","part":1}]'
            className="!font-mono !text-[13px]" style={{ minHeight: 120, resize: 'vertical' }} />
          <Button size="sm" className="!mt-2" onClick={doImport} loading={importing} disabled={!json.trim()} icon={Upload}>
            {importing ? 'Importing...' : `Import${count ? ' ' + count + ' question(s)' : ''}`}
          </Button>
        </div>
      )}
    </div>
  );
}

function BankImportSection({ examId, onImported }) {
  const [open, setOpen] = useState(false);
  const [bank, setBank] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [importing, setImporting] = useState(false);
  const toast = useToast();

  const loadBank = async () => {
    try {
      const data = await api.listBank();
      setBank(data);
      setOpen(true);
      setSelected(new Set());
    } catch (e) { toast.error(e.message); }
  };

  const toggle = (id) => {
    setSelected(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const doImport = async () => {
    const toImport = bank.filter(q => selected.has(q.id));
    if (!toImport.length) { toast.error('Select at least one question'); return; }
    setImporting(true);
    try {
      const formatted = toImport.map(q => ({
        part: q.part, text: q.text,
        choices: typeof q.choices === 'string' ? JSON.parse(q.choices) : q.choices,
        answer: q.answer, explain: q.explain || '',
      }));
      await api.bulkImportQuestions(examId, formatted, 0);
      setOpen(false);
      onImported();
    } catch (e) { toast.error(e.message); }
    setImporting(false);
  };

  return (
    <div>
      <Button size="sm" variant="soft" icon={Library} onClick={loadBank}>Import from Question Bank</Button>
      {open && (
        <div className="mt-3 border border-border rounded-[10px] p-4 bg-canvas/50">
          <div className="flex justify-between items-center mb-3">
            <span className="text-[13px] font-semibold text-navy-800 flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-navy-100 text-navy-700 flex items-center justify-center shrink-0"><Library size={13} /></span>
              Select questions to import
            </span>
            <Button size="sm" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
          {!bank.length ? (
            <p className="text-[13px] text-muted">Bank is empty.</p>
          ) : (
            <div className="max-h-[300px] overflow-y-auto flex flex-col gap-1.5">
              {bank.map(q => (
                <label key={q.id} onClick={() => toggle(q.id)}
                  className={`flex items-center gap-2.5 px-3 py-2 border rounded-md cursor-pointer text-[13px] transition-colors ${selected.has(q.id) ? 'border-navy-700 bg-navy-100' : 'border-border bg-surface hover:border-navy-700'}`}>
                  <input type="checkbox" checked={selected.has(q.id)} onChange={() => {}} className="accent-navy-700" />
                  <Badge tone="info">Part {q.part}</Badge>
                  <span className="flex-1 truncate">{q.text}</span>
                </label>
              ))}
            </div>
          )}
          {selected.size > 0 && (
            <Button size="sm" className="!mt-3" onClick={doImport} loading={importing} icon={Check}>
              {importing ? 'Importing...' : `Import ${selected.size} question${selected.size > 1 ? 's' : ''}`}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}