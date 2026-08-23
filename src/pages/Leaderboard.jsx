import { useState, useEffect } from 'react';
import { api } from '../api';
import { Button, Card, Select, EmptyState, Spinner, Badge } from '../components/ui';
import PublicLayout from '../components/PublicLayout';
import { Trophy, RefreshCw, Medal, Timer, ShieldCheck } from 'lucide-react';

export default function Leaderboard() {
  const [exams, setExams] = useState([]);
  const [examId, setExamId] = useState('');
  const [entries, setEntries] = useState([]);
  const [examTitle, setExamTitle] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.listExams().then(setExams).catch(() => {});
    const saved = localStorage.getItem('lb_exam');
    if (saved) setExamId(saved);
  }, []);

  useEffect(() => {
    if (!examId) return;
    localStorage.setItem('lb_exam', examId);
    api.getExam(examId).then(d => setExamTitle(d.title)).catch(() => {});
    refresh();
    const iv = setInterval(refresh, 15000);
    return () => clearInterval(iv);
  }, [examId]);

  async function refresh() {
    if (!examId) return;
    setLoading(true);
    try {
      const data = await api.getLeaderboard(examId);
      setEntries(data.results || data || []);
    } catch (e) {}
    setLoading(false);
  }

  const rankMeta = (i) => {
    if (i === 0) return { icon: <Medal size={20} className="text-accent" />, ring: 'ring-accent/30 bg-accent/10' };
    if (i === 1) return { icon: <Medal size={18} className="text-muted" />, ring: 'ring-muted/20 bg-muted/10' };
    if (i === 2) return { icon: <Medal size={16} className="text-[#b87333]" />, ring: 'ring-[#b87333]/25 bg-[#b87333]/10' };
    return { icon: null, ring: '' };
  };

  return (
    <PublicLayout>
      {/* Hero */}
      <section className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0b1b3a 0%, #143a8a 45%, #1a4fad 100%)' }}>
        <div className="absolute inset-0 pointer-events-none opacity-40" style={{ backgroundImage: 'radial-gradient(700px 340px at 78% -8%, rgba(255,255,255,.14), transparent 60%), radial-gradient(520px 280px at 8% 108%, rgba(232,160,32,.18), transparent 60%)' }} />
        <div className="absolute inset-0 pointer-events-none opacity-[0.06]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
        <div className="relative max-w-[800px] mx-auto px-4 py-8 sm:py-10">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur border border-white/10 rounded-full px-3 py-1 text-[11px] font-semibold text-accent mb-4">
            <ShieldCheck size={12} /> Live rankings update every 15 seconds
          </div>
          <div className="flex items-start gap-3">
            <span className="hidden sm:flex w-11 h-11 rounded-xl bg-white/10 border border-white/10 text-white items-center justify-center shrink-0"><Trophy size={20} /></span>
            <div className="flex-1 min-w-0">
              <h1 className="text-white text-[26px] sm:text-[30px] font-bold leading-tight tracking-tight">Live Scoreboard</h1>
              <p className="text-white/70 text-[13px] sm:text-[14px] leading-relaxed mt-1 truncate">{examTitle || 'Select an exam to view rankings'}</p>
            </div>
          </div>

          <div className="mt-6 bg-surface rounded-[16px] shadow-modal border border-border p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
              <div className="flex-1 min-w-0">
                <label className="block text-[11px] font-semibold tracking-[.08em] uppercase text-muted mb-1.5">Exam</label>
                <Select value={examId} onChange={e => setExamId(e.target.value)} placeholder="— Select an exam —">
                  <option value="">— Select an exam —</option>
                  {exams.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
                </Select>
              </div>
              <Button icon={RefreshCw} onClick={refresh} className="shrink-0 !py-3">Refresh</Button>
            </div>
            <div className="flex items-center gap-2 mt-3 text-[12px] text-muted">
              <span className="inline-flex items-center gap-1.5 bg-canvas border border-border rounded-full px-2.5 py-1 text-[11px] font-medium"><Trophy size={12} /> {entries.length} participant{entries.length !== 1 ? 's' : ''}</span>
              {examId && <span className="text-faint">Auto-refreshes · {entries.length ? 'live' : 'waiting for scores'}</span>}
            </div>
          </div>
        </div>
      </section>

      <main className="max-w-[800px] mx-auto px-4 py-6 w-full flex-1">
        {!examId ? (
          <EmptyState icon={Trophy} title="Select an exam" body="Pick an exam above to see the live scoreboard." />
        ) : loading && !entries.length ? (
          <Spinner label="Loading leaderboard..." />
        ) : !entries.length ? (
          <EmptyState icon={Trophy} title="No scores yet" body="Be the first to take the exam!" />
        ) : (
          <>
            {/* Podium */}
            {entries.length >= 1 && (
              <div className="mb-5">
                <div className="flex items-end justify-center gap-3 px-2">
                  {[1, 0, 2].map(pos => {
                    const e = entries[pos];
                    if (!e) return <div key={pos} className="w-1/3" />;
                    const mins = Math.floor(e.time_taken / 60);
                    const secs = e.time_taken % 60;
                    const pct = ((e.score / e.total) * 100).toFixed(0);
                    const heights = { 0: 'h-40', 1: 'h-32', 2: 'h-28' };
                    const medalCls = { 0: 'text-accent', 1: 'text-muted', 2: 'text-[#b87333]' };
                    const nameSize = { 0: 'text-[15px]', 1: 'text-[14px]', 2: 'text-[14px]' };
                    return (
                      <div key={pos} className="w-1/3 flex flex-col items-center">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${pos === 0 ? 'bg-accent text-white shadow-card' : 'bg-navy-50 text-navy-800 border border-border'}`}>
                          <Medal size={18} className={pos === 0 ? 'text-white' : medalCls[pos]} />
                        </div>
                        <div className={`font-bold text-navy-800 truncate max-w-full px-1 ${nameSize[pos]}`}>{e.student_name}</div>
                        <div className="text-[11px] text-faint truncate max-w-full px-1 mb-1.5">{e.student_section}</div>
                        <div className={`rounded-t-xl w-full flex flex-col items-center justify-start pt-3 px-2 ${heights[pos]} ${pos === 0 ? 'bg-accent/15 border border-accent/40' : 'bg-navy-50 border border-border'}`}>
                          <span className={`font-bold text-[18px] leading-none ${pos === 0 ? 'text-accent' : 'text-navy-800'}`}>{e.score}/{e.total}</span>
                          <span className="text-[11px] text-muted mt-1">{pct}% · {mins}:{String(secs).padStart(2, '0')}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <Card className="!p-0 !mb-0 overflow-hidden">
              <div className="flex flex-col">
                {entries.map((e, i) => {
                  const mins = Math.floor(e.time_taken / 60);
                  const secs = e.time_taken % 60;
                  const pct = ((e.score / e.total) * 100).toFixed(0);
                  const meta = rankMeta(i);
                  return (
                    <div key={i} className={`flex items-center gap-3 px-4 sm:px-5 py-3.5 border-b border-border last:border-0 ${i === 0 ? 'bg-accent/5' : ''}`}>
                      <div className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center font-mono text-[15px] font-bold ${i < 3 ? meta.ring : 'bg-navy-50 text-muted'}`}>
                        {meta.icon || i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-navy-800 truncate">{e.student_name}</div>
                        <div className="text-[11px] text-faint flex items-center gap-3">
                          <span className="truncate">{e.student_section}</span>
                          <span className="inline-flex items-center gap-1"><Timer size={11} /> {mins}:{String(secs).padStart(2, '0')}</span>
                          {e.reason && e.reason !== 'manual' && (
                            <Badge tone={e.reason === 'timeout' ? 'warning' : 'danger'}>
                              {e.reason === 'tab' ? 'tab' : e.reason}
                            </Badge>
                          )}
                          {e.retry_allowed && <Badge tone="success">retry</Badge>}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="flex items-center gap-2 justify-end">
                          <span className="font-mono text-[13px] text-muted">{i + 1}</span>
                          <span className={`inline-block px-3.5 py-1 rounded-full font-bold text-[15px] ${i === 0 ? 'bg-accent text-white' : 'bg-success-bg text-success'}`}>
                            {e.score}/{e.total}
                          </span>
                        </div>
                        <div className="h-1 bg-border/50 rounded-full mt-1.5 w-32 ml-auto overflow-hidden">
                          <div className="h-full bg-navy-700 rounded-full transition-all duration-500" style={{ width: pct + '%' }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </>
        )}

        <div className="text-center text-[11px] text-faint mt-4 flex items-center justify-center gap-1.5">
          <RefreshCw size={11} className="animate-spin" style={{ animationDuration: '4s' }} /> Live — refreshes automatically
        </div>
      </main>
    </PublicLayout>
  );
}
