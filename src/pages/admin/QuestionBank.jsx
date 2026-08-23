import { useState, useEffect, useMemo } from 'react';
import { api } from '../../api';
import AdminLayout from '../../components/AdminLayout';
import { PageHeader, Card, Button, Input, Select, TextArea, Badge, EmptyState, ConfirmDialog, useToast } from '../../components/ui';
import { Plus, Search, BookOpen, Lightbulb, Pencil, Trash2, X, Tag } from 'lucide-react';
import { DIFFICULTY_LABELS, difficultyLabel, parseTags, splitTags } from '../../utils';

export default function QuestionBank() {
  return <AdminLayout title="Question Bank"><BankInner /></AdminLayout>;
}

function TypeToggle({ value, onChange, sm = false }) {
  const base = `rounded-md font-semibold cursor-pointer font-sans border-2 transition-colors ${sm ? 'px-2.5 py-1 text-[11px]' : 'px-3.5 py-1.5 text-[12px]'}`;
  const active = 'bg-navy-100 border-navy-700 text-navy-700';
  const idle = 'bg-surface border-border-strong text-muted hover:border-navy-700';
  return (
    <div className="flex gap-2">
      {['multiple_choice', 'fill_blank'].map(t => (
        <button key={t} type="button" onClick={() => onChange(t)}
          className={`${base} ${value === t ? active : idle}`}>
          {t === 'multiple_choice' ? 'Multiple Choice' : 'Fill in the Blank'}
        </button>
      ))}
    </div>
  );
}

function ChoiceRows({ choices, setChoices, ans, setAns }) {
  return (
    <div>
      <span className="label">Choices</span>
      {choices.map(({ key, text }, i) => (
        <div key={key} className="flex items-center gap-2 mb-1.5">
          <span className={`font-mono text-[13px] font-semibold min-w-[24px] ${ans === key ? 'text-success' : 'text-navy-700'}`}>{key})</span>
          <input
            value={text}
            onChange={e => setChoices(choices.map((c, j) => j === i ? { ...c, text: e.target.value } : c))}
            placeholder={`Choice ${key}`}
            className={`input flex-1 ${ans === key ? '!border-success !bg-success-bg/30' : ''}`}
          />
        </div>
      ))}
    </div>
  );
}

