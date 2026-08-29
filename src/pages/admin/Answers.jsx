import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../../api';
import AdminLayout from '../../components/AdminLayout';
import { shuffleWithSeed, parseChoices, matchesAnswer, examTypeLabel, EXAM_STATUS_LABELS, EXAM_STATUS_TONES, effectiveExamStatus } from '../../utils';
import { PageHeader, Card, Button, Badge, Select, EmptyState, Spinner, Modal, useToast } from '../../components/ui';
import { SearchInput } from '../../components/ui/SearchInput';
import { PillsContainer, Pill } from '../../components/ui/Pills';
import { Search, RefreshCw, Eye, CheckCircle, XCircle, X, User, Download, FolderOpen, ArrowLeft, ArrowRight, BarChart3, Users, Clock, CalendarClock, GraduationCap, FileText, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

export default function Answers() {
  return <AdminLayout title="Student Answers"><AnswersInner /></AdminLayout>;
}

function buildCells(questions, sub) {
  const stored = typeof sub.answers === 'string' ? JSON.parse(sub.answers || '{}') : (sub.answers || {});
  const reviews = sub.reviews || {};
  const seed = Number(sub.seed);
  const shuffledQs = shuffleWithSeed(questions, seed);
  const seeds = {};
  shuffledQs.forEach((q, idx) => { seeds[q.id] = seed + idx * 7919; });

  return questions.map(q => {
    const verdict = reviews[q.id];
    const isBlank = (q.type || 'multiple_choice') === 'fill_blank';
    const raw = (stored[q.id] || '');

    let autoCorrect;
    let cell;
    if (isBlank) {
      const text = raw.trim();
      autoCorrect = matchesAnswer(text, q.answer);
      cell = {
        type: 'fill_blank',
        chosen: text || null,
        answerKey: q.answer,
        answerText: q.answer,
        choiceText: '',
      };
    } else {
      const choices = parseChoices(q.choices);
      const scheme = sub.answer_scheme === 'fixed' ? 'fixed' : 'shuffled';
      const correctChoice = choices.find(c => c.key === q.answer) || {};

      // Resolve which underlying choice the student picked, regardless of scheme.
      // For 'shuffled' (legacy) the stored value is a per-student display letter;
      // for 'fixed' it is the canonical choice key.
      let picked;
      if (scheme === 'fixed') {
        picked = choices.find(c => c.key === raw) || null;
      } else {
        const shuffled = shuffleWithSeed(choices, seeds[q.id]).map((c, ci) => ({
          ...c, displayKey: String.fromCharCode(65 + ci),
        }));
        picked = shuffled.find(c => c.displayKey === raw);
      }

      // Re-align for DISPLAY using the canonical DB-order letters (A=first choice,
      // B=second, …) so answers align with the answer key the same way new takers see
      // them. The stored grade (`autoCorrect` from the picked choice's key) is unchanged.
      const pickedKey = picked ? picked.key : (raw || null);
      autoCorrect = !!picked && picked.key === q.answer;
      cell = {
        type: 'multiple_choice',
        chosen: pickedKey,
        answerKey: q.answer,
        choiceText: picked ? picked.text : '',
        answerText: correctChoice.text || '',
        correctDisplayKey: q.answer,
        correctDisplayText: correctChoice.text || '',
      };
    }

    const reviewed = verdict === 'correct' || verdict === 'incorrect';
    return {
      ...cell,
      correct: reviewed ? verdict === 'correct' : autoCorrect,
      autoCorrect,
      reviewed,
      verdict,
    };
  });
}

function cellText(cell) {
  if (cell.type === 'fill_blank') return (cell.chosen || '—');
  // Multiple-choice: surface BOTH the student's pick and the correct answer
  // (letter + text). Old submissions recorded shuffled letters, so the correct
  // letter shown is the per-student one; new submissions use fixed DB order.
  const pick = cell.chosen ? `${cell.chosen} ${cell.choiceText || ''}`.trim() : '—';
  const correct = `${cell.correctDisplayKey || cell.answerKey} ${cell.correctDisplayText || cell.answerText || ''}`.trim();
  return `${pick} | correct: ${correct}`;
}

// The student's chosen answer alone (letter + text as they saw it), used in the
// drill-down modal where the correct answer is shown on its own line.
function studentAnswerText(cell) {
  if (cell.type === 'fill_blank') return (cell.chosen || '—');
  return cell.chosen ? `${cell.chosen} ${cell.choiceText || ''}`.trim() : '—';
}

function plainText(html) {
  return String(html || '').replace(/<[^>]+>/g, '').trim();
}

function AnswersInner() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const examId = params.get('id');
  const [exam, setExam] = useState(null);
  const [subs, setSubs] = useState([]);
  const [examList, setExamList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [examSearch, setExamSearch] = useState('');
  const [examPage, setExamPage] = useState(1);
  const EXAM_PAGE_SIZE = 6;
  const [openSub, setOpenSub] = useState(null);
  const [saving, setSaving] = useState(null);
  // Debounce search 300ms to avoid 10k shuffles per keystroke (P2)
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = async () => {
    if (!examId) return;
    setLoading(true);
    const [examData, subsData] = await Promise.all([
      api.getExam(examId).catch(() => null),
      api.getSubmissions(examId).catch(() => ({ passing_score: 60, results: [] })),
    ]);
    setExam(examData);
    setSubs(subsData.results || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, [examId]);
  useEffect(() => { api.listExams().then(setExamList).catch(() => {}); }, []);
  useEffect(() => { setExamPage(1); }, [examSearch]);

  const qs = exam?.questions || [];
  const rows = subs.map(sub => ({ sub, cells: buildCells(qs, sub) }));
  const filtered = rows
    .filter(r => r.sub.student_name.toLowerCase().includes(debouncedSearch.toLowerCase()))
    .sort((a, b) => b.sub.score - a.sub.score);
  const open = openSub ? rows.find(r => r.sub.id === openSub) : null;

  const handleReview = async (subId, questionId, verdict) => {
    setSaving(subId + '|' + questionId);
    try {
      const res = await api.reviewAnswer(subId, { question_id: questionId, verdict });
      setSubs(prev => prev.map(s => {
        if (s.id !== subId) return s;
        const reviews = { ...(s.reviews || {}) };
        if (verdict === 'correct' || verdict === 'incorrect') reviews[questionId] = verdict;
        else delete reviews[questionId];
        return { ...s, reviews, score: res.score };
      }));
    } finally {
      setSaving(null);
    }
  };

  const exportCSV = () => {
    const header = ['Student', 'Section', 'Score', 'Total'];
    qs.forEach((_, i) => header.push(`Q${i + 1}`));
    const lines = filtered.map(r =>
      [r.sub.student_name, r.sub.student_section, r.sub.score, r.sub.total]
        .concat(r.cells.map(c => cellText(c)))
        .join(',')
    );
    const blob = new Blob([header.join(',') + '\n' + lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = (exam?.title || 'answers') + '-answers.csv';
    a.click(); URL.revokeObjectURL(url);
  };

  if (!examId) {
    const filteredExams = examList.filter(ex => {
      const q = examSearch.trim().toLowerCase();
      if (!q) return true;
      return ex.title?.toLowerCase().includes(q) || ex.id?.toLowerCase().includes(q) || ex.type?.toLowerCase().includes(q);
    });
    const totalPages = Math.max(1, Math.ceil(filteredExams.length / EXAM_PAGE_SIZE));
    const safePage = Math.min(examPage, totalPages);
    const pagedExams = filteredExams.slice((safePage - 1) * EXAM_PAGE_SIZE, safePage * EXAM_PAGE_SIZE);
    return (
      <main className="max-w-[960px] mx-auto px-4 py-6">
        <Button variant="ghost" icon={ArrowLeft} onClick={() => navigate('/admin')} className="!px-0 !py-1 !text-[13px] !text-muted hover:!text-navy-800 mb-3">Back to Dashboard</Button>
        <PageHeader
          eyebrow="Exam Review"
          title="Review student answers"
          subtitle="Select an exam to see how each student answered, and manually accept or reject individual answers."
          icon={Eye}
        />
        {examList.length > 0 && (
          <div className="bg-surface border border-border rounded-2xl p-3 sm:p-4 flex gap-3 mb-4 shadow-sm">
            <SearchInput value={examSearch} onChange={e=>setExamSearch(e.target.value)} placeholder="Search exams by title or type…" onClear={()=>setExamSearch('')} />
            <span className="hidden sm:inline-flex items-center text-[11px] text-faint self-center shrink-0">{filteredExams.length} of {examList.length}</span>
          </div>
        )}
        {!examList.length ? (
          <EmptyState icon={FolderOpen} title="No exams yet" compact />
        ) : !filteredExams.length ? (
          <EmptyState icon={Search} title="No matches" body={`No exams match "${examSearch}"`} compact action={<Button variant="outline" icon={X} onClick={()=>setExamSearch('')}>Clear search</Button>} />
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {pagedExams.map(ex => {
                const letter = (ex.title || '?').charAt(0).toUpperCase();
                const effStatus = effectiveExamStatus(ex);
                return (
                  <button key={ex.id} onClick={() => setParams({ id: ex.id })}
                    className="group card-hover flex flex-col gap-0 text-left bg-surface border border-border rounded-xl overflow-hidden cursor-pointer">
                    <div className="h-1 bg-gradient-to-r from-navy-700 via-navy-600 to-accent" />
                    <div className="p-4 flex flex-col gap-2.5">
                      <div className="flex items-start gap-3">
                        <span className="w-10 h-10 rounded-xl bg-navy-700 text-white flex items-center justify-center shrink-0 font-bold text-[14px] shadow-sm">{letter}</span>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-navy-800 text-[14px] truncate leading-tight">{ex.title}</div>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1">
                            <Badge tone="info">{examTypeLabel(ex.type)}</Badge>
                            <Badge tone={EXAM_STATUS_TONES[effStatus] || 'neutral'}>{EXAM_STATUS_LABELS[effStatus] || ex.status}</Badge>
                            <Badge tone={(ex.question_count||0)===0?'danger':'neutral'}>{ex.question_count||0} Q</Badge>
                          </div>
                        </div>
                        <ArrowRight size={16} className="shrink-0 text-faint group-hover:text-navy-700 transition-colors mt-1" />
                      </div>
                      <div className="flex flex-wrap gap-3 text-[11px] text-muted border-t border-border pt-2.5">
                        <span className="inline-flex items-center gap-1"><Clock size={11}/>{ex.time_limit || 60}m</span>
                        <span className="inline-flex items-center gap-1"><BarChart3 size={11}/>{ex.submission_count||0} subs</span>
                        <span className="inline-flex items-center gap-1"><GraduationCap size={11}/>{ex.passing_score ?? 60}% pass</span>
                        {ex.deadline && <span className="inline-flex items-center gap-1"><CalendarClock size={11}/>{new Date(ex.deadline).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>}
                      </div>
                      {ex.description && <div className="text-[11px] text-faint truncate leading-relaxed">{ex.description}</div>}
                    </div>
                  </button>
                );
              })}
            </div>
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4">
                <span className="text-[11px] text-faint order-2 sm:order-1">Showing <strong className="text-navy-800">{(safePage-1)*EXAM_PAGE_SIZE+1}–{Math.min(safePage*EXAM_PAGE_SIZE, filteredExams.length)}</strong> of {filteredExams.length}</span>
                <div className="flex items-center gap-1 order-1 sm:order-2">
                  <button onClick={()=>setExamPage(1)} disabled={safePage<=1} className="w-7 h-7 flex items-center justify-center rounded-lg border text-muted bg-surface border-border hover:bg-navy-50 disabled:opacity-40 disabled:cursor-not-allowed"><ChevronsLeft size={14}/></button>
                  <button onClick={()=>setExamPage(p=>Math.max(1,p-1))} disabled={safePage<=1} className="w-7 h-7 flex items-center justify-center rounded-lg border text-muted bg-surface border-border hover:bg-navy-50 disabled:opacity-40 disabled:cursor-not-allowed"><ChevronLeft size={14}/></button>
                  <span className="text-[11px] font-semibold text-navy-800 px-2">{safePage} / {totalPages}</span>
                  <button onClick={()=>setExamPage(p=>Math.min(totalPages,p+1))} disabled={safePage>=totalPages} className="w-7 h-7 flex items-center justify-center rounded-lg border text-muted bg-surface border-border hover:bg-navy-50 disabled:opacity-40 disabled:cursor-not-allowed"><ChevronRight size={14}/></button>
                  <button onClick={()=>setExamPage(totalPages)} disabled={safePage>=totalPages} className="w-7 h-7 flex items-center justify-center rounded-lg border text-muted bg-surface border-border hover:bg-navy-50 disabled:opacity-40 disabled:cursor-not-allowed"><ChevronsRight size={14}/></button>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    );
  }
  if (loading) return <main className="max-w-[960px] mx-auto px-4 py-6"><Button variant="ghost" icon={ArrowLeft} onClick={() => navigate('/admin')} className="!px-0 !py-1 !text-[13px] !text-muted hover:!text-navy-800 mb-3">Back to Dashboard</Button><Spinner label="Loading answers..." /></main>;

  return (
    <main className="max-w-[960px] mx-auto px-4 py-6">
      <Button variant="ghost" icon={ArrowLeft} onClick={() => navigate('/admin')} className="!px-0 !py-1 !text-[13px] !text-muted hover:!text-navy-800 mb-3">Back to Dashboard</Button>
      <PageHeader
        eyebrow="Exam Review"
        title={exam?.title || 'Student Answers'}
        subtitle={`Review how each student answered, Google Forms-style. ${subs.length} submission${subs.length !== 1 ? 's' : ''} · ${qs.length} question${qs.length !== 1 ? 's' : ''}.`}
        icon={Eye}
        actions={
          <>
            <Select
              value=""
              onChange={e => { if (e.target.value) setParams({ id: e.target.value }); }}
              className="!w-48 !m-0"
            >
              <option value="" disabled>Switch exam…</option>
              {examList.map(ex => <option key={ex.id} value={ex.id}>{ex.title}</option>)}
            </Select>
            <Button variant="outline" size="sm" icon={RefreshCw} onClick={load}>Refresh</Button>
            {subs.length > 0 && <Button size="sm" icon={Download} onClick={exportCSV}>Export answers</Button>}
          </>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <div className="bg-surface border border-border rounded-xl px-4 py-3.5 flex items-center gap-3 shadow-sm">
          <span className="w-9 h-9 rounded-xl bg-navy-100 text-navy-700 flex items-center justify-center shrink-0"><Users size={16} /></span>
          <div className="min-w-0">
            <div className="text-[11px] font-bold tracking-[.08em] uppercase text-faint leading-none">Submissions</div>
            <div className="text-[20px] font-bold text-navy-800 leading-none mt-1">{subs.length}</div>
          </div>
          <span className="ml-auto text-[11px] font-medium text-muted bg-canvas border border-border rounded-full px-2.5 py-1">{qs.length} Qs</span>
        </div>
        <div className="bg-surface border border-border rounded-xl px-4 py-3.5 flex items-center gap-3 shadow-sm">
          <span className="w-9 h-9 rounded-xl bg-purple-bg text-purple flex items-center justify-center shrink-0"><BarChart3 size={16} /></span>
          <div className="min-w-0">
            <div className="text-[11px] font-bold tracking-[.08em] uppercase text-faint leading-none">Average</div>
            <div className="text-[20px] font-bold text-navy-800 leading-none mt-1">
              {subs.length ? Math.round(subs.reduce((a, s) => a + (s.total ? s.score / s.total : 0), 0) / subs.length * 100) : 0}%
            </div>
          </div>
          <span className="ml-auto text-[11px] text-faint">{subs.length ? `${Math.round(subs.reduce((a,s)=>a+s.score,0)/subs.length)}/${qs.length} avg` : '—'}</span>
        </div>
        <div className="bg-surface border border-border rounded-xl px-4 py-3.5 flex items-center gap-3 shadow-sm">
          <span className="w-9 h-9 rounded-xl bg-success-bg text-success flex items-center justify-center shrink-0"><CheckCircle size={16} /></span>
          <div className="min-w-0">
            <div className="text-[11px] font-bold tracking-[.08em] uppercase text-faint leading-none">Passed ≥60%</div>
            <div className="text-[20px] font-bold text-navy-800 leading-none mt-1">
              {subs.filter(s => s.total && s.score / s.total >= 0.6).length}<span className="text-[12px] font-normal text-muted">/{subs.length}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row gap-3 mb-4 shadow-sm">
        <SearchInput value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by student name…" onClear={()=>setSearch('')} />
        <div className="text-[11px] text-faint self-center shrink-0 hidden sm:block">{filtered.length} of {subs.length}</div>
      </div>

      {!subs.length ? (
        <EmptyState icon={Eye} title="No submissions yet" body="Students' individual answers will appear here once they take the exam." />
      ) : !filtered.length ? (
        <EmptyState icon={Search} title="No matches" body={`No results match "${search}"`} compact />
      ) : (
        <>
          <div className="flex items-center gap-1 text-[11px] text-faint mb-2 sm:hidden"><ArrowRight size={12} className="text-faint" /> Swipe to see all questions →</div>
          <Card className="!p-0 overflow-hidden shadow-sm">
            <div className="overflow-x-auto no-scrollbar">
              <table className="table min-w-max w-full" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ position: 'sticky', left: 0, background: 'var(--color-navy-50)', zIndex: 2, minWidth: 150, borderRight: '1px solid var(--color-border)' }} className="sm:min-w-[180px]">Student</th>
                  {qs.map((q, qi) => {
                    const correctText = (() => {
                      try {
                        const ch = parseChoices(q.choices).find(c => c.key === q.answer);
                        return ch ? ch.text : q.answer;
                      } catch { return q.answer; }
                    })();
                    return (
                    <th key={q.id} title={`${plainText(q.text)} — correct: ${correctText}`} style={{ textAlign: 'center', fontSize: 11, minWidth: 92 }}>
                      <div>Q{qi + 1}</div>
                      <div style={{ fontSize: 10, color: 'var(--color-muted)', marginTop: 2, fontWeight: 400 }}>
                        {q.type === 'fill_blank' ? 'fill' : '✓ ' + correctText.slice(0, 20)}
                      </div>
                      <div style={{ fontSize: 9, color: 'var(--color-faint)', fontWeight: 400 }}>fixed A B C D · old rows per-seed</div>
                    </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, rowIdx) => {
                  const reviewedCount = r.cells.filter(c => c.reviewed).length;
                  return (
                  <tr key={r.sub.id} onClick={() => setOpenSub(r.sub.id)} className="cursor-pointer">
                    <td style={{ position: 'sticky', left: 0, zIndex: 1, minWidth: 150, background: rowIdx % 2 === 0 ? 'var(--color-surface)' : 'var(--color-navy-50)', borderRight: '1px solid var(--color-border)' }}>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-navy-800 truncate">{r.sub.student_name}</span>
                        {reviewedCount > 0 && (
                          <span className="inline-flex items-center gap-1 bg-warning-bg text-warning border border-warning/30 rounded-full px-1.5 py-0.5 text-[10px] font-bold shrink-0" title={`${reviewedCount} answer${reviewedCount !== 1 ? 's' : ''} manually reviewed`}>
                            <CheckCircle size={10} /> {reviewedCount}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-faint mt-0.5 flex items-center gap-1.5 flex-wrap">
                        <span>{r.sub.student_section} · {r.sub.score}/{r.sub.total}</span>
                        {reviewedCount > 0 && <span className="text-warning font-semibold">· reviewed</span>}
                      </div>
                    </td>
                    {r.cells.map((cell, ci) => {
                      const col = cell.correct ? 'bg-success-bg text-success'
                        : cell.chosen === null ? 'bg-navy-50 text-faint'
                        : 'bg-danger-bg text-danger';
                      return (
                        <td key={ci} title={`${cellText(cell)}${cell.reviewed ? ' · manually reviewed (' + cell.verdict + ')' : ''}`} style={{ padding: '8px 10px', textAlign: 'center', minWidth: 118, maxWidth: 190, verticalAlign: 'top' }}>
                          <div className={`relative flex items-center justify-center gap-1 rounded-md px-2 py-1 text-[11px] min-h-[26px] font-mono ${col}`}
                            style={{ outline: cell.reviewed ? (cell.correct ? '1.5px solid var(--color-success)' : '1.5px solid var(--color-danger)') : 'none' }}>
                            {cell.reviewed && (
                              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-warning border-2 border-surface shadow-sm" title={`Manually marked ${cell.verdict}`} />
                            )}
                            {cell.type === 'fill_blank' ? (
                              <span className="truncate max-w-[140px]">{cell.chosen || '—'}</span>
                            ) : (
                              <div className="flex flex-col items-center justify-center gap-0.5 leading-tight">
                                <span className="flex items-center gap-1">
                                  <span className="font-bold text-[11px]">{cell.chosen || '—'}</span>
                                  <span className="truncate max-w-[120px] text-[11px]">{cell.choiceText}</span>
                                </span>
                                <span className="flex items-center gap-1 text-success">
                                  <CheckCircle size={10} className="shrink-0" />
                                  <span className="font-bold text-[10px]">{cell.correctDisplayKey || cell.answerKey}</span>
                                  <span className="truncate max-w-[120px] text-[10px]">{cell.correctDisplayText || cell.answerText || ''}</span>
                                </span>
                              </div>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex items-center gap-2 px-4 py-2.5 text-[11px] text-muted border-t border-border bg-canvas flex-wrap">
            <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-success-bg border border-success inline-block" /> Correct</span>
            <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-danger-bg border border-danger inline-block" /> Wrong</span>
            <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-navy-50 border border-border inline-block" /> Unanswered</span>
            <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-surface border-2 border-warning inline-block" /> Manual review</span>
            <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-warning border-2 border-surface shadow-sm inline-block" /> Reviewed cell</span>
            <span className="inline-flex items-center gap-1"><span className="inline-flex items-center gap-1 bg-warning-bg text-warning border border-warning/30 rounded-full px-1.5 py-0.5 text-[10px] font-bold"><CheckCircle size={10} /> n</span> Reviewed count</span>
            <span className="ml-auto hidden sm:inline">Click a row for full details and review controls.</span>
          </div>
        </Card>
        </>
      )}

      {/* Drill-down modal */}
      <Modal open={!!open} onClose={() => setOpenSub(null)} size="lg"
        title={open?.sub?.student_name}
        icon={User}>
        {open && (
          <div className="flex flex-col gap-3.5">
            <div className="flex items-center gap-2 text-[12px] text-muted flex-wrap">
              <span className="inline-flex items-center gap-1.5 bg-canvas/70 border border-border rounded-md px-2.5 py-1">
                <Users size={12} className="text-navy-700" /> {open.sub.student_section || 'No section'}
              </span>
              <span className="inline-flex items-center gap-1.5 bg-canvas/70 border border-border rounded-md px-2.5 py-1">
                <Badge tone={open.sub.total && open.sub.score / open.sub.total >= 0.6 ? 'success' : 'neutral'}>{open.sub.score}/{open.sub.total}</Badge>
              </span>
              <span className="inline-flex items-center gap-1.5 bg-canvas/70 border border-border rounded-md px-2.5 py-1">
                <CheckCircle size={12} className="text-success" /> submitted {new Date(open.sub.submitted_at + 'Z').toLocaleString('en-PH')}
              </span>
              {open.sub.tab_switches > 0 && (
                <span className="inline-flex items-center gap-1.5 bg-warning-bg border border-warning/40 text-warning rounded-md px-2.5 py-1">
                  <XCircle size={12} /> {open.sub.tab_switches} tab switch{open.sub.tab_switches !== 1 ? 'es' : ''}
                </span>
              )}
            </div>
            {qs.map((q, i) => {
              const cell = open.cells[i];
              const statusColor = cell.correct ? 'text-success' : cell.chosen === null ? 'text-faint' : 'text-danger';
              const isSaving = saving === open.sub.id + '|' + q.id;
              return (
                <Card key={q.id} className={`!p-0 !mb-0 overflow-hidden ${cell.correct ? '!border-success/40' : ''}`}>
                  <div className={`flex justify-between items-center gap-2 px-4 py-2.5 border-b border-border ${cell.correct ? 'bg-success-bg/40' : cell.chosen === null ? 'bg-canvas/60' : 'bg-danger-bg/25'}`}>
                    <Badge tone="info">Q{i + 1} · Part {q.part}</Badge>
                    <span className={`flex items-center gap-1 text-[12px] font-semibold ${statusColor}`}>
                      {cell.correct
                        ? <><CheckCircle size={14} /> Correct</>
                        : cell.chosen === null
                          ? <><XCircle size={14} /> Unanswered</>
                          : <><XCircle size={14} /> Wrong</>}
                      {cell.reviewed && <Badge tone="warning" className="!ml-1">MANUAL</Badge>}
                    </span>
                  </div>
                  <div className="p-4">
                    <div className="text-[13.5px] leading-relaxed mb-2.5" dangerouslySetInnerHTML={{ __html: q.text }} />
                    <div className="flex flex-col gap-1 text-[13px] border-t border-border pt-2.5">
                      <div className="text-muted">Student's answer: <strong className={statusColor}>{studentAnswerText(cell)}</strong></div>
                      <div className="text-muted">
                        Correct answer:{' '}
                        <strong className="text-navy-700">
                          {cell.type === 'fill_blank' ? (cell.answerText || q.answer || '—') : `${cell.correctDisplayKey || cell.answerKey}${(cell.correctDisplayText || cell.answerText) ? ' · ' + (cell.correctDisplayText || cell.answerText) : ''}`}
                        </strong>
                        {cell.type !== 'fill_blank' && cell.correctDisplayKey !== cell.answerKey && (
                          <span className="text-[11px] text-faint ml-1">(DB key {cell.answerKey})</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-border flex-wrap">
                      <span className="text-[12px] font-semibold text-muted">Manual review:</span>
                      <Button size="sm" variant={cell.verdict === 'correct' ? 'success' : 'outline'} disabled={isSaving}
                        onClick={() => handleReview(open.sub.id, q.id, 'correct')} icon={CheckCircle}>
                        Accept as correct
                      </Button>
                      <Button size="sm" variant={cell.verdict === 'incorrect' ? 'danger' : 'outline'} disabled={isSaving}
                        onClick={() => handleReview(open.sub.id, q.id, 'incorrect')} icon={XCircle}>
                        Mark wrong
                      </Button>
                      {cell.reviewed && (
                        <Button size="sm" variant="ghost" disabled={isSaving}
                          onClick={() => handleReview(open.sub.id, q.id, null)}>
                          Revert to auto
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
            <div className="flex justify-end">
              <Button variant="outline" icon={ArrowLeft} onClick={() => setOpenSub(null)}>Close</Button>
            </div>
          </div>
        )}
      </Modal>
    </main>
  );
}