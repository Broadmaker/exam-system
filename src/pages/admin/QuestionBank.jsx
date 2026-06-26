import { useState, useEffect } from 'react';
import { api } from '../../api';
import AdminLayout from '../../components/AdminLayout';
import '../../styles.css';
import { Plus, Search, ChevronDown, BookOpen, Lightbulb } from 'lucide-react';

export default function QuestionBank() {
  return <AdminLayout title="Question Bank"><BankInner /></AdminLayout>;
}

const inputStyle = {
  width: '100%', border: '1.5px solid #c8d8f0', borderRadius: 8,
  padding: '10px 14px', fontSize: 14, fontFamily: 'inherit', outline: 'none',
};
const labelStyle = { display: 'block', fontSize: 12, fontWeight: 600, color: '#0f2044', marginBottom: 4 };

function BankInner() {
  const [questions, setQuestions] = useState([]);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState('');

  // Add form
  const [showForm, setShowForm] = useState(false);
  const [part, setPart] = useState(1);
  const [text, setText] = useState('');
  const [choiceA, setChoiceA] = useState('');
  const [choiceB, setChoiceB] = useState('');
  const [choiceC, setChoiceC] = useState('');
  const [choiceD, setChoiceD] = useState('');
  const [answer, setAnswer] = useState('');
  const [explain, setExplain] = useState('');
  const [saving, setSaving] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState(null);
  const [editPart, setEditPart] = useState(1);
  const [editText, setEditText] = useState('');
  const [editChoiceA, setEditChoiceA] = useState('');
  const [editChoiceB, setEditChoiceB] = useState('');
  const [editChoiceC, setEditChoiceC] = useState('');
  const [editChoiceD, setEditChoiceD] = useState('');
  const [editAnswer, setEditAnswer] = useState('');
  const [editExplain, setEditExplain] = useState('');

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  const load = () => api.listBank().then(setQuestions).catch(() => {});
  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setPart(1); setText(''); setChoiceA(''); setChoiceB(''); setChoiceC(''); setChoiceD('');
    setAnswer(''); setExplain(''); setShowForm(false);
  };

  const addQuestion = async () => {
    const choices = [{ key: 'A', text: choiceA.trim() }, { key: 'B', text: choiceB.trim() },
      { key: 'C', text: choiceC.trim() }, { key: 'D', text: choiceD.trim() }].filter(c => c.text);
    if (!text.trim() || choices.length < 2 || !answer) return showToast('Fill in question, at least 2 choices, and answer');
    setSaving(true);
    try {
      await api.addBank({ part, text: text.trim(), choices, answer, explain: explain.trim() });
      showToast('Question added to bank');
      resetForm();
      load();
    } catch (e) { showToast(e.message); }
    setSaving(false);
  };

  const startEdit = (q) => {
    const choices = typeof q.choices === 'string' ? JSON.parse(q.choices) : q.choices;
    const m = {}; choices.forEach(c => { m[c.key] = c.text; });
    setEditPart(q.part); setEditText(q.text);
    setEditChoiceA(m['A'] || ''); setEditChoiceB(m['B'] || ''); setEditChoiceC(m['C'] || ''); setEditChoiceD(m['D'] || '');
    setEditAnswer(q.answer); setEditExplain(q.explain || '');
    setEditingId(q.id);
  };
  const cancelEdit = () => setEditingId(null);

  const saveEdit = async () => {
    const choices = [{ key: 'A', text: editChoiceA.trim() }, { key: 'B', text: editChoiceB.trim() },
      { key: 'C', text: editChoiceC.trim() }, { key: 'D', text: editChoiceD.trim() }].filter(c => c.text);
    if (!editText.trim() || choices.length < 2 || !editAnswer) return showToast('Fill in all fields');
    try {
      await api.updateBank(editingId, { part: editPart, text: editText.trim(), choices, answer: editAnswer, explain: editExplain.trim() });
      showToast('Question updated');
      cancelEdit();
      load();
    } catch (e) { showToast(e.message); }
  };

  const deleteQ = async (id) => {
    if (!window.confirm('Delete this bank question?')) return;
    try { await api.deleteBank(id); showToast('Deleted'); load(); } catch (e) { showToast(e.message); }
  };

  const filtered = questions.filter(q =>
    q.text.toLowerCase().includes(search.toLowerCase())
  );

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
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: 1, position: 'relative', minWidth: 200 }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ab' }} />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search questions..." style={{ ...inputStyle, padding: '10px 14px 10px 36px' }} />
          </div>
          <button onClick={() => setShowForm(!showForm)} className="btn" style={{ whiteSpace: 'nowrap' }}>
            <Plus size={16} /> {showForm ? 'Cancel' : 'Add Question'}
          </button>
          <span style={{ fontSize: 13, color: '#5a7090' }}>{questions.length} total</span>
        </div>

        {/* Add Form */}
        {showForm && (
          <div className="card" style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 16, color: '#0f2044', marginBottom: 16 }}>New Bank Question</h3>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Part</label>
              <input type="number" value={part} onChange={e => setPart(Number(e.target.value))} min={1} style={{ ...inputStyle, width: 80 }} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Question Text</label>
              <textarea value={text} onChange={e => setText(e.target.value)} style={{ ...inputStyle, resize: 'vertical', minHeight: 60 }} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Choices</label>
              {['A', 'B', 'C', 'D'].map((l, i) => {
                const vals = [choiceA, choiceB, choiceC, choiceD];
                const sets = [setChoiceA, setChoiceB, setChoiceC, setChoiceD];
                return (
                  <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, fontWeight: 600, color: answer === l ? '#1a7a4a' : '#1a4fad', minWidth: 24 }}>{l})</span>
                    <input value={vals[i]} onChange={e => sets[i](e.target.value)} placeholder={`Choice ${l}`}
                      style={{ ...inputStyle, flex: 1, borderColor: answer === l ? '#1a7a4a' : '#c8d8f0', background: answer === l ? '#f0faf4' : '#fff' }} />
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'flex', gap: 14, marginBottom: 12, flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 180px' }}>
                <label style={labelStyle}>Correct Answer</label>
                <div style={{ position: 'relative' }}>
                  <select value={answer} onChange={e => setAnswer(e.target.value)}
                    style={{ width: '100%', padding: '11px 40px 11px 14px', borderRadius: 10, fontSize: 14,
                      fontFamily: 'inherit', border: '2px solid #d0ddf0', background: '#f5f8ff', outline: 'none',
                      appearance: 'none', cursor: 'pointer', color: answer ? '#1a2a3a' : '#9ab', fontWeight: answer ? 500 : 400 }}>
                    <option value="">— Select —</option>
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="C">C</option>
                    <option value="D">D</option>
                  </select>
                  <ChevronDown size={18} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#5a7090' }} />
                </div>
              </div>
              <div style={{ flex: '1 1 180px' }}>
                <label style={labelStyle}>Explanation <span style={{ fontWeight: 400, color: '#5a7090' }}>(optional)</span></label>
                <input value={explain} onChange={e => setExplain(e.target.value)} placeholder="Shown after submission" style={inputStyle} />
              </div>
            </div>
            <button onClick={addQuestion} className="btn" disabled={saving} style={{ opacity: saving ? .7 : 1 }}>
              {saving ? 'Saving...' : <><Plus size={16} /> Add to Bank</>}
            </button>
          </div>
        )}

        {/* List */}
        {!filtered.length ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#5a7090', background: '#fff', borderRadius: 12, border: '2px dashed #c8d8f0' }}>
            <BookOpen size={40} style={{ marginBottom: 12, opacity: .4 }} />
            <p style={{ fontSize: 16, fontWeight: 600, color: '#0f2044', marginBottom: 4 }}>{search ? 'No matches' : 'Bank is empty'}</p>
            <p style={{ fontSize: 13 }}>{search ? 'Try a different search.' : 'Add reusable questions here.'}</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map(q => {
              const choices = typeof q.choices === 'string' ? JSON.parse(q.choices) : q.choices;
              const isEditing = editingId === q.id;
              return (
                <div key={q.id} style={{
                  background: isEditing ? '#fff' : '#f5f8ff',
                  border: `1px solid ${isEditing ? '#1a4fad' : '#c8d8f0'}`,
                  borderRadius: 10, padding: '16px 18px',
                  boxShadow: isEditing ? '0 2px 16px rgba(26,79,173,.15)' : 'none',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 10, background: '#0f2044', color: '#fff', padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>Part {q.part}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {isEditing ? (
                        <>
                          <button onClick={saveEdit} className="btn btn-sm">Save</button>
                          <button onClick={cancelEdit} className="btn btn-outline btn-sm">Cancel</button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => startEdit(q)} className="btn btn-outline btn-sm">Edit</button>
                          <button onClick={() => deleteQ(q.id)} className="btn btn-danger btn-sm">Delete</button>
                        </>
                      )}
                    </div>
                  </div>

                  {isEditing ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <input type="number" value={editPart} onChange={e => setEditPart(Number(e.target.value))} min={1} style={{ ...inputStyle, width: 60 }} />
                      <textarea value={editText} onChange={e => setEditText(e.target.value)} style={{ ...inputStyle, resize: 'vertical', minHeight: 60 }} />
                      {['A', 'B', 'C', 'D'].map((l, i) => {
                        const vals = [editChoiceA, editChoiceB, editChoiceC, editChoiceD];
                        const sets = [setEditChoiceA, setEditChoiceB, setEditChoiceC, setEditChoiceD];
                        return (
                          <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, fontWeight: 600, color: editAnswer === l ? '#1a7a4a' : '#1a4fad', minWidth: 20 }}>{l})</span>
                            <input value={vals[i]} onChange={e => sets[i](e.target.value)} style={{ flex: 1, ...inputStyle, borderColor: editAnswer === l ? '#1a7a4a' : '#c8d8f0' }} />
                          </div>
                        );
                      })}
                      <div style={{ display: 'flex', gap: 10 }}>
                        <div>
                          <select value={editAnswer} onChange={e => setEditAnswer(e.target.value)}
                            style={{ padding: '8px 32px 8px 12px', borderRadius: 6, fontSize: 13, fontFamily: 'inherit', border: '1.5px solid #c8d8f0', outline: 'none', appearance: 'none', cursor: 'pointer', background: '#fff' }}>
                            <option value="">—</option>
                            <option value="A">A</option>
                            <option value="B">B</option>
                            <option value="C">C</option>
                            <option value="D">D</option>
                          </select>
                        </div>
                        <div style={{ flex: 1 }}>
                          <input value={editExplain} onChange={e => setEditExplain(e.target.value)} placeholder="Explanation" style={{ ...inputStyle, fontSize: 13 }} />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div style={{ fontSize: 14, marginBottom: 10, lineHeight: 1.5 }}>{q.text}</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                        {choices.map(c => (
                          <span key={c.key} style={{
                            fontSize: 12, padding: '3px 10px', borderRadius: 5,
                            background: c.key === q.answer ? '#d4f5e2' : '#fff',
                            border: `1px solid ${c.key === q.answer ? '#1a7a4a' : '#c8d8f0'}`,
                            color: c.key === q.answer ? '#1a7a4a' : '#5a7090',
                            fontWeight: c.key === q.answer ? 600 : 400,
                          }}>{c.key}. {c.text}</span>
                        ))}
                      </div>
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
      </main>
    </div>
  );
}