function BankInner() {
  const [questions, setQuestions] = useState([]);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState('');
  const [filterTopic, setFilterTopic] = useState('');
  const toast = useToast();

  const emptyChoices = () => ['A', 'B', 'C', 'D'].map(k => ({ key: k, text: '' }));
  const [showForm, setShowForm] = useState(false);
  const [part, setPart] = useState(1);
  const [qType, setQType] = useState('multiple_choice');
  const [text, setText] = useState('');
  const [choices, setChoices] = useState(emptyChoices);
  const [answer, setAnswer] = useState('');
  const [blankAnswer, setBlankAnswer] = useState('');
  const [explain, setExplain] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [topic, setTopic] = useState('');
  const [competency, setCompetency] = useState('');
  const [tags, setTags] = useState('');
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [editPart, setEditPart] = useState(1);
  const [editType, setEditType] = useState('multiple_choice');
  const [editText, setEditText] = useState('');
  const [editChoices, setEditChoices] = useState(emptyChoices);
  const [editAnswer, setEditAnswer] = useState('');
  const [editBlankAnswer, setEditBlankAnswer] = useState('');
  const [editExplain, setEditExplain] = useState('');
  const [editDifficulty, setEditDifficulty] = useState('');
  const [editTopic, setEditTopic] = useState('');
  const [editCompetency, setEditCompetency] = useState('');
  const [editTags, setEditTags] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = () => api.listBank().then(setQuestions).catch(() => {});
  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setPart(1); setQType('multiple_choice'); setText(''); setChoices(emptyChoices());
    setAnswer(''); setBlankAnswer(''); setExplain('');
    setDifficulty(''); setTopic(''); setCompetency(''); setTags('');
    setShowForm(false);
  };

  const addQuestion = async () => {
    setSaving(true);
    try {
      const meta = { difficulty, topic: topic.trim(), competency: competency.trim(), tags: splitTags(tags) };
      if (qType === 'fill_blank') {
        if (!text.trim() || !blankAnswer.trim()) { toast.error('Fill in question text and the correct answer'); return; }
        await api.addBank({ type: 'fill_blank', part, text: text.trim(), choices: [], answer: blankAnswer.trim(), explain: explain.trim(), ...meta });
      } else {
        const ch = choices.filter(c => c.text.trim());
        if (!text.trim() || ch.length < 2 || !answer) { toast.error('Fill in question, at least 2 choices, and answer'); return; }
        await api.addBank({ type: 'multiple_choice', part, text: text.trim(), choices: ch.map(c => ({ key: c.key, text: c.text.trim() })), answer, explain: explain.trim(), ...meta });
      }
      toast.success('Question added to bank');
      resetForm();
      load();
    } catch (e) { toast.error(e.message); }
    setSaving(false);
  };

  const startEdit = (q) => {
    const t = q.type || 'multiple_choice';
    setEditPart(q.part); setEditType(t); setEditText(q.text);
    if (t === 'fill_blank') {
      setEditBlankAnswer(q.answer || '');
    } else {
      const ch = typeof q.choices === 'string' ? JSON.parse(q.choices) : q.choices;
      const filled = emptyChoices().map(c => {
        const match = (ch || []).find(x => x.key === c.key);
        return { key: c.key, text: match ? match.text : '' };
      });
      setEditChoices(filled);
      setEditAnswer(q.answer);
    }
    setEditExplain(q.explain || '');
    setEditDifficulty(q.difficulty || '');
    setEditTopic(q.topic || '');
    setEditCompetency(q.competency || '');
    setEditTags(parseTags(q.tags).join(', '));
    setEditingId(q.id);
  };
  const cancelEdit = () => setEditingId(null);

  const saveEdit = async () => {
    try {
      const meta = { difficulty: editDifficulty, topic: editTopic.trim(), competency: editCompetency.trim(), tags: splitTags(editTags) };
      if (editType === 'fill_blank') {
        if (!editText.trim() || !editBlankAnswer.trim()) { toast.error('Fill in question text and the correct answer'); return; }
        await api.updateBank(editingId, { type: 'fill_blank', part: editPart, text: editText.trim(), choices: [], answer: editBlankAnswer.trim(), explain: editExplain.trim(), ...meta });
      } else {
        const ch = editChoices.filter(c => c.text.trim());
        if (!editText.trim() || ch.length < 2 || !editAnswer) { toast.error('Fill in all fields'); return; }
        await api.updateBank(editingId, { type: 'multiple_choice', part: editPart, text: editText.trim(), choices: ch.map(c => ({ key: c.key, text: c.text.trim() })), answer: editAnswer, explain: editExplain.trim(), ...meta });
      }
      toast.success('Question updated');
      cancelEdit();
      load();
    } catch (e) { toast.error(e.message); }
  };

  const deleteQ = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try { await api.deleteBank(deleteTarget); toast.success('Question deleted'); setDeleteTarget(null); load(); }
    catch (e) { toast.error(e.message); }
    setDeleting(false);
  };

  const filtered = questions.filter(q => {
    const s = search.toLowerCase();
    const textMatch = !s || q.text.toLowerCase().includes(s);
    const typeMatch = !filterType || (q.type || 'multiple_choice') === filterType;
    const diffMatch = !filterDifficulty || (q.difficulty || '') === filterDifficulty;
    const topicMatch = !filterTopic || (q.topic || '').toLowerCase().includes(filterTopic.toLowerCase());
    return textMatch && typeMatch && diffMatch && topicMatch;
  });

  // Distinct topics present in the bank, for the filter dropdown.
  const topics = useMemo(() => {
    const set = new Set(questions.map(q => (q.topic || '').trim()).filter(Boolean));
    return [...set].sort();
  }, [questions]);

  const renderView = (q) => {
    const choices = typeof q.choices === 'string' ? JSON.parse(q.choices) : q.choices;
    const isFill = (q.type || 'multiple_choice') === 'fill_blank';
    const diff = q.difficulty || '';
    const tags = parseTags(q.tags);
    return (
      <>
        <div className="text-[14px] leading-relaxed mb-2.5">{q.text}</div>
        <div className="flex flex-wrap items-center gap-1.5 mb-2">
          {isFill && <Badge tone="neutral">Fill Blank</Badge>}
          {diff && <Badge tone={diff === 'hard' ? 'danger' : diff === 'easy' ? 'success' : 'warning'}>{difficultyLabel(diff)}</Badge>}
          {q.topic && <Badge tone="info">{q.topic}</Badge>}
          {q.competency && <Badge tone="purple">{q.competency}</Badge>}
          {tags.map(t => <span key={t} className="inline-flex items-center gap-1 text-[11px] text-navy-700 bg-navy-50 border border-border rounded-full px-2 py-0.5"><Tag size={10} /> {t}</span>)}
        </div>
        {isFill ? (
          <div className="text-[12px] text-navy-700 mb-2">Answer: <strong>{q.answer}</strong></div>
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
    );
  };

  return (
    <main className="max-w-[860px] mx-auto px-4 py-6">
      <PageHeader
        eyebrow="Exams"
        title="Question Bank"
        subtitle={`${questions.length} reusable question${questions.length !== 1 ? 's' : ''}`}
        icon={BookOpen}
        actions={
          <>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search questions..."
                className="input !pl-9 !py-2 !text-[13px] min-w-[180px]" />
            </div>
            <Select value={filterType} onChange={e => setFilterType(e.target.value)} className="!w-[140px]">
              <option value="">All types</option>
              <option value="multiple_choice">Multiple Choice</option>
              <option value="fill_blank">Fill Blank</option>
            </Select>
            <Select value={filterDifficulty} onChange={e => setFilterDifficulty(e.target.value)} className="!w-[130px]">
              <option value="">All difficulty</option>
              {Object.entries(DIFFICULTY_LABELS).map(([v, lbl]) => <option key={v} value={v}>{lbl}</option>)}
            </Select>
            {topics.length > 0 && (
              <Select value={filterTopic} onChange={e => setFilterTopic(e.target.value)} className="!w-[140px]">
                <option value="">All topics</option>
                {topics.map(t => <option key={t} value={t}>{t}</option>)}
              </Select>
            )}
            <Button onClick={() => setShowForm(!showForm)} icon={showForm ? X : Plus} variant={showForm ? 'outline' : 'primary'}>
              {showForm ? 'Cancel' : 'Add Question'}
            </Button>
          </>
        }
      />

      {showForm && (
        <Card title="New Bank Question" icon={Plus} className="!border-navy-700 mb-6">
          <div className="flex flex-col gap-3.5">
            <div className="grid sm:grid-cols-2 gap-3">
              <Input label="Part" type="number" value={part} onChange={e => setPart(Number(e.target.value))} min={1} />
              <div>
                <span className="label">Question Type</span>
                <TypeToggle value={qType} onChange={setQType} />
              </div>
            </div>
            <TextArea label="Question Text" value={text} onChange={e => setText(e.target.value)} style={{ minHeight: 60, resize: 'vertical' }} />
            {qType === 'fill_blank' ? (
              <Input label="Correct Answer" value={blankAnswer} onChange={e => setBlankAnswer(e.target.value)} placeholder="e.g. 42" hint="Matching is case-insensitive." />
            ) : (
              <>
                <ChoiceRows choices={choices} setChoices={setChoices} ans={answer} setAns={setAnswer} />
                <div className="grid sm:grid-cols-2 gap-3">
                  <Select label="Correct Answer" value={answer} onChange={e => setAnswer(e.target.value)}>
                    <option value="">— Select —</option>
                    {['A', 'B', 'C', 'D'].map(k => <option key={k} value={k}>{k}</option>)}
                  </Select>
                  <Input label="Explanation (optional)" value={explain} onChange={e => setExplain(e.target.value)} placeholder="Shown after submission" />
                </div>
              </>
            )}
            <div className="grid sm:grid-cols-2 gap-3">
              <Select label="Difficulty" value={difficulty} onChange={e => setDifficulty(e.target.value)}>
                <option value="">— None —</option>
                {Object.entries(DIFFICULTY_LABELS).map(([v, lbl]) => <option key={v} value={v}>{lbl}</option>)}
              </Select>
              <Input label="Topic" value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g. Algebra" />
              <Input label="Competency" value={competency} onChange={e => setCompetency(e.target.value)} placeholder="e.g. Solve linear equations" />
              <Input label="Tags (comma-separated)" icon={Tag} value={tags} onChange={e => setTags(e.target.value)} placeholder="e.g. algebra, equation" />
            </div>
            <div>
              <Button onClick={addQuestion} loading={saving} icon={Plus}>{saving ? 'Saving...' : 'Add to Bank'}</Button>
            </div>
          </div>
        </Card>
      )}

      {!filtered.length ? (
        <EmptyState icon={BookOpen} title={search ? 'No matches' : 'Bank is empty'} body={search ? 'Try a different search.' : 'Add reusable questions here.'} />
      ) : (
        <div className="flex flex-col gap-2.5">
          {filtered.map(q => {
            const isEditing = editingId === q.id;
            const isFill = (q.type || 'multiple_choice') === 'fill_blank';
            return (
              <Card key={q.id} className={`!p-4 ${isEditing ? '!border-navy-700 shadow-card' : ''}`}>
                <div className="flex justify-between items-start mb-2 gap-2">
                  <div className="flex items-center gap-2">
                    <Badge tone="info">Part {q.part}</Badge>
                    {isFill && <Badge tone="neutral">Fill Blank</Badge>}
                  </div>
                  <div className="flex gap-1.5">
                    {isEditing ? (
                      <>
                        <Button size="sm" onClick={saveEdit} icon={Pencil}>Save</Button>
                        <Button size="sm" variant="outline" onClick={cancelEdit} icon={X}>Cancel</Button>
                      </>
                    ) : (
                      <>
                        <Button size="sm" variant="outline" onClick={() => startEdit(q)} icon={Pencil}>Edit</Button>
                        <Button size="sm" variant="danger" onClick={() => setDeleteTarget(q.id)} icon={Trash2}>Delete</Button>
                      </>
                    )}
                  </div>
                </div>

                {isEditing ? (
                  <div className="flex flex-col gap-2.5">
                    <div className="grid sm:grid-cols-[90px_1fr] gap-2.5">
                      <Input type="number" value={editPart} onChange={e => setEditPart(Number(e.target.value))} min={1} />
                      <TypeToggle value={editType} onChange={setEditType} sm />
                    </div>
                    <TextArea value={editText} onChange={e => setEditText(e.target.value)} style={{ minHeight: 60, resize: 'vertical' }} />
                    {editType === 'fill_blank' ? (
                      <Input value={editBlankAnswer} onChange={e => setEditBlankAnswer(e.target.value)} placeholder="Correct answer" />
                    ) : (
                      <>
                        <ChoiceRows choices={editChoices} setChoices={setEditChoices} ans={editAnswer} setAns={setEditAnswer} />
                        <div className="grid sm:grid-cols-2 gap-3">
                          <Select value={editAnswer} onChange={e => setEditAnswer(e.target.value)}>
                            <option value="">—</option>
                            {['A', 'B', 'C', 'D'].map(k => <option key={k} value={k}>{k}</option>)}
                          </Select>
                          <Input value={editExplain} onChange={e => setEditExplain(e.target.value)} placeholder="Explanation" />
                        </div>
                      </>
                    )}
                    <div className="grid sm:grid-cols-2 gap-2.5">
                      <Select value={editDifficulty} onChange={e => setEditDifficulty(e.target.value)}>
                        <option value="">Difficulty —</option>
                        {Object.entries(DIFFICULTY_LABELS).map(([v, lbl]) => <option key={v} value={v}>{lbl}</option>)}
                      </Select>
                      <Input value={editTopic} onChange={e => setEditTopic(e.target.value)} placeholder="Topic" />
                      <Input value={editCompetency} onChange={e => setEditCompetency(e.target.value)} placeholder="Competency" />
                      <Input icon={Tag} value={editTags} onChange={e => setEditTags(e.target.value)} placeholder="Tags (comma-separated)" />
                    </div>
                  </div>
                ) : (
                  renderView(q)
                )}
              </Card>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Question?"
        body="This bank question will be permanently removed."
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={deleteQ}
      />
    </main>
  );
}