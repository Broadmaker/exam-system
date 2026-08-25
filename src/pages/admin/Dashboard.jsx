import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api';
import { examTypeLabel, EXAM_STATUS_TONES, EXAM_STATUS_LABELS, EXAM_TYPE_LABELS, effectiveExamStatus } from '../../utils';
import AdminLayout from '../../components/AdminLayout';
import { PageHeader, StatCard, Card, Badge, Button, ConfirmDialog, EmptyState, Input, Select, Modal, useToast, PillsContainer, Pill, SearchInput } from '../../components/ui';
import { Plus, Users, ClipboardList, Clock, BarChart3, Eye, Pencil, Lock, FileText, Radio, Trash2, GraduationCap, Copy, TrendingUp, CopyPlus, CalendarClock, Search, Filter, ArrowUpDown, X, History, RefreshCw, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, QrCode, Download, Printer, Info } from 'lucide-react';
import QRCode from 'qrcode';

export default function Dashboard() {
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [duplicating, setDuplicating] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;
  const [qrExam, setQrExam] = useState(null);
  const [qr, setQr] = useState('');
  const toast = useToast();

  useEffect(() => {
    if (!qrExam) { setQr(''); return; }
    const link = window.location.origin + '/exam?id=' + encodeURIComponent(qrExam.id);
    QRCode.toDataURL(link, { width: 280, margin: 1, color: { dark: '#0b1b3a', light: '#ffffff' } }).then(setQr).catch(() => setQr(''));
  }, [qrExam]);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.listExams().then(setExams).catch(e => toast.error(e.message)),
      api.listClasses().then(setClasses).catch(() => {}),
      api.listStudents().then(setStudents).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const totalSubs = exams.reduce((s, e) => s + (e.submission_count || 0), 0);
  const totalQuestions = exams.reduce((s, e) => s + (e.question_count || 0), 0);
  const activeExams = exams.filter(e => effectiveExamStatus(e) === 'active').length;
  const fineStats = useMemo(() => {
    const avgSubs = exams.length ? (totalSubs / exams.length).toFixed(1) : '—';
    const avgQ = exams.length ? (totalQuestions / exams.length).toFixed(1) : '—';
    const totalEnroll = classes.reduce((s, c) => s + (Number(c.student_count) || 0), 0);
    const avgClassSize = classes.length ? (totalEnroll / classes.length).toFixed(1) : '—';
    return { avgSubs, avgQ, avgClassSize, totalEnroll, totalQuestions };
  }, [exams.length, totalSubs, totalQuestions, classes]);

  // ── Filters / Sort / Search (A) ──
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sortBy, setSortBy] = useState('created_desc');

  const statusCounts = useMemo(() => {
    const c = { all: exams.length, draft: 0, scheduled: 0, active: 0, closed: 0, archived: 0 };
    exams.forEach(e => { const s = effectiveExamStatus(e); if (c[s] !== undefined) c[s]++; });
    return c;
  }, [exams]);

  const needsAttention = useMemo(() => {
    const drafts = exams.filter(e => effectiveExamStatus(e) === 'draft').length;
    const emptyQ = exams.filter(e => (e.question_count || 0) === 0).length;
    const overdue = exams.filter(e => e.deadline && new Date(e.deadline).getTime() < Date.now() && (e.submission_count || 0) === 0 && effectiveExamStatus(e) !== 'closed' && effectiveExamStatus(e) !== 'archived').length;
    return { drafts, emptyQ, overdue };
  }, [exams]);

  const classMap = useMemo(() => {
    const m = {};
    classes.forEach(c => { m[c.id] = [c.name, c.section].filter(Boolean).join(' — ') || c.name; });
    return m;
  }, [classes]);
  const classMeta = useMemo(() => {
    const m = {};
    classes.forEach(c => { m[c.id] = { name: [c.name, c.section].filter(Boolean).join(' — ') || c.name, count: Number(c.student_count) || 0 }; });
    return m;
  }, [classes]);

  const filteredExams = useMemo(() => {
    let out = [...exams];
    const q = search.trim().toLowerCase();
    if (q) {
      out = out.filter(e => {
        const className = (classMap[e.class_id] || '').toLowerCase();
        return e.title?.toLowerCase().includes(q) ||
          e.id?.toLowerCase().includes(q) ||
          e.type?.toLowerCase().includes(q) ||
          className.includes(q);
      });
    }
    if (statusFilter !== 'all') out = out.filter(e => effectiveExamStatus(e) === statusFilter);
    if (typeFilter !== 'all') out = out.filter(e => (e.type || 'major_exam') === typeFilter);
    out.sort((a, b) => {
      if (sortBy === 'created_desc') return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      if (sortBy === 'deadline_asc') {
        const da = a.deadline ? new Date(a.deadline).getTime() : Infinity;
        const db = b.deadline ? new Date(b.deadline).getTime() : Infinity;
        return da - db;
      }
      if (sortBy === 'submissions_desc') return (b.submission_count || 0) - (a.submission_count || 0);
      if (sortBy === 'title_asc') return (a.title || '').localeCompare(b.title || '');
      return 0;
    });
    return out;
  }, [exams, search, statusFilter, typeFilter, sortBy, classMap]);

  const hasActiveFilters = search.trim() || statusFilter !== 'all' || typeFilter !== 'all' || sortBy !== 'created_desc';
  const clearFilters = () => { setSearch(''); setStatusFilter('all'); setTypeFilter('all'); setSortBy('created_desc'); setPage(1); };

  // reset page when filters change
  useEffect(() => { setPage(1); }, [search, statusFilter, typeFilter, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredExams.length / PAGE_SIZE));
  const pagedExams = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredExams.slice(start, start + PAGE_SIZE);
  }, [filteredExams, page]);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    await api.deleteExam(deleteTarget.id).catch(e => toast.error(e.message));
    setDeleting(false);
    setDeleteTarget(null);
    toast.success('Exam deleted');
    load();
  };

  const copyId = (e) => {
    navigator.clipboard.writeText(e.id);
    toast.info('Exam ID copied');
  };

  const copyLink = (e) => {
    navigator.clipboard.writeText(window.location.origin + '/exam?id=' + e.id);
    toast.info('Exam link copied');
  };

  const doDuplicate = async (e) => {
    setDuplicating(e.id);
    try {
      const data = await api.duplicateExam(e.id);
      toast.success('Exam duplicated as draft');
      load();
      if (data?.id) navigate('/admin/create?id=' + data.id);
    } catch (err) { toast.error(err.message); }
    setDuplicating(null);
  };

  return (
    <AdminLayout title="Dashboard">
      <main className="max-w-[1100px] mx-auto px-4 py-6">
        {/* Hero */}
        <section className="flex flex-wrap items-end justify-between gap-4 mb-7">
          <div>
            <div className="text-[10px] font-semibold tracking-[.14em] uppercase text-faint mb-1.5">
              Workspace · Dashboard
            </div>
            <h1 className="text-[24px] sm:text-[28px] font-bold text-navy-800 leading-tight">
              Welcome back, <span className="text-navy-700">Admin</span>
            </h1>
            <p className="text-[13px] text-muted mt-1.5">
              <strong className="text-navy-800 font-semibold">{totalSubs}</strong> submission{totalSubs !== 1 ? 's' : ''} across{' '}
              <strong className="text-navy-800 font-semibold">{exams.length}</strong> exam{exams.length !== 1 ? 's' : ''} and{' '}
              <strong className="text-navy-800 font-semibold">{classes.length}</strong> class{classes.length !== 1 ? 'es' : ''}.
            </p>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <Button variant="outline" icon={Users} to="/admin/classes">Classes</Button>
            <Button icon={Plus} to="/admin/create">New Exam</Button>
          </div>
        </section>

        {/* KPI grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <StatCard icon={ClipboardList} value={exams.length} label="Total Exams" tone="navy"
            trend={{ dir: 'info', text: `${activeExams} open`, icon: <Radio size={11} /> }}
            note={`${statusCounts.draft} draft · ${statusCounts.scheduled} scheduled · ${statusCounts.closed} closed · ${statusCounts.archived} archived`} />
          <StatCard icon={BarChart3} value={totalSubs} label="Total Submissions" tone="green"
            trend={{ dir: 'up', text: 'live', icon: <TrendingUp size={11} /> }}
            note={`${fineStats.avgSubs} avg / exam · ${fineStats.totalQuestions} Q total`} />
          <StatCard icon={Users} value={students.length} label="Known Students" tone="accent"
            note={`${fineStats.totalEnroll} enrolled · ${fineStats.avgClassSize} avg / class`} />
          <StatCard icon={GraduationCap} value={classes.length} label="Classes" tone="red"
            note={`${fineStats.avgQ} Q avg / exam · ${classes.length ? 'roster coverage above' : 'no classes'}`} />
        </div>

        {/* Fine stats strip */}
        <div className="grid grid-cols-3 gap-2 mb-6">
          <div className="bg-surface border border-border rounded-lg px-3 py-2.5 flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-[.08em] uppercase text-faint">Avg subs / exam</span>
            <span className="text-[14px] font-bold text-navy-800">{fineStats.avgSubs}</span>
          </div>
          <div className="bg-surface border border-border rounded-lg px-3 py-2.5 flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-[.08em] uppercase text-faint">Avg Q / exam</span>
            <span className="text-[14px] font-bold text-navy-800">{fineStats.avgQ}</span>
          </div>
          <div className="bg-surface border border-border rounded-lg px-3 py-2.5 flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-[.08em] uppercase text-faint">Avg class size</span>
            <span className="text-[14px] font-bold text-navy-800">{fineStats.avgClassSize}</span>
          </div>
        </div>

        {/* Triage strip — shared PillsContainer */}
        <PillsContainer className="mb-4">
          {[
            { key: 'all', label: 'All', count: statusCounts.all },
            { key: 'draft', label: 'Draft', count: statusCounts.draft },
            { key: 'scheduled', label: 'Scheduled', count: statusCounts.scheduled },
            { key: 'active', label: 'Active', count: statusCounts.active },
            { key: 'closed', label: 'Closed', count: statusCounts.closed },
            { key: 'archived', label: 'Archived', count: statusCounts.archived },
          ].map(p => (
            <Pill
              key={p.key}
              active={statusFilter === p.key}
              onClick={() => setStatusFilter(p.key === 'all' ? 'all' : p.key)}
              label={p.label}
              count={p.count}
            />
          ))}
          {(needsAttention.drafts > 0 || needsAttention.emptyQ > 0) && (
            <span className="shrink-0 snap-start inline-flex items-center gap-1.5 text-[11px] text-warning ml-1 py-1.5">
              <Filter size={11} /> {needsAttention.drafts} drafts · {needsAttention.emptyQ} empty · {needsAttention.overdue} overdue (0 subs)
            </span>
          )}
        </PillsContainer>

        {/* C - Deadlines & Health (inline compact) */}
        <DeadlinesHealth exams={exams} classMap={classMap} />

        <PageHeader
          eyebrow="Exams"
          title="All Exams"
          subtitle={`${filteredExams.length} of ${exams.length} exam${exams.length !== 1 ? 's' : ''}${hasActiveFilters ? ' (filtered)' : ''}`}
          actions={
            <div className="flex gap-2">
              {hasActiveFilters && <Button size="sm" variant="outline" icon={X} onClick={clearFilters}>Clear filters</Button>}
              <Button size="sm" variant="outline" icon={RefreshCw} onClick={load} loading={loading}>Refresh</Button>
            </div>
          }
        />

        {/* Filters toolbar — shared SearchInput */}
        <div className="bg-surface border border-border rounded-xl p-3 sm:p-4 flex flex-col lg:flex-row gap-3 mb-4">
          <SearchInput value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by title, ID, or type…" onClear={() => setSearch('')} />
          <div className="flex gap-2 overflow-x-auto no-scrollbar snap-x snap-mandatory flex-nowrap pb-1 lg:pb-0 scroll-px-3 pr-1">
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="select !py-2.5 !text-[13px] !w-auto min-w-[130px] shrink-0 snap-start">
              <option value="all">All statuses</option>
              {Object.entries(EXAM_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="select !py-2.5 !text-[13px] !w-auto min-w-[140px] shrink-0 snap-start">
              <option value="all">All types</option>
              {Object.entries(EXAM_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="select !py-2.5 !text-[13px] !w-auto min-w-[160px] shrink-0 snap-start">
              <option value="created_desc">Newest first</option>
              <option value="deadline_asc">Deadline earliest</option>
              <option value="submissions_desc">Most submissions</option>
              <option value="title_asc">Title A–Z</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col gap-3.5">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-surface border border-border rounded-xl p-5 animate-pulse">
                <div className="h-4 bg-navy-50 rounded w-1/3 mb-3" />
                <div className="h-3 bg-navy-50 rounded w-2/3 mb-2" />
                <div className="h-3 bg-navy-50 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : !exams.length ? (
          <EmptyState
            icon={ClipboardList}
            title="No exams yet"
            body="Create your first exam to get started."
            action={<Button icon={Plus} to="/admin/create">Create Your First Exam</Button>}
          />
        ) : !filteredExams.length ? (
          <EmptyState
            icon={Search}
            title="No exams match your filters"
            body="Try clearing filters or searching for a different title, status, or type."
            action={<Button variant="outline" icon={X} onClick={clearFilters}>Clear filters</Button>}
          />
        ) : (
          <>
          <div className="flex flex-col gap-3.5">
            {pagedExams.map(e => (
              <Card key={e.id} padded={false} className="overflow-hidden card-hover">
                <div className="p-4 sm:p-5">
                  <div className="flex items-start gap-3">
                    <span className="w-10 h-10 rounded-xl bg-navy-700 text-white flex items-center justify-center shrink-0 font-bold text-[14px] shadow-sm">
                      {(e.title || '?').charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-[15px] font-semibold text-navy-800 leading-tight">{e.title}</h3>
                        {e.type ? <Badge tone="info">{examTypeLabel(e.type)}</Badge> : null}
                        <ExamStatus exam={e} />
                        <Badge tone={(e.question_count || 0) === 0 ? 'danger' : 'neutral'}>{e.question_count || 0} Q{(e.question_count || 0) === 0 ? ' · needs questions' : ''}</Badge>
                      </div>
                      <div className="flex gap-4 text-[12px] text-muted mt-1.5 flex-wrap">
                        <span className="inline-flex items-center gap-1.5"><Clock size={12} /> {e.time_limit} min</span>
                        <span className="inline-flex items-center gap-1.5"><BarChart3 size={12} /> {e.submission_count || 0} submission{(e.submission_count || 0) !== 1 ? 's' : ''}</span>
                        {e.deadline && <span className="inline-flex items-center gap-1.5"><CalendarClock size={12} /> Deadline {fmtDeadline(e.deadline)}</span>}
                        <span className={`inline-flex items-center gap-1.5 ${e.class_id ? 'text-navy-700' : 'text-faint'}`} title={e.class_id ? classMap[e.class_id] : 'Not linked to a class'}>
                          <GraduationCap size={12} /> {e.class_id ? (classMap[e.class_id] || 'Unknown class') : 'No class'}
                        </span>
                      </div>
                      {(() => {
                        const meta = classMeta[e.class_id];
                        if (!e.class_id || !meta || !meta.count) return null;
                        const subs = e.submission_count || 0;
                        const rawPct = meta.count ? Math.round((subs / meta.count) * 100) : 0;
                        const barPct = Math.min(100, rawPct);
                        const tone = rawPct >= 70 && rawPct <= 100 ? 'bg-success' : rawPct > 100 ? 'bg-info' : rawPct >= 30 ? 'bg-warning' : 'bg-danger';
                        const over = rawPct > 100;
                        return (
                          <div className="mt-2.5">
                            <div className="flex items-center justify-between text-[11px] text-faint mb-1">
                              <span>Coverage {subs}/{meta.count} · {rawPct}%{over ? ' · over' : ''}</span>
                              <span className={`${rawPct < 30 ? 'text-warning font-semibold' : over ? 'text-info font-semibold' : ''}`}>{over ? `${subs - meta.count} extra` : rawPct < 30 ? 'low' : rawPct >= 70 ? 'good' : ''}</span>
                            </div>
                            <div className="h-1.5 bg-navy-50 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full transition-all ${tone}`} style={{ width: barPct + '%' }} />
                            </div>
                            {over && <div className="text-[11px] text-info mt-1">More submissions than roster — roster may be outdated, retakes counted, or walk-ins from enrollment fix. Check <span className="font-mono">Class {meta.name}</span> roster.</div>}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                {/* Footer toolbar */}
                <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-2.5 bg-canvas/70 border-t border-border flex-wrap">
                  <div className="flex items-center gap-2.5 text-[11px] font-mono text-faint min-w-0">
                    <span className="truncate max-w-[200px]">{e.id}</span>
                    <span className="text-border-strong shrink-0">·</span>
                    <button onClick={() => copyId(e)} className="text-navy-700 hover:text-navy-800 font-sans cursor-pointer hover:underline shrink-0">copy ID</button>
                    <span className="text-border-strong shrink-0">·</span>
                    <button onClick={() => copyLink(e)} className="text-navy-700 hover:text-navy-800 font-sans cursor-pointer inline-flex items-center gap-1 hover:underline shrink-0">
                      <Copy size={11} /> link
                    </button>
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    <Button size="sm" variant="soft" title="Show QR" icon={QrCode} onClick={() => setQrExam(e)} />
                    <Button size="sm" variant="soft" title="Edit" icon={Pencil} to={"/admin/create?id=" + e.id} />
                    <Button size="sm" variant="soft" title="Preview" icon={FileText} to={"/admin/preview?id=" + e.id} />
                    <Button size="sm" variant="soft" title="Duplicate" icon={CopyPlus} loading={duplicating === e.id}
                      onClick={() => doDuplicate(e)} />
                    <span className="w-px h-6 bg-border self-center mx-0.5 hidden sm:block" />
                    <Button size="sm" variant="soft" title="Student answers" icon={Eye} to={"/admin/answers?id=" + e.id} />
                    <Button size="sm" variant="soft" title="Scores" icon={BarChart3} to={"/admin/results?id=" + e.id} />
                    <Button size="sm" variant="soft" title="Live proctoring" icon={Radio} to={"/admin/proctor?id=" + e.id} />
                    <Button size="sm" variant="dangerSoft" title="Delete" icon={Trash2} onClick={() => setDeleteTarget(e)} />
                  </div>
                </div>
              </Card>
            ))}
          </div>
          {filteredExams.length > PAGE_SIZE && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 px-1 py-1">
              <span className="text-[12px] text-faint order-2 sm:order-1">
                Showing <strong className="text-navy-800">{(page-1)*PAGE_SIZE+1}–{Math.min(page*PAGE_SIZE, filteredExams.length)}</strong> of <strong className="text-navy-800">{filteredExams.length}</strong>
              </span>
              <div className="flex items-center gap-1 order-1 sm:order-2">
                <button
                  onClick={() => setPage(1)}
                  disabled={page <= 1}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border text-muted bg-surface border-border hover:bg-navy-50 hover:text-navy-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  title="First page"
                >
                  <ChevronsLeft size={14} />
                </button>
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border text-muted bg-surface border-border hover:bg-navy-50 hover:text-navy-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  title="Previous"
                >
                  <ChevronLeft size={14} />
                </button>
                <div className="flex items-center gap-1 mx-1">
                  {(() => {
                    const pages = [];
                    const delta = 1;
                    const left = Math.max(2, page - delta);
                    const right = Math.min(totalPages - 1, page + delta);
                    pages.push(1);
                    if (left > 2) pages.push('…');
                    for (let i = left; i <= right; i++) pages.push(i);
                    if (right < totalPages - 1) pages.push('…');
                    if (totalPages > 1) pages.push(totalPages);
                    const uniq = [...new Set(pages)];
                    // handle small totalPages where dedup breaks order
                    const ordered = uniq.sort((a,b) => a === '…' ? 0 : b === '…' ? 0 : a-b);
                    // Actually keep original order with ellipsis in place
                    const final = [];
                    if (totalPages <= 5) {
                      for (let i=1;i<=totalPages;i++) final.push(i);
                    } else {
                      final.push(...pages);
                    }
                    return final.map((p, idx) =>
                      p === '…' ? <span key={'e'+idx} className="w-8 h-8 flex items-center justify-center text-faint text-[12px]">…</span> : (
                        <button
                          key={p}
                          onClick={() => setPage(p)}
                          className={`min-w-8 h-8 px-2 flex items-center justify-center rounded-lg border text-[13px] font-semibold transition-colors ${page === p ? 'bg-navy-700 text-white border-navy-700 shadow-sm' : 'bg-surface text-muted border-border hover:bg-navy-50 hover:text-navy-800 hover:border-navy-700/20'}`}
                        >
                          {p}
                        </button>
                      )
                    );
                  })()}
                </div>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border text-muted bg-surface border-border hover:bg-navy-50 hover:text-navy-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  title="Next"
                >
                  <ChevronRight size={14} />
                </button>
                <button
                  onClick={() => setPage(totalPages)}
                  disabled={page >= totalPages}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border text-muted bg-surface border-border hover:bg-navy-50 hover:text-navy-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  title="Last page"
                >
                  <ChevronsRight size={14} />
                </button>
              </div>
            </div>
          )}
          </>
        )}
      </main>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Exam?"
        body={
          <>
            You are about to delete <strong>{deleteTarget?.title}</strong>. This will also remove all
            questions and submissions.
          </>
        }
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={confirmDelete}
      />

      {/* QR per exam — scan to take exam */}
      <Modal open={!!qrExam} onClose={() => setQrExam(null)} title={qrExam ? qrExam.title : 'Exam QR'} icon={QrCode} size="sm">
        {qrExam && (
          <div className="text-center">
            {/* ID with icon-only copy — link copy is via the button under QR */}
            <div className="bg-canvas/60 border border-border rounded-lg p-2.5 mb-3 text-left">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold tracking-[.08em] uppercase text-faint shrink-0 w-7">ID</span>
                <span className="font-mono text-[11px] truncate flex-1 text-navy-700">{qrExam.id}</span>
                <button
                  onClick={() => { navigator.clipboard.writeText(qrExam.id); toast.info('ID copied'); }}
                  title="Copy ID"
                  aria-label="Copy ID"
                  className="w-7 h-7 flex items-center justify-center rounded-md bg-surface border border-border text-navy-700 hover:bg-navy-50 hover:text-navy-800 transition-colors cursor-pointer shrink-0"
                >
                  <Copy size={13} />
                </button>
              </div>
            </div>

            <div className="bg-white p-3 rounded-xl border border-border inline-block shadow-sm">
              {qr ? <img src={qr} alt="Exam QR" className="w-[240px] h-[240px] block" /> : <div className="w-[240px] h-[240px] flex items-center justify-center text-faint text-[12px]">Generating…</div>}
            </div>
            <p className="text-[11px] text-faint mt-3 leading-relaxed">Scan to open — enter your Student ID to begin</p>
            {qrExam.deadline && <p className="text-[11px] text-muted mt-1">Deadline: <strong className="text-navy-700">{fmtDeadline(qrExam.deadline)}</strong></p>}
            <div className="flex flex-wrap gap-1.5 justify-center mt-3">
              <Badge tone="info">{examTypeLabel(qrExam.type)}</Badge>
              <Badge tone={effectiveExamStatus(qrExam) === 'active' ? 'success' : effectiveExamStatus(qrExam) === 'closed' ? 'danger' : 'neutral'}>{EXAM_STATUS_LABELS[effectiveExamStatus(qrExam)] || qrExam.status}</Badge>
              <Badge tone="neutral">{qrExam.question_count || 0} Q · {qrExam.time_limit} min</Badge>
            </div>

            {/* Buttons under QR — compact, centered */}
            <div className="flex items-center justify-center gap-2 mt-4 flex-wrap">
              <Button size="sm" variant="soft" icon={Copy} onClick={() => { navigator.clipboard.writeText(window.location.origin + '/exam?id=' + qrExam.id); toast.info('Link copied'); }}>
                Copy Link
              </Button>
              <Button size="sm" variant="outline" icon={Download} onClick={() => {
                if (!qr) return;
                const a = document.createElement('a');
                a.href = qr;
                a.download = `exam-${qrExam.id.slice(0,8)}.png`;
                a.click();
                toast.info('QR downloaded');
              }}>
                Download
              </Button>
              <Button size="sm" variant="outline" icon={Printer} onClick={() => {
                const w = window.open('', '_blank', 'width=400,height=500');
                if (!w) { window.print(); return; }
                w.document.write(`<html><head><title>${qrExam.title} — QR</title><style>body{font-family:system-ui,sans-serif;text-align:center;padding:24px}img{width:320px;height:320px}h1{font-size:16px;margin:12px 0 4px}p{font-size:11px;color:#64748b;word-break:break-all}</style></head><body><h1>${qrExam.title}</h1><p>${window.location.origin + '/exam?id=' + qrExam.id}</p><p style="font-family:monospace;font-size:10px">${qrExam.id}</p><img src="${qr}" /><p>Scan to take the exam</p><script>window.onload=()=>window.print()<\/script></body></html>`);
                w.document.close();
              }}>
                Print
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </AdminLayout>
  );
}

function ExamStatus({ exam }) {
  const status = effectiveExamStatus(exam);
  const iconFor = {
    scheduled: <Clock size={10} />,
    active: <Lock size={10} />,
    closed: <Lock size={10} />,
  };
  return (
    <Badge tone={EXAM_STATUS_TONES[status] || 'neutral'}>
      {iconFor[status]} {EXAM_STATUS_LABELS[status] || status}
    </Badge>
  );
}

function fmtDeadline(deadline) {
  try {
    const d = new Date(deadline);
    if (isNaN(d.getTime())) return String(deadline).slice(0, 16).replace('T', ' ');
    return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  } catch { return String(deadline); }
}

function DeadlinesHealth({ exams, classMap }) {
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem('dash_deadlines_dismissed') === '1'; } catch { return false; }
  });
  const now = Date.now();
  const in7d = now + 7 * 24 * 60 * 60 * 1000;
  const withDeadline = exams.filter(e => e.deadline && !isNaN(new Date(e.deadline).getTime()));
  const upcoming = withDeadline.filter(e => { const t = new Date(e.deadline).getTime(); return t >= now && t <= in7d && (effectiveExamStatus(e) === 'active' || effectiveExamStatus(e) === 'scheduled'); }).sort((a, b) => new Date(a.deadline) - new Date(b.deadline)).slice(0, 5);
  const overdue = withDeadline.filter(e => new Date(e.deadline).getTime() < now && (effectiveExamStatus(e) === 'active' || effectiveExamStatus(e) === 'scheduled') ).slice(0, 5);
  const noDeadline = exams.filter(e => !e.deadline).length;
  const hasUrgent = upcoming.some(e => (new Date(e.deadline).getTime() - now) < 24*60*60*1000);
  if (!exams.length) return null;
  if (!upcoming.length && !overdue.length && !noDeadline) return null;
  if (dismissed) {
    const pillTone = overdue.length > 0 ? 'danger' : hasUrgent ? 'warning' : upcoming.length > 0 ? 'info' : 'neutral';
    const pillCls = pillTone === 'danger' ? 'bg-danger-bg text-danger border-danger/30 hover:bg-danger-bg/80'
      : pillTone === 'warning' ? 'bg-warning-bg text-warning border-warning/30 hover:bg-warning-bg/80'
      : pillTone === 'info' ? 'bg-info-bg text-info border-info/20 hover:bg-info-bg/80'
      : 'bg-surface text-muted border-border hover:text-navy-800';
    const pillLabel = overdue.length > 0 ? `${overdue.length} overdue`
      : hasUrgent ? `${upcoming.length} due <24h`
      : upcoming.length > 0 ? `${upcoming.length} due`
      : noDeadline ? `${noDeadline} no deadline` : 'deadlines';
    return (
      <div className="flex justify-end mb-3">
        <button
          onClick={() => { try { localStorage.removeItem('dash_deadlines_dismissed'); } catch {} setDismissed(false); }}
          className={`inline-flex items-center gap-1.5 text-[11px] font-semibold border rounded-full px-3 py-1.5 shadow-sm cursor-pointer transition-colors ${pillCls}`}
        >
          <Info size={12} /> Show deadlines info · {pillLabel}
        </button>
      </div>
    );
  }
  const dismiss = () => { try { localStorage.setItem('dash_deadlines_dismissed', '1'); } catch {} setDismissed(true); };
  const headerTone = overdue.length > 0 ? 'danger' : hasUrgent ? 'warning' : 'info';
  const headerBorder = headerTone === 'danger' ? 'border-danger/15' : headerTone === 'warning' ? 'border-warning/20' : 'border-info/15';
  const headerGrad = headerTone === 'danger' ? 'from-danger-bg/30 via-danger-bg/15' : headerTone === 'warning' ? 'from-warning-bg/40 via-warning-bg/20' : 'from-info-bg/40 via-info-bg/20';
  const headerIconBg = headerTone === 'danger' ? 'bg-danger' : headerTone === 'warning' ? 'bg-warning' : 'bg-info';
  return (
    <div className={`relative bg-surface border rounded-2xl shadow-sm overflow-hidden mb-4 ${headerBorder}`}>
      {/* Header — info style, works on mobile + dark */}
      <div className={`flex items-center justify-between gap-3 px-4 sm:px-5 py-3 bg-gradient-to-r ${headerGrad} to-surface border-b ${headerTone === 'danger' ? 'border-danger/10' : headerTone === 'warning' ? 'border-warning/10' : 'border-info/10'}`}>
        <div className="flex items-center gap-3 min-w-0">
          <span className={`w-8 h-8 rounded-xl text-white flex items-center justify-center shrink-0 shadow-sm ${headerIconBg}`}>
            <Info size={15} />
          </span>
          <div className="min-w-0">
            <div className="text-[13px] font-bold text-navy-800 leading-none">Deadlines & exam health</div>
            <div className="text-[11px] text-muted leading-none mt-1 truncate">
              {upcoming.length ? `${upcoming.length} due this week` : 'No upcoming deadlines'} · {overdue.length ? `${overdue.length} overdue` : 'no overdue'} {noDeadline ? `· ${noDeadline} no deadline` : ''}
            </div>
          </div>
        </div>
        <button
          onClick={dismiss}
          title="Dismiss"
          aria-label="Dismiss"
          className="w-7 h-7 flex items-center justify-center rounded-full bg-surface border border-border text-faint hover:text-navy-800 hover:border-navy-700/20 transition-colors cursor-pointer shrink-0"
        >
          <X size={14} />
        </button>
      </div>

      {/* Body — stacked on mobile, two cols on lg */}
      <div className="p-4 sm:p-5 grid gap-5 lg:grid-cols-[1fr_1fr] lg:gap-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-2.5 flex-wrap">
            <CalendarClock size={13} className="text-info shrink-0" />
            <span className="text-[11px] font-bold tracking-[.08em] uppercase text-navy-700">Due in 7 days</span>
            <Badge tone={hasUrgent ? 'warning' : 'info'}>{upcoming.length}</Badge>
            {hasUrgent && <Badge tone="warning">Due &lt;24h</Badge>}
          </div>
          {!upcoming.length ? (
            <div className="rounded-xl border border-dashed border-border bg-canvas/40 px-3.5 py-3 text-center">
              <p className="text-[12px] font-medium text-navy-700">No exams due this week</p>
              <p className="text-[11px] text-faint mt-0.5">You’re clear — no deadlines in the next 7 days.</p>
            </div>
          ) : (
            <div className="flex gap-2.5 overflow-x-auto no-scrollbar snap-x snap-mandatory pb-1 scroll-px-4 pr-1">
              {upcoming.map(e => {
                const hrs = Math.round((new Date(e.deadline).getTime() - now) / (60 * 60 * 1000));
                const urgent = hrs < 24;
                return (
                  <div key={e.id} className={`snap-start shrink-0 min-w-[200px] max-w-[240px] sm:min-w-[210px] rounded-xl border px-3.5 py-3 ${urgent ? 'bg-warning-bg/40 border-warning/30' : 'bg-canvas/40 border-border'}`}>
                    <div className="text-[13px] font-semibold text-navy-800 truncate leading-tight">{e.title}</div>
                    <div className="text-[11px] text-faint truncate mt-0.5">{classMap[e.class_id] || 'No class'}</div>
                    <div className={`inline-flex items-center gap-1 text-[11px] font-mono font-semibold mt-2 px-2 py-1 rounded-full ${urgent ? 'bg-warning text-white' : 'bg-navy-700 text-white'}`}>{fmtDeadline(e.deadline)}</div>
                    <div className="text-[11px] text-muted mt-1.5">{hrs < 24 ? `${hrs}h left` : `${Math.round(hrs/24)}d left`} · {e.submission_count || 0} subs</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="min-w-0 lg:pl-5 lg:border-l lg:border-info/10 pt-4 lg:pt-0 border-t lg:border-t-0 border-border">
          <div className="flex items-center gap-2 mb-2.5 flex-wrap">
            <Clock size={13} className={overdue.length ? 'text-danger' : 'text-faint'} />
            <span className="text-[11px] font-bold tracking-[.08em] uppercase text-navy-700">At risk</span>
            <Badge tone={overdue.length ? 'danger' : 'neutral'}>{overdue.length} overdue</Badge>
            {noDeadline > 0 && <span className="text-[11px] text-faint">· {noDeadline} no deadline</span>}
          </div>
          {!overdue.length ? (
            <div className="rounded-xl border border-success/15 bg-success-bg/30 px-3.5 py-3 flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-full bg-success text-white flex items-center justify-center shrink-0"><Info size={13} /></span>
              <div>
                <p className="text-[12px] font-semibold text-navy-800">No overdue exams</p>
                <p className="text-[11px] text-muted">All active exams are on track.</p>
              </div>
            </div>
          ) : (
            <div className="flex gap-2.5 overflow-x-auto no-scrollbar snap-x snap-mandatory pb-1 scroll-px-4 pr-1">
              {overdue.map(e => (
                <div key={e.id} className="snap-start shrink-0 min-w-[200px] max-w-[240px] sm:min-w-[210px] bg-danger-bg/30 border border-danger/20 rounded-xl px-3.5 py-3">
                  <div className="text-[13px] font-semibold text-navy-800 truncate leading-tight">{e.title}</div>
                  <div className="text-[11px] text-faint truncate mt-0.5">{e.submission_count || 0} subs · {e.question_count || 0} Q</div>
                  <div className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold mt-2 px-2 py-1 rounded-full bg-danger text-white">Overdue · {fmtDeadline(e.deadline)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}