import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../../api';
import AdminLayout from '../../components/AdminLayout';
import '../../styles.css';
import { FileText, HelpCircle, Plus, Inbox, Lightbulb, X, ChevronDown } from 'lucide-react';

export default function CreateExam() {
  return <AdminLayout title={useSearchParams()[0].get('id') ? 'Edit Exam' : 'Create Exam'}><CreateExamInner /></AdminLayout>;
}

const inputStyle = {
  width: '100%', border: '1.5px solid #c8d8f0', borderRadius: 8,
  padding: '10px 14px', fontSize: 14, fontFamily: 'inherit', outline: 'none',
  transition: 'border-color .2s',
};

const labelStyle = {
  display: 'block', fontSize: 12, fontWeight: 600, color: '#0f2044', marginBottom: 4,
};

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

function CreateExamInner() {
  const [params] = useSearchParams();
  const examId = params.get('id');

  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [timeLimit, setTimeLimit] = useState(60);
  const [showAnswers, setShowAnswers] = useState(true);
  const [deadline, setDeadline] = useState('');
  const [questions, setQuestions] = useState([]);

  const [qPart, setQPart] = useState(1);
  const [qType, setQType] = useState('multiple_choice');
  const [qText, setQText] = useState('');
  const [qChoiceA, setQChoiceA] = useState('');
  const [qChoiceB, setQChoiceB] = useState('');
  const [qChoiceC, setQChoiceC] = useState('');
  const [qChoiceD, setQChoiceD] = useState('');
  const [qAnswer, setQAnswer] = useState('');
  const [qBlankAnswer, setQBlankAnswer] = useState('');
  const [qExplain, setQExplain] = useState('');
  const [toast, setToast] = useState('');
  const [saving, setSaving] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Inline edit state
  const [editPart, setEditPart] = useState(1);
  const [editType, setEditType] = useState('multiple_choice');
  const [editText, setEditText] = useState('');
  const [editChoiceA, setEditChoiceA] = useState('');
  const [editChoiceB, setEditChoiceB] = useState('');
  const [editChoiceC, setEditChoiceC] = useState('');
  const [editChoiceD, setEditChoiceD] = useState('');
  const [editAnswer, setEditAnswer] = useState('');
  const [editBlankAnswer, setEditBlankAnswer] = useState('');
  const [editExplain, setEditExplain] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  useEffect(() => {
    if (!examId) return;
    api.getExam(examId).then(data => {
      setTitle(data.title);
      setDesc(data.description || '');
      setTimeLimit(data.time_limit);
      setShowAnswers(data.show_answers !== 0);
      setDeadline(data.deadline ? toLocalInput(data.deadline) : '');
      setQuestions(data.questions || []);
    });
  }, [examId]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  const saveExam = async () => {
    if (!title.trim()) return showToast('Title is required');
    setSaving(true);
    const body = { title: title.trim(), description: desc.trim(), time_limit: timeLimit, show_answers: showAnswers, deadline: toIso(deadline) };
    try {
      if (examId) {
        await api.updateExam(examId, body);
        showToast('Exam updated');
      } else {
        const data = await api.createExam(body);
        window.location.search = '?id=' + data.id;
      }
    } catch (e) { showToast(e.message); }
    setSaving(false);
  };

  const addQuestion = async () => {
    if (!examId) return showToast('Save the exam first');
    setAdding(true);
    try {
      if (qType === 'fill_blank') {
        if (!qText.trim() || !qBlankAnswer.trim())
          return showToast('Fill in question text and the correct answer');
        await api.addQuestion(examId, {
          type: 'fill_blank', part: qPart, text: qText.trim(),
          choices: [], answer: qBlankAnswer.trim(),
          explain: qExplain.trim(), sort_order: questions.length,
        });
        setQText(''); setQBlankAnswer(''); setQExplain('');
      } else {
        const choices = [
          { key: 'A', text: qChoiceA.trim() },
          { key: 'B', text: qChoiceB.trim() },
          { key: 'C', text: qChoiceC.trim() },
          { key: 'D', text: qChoiceD.trim() },
        ].filter(c => c.text);
        if (!qText.trim() || choices.length < 2 || !qAnswer.trim())
          return showToast('Fill in question text, at least 2 choices, and select the correct answer');
        if (!choices.find(c => c.key === qAnswer.trim().toUpperCase()))
          return showToast('Answer key not found in choices');
        await api.addQuestion(examId, {
          type: 'multiple_choice', part: qPart, text: qText.trim(),
          choices, answer: qAnswer.trim().toUpperCase(),
          explain: qExplain.trim(), sort_order: questions.length,
        });
        setQText(''); setQChoiceA(''); setQChoiceB(''); setQChoiceC(''); setQChoiceD(''); setQAnswer(''); setQExplain('');
      }
      showToast('Question added');
      const data = await api.getExam(examId);
      setQuestions(data.questions || []);
    } catch (e) { showToast(e.message); }
    setAdding(false);
  };

  const startEdit = (q) => {
    const qType = q.type || 'multiple_choice';
    setEditPart(q.part);
    setEditType(qType);
    setEditText(q.text);
    if (qType === 'fill_blank') {
      setEditBlankAnswer(q.answer || '');
    } else {
      const choices = typeof q.choices === 'string' ? JSON.parse(q.choices) : q.choices;
      const m = {};
      choices.forEach(c => { m[c.key] = c.text; });
      setEditChoiceA(m['A'] || '');
      setEditChoiceB(m['B'] || '');
      setEditChoiceC(m['C'] || '');
      setEditChoiceD(m['D'] || '');
      setEditAnswer(q.answer);
    }
    setEditExplain(q.explain || '');
    setEditingId(q.id);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText('');
  };

  const saveEdit = async (q) => {
    setEditSaving(true);
    try {
      if (editType === 'fill_blank') {
        if (!editText.trim() || !editBlankAnswer.trim())
          return showToast('Fill in question text and the correct answer');
        await api.updateQuestion(editingId, {
          type: 'fill_blank', part: editPart, text: editText.trim(),
          choices: [], answer: editBlankAnswer.trim(),
          explain: editExplain.trim(), sort_order: q.sort_order || 0,
        });
      } else {
        const choices = [
          { key: 'A', text: editChoiceA.trim() },
          { key: 'B', text: editChoiceB.trim() },
          { key: 'C', text: editChoiceC.trim() },
          { key: 'D', text: editChoiceD.trim() },
        ].filter(c => c.text);
        if (!editText.trim() || choices.length < 2 || !editAnswer.trim())
          return showToast('Fill in question text, at least 2 choices, and select the correct answer');
        if (!choices.find(c => c.key === editAnswer.trim().toUpperCase()))
          return showToast('Answer key not found in choices');
        await api.updateQuestion(editingId, {
          type: 'multiple_choice', part: editPart, text: editText.trim(),
          choices, answer: editAnswer.trim().toUpperCase(),
          explain: editExplain.trim(), sort_order: q.sort_order || 0,
        });
      }
      showToast('Question updated');
      const data = await api.getExam(examId);
      setQuestions(data.questions || []);
      cancelEdit();
    } catch (e) { showToast(e.message); }
    setEditSaving(false);
  };

  const deleteQuestion = async (id) => {
    if (!window.confirm('Delete this question?')) return;
    try {
      await api.deleteQuestion(id);
      setQuestions(prev => prev.filter(q => q.id !== id));
      showToast('Question deleted');
    } catch (e) { showToast(e.message); }
  };

  return (
    <div>
      {toast && (
        <div style={{
          position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
          background: '#1a7a4a', color: '#fff', padding: '12px 28px', borderRadius: 8,
          fontSize: 14, fontWeight: 600, zIndex: 300, animation: 'fadeIn .3s',
          boxShadow: '0 8px 24px rgba(0,0,0,.2)',
        }}>
          {toast}
          <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } }`}</style>
        </div>
      )}

      <main style={{ maxWidth: 860, margin: '0 auto', padding: '24px 16px' }}>
        {/* Exam Details */}
        <div className="card">
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20,
            paddingBottom: 16, borderBottom: '1px solid #c8d8f0',
          }}>
            <span style={{ fontSize: 20 }}><FileText size={20} /></span>
            <h2 style={{ fontSize: 16, color: '#0f2044' }}>Exam Details</h2>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Exam Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              placeholder="e.g. STAT 120 Midterm" style={inputStyle} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Description <span style={{ fontWeight: 400, color: '#5a7090' }}>(optional)</span></label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Brief description of the exam"
              style={{ ...inputStyle, resize: 'vertical', minHeight: 60 }} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Time Limit (minutes)</label>
            <input type="number" value={timeLimit} onChange={e => setTimeLimit(Number(e.target.value))}
              style={{ ...inputStyle, width: 200 }} min={1} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Deadline <span style={{ fontWeight: 400, color: '#5a7090' }}>(optional)</span></label>
            <input type="datetime-local" value={deadline} onChange={e => setDeadline(e.target.value)}
              style={{ ...inputStyle, maxWidth: 280 }} />
            {deadline && (
              <div style={{ fontSize: 11, color: '#5a7090', marginTop: 4 }}>
                Students will no longer be able to access or submit this exam after this time.
                <button onClick={() => setDeadline('')} className="btn btn-sm btn-outline" style={{ marginLeft: 8, padding: '2px 10px', fontSize: 11 }}>Remove</button>
              </div>
            )}
          </div>
          <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
            <label style={{ ...labelStyle, marginBottom: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
              <div onClick={() => setShowAnswers(!showAnswers)} style={{
                width: 44, height: 24, borderRadius: 12, position: 'relative', cursor: 'pointer', flexShrink: 0,
                background: showAnswers ? '#1a7a4a' : '#c8d8f0', transition: 'background .2s',
              }}>
                <div style={{
                  width: 20, height: 20, borderRadius: '50%', background: '#fff', position: 'absolute', top: 2,
                  left: showAnswers ? 22 : 2, transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,.2)',
                }} />
              </div>
              Show correct answers to students after submission
            </label>
          </div>
          <button onClick={saveExam} className="btn" disabled={saving}
            style={{ opacity: saving ? .7 : 1 }}>
            {saving ? 'Saving...' : examId ? 'Update Exam' : 'Save Exam'}
          </button>
        </div>

        {/* Add Question */}
        {examId && (
          <div className="card" style={{ marginTop: 24 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20,
              paddingBottom: 16, borderBottom: '1px solid #c8d8f0',
            }}>
              <span style={{ fontSize: 20 }}><HelpCircle size={20} /></span>
              <h2 style={{ fontSize: 16, color: '#0f2044' }}>Add Question</h2>
              <span style={{ fontSize: 12, color: '#5a7090', marginLeft: 'auto' }}>
                {questions.length} question{questions.length !== 1 ? 's' : ''} total
              </span>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Part</label>
              <input type="number" value={qPart} onChange={e => setQPart(Number(e.target.value))}
                min={1} style={{ ...inputStyle, width: 80 }} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Question Type</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setQType('multiple_choice')}
                  style={{
                    padding: '8px 16px', borderRadius: 6, fontSize: 13, fontWeight: 600,
                    border: `2px solid ${qType === 'multiple_choice' ? '#1a4fad' : '#c8d8f0'}`,
                    background: qType === 'multiple_choice' ? '#ddeeff' : '#fff',
                    color: qType === 'multiple_choice' ? '#1a4fad' : '#5a7090',
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}>Multiple Choice</button>
                <button onClick={() => setQType('fill_blank')}
                  style={{
                    padding: '8px 16px', borderRadius: 6, fontSize: 13, fontWeight: 600,
                    border: `2px solid ${qType === 'fill_blank' ? '#1a4fad' : '#c8d8f0'}`,
                    background: qType === 'fill_blank' ? '#ddeeff' : '#fff',
                    color: qType === 'fill_blank' ? '#1a4fad' : '#5a7090',
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}>Fill in the Blank</button>
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>
                Question Text{' '}
                <span style={{ fontWeight: 400, color: '#5a7090' }}>(use {'{{DATA:1,2,3}}'} for datasets)</span>
              </label>
              <textarea value={qText} onChange={e => setQText(e.target.value)}
                style={{ ...inputStyle, resize: 'vertical', minHeight: 70 }} />
            </div>
            {qType === 'fill_blank' ? (
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Correct Answer</label>
                <input value={qBlankAnswer} onChange={e => setQBlankAnswer(e.target.value)}
                  placeholder="e.g. 42" style={inputStyle} />
                <div style={{ fontSize: 11, color: '#5a7090', marginTop: 4 }}>
                  Matching is flexible: case-insensitive, ignores all spacing, and accepts equivalent math. Examples: "x = 2" ≈ "2"; "1/2" ≈ "0.5" ≈ "50%"; "(x-1)(x+2)" ≈ "(x+2)(x-1)" ≈ "x² + x - 2".
                </div>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>Choices</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {['A', 'B', 'C', 'D'].map(letter => {
                      const val = [qChoiceA, qChoiceB, qChoiceC, qChoiceD][letter.charCodeAt(0) - 65];
                      const set = [setQChoiceA, setQChoiceB, setQChoiceC, setQChoiceD][letter.charCodeAt(0) - 65];
                      return (
                        <div key={letter} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{
                            fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, fontWeight: 600,
                            color: qAnswer === letter ? '#1a7a4a' : '#1a4fad', minWidth: 24,
                          }}>
                            {letter})
                          </span>
                          <input value={val} onChange={e => set(e.target.value)}
                            placeholder={`Choice ${letter}`}
                            style={{
                              ...inputStyle, flex: 1,
                              borderColor: qAnswer === letter ? '#1a7a4a' : '#c8d8f0',
                              background: qAnswer === letter ? '#f0faf4' : '#fff',
                            }} />
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 14, marginBottom: 16, flexWrap: 'wrap' }}>
                  <div style={{ flex: '1 1 180px' }}>
                    <label style={labelStyle}>Correct Answer</label>
                    <div style={{ position: 'relative' }}>
                      <select value={qAnswer} onChange={e => setQAnswer(e.target.value)}
                        style={{
                          width: '100%', padding: '11px 40px 11px 14px', borderRadius: 10, fontSize: 14,
                          fontFamily: 'inherit', border: '2px solid #d0ddf0', background: '#f5f8ff',
                          outline: 'none', appearance: 'none', cursor: 'pointer',
                          color: qAnswer ? '#1a2a3a' : '#9ab', fontWeight: qAnswer ? 500 : 400,
                          transition: 'border-color .2s, box-shadow .2s',
                          boxShadow: '0 1px 4px rgba(15,32,68,.06)',
                        }}
                        onFocus={e => { e.target.style.borderColor = '#1a4fad'; e.target.style.boxShadow = '0 0 0 3px rgba(26,79,173,.12)'; }}
                        onBlur={e => { e.target.style.borderColor = '#d0ddf0'; e.target.style.boxShadow = '0 1px 4px rgba(15,32,68,.06)'; }}>
                        <option value="" disabled>— Select —</option>
                        <option value="A">A</option>
                        <option value="B">B</option>
                        <option value="C">C</option>
                        <option value="D">D</option>
                      </select>
                      <div style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#5a7090' }}>
                        <ChevronDown size={18} />
                      </div>
                    </div>
                  </div>
                  <div style={{ flex: '1 1 180px' }}>
                    <label style={labelStyle}>Explanation <span style={{ fontWeight: 400, color: '#5a7090' }}>(optional)</span></label>
                    <input value={qExplain} onChange={e => setQExplain(e.target.value)}
                      placeholder="Shown after submission" style={inputStyle} />
                  </div>
                </div>
              </>
            )}
            <button onClick={addQuestion} className="btn" disabled={adding}
              style={{ opacity: adding ? .7 : 1 }}>
              {adding ? 'Adding...' : <><Plus size={16} /> Add Question</>}
            </button>
          </div>
        )}

        {/* Bulk Import & Bank Import */}
        {examId && (
          <div className="card" style={{ marginTop: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid #c8d8f0' }}>
              <HelpCircle size={20} />
              <h2 style={{ fontSize: 16, color: '#0f2044' }}>Import Questions</h2>
            </div>

            {/* Bulk Import */}
            <BulkImportSection examId={examId} onImported={() => { api.getExam(examId).then(d => setQuestions(d.questions || [])); showToast('Questions imported!'); }} showToast={showToast} />

            {/* From Bank */}
            <BankImportSection examId={examId} onImported={() => { api.getExam(examId).then(d => setQuestions(d.questions || [])); showToast('Questions imported from bank!'); }} showToast={showToast} />
          </div>
        )}

        {/* Questions List */}
        {examId && (
          <div className="card" style={{ marginTop: 24 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20,
              paddingBottom: 16, borderBottom: '1px solid #c8d8f0',
            }}>
              <span style={{ fontSize: 20 }}><FileText size={20} /></span>
              <h2 style={{ fontSize: 16, color: '#0f2044' }}>Questions</h2>
              <span style={{ fontSize: 12, color: '#5a7090', marginLeft: 'auto' }}>
                {questions.length} question{questions.length !== 1 ? 's' : ''}
              </span>
            </div>

            {!questions.length ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#5a7090' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}><Inbox size={32} /></div>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#0f2044' }}>No questions yet</p>
                <p style={{ fontSize: 13, marginTop: 4 }}>Add your first question above.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {questions.map((q, i) => {
                  const choices = typeof q.choices === 'string' ? JSON.parse(q.choices) : q.choices;
                  const isEditing = editingId === q.id;
                  return (
                    <div key={q.id} style={{
                      background: isEditing ? '#fff' : '#f5f8ff',
                      border: `1px solid ${isEditing ? '#1a4fad' : '#c8d8f0'}`,
                      borderRadius: 10, padding: '16px 18px',
                      boxShadow: isEditing ? '0 2px 16px rgba(26,79,173,.15)' : 'none',
                      transition: 'box-shadow .15s',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{
                            fontSize: 10, background: '#0f2044', color: '#fff', padding: '2px 8px',
                            borderRadius: 4, fontWeight: 600, letterSpacing: '.03em',
                          }}>
                            Q{i + 1}
                          </span>
                          {isEditing ? (
                            <input type="number" value={editPart} onChange={e => setEditPart(Number(e.target.value))}
                              min={1} style={{ width: 50, ...inputStyle }} />
                          ) : (
                            <span style={{ fontSize: 11, color: '#5a7090' }}>Part {q.part}{q.type === 'fill_blank' ? ' · Fill-in-the-blank' : ''}</span>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {isEditing ? (
                            <>
                              <button onClick={() => saveEdit(q)} disabled={editSaving}
                                style={{
                                  background: '#1a4fad', color: '#fff', border: 'none', borderRadius: 6,
                                  padding: '5px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                                }}>{editSaving ? 'Saving...' : 'Save'}</button>
                              <button onClick={cancelEdit}
                                style={{
                                  background: 'none', border: '1px solid #c8d8f0', borderRadius: 6,
                                  padding: '5px 14px', fontSize: 12, cursor: 'pointer', color: '#5a7090',
                                }}>Cancel</button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => startEdit(q)}
                                style={{
                                  background: 'none', border: 'none', color: '#1a4fad', cursor: 'pointer',
                                  fontSize: 12, padding: '2px 6px', borderRadius: 4,
                                }}>Edit</button>
                              <button onClick={() => deleteQuestion(q.id)}
                                style={{
                                  background: 'none', border: 'none', color: '#9ab', cursor: 'pointer',
                                  fontSize: 16, padding: '2px 6px', borderRadius: 4, lineHeight: 1,
                                }}
                                onMouseEnter={e => { e.target.style.background = '#ffe0e0'; e.target.style.color = '#c0392b'; }}
                                onMouseLeave={e => { e.target.style.background = 'none'; e.target.style.color = '#9ab'; }}>
                                <X size={14} />
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {isEditing ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          <textarea value={editText} onChange={e => setEditText(e.target.value)}
                            style={{ ...inputStyle, resize: 'vertical', minHeight: 60 }} />
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button onClick={() => setEditType('multiple_choice')}
                              style={{
                                padding: '5px 12px', borderRadius: 5, fontSize: 11, fontWeight: 600,
                                border: `2px solid ${editType === 'multiple_choice' ? '#1a4fad' : '#c8d8f0'}`,
                                background: editType === 'multiple_choice' ? '#ddeeff' : '#fff',
                                color: editType === 'multiple_choice' ? '#1a4fad' : '#5a7090',
                                cursor: 'pointer', fontFamily: 'inherit',
                              }}>MC</button>
                            <button onClick={() => setEditType('fill_blank')}
                              style={{
                                padding: '5px 12px', borderRadius: 5, fontSize: 11, fontWeight: 600,
                                border: `2px solid ${editType === 'fill_blank' ? '#1a4fad' : '#c8d8f0'}`,
                                background: editType === 'fill_blank' ? '#ddeeff' : '#fff',
                                color: editType === 'fill_blank' ? '#1a4fad' : '#5a7090',
                                cursor: 'pointer', fontFamily: 'inherit',
                              }}>Fill Blank</button>
                          </div>
                          {editType === 'fill_blank' ? (
                            <div>
                              <label style={{ ...labelStyle, fontSize: 11 }}>Correct Answer</label>
                              <input value={editBlankAnswer} onChange={e => setEditBlankAnswer(e.target.value)}
                                placeholder="e.g. 42" style={{ ...inputStyle, fontSize: 13 }} />
                            </div>
                          ) : (
                            <>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {['A', 'B', 'C', 'D'].map(letter => {
                                  const val = [editChoiceA, editChoiceB, editChoiceC, editChoiceD][letter.charCodeAt(0) - 65];
                                  const set = [setEditChoiceA, setEditChoiceB, setEditChoiceC, setEditChoiceD][letter.charCodeAt(0) - 65];
                                  return (
                                    <div key={letter} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                      <span style={{
                                        fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, fontWeight: 600,
                                        color: editAnswer === letter ? '#1a7a4a' : '#1a4fad', minWidth: 20,
                                      }}>{letter})</span>
                                      <input value={val} onChange={e => set(e.target.value)}
                                        placeholder={`Choice ${letter}`}
                                        style={{ flex: 1, ...inputStyle, borderColor: editAnswer === letter ? '#1a7a4a' : '#c8d8f0' }} />
                                    </div>
                                  );
                                })}
                              </div>
                              <div style={{ display: 'flex', gap: 10 }}>
                                <div>
                                  <label style={{ ...labelStyle, fontSize: 11 }}>Correct Answer</label>
                                  <select value={editAnswer} onChange={e => setEditAnswer(e.target.value)}
                                    style={{
                                      padding: '8px 32px 8px 12px', borderRadius: 6, fontSize: 13,
                                      fontFamily: 'inherit', border: '1.5px solid #c8d8f0', outline: 'none',
                                      appearance: 'none', cursor: 'pointer', background: '#fff',
                                    }}>
                                    <option value="" disabled>—</option>
                                    <option value="A">A</option>
                                    <option value="B">B</option>
                                    <option value="C">C</option>
                                    <option value="D">D</option>
                                  </select>
                                </div>
                                <div style={{ flex: 1 }}>
                                  <label style={{ ...labelStyle, fontSize: 11 }}>Explanation</label>
                                  <input value={editExplain} onChange={e => setEditExplain(e.target.value)}
                                    placeholder="Shown after submission" style={{ ...inputStyle, fontSize: 13 }} />
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      ) : (
                        <>
                          <div style={{ fontSize: 14, marginBottom: 10, lineHeight: 1.5 }}>{q.text}</div>
                          {(q.type || 'multiple_choice') === 'fill_blank' ? (
                            <div style={{ fontSize: 12, color: '#1a4fad', marginBottom: 8 }}>
                              Answer: <strong>{q.answer}</strong>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                              {choices.map(c => (
                                <span key={c.key} style={{
                                  fontSize: 12, padding: '3px 10px', borderRadius: 5,
                                  background: c.key === q.answer ? '#d4f5e2' : '#fff',
                                  border: `1px solid ${c.key === q.answer ? '#1a7a4a' : '#c8d8f0'}`,
                                  color: c.key === q.answer ? '#1a7a4a' : '#5a7090',
                                  fontWeight: c.key === q.answer ? 600 : 400,
                                }}>
                                  {c.key}. {c.text}
                                </span>
                              ))}
                            </div>
                          )}
                          {q.explain && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#1a4fad', fontStyle: 'italic' }}>
                              <Lightbulb size={12} /> {q.explain}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>
      </div>
  );
}

function BulkImportSection({ examId, onImported, showToast }) {
  const [open, setOpen] = useState(false);
  const [json, setJson] = useState('');
  const [importing, setImporting] = useState(false);

  const doImport = async () => {
    let questions;
    try { questions = JSON.parse(json); } catch { return showToast('Invalid JSON'); }
    if (!Array.isArray(questions) || !questions.length) return showToast('Provide an array of questions');
    setImporting(true);
    try {
      await api.bulkImportQuestions(examId, questions, 0);
      setJson(''); setOpen(false);
      onImported();
    } catch (e) { showToast(e.message); }
    setImporting(false);
  };

  return (
    <div style={{ marginBottom: 16 }}>
      <button onClick={() => setOpen(!open)} className="btn btn-outline btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <Plus size={14} /> {open ? 'Close Bulk Import' : 'Bulk Import JSON'}
      </button>
      {open && (
        <div style={{ marginTop: 12 }}>
          <p style={{ fontSize: 12, color: '#5a7090', marginBottom: 8 }}>
            Paste a JSON array of questions. Each object: {`{ "text": "...", "choices": [{"key":"A","text":"..."},...], "answer": "A", "part": 1, "explain": "...", "type": "multiple_choice" }`}. For fill-in-the-blank, use {`{ "text": "...", "type": "fill_blank", "choices": [], "answer": "correct answer", "part": 1 }`}.
          </p>
          <textarea value={json} onChange={e => setJson(e.target.value)}
            placeholder='[{"text":"What is 2+2?","choices":[{"key":"A","text":"3"},{"key":"B","text":"4"},{"key":"C","text":"5"}],"answer":"B","part":1}]'
            style={{ width: '100%', minHeight: 120, border: '1.5px solid #c8d8f0', borderRadius: 8, padding: 10, fontSize: 13, fontFamily: "'IBM Plex Mono', monospace", resize: 'vertical', outline: 'none' }} />
          <button onClick={doImport} disabled={importing || !json.trim()} className="btn btn-sm" style={{ marginTop: 8, opacity: importing ? .7 : 1 }}>
            {importing ? 'Importing...' : 'Import ' + (() => { try { const q = JSON.parse(json); return Array.isArray(q) ? q.length + ' question(s)' : ''; } catch { return ''; } })()}
          </button>
        </div>
      )}
    </div>
  );
}

function BankImportSection({ examId, onImported, showToast }) {
  const [open, setOpen] = useState(false);
  const [bank, setBank] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [importing, setImporting] = useState(false);

  const loadBank = async () => {
    try {
      const data = await api.listBank();
      setBank(data);
      setOpen(true);
      setSelected(new Set());
    } catch (e) { showToast(e.message); }
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
    if (!toImport.length) return showToast('Select at least one question');
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
    } catch (e) { showToast(e.message); }
    setImporting(false);
  };

  return (
    <div>
      <button onClick={loadBank} className="btn btn-outline btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <Plus size={14} /> Import from Question Bank
      </button>
      {open && (
        <div style={{ marginTop: 12, border: '1px solid #c8d8f0', borderRadius: 10, padding: 16, background: '#f5f8ff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#0f2044' }}>Select questions to import</span>
            <button onClick={() => setOpen(false)} className="btn btn-sm btn-outline">Cancel</button>
          </div>
          {!bank.length ? (
            <p style={{ fontSize: 13, color: '#5a7090' }}>Bank is empty.</p>
          ) : (
            <div style={{ maxHeight: 300, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {bank.map(q => (
                <label key={q.id} onClick={() => toggle(q.id)} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                  border: `1px solid ${selected.has(q.id) ? '#1a4fad' : '#c8d8f0'}`,
                  borderRadius: 6, cursor: 'pointer', fontSize: 13,
                  background: selected.has(q.id) ? '#ddeeff' : '#fff',
                }}>
                  <input type="checkbox" checked={selected.has(q.id)} onChange={() => {}} style={{ accentColor: '#1a4fad' }} />
                  <span style={{ fontSize: 10, background: '#0f2044', color: '#fff', padding: '1px 6px', borderRadius: 3, fontWeight: 600, whiteSpace: 'nowrap' }}>Part {q.part}</span>
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{q.text}</span>
                </label>
              ))}
            </div>
          )}
          {selected.size > 0 && (
            <button onClick={doImport} disabled={importing} className="btn btn-sm" style={{ marginTop: 12, opacity: importing ? .7 : 1 }}>
              {importing ? 'Importing...' : `Import ${selected.size} question${selected.size > 1 ? 's' : ''}`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
