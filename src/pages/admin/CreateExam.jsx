import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../../api';
import AdminLayout from '../../components/AdminLayout';
import { PageHeader, Card, Button, Input, Select, TextArea, Badge, EmptyState, ConfirmDialog, useToast, Modal, Spinner } from '../../components/ui';
import { FileText, HelpCircle, Plus, Inbox, Lightbulb, X, Check, Upload, Library, Clock, Key, Users, CalendarClock, ListChecks, Type, GraduationCap, Pencil, Trash2, BarChart2, Tag, Save, Copy, ArrowLeft } from 'lucide-react';
import { EXAM_TYPE_LABELS, DIFFICULTY_LABELS, parseTags, splitTags } from '../../utils';

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
            <div className="grid sm:grid-cols-2 gap-2.5">
              <Select label="Difficulty" value={editState.difficulty} onChange={editActions.setDifficulty}>
                <option value="">— None —</option>
                {Object.entries(DIFFICULTY_LABELS).map(([v, lbl]) => <option key={v} value={v}>{lbl}</option>)}
              </Select>
              <Input label="Topic" value={editState.topic} onChange={editActions.setTopic} placeholder="e.g. Algebra" />
              <Input label="Competency" value={editState.competency} onChange={editActions.setCompetency} placeholder="e.g. Solve linear equations" />
              <Input label="Tags (comma-separated)" icon={Tag} value={editState.tags} onChange={editActions.setTags} placeholder="e.g. algebra, equation" />
            </div>
          </div>
        ) : (
          <>
            <div className="text-[14px] leading-relaxed mb-2.5">{q.text}</div>
            {(q.difficulty || q.topic || q.competency || parseTags(q.tags).length > 0) && (
              <div className="flex flex-wrap items-center gap-1.5 mb-2">
                {q.difficulty && <Badge tone={q.difficulty === 'hard' ? 'danger' : q.difficulty === 'easy' ? 'success' : 'warning'}>{DIFFICULTY_LABELS[q.difficulty] || q.difficulty}</Badge>}
                {q.topic && <Badge tone="info">{q.topic}</Badge>}
                {q.competency && <Badge tone="purple">{q.competency}</Badge>}
                {parseTags(q.tags).map(t => <span key={t} className="inline-flex items-center gap-1 text-[11px] text-navy-700 bg-navy-50 border border-border rounded-full px-2 py-0.5"><Tag size={10} /> {t}</span>)}
              </div>
            )}
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
  const [qDifficulty, setQDifficulty] = useState('');
  const [qTopic, setQTopic] = useState('');
  const [qCompetency, setQCompetency] = useState('');
  const [qTags, setQTags] = useState('');
  const [showQMeta, setShowQMeta] = useState(false);
  const [saving, setSaving] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [editState, setEditState] = useState({
    part: 1, type: 'multiple_choice', text: '', choices: { A: '', B: '', C: '', D: '' },
    answer: '', blankAnswer: '', explain: '', difficulty: '', topic: '', competency: '', tags: '',
  });
  const [editSaving, setEditSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  // Templates (§66)
  const [templates, setTemplates] = useState([]);
  const [showTplModal, setShowTplModal] = useState(false);
  const [tplSaving, setTplSaving] = useState(false);
  const [showUseTplModal, setShowUseTplModal] = useState(false);
  const [tplUsing, setTplUsing] = useState(false);
  const [selectedTpl, setSelectedTpl] = useState('');

  useEffect(() => {
    api.listClasses().then(setClasses).catch(() => {});
    api.listTemplates().then(setTemplates).catch(() => {});
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

  const saveAsTemplate = async () => {
    if (!examId) { toast.error('Save the exam first'); return; }
    setTplSaving(true);
    try {
      const res = await api.createTemplate({ exam_id: examId, title: title.trim() + ' Template', description: desc.trim(), type: examType, time_limit: timeLimit, questions_per_set: questions.length || 10, show_answers: showAnswers, passing_score: Number(passingScore) || 60, class_id: classId });
      toast.success(`Template saved (${res.question_count} questions)`);
      api.listTemplates().then(setTemplates).catch(()=>{});
      setShowTplModal(false);
    } catch (e) { toast.error(e.message); }
    setTplSaving(false);
  };

  const useTemplate = async () => {
    if (!selectedTpl) { toast.error('Select a template'); return; }
    setTplUsing(true);
    try {
      const res = await api.useTemplate(selectedTpl, { class_id: classId });
      toast.success(`Created exam from template (${res.question_count} Qs)`);
      window.location.search = '?id=' + res.id;
    } catch (e) { toast.error(e.message); }
    setTplUsing(false);
  };

  const addQuestion = async () => {
    if (!examId) { toast.error('Save the exam first'); return; }
    setAdding(true);
    const meta = { difficulty: qDifficulty, topic: qTopic.trim(), competency: qCompetency.trim(), tags: splitTags(qTags) };
    try {
      if (qType === 'fill_blank') {
        if (!qText.trim() || !qBlankAnswer.trim()) { toast.error('Fill in question text and the correct answer'); return; }
        await api.addQuestion(examId, {
          type: 'fill_blank', part: qPart, text: qText.trim(),
          choices: [], answer: qBlankAnswer.trim(),
          explain: qExplain.trim(), sort_order: questions.length, ...meta,
        });
        setQText(''); setQBlankAnswer(''); setQExplain('');
      } else {
        const choices = ['A', 'B', 'C', 'D'].filter(k => qChoices[k].trim()).map(k => ({ key: k, text: qChoices[k].trim() }));
        if (!qText.trim() || choices.length < 2 || !qAnswer.trim()) { toast.error('Fill in question text, at least 2 choices, and select the correct answer'); return; }
        if (!choices.find(c => c.key === qAnswer.trim().toUpperCase())) { toast.error('Answer key not found in choices'); return; }
        await api.addQuestion(examId, {
          type: 'multiple_choice', part: qPart, text: qText.trim(),
          choices, answer: qAnswer.trim().toUpperCase(),
          explain: qExplain.trim(), sort_order: questions.length, ...meta,
        });
        setQText(''); setQChoices({ A: '', B: '', C: '', D: '' }); setQAnswer(''); setQExplain('');
      }
      setQDifficulty(''); setQTopic(''); setQCompetency(''); setQTags('');
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
      difficulty: q.difficulty || '', topic: q.topic || '', competency: q.competency || '',
      tags: parseTags(q.tags).join(', '),
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
    setDifficulty: (e) => setEditState(s => ({ ...s, difficulty: e.target.value })),
    setTopic: (e) => setEditState(s => ({ ...s, topic: e.target.value })),
    setCompetency: (e) => setEditState(s => ({ ...s, competency: e.target.value })),
    setTags: (e) => setEditState(s => ({ ...s, tags: e.target.value })),
    cancel: () => { setEditingId(null); },
    save: async (q) => {
      setEditSaving(true);
      try {
        const meta = { difficulty: editState.difficulty, topic: editState.topic.trim(), competency: editState.competency.trim(), tags: splitTags(editState.tags) };
        if (editState.type === 'fill_blank') {
          if (!editState.text.trim() || !editState.blankAnswer.trim()) { toast.error('Fill in question text and the correct answer'); return; }
          await api.updateQuestion(editingId, {
            type: 'fill_blank', part: editState.part, text: editState.text.trim(),
            choices: [], answer: editState.blankAnswer.trim(),
            explain: editState.explain.trim(), sort_order: q.sort_order || 0, ...meta,
          });
        } else {
          const choices = ['A', 'B', 'C', 'D'].filter(k => editState.choices[k].trim()).map(k => ({ key: k, text: editState.choices[k].trim() }));
          if (!editState.text.trim() || choices.length < 2 || !editState.answer.trim()) { toast.error('Fill in question text, at least 2 choices, and select the correct answer'); return; }
          if (!choices.find(c => c.key === editState.answer.trim().toUpperCase())) { toast.error('Answer key not found in choices'); return; }
          await api.updateQuestion(editingId, {
            type: 'multiple_choice', part: editState.part, text: editState.text.trim(),
            choices, answer: editState.answer.trim().toUpperCase(),
            explain: editState.explain.trim(), sort_order: q.sort_order || 0, ...meta,
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

  const navigate = useNavigate();
  return (
    <main className="max-w-[860px] mx-auto px-4 py-6">
      <Button variant="ghost" icon={ArrowLeft} onClick={() => navigate('/admin')} className="!px-0 !py-1 !text-[13px] !text-muted hover:!text-navy-800 mb-3">Back to Dashboard</Button>
      <PageHeader
        eyebrow="Exams"
        title={examId ? 'Edit Exam' : 'Create Exam'}
        subtitle={examId ? 'Update exam details, add or edit questions.' : 'Set up your exam details first.'}
      />

      {/* Exam Details — Professional grouped layout */}
      <Card className="!p-0 overflow-hidden">
        <div className="px-5 sm:px-6 pt-5 pb-4 border-b border-border bg-gradient-to-r from-navy-50 to-surface">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-navy-700 text-white flex items-center justify-center shrink-0"><FileText size={16} /></span>
            <div>
              <h2 className="text-[15px] font-semibold text-navy-800 leading-tight">Exam Details</h2>
              <p className="text-[12px] text-muted">Configure the basics first — you can add questions after saving.</p>
            </div>
            <Badge tone="info" className="ml-auto">{examId ? 'Edit' : 'New'}</Badge>
          </div>
          {classId && (
            <div className="flex items-start gap-2 text-[12px] text-navy-700 bg-navy-100/60 border border-navy-100 rounded-lg px-3 py-2 mt-3">
              <GraduationCap size={15} className="shrink-0 mt-0.5" />
              <span>Linked to <strong>{classes.find(c=>c.id===classId)?.name || 'class'}</strong> — roster auto-filled from enrollments; submissions auto-mark <strong>present</strong>.</span>
            </div>
          )}
        </div>

        <div className="px-5 sm:px-6 py-5 flex flex-col gap-6">
          {/* Group 1: Identity */}
          <div className="bg-canvas/40 border border-border rounded-xl p-4">
            <div className="text-[11px] font-bold tracking-[.08em] uppercase text-faint mb-3 flex items-center gap-2"><FileText size={12} /> Identity</div>
            <div className="flex flex-col gap-4">
              <Input label="Exam Title *" icon={FileText} value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. STAT 120 — Midterm" hint={`${title.length}/80 characters`} />
              <TextArea label="Description" hint="Shown on the student gate. Keep it concise." value={desc} onChange={e => setDesc(e.target.value)} placeholder="Brief overview, instructions, or coverage..." style={{ minHeight: 72, resize: 'vertical' }} />
              <div className="grid sm:grid-cols-2 gap-4">
                <Select label="Assessment Type" hint="Drives gradebook categories." value={examType} onChange={e => setExamType(e.target.value)}>
                  {Object.entries(EXAM_TYPE_LABELS).map(([v, lbl]) => <option key={v} value={v}>{lbl}</option>)}
                </Select>
                <div>
                  <Select label="Status" value={status} onChange={e => setStatus(e.target.value)}>
                    <option value="draft">Draft — not visible</option>
                    <option value="scheduled">Scheduled — opens later</option>
                    <option value="active">Active — open now</option>
                    <option value="closed">Closed — no new starts</option>
                    <option value="archived">Archived</option>
                  </Select>
                  <div className="mt-1.5"><Badge tone={status==='active'?'success':status==='draft'?'neutral':status==='scheduled'?'info':'danger'}>{status}</Badge></div>
                </div>
              </div>
            </div>
          </div>

          {/* Group 2: Scoring & Timing */}
          <div className="bg-canvas/40 border border-border rounded-xl p-4">
            <div className="text-[11px] font-bold tracking-[.08em] uppercase text-faint mb-3 flex items-center gap-2"><BarChart2 size={12} /> Scoring & Timing</div>
            <div className="grid sm:grid-cols-3 gap-4">
              <Input label="Passing Score %" icon={BarChart2} type="number" value={passingScore} onChange={e => setPassingScore(e.target.value)} min={0} max={100} hint="0–100, default 60" />
              <Input label="Time Limit (min)" icon={Clock} type="number" value={timeLimit} onChange={e => setTimeLimit(Number(e.target.value))} min={1} hint="Per attempt." />
              <Input label="Access Code" icon={Key} value={accessCode} onChange={e => setAccessCode(e.target.value)} placeholder="MIDTERM25" className="!font-mono !tracking-[.08em] !uppercase" hint="Optional live check-in." />
            </div>
            <div className="grid sm:grid-cols-2 gap-4 mt-4">
              <div>
                <Input label="Scheduled Open" icon={CalendarClock} type="datetime-local" value={startAt} onChange={e => setStartAt(e.target.value)} hint={status!=='scheduled' ? 'Only when Status = Scheduled.' : ''} />
                {status==='scheduled' && startAt && <p className="text-[11px] text-info mt-1">Opens {new Date(startAt).toLocaleString()}.</p>}
              </div>
              <div>
                <Input label="Deadline" icon={CalendarClock} type="datetime-local" value={deadline} onChange={e => setDeadline(e.target.value)} />
                {deadline ? (
                  <div className="text-[11px] text-muted mt-1 flex items-center gap-2">
                    Closes {new Date(deadline).toLocaleString()}.
                    <Button size="sm" variant="ghost" onClick={() => setDeadline('')} icon={X} className="!px-1.5">Clear</Button>
                  </div>
                ) : <p className="text-[11px] text-faint mt-1">No deadline — stays open until closed.</p>}
              </div>
            </div>
          </div>

          {/* Group 3: Class & Roster */}
          <div className="bg-canvas/40 border border-border rounded-xl p-4">
            <div className="text-[11px] font-bold tracking-[.08em] uppercase text-faint mb-3 flex items-center gap-2"><GraduationCap size={12} /> Class & Roster</div>
            <Select label="Class" value={classId} onChange={e => setClassId(e.target.value)} hint="Links records & auto-marks present on submit.">
              <option value="">— No class (standalone exam) —</option>
              {classes.map(k => <option key={k.id} value={k.id}>{k.name}{k.section ? ' · ' + k.section : ''} · {k.student_count || 0} students</option>)}
            </Select>
            <div className="mt-4">
              <TextArea label="Roster" value={roster} onChange={e => setRoster(e.target.value)}
                placeholder={'One per line: Student ID, Full Name, Section\n2019-12345, Dela Cruz, Juan A., BSCS 2-A\n2019-23456, Santos, Maria B., BSCS 2-A'}
                hint={`${roster.split('\n').filter(l=>l.trim()).length} students listed · absent if never starts`}
                className="!font-mono !text-[13px]" style={{ minHeight: 110, resize: 'vertical' }} />
            </div>
          </div>

          {/* Preferences */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border border-border rounded-xl px-4 py-3 bg-navy-50/50">
            <Toggle checked={showAnswers} onChange={setShowAnswers} label="Show correct answers after submission" />
            <span className="text-[11px] text-faint">Students see score + breakdown.</span>
          </div>

          <div className="flex gap-2 flex-wrap pt-1 sticky bottom-4 bg-surface/90 backdrop-blur border border-border rounded-xl px-3 py-2.5 shadow-pop sm:static sm:bg-transparent sm:border-0 sm:p-0 sm:shadow-none">
            <Button onClick={saveExam} loading={saving} icon={Save} className="!px-6">{saving ? 'Saving...' : examId ? 'Update Exam' : 'Create Exam'}</Button>
            {examId && <Button variant="outline" icon={Copy} onClick={() => setShowTplModal(true)}>Save as Template</Button>}
            {!examId && templates.length > 0 && <Button variant="outline" icon={Copy} onClick={() => setShowUseTplModal(true)}>Use Template ({templates.length})</Button>}
            <span className="text-[11px] text-faint self-center ml-1">* Required</span>
          </div>
        </div>
      </Card>

      {/* Template modals */}
      <Modal open={showTplModal} onClose={()=>setShowTplModal(false)} title="Save as Template" icon={Library} size="sm"
        footer={<><Button variant="ghost" onClick={()=>setShowTplModal(false)}>Cancel</Button><Button icon={Save} loading={tplSaving} onClick={saveAsTemplate}>Save Template</Button></>}>
        <p className="text-[12px] text-muted mb-3">This will save the current exam’s title, description, type ({EXAM_TYPE_LABELS[examType] || examType}), {timeLimit} min, {passingScore}% passing, and {questions.length} question(s) as a reusable template (§66). You’ll find it in <strong>Templates</strong>.</p>
        <Input label="Template name" value={title} onChange={e=>setTitle(e.target.value)} placeholder={title + ' Template'} />
      </Modal>

      <Modal open={showUseTplModal} onClose={()=>setShowUseTplModal(false)} title="Create from Template" icon={Library} size="sm"
        footer={<><Button variant="ghost" onClick={()=>setShowUseTplModal(false)}>Cancel</Button><Button icon={Copy} loading={tplUsing} onClick={useTemplate}>Create Exam</Button></>}>
        <Select label="Choose template" value={selectedTpl} onChange={e=>setSelectedTpl(e.target.value)}>
          <option value="">— Select —</option>
          {templates.map(t=> <option key={t.id} value={t.id}>{t.title} — {t.question_count} Qs · {t.time_limit}m</option>)}
        </Select>
        <p className="text-[11px] text-faint mt-2">Creates a new draft exam from the template with all its questions copied.</p>
      </Modal>

      {/* Add Question — Professional grouped */}
      {examId && (
        <Card className="!mt-6 !p-0 overflow-hidden">
          <div className="px-5 sm:px-6 pt-5 pb-4 border-b border-border bg-gradient-to-r from-navy-50 to-surface">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-lg bg-navy-700 text-white flex items-center justify-center shrink-0"><HelpCircle size={16} /></span>
              <div>
                <h2 className="text-[15px] font-semibold text-navy-800 leading-tight">Add Question</h2>
                <p className="text-[12px] text-muted">{questions.length} question{questions.length !== 1 ? 's' : ''} total · grouped by part</p>
              </div>
              <Badge tone="info" className="ml-auto">{questions.length}</Badge>
            </div>
          </div>
          <div className="px-5 sm:px-6 py-5 flex flex-col gap-5">
            {/* Setup */}
            <div className="bg-canvas/40 border border-border rounded-xl p-4">
              <div className="text-[11px] font-bold tracking-[.08em] uppercase text-faint mb-3 flex items-center gap-2"><ListChecks size={12} /> Setup</div>
              <div className="grid sm:grid-cols-[110px_1fr] gap-4 items-end">
                <Input label="Part" type="number" value={qPart} onChange={e => setQPart(Number(e.target.value))} min={1} hint="Section" />
                <div>
                  <span className="label">Question Type</span>
                  <TypeToggle value={qType} onChange={setQType} />
                  <p className="text-[11px] text-faint mt-1">{qType === 'fill_blank' ? 'Free text · flexible matching.' : '4 choices · one correct.'}</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="bg-canvas/40 border border-border rounded-xl p-4">
              <div className="text-[11px] font-bold tracking-[.08em] uppercase text-faint mb-3">Question</div>
              <TextArea label="Question Text" value={qText} onChange={e => setQText(e.target.value)} placeholder="Enter the question…   Hint: use {{DATA:1,2,3}} for randomized datasets" style={{ minHeight: 80, resize: 'vertical' }} hint="Supports datasets · keep it concise for students." />
            </div>

            {/* Answer */}
            <div className="bg-canvas/40 border border-border rounded-xl p-4">
              <div className="text-[11px] font-bold tracking-[.08em] uppercase text-faint mb-3 flex items-center gap-2"><Key size={12} /> Answer</div>
              {qType === 'fill_blank' ? (
                <Input label="Correct Answer" icon={Key} value={qBlankAnswer} onChange={e => setQBlankAnswer(e.target.value)} placeholder="e.g. 42"
                  hint='Flexible: "x = 2" ≈ "2"; "1/2" ≈ "0.5"; "(x-1)(x+2)" ≈ "x² + x - 2".' />
              ) : (
                <div className="flex flex-col gap-4">
                  <ChoiceRows values={qChoices} setValue={(k, v) => setQChoices(c => ({ ...c, [k]: v }))} answer={qAnswer} setAnswer={setQAnswer} />
                  <div className="grid sm:grid-cols-2 gap-4">
                    <Select label="Correct Answer *" value={qAnswer} onChange={e => setQAnswer(e.target.value)} hint="Click a letter chip above.">
                      <option value="" disabled>— Select —</option>
                      {['A', 'B', 'C', 'D'].map(k => <option key={k} value={k}>{k}</option>)}
                    </Select>
                    <Input label="Explanation" icon={Lightbulb} value={qExplain} onChange={e => setQExplain(e.target.value)} placeholder="Shown after submission" hint="Optional." />
                  </div>
                </div>
              )}
            </div>

            {/* Metadata — collapsed by default */}
            <div className="bg-canvas/40 border border-border rounded-xl overflow-hidden">
              <button type="button" onClick={() => setShowQMeta(v => !v)} className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-navy-50/50 transition-colors">
                <span className="text-[11px] font-bold tracking-[.08em] uppercase text-faint flex items-center gap-2"><Tag size={12} /> Metadata <span className="font-normal normal-case tracking-normal text-faint">· optional · powers analytics</span></span>
                <span className={`text-[11px] font-semibold px-2 py-1 rounded-full border ${showQMeta ? 'bg-navy-700 text-white border-navy-700' : 'bg-surface text-muted border-border'}`}>{showQMeta ? 'Hide' : 'Show'}</span>
              </button>
              {showQMeta && (
                <div className="px-4 pb-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-4 border-t border-border pt-4">
                  <Select label="Difficulty" value={qDifficulty} onChange={e => setQDifficulty(e.target.value)}>
                    <option value="">— None —</option>
                    {Object.entries(DIFFICULTY_LABELS).map(([v, lbl]) => <option key={v} value={v}>{lbl}</option>)}
                  </Select>
                  <Input label="Topic" value={qTopic} onChange={e => setQTopic(e.target.value)} placeholder="Algebra" />
                  <Input label="Competency" value={qCompetency} onChange={e => setQCompetency(e.target.value)} placeholder="Solve linear equations" />
                  <Input label="Tags" icon={Tag} value={qTags} onChange={e => setQTags(e.target.value)} placeholder="algebra, equation" />
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button onClick={addQuestion} loading={adding} icon={Plus} className="!px-6">{adding ? 'Adding…' : 'Add Question'}</Button>
              <span className="text-[11px] text-faint self-center">Part {qPart} · {qType === 'fill_blank' ? 'Fill blank' : 'Multiple choice'}</span>
            </div>
          </div>
        </Card>
      )}

      {/* Import — Professional */}
      {examId && (
        <Card className="!mt-6 !p-0 overflow-hidden">
          <div className="px-5 sm:px-6 pt-5 pb-4 border-b border-border bg-gradient-to-r from-navy-50 to-surface">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-lg bg-navy-700 text-white flex items-center justify-center shrink-0"><Upload size={16} /></span>
              <div>
                <h2 className="text-[15px] font-semibold text-navy-800 leading-tight">Import Questions</h2>
                <p className="text-[12px] text-muted">Bulk JSON or pick from your Question Bank</p>
              </div>
              <Badge tone="info" className="ml-auto">Bulk · Bank</Badge>
            </div>
          </div>
          <div className="px-5 sm:px-6 py-5 flex flex-col gap-4">
            <div className="bg-canvas/40 border border-border rounded-xl p-4">
              <div className="text-[11px] font-bold tracking-[.08em] uppercase text-faint mb-3 flex items-center gap-2"><Upload size={12} /> Bulk JSON</div>
              <BulkImportSection examId={examId} onImported={() => { refreshQuestions(); toast.success('Questions imported!'); }} />
            </div>
            <div className="flex items-center gap-3 text-[11px] text-faint">
              <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
            </div>
            <div className="bg-canvas/40 border border-border rounded-xl p-4">
              <div className="text-[11px] font-bold tracking-[.08em] uppercase text-faint mb-3 flex items-center gap-2"><Library size={12} /> Question Bank</div>
              <BankImportSection examId={examId} onImported={() => { refreshQuestions(); toast.success('Questions imported from bank!'); }} />
            </div>
          </div>
        </Card>
      )}

      {/* Questions List — Professional */}
      {examId && (
        <Card className="!mt-6 !p-0 overflow-hidden">
          <div className="px-5 sm:px-6 pt-5 pb-4 border-b border-border bg-gradient-to-r from-navy-50 to-surface">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-lg bg-navy-100 text-navy-700 flex items-center justify-center shrink-0"><FileText size={16} /></span>
              <div>
                <h2 className="text-[15px] font-semibold text-navy-800 leading-tight">Questions</h2>
                <p className="text-[12px] text-muted">{questions.length} total · {[...new Set(questions.map(q=>q.part))].length} part{[...new Set(questions.map(q=>q.part))].length!==1?'s':''} · drag to reorder in future</p>
              </div>
              <Badge tone="info" className="ml-auto">{questions.length}</Badge>
            </div>
          </div>
          <div className="px-5 sm:px-6 py-5">
            {!questions.length ? (
              <EmptyState icon={Inbox} title="No questions yet" body="Add your first question above — or import from Bulk/Bank." compact />
            ) : (
              <div className="flex flex-col gap-3">
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
          </div>
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
        difficulty: q.difficulty || '', topic: q.topic || '', competency: q.competency || '',
        tags: parseTags(q.tags),
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