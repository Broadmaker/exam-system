import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api';
import AdminLayout from '../../components/AdminLayout';
import { PageHeader, Card, Button, Input, Badge, EmptyState, Spinner, Modal, ConfirmDialog, useToast } from '../../components/ui';
import { SearchInput } from '../../components/ui/SearchInput';
import { PillsContainer, Pill } from '../../components/ui/Pills';
import { FileText, Trash2, Copy, Eye, Clock, Layers, GraduationCap, Library, ArrowRight, Check, Search, Filter, X } from 'lucide-react';
import { EXAM_TYPE_LABELS } from '../../utils';

export default function Templates() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [useTarget, setUseTarget] = useState(null);
  const [useTitle, setUseTitle] = useState('');
  const [using, setUsing] = useState(false);
  const [preview, setPreview] = useState(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const toast = useToast();
  const navigate = useNavigate();

  const load = useCallback(() => {
    setLoading(true);
    api.listTemplates().then(setTemplates).catch(e=>toast.error(e.message)).finally(()=>setLoading(false));
  }, [toast]);

  useEffect(()=>{ load(); }, [load]);

  const filtered = useMemo(() => {
    let out = [...templates];
    const q = search.trim().toLowerCase();
    if (q) out = out.filter(t => t.title?.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q) || t.type?.toLowerCase().includes(q));
    if (typeFilter !== 'all') out = out.filter(t => (t.type || 'major_exam') === typeFilter);
    return out.sort((a,b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0));
  }, [templates, search, typeFilter]);

  const hasActiveFilters = search.trim() || typeFilter !== 'all';

  const del = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try { await api.deleteTemplate(deleteTarget.id); toast.success('Template deleted'); setDeleteTarget(null); load(); } catch(e){ toast.error(e.message); }
    setDeleting(false);
  };

  const openUse = (t) => { setUseTarget(t); setUseTitle(t.title + ' Copy'); };
  const confirmUse = async () => {
    if (!useTarget) return;
    setUsing(true);
    try {
      const res = await api.useTemplate(useTarget.id, { title: useTitle.trim() || undefined });
      toast.success(`Created exam from template (${res.question_count} questions)`);
      setUseTarget(null);
      navigate('/admin/create?id=' + res.id);
    } catch(e){ toast.error(e.message); }
    setUsing(false);
  };

  const openPreview = async (t) => {
    try { const data = await api.getTemplate(t.id); setPreview(data); } catch(e){ toast.error(e.message); }
  };

  const typeCounts = useMemo(() => {
    const c = {};
    templates.forEach(t => { const k = t.type || 'major_exam'; c[k] = (c[k]||0)+1; });
    return c;
  }, [templates]);

  return (
    <AdminLayout title="Exam Templates">
      <main className="max-w-[960px] mx-auto px-4 py-6">
        <PageHeader
          eyebrow="Exams · Upscale §66"
          title="Exam Templates"
          subtitle={`${filtered.length} of ${templates.length} template${templates.length!==1?'s':''} — save exam shells + questions, then one-click create next term`}
          icon={Library}
        />

        {/* Stats strip */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-surface border border-border rounded-xl px-3.5 py-3 flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-[.08em] uppercase text-faint">Total</span>
            <span className="text-[16px] font-bold text-navy-800">{templates.length}</span>
          </div>
          <div className="bg-surface border border-border rounded-xl px-3.5 py-3 flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-[.08em] uppercase text-faint">Avg Qs</span>
            <span className="text-[16px] font-bold text-navy-800">{templates.length ? (templates.reduce((a,t)=>a+(t.question_count||0),0)/templates.length).toFixed(1) : '—'}</span>
          </div>
          <div className="bg-surface border border-border rounded-xl px-3.5 py-3 flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-[.08em] uppercase text-faint">Types</span>
            <span className="text-[16px] font-bold text-navy-800">{Object.keys(typeCounts).length || '—'}</span>
          </div>
        </div>

        {/* Toolbar — shared SearchInput */}
        <div className="bg-surface border border-border rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row gap-3 mb-4 shadow-sm">
          <SearchInput value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by title, description or type…" onClear={()=>setSearch('')} />
          <div className="flex items-center gap-2 shrink-0">
            <select value={typeFilter} onChange={e=>setTypeFilter(e.target.value)} className="select !py-2.5 !text-[13px] !w-auto min-w-[140px]">
              <option value="all">All types</option>
              {Object.entries(EXAM_TYPE_LABELS).map(([k,v])=><option key={k} value={k}>{v}</option>)}
            </select>
            {hasActiveFilters && <Button size="sm" variant="ghost" icon={X} onClick={()=>{setSearch(''); setTypeFilter('all');}}>Clear</Button>}
          </div>
        </div>

        {/* Type pills — horizontally scrollable */}
        <PillsContainer className="mb-4">
          <Pill active={typeFilter==='all'} onClick={()=>setTypeFilter('all')} label="All" count={templates.length} />
          {Object.entries(typeCounts).map(([k,c])=>(
            <Pill key={k} active={typeFilter===k} onClick={()=>setTypeFilter(k)} label={EXAM_TYPE_LABELS[k]||k} count={c} />
          ))}
        </PillsContainer>

        {loading ? <Spinner label="Loading templates..." /> : !templates.length ? (
          <EmptyState icon={Library} title="No templates yet" body="Open any exam in Create Exam and click 'Save as Template' to reuse its title, settings, and questions." compact />
        ) : !filtered.length ? (
          <EmptyState icon={Search} title="No matches" body={`No templates match "${search}"`} compact action={<Button variant="outline" icon={X} onClick={()=>{setSearch(''); setTypeFilter('all');}}>Clear filters</Button>} />
        ) : (
          <div className="grid sm:grid-cols-2 gap-3.5">
            {filtered.map(t => {
              const letter = (t.title || '?').charAt(0).toUpperCase();
              return (
                <Card key={t.id} className="!p-0 overflow-hidden card-hover flex flex-col">
                  <div className="h-1 bg-gradient-to-r from-navy-700 via-navy-600 to-accent" />
                  <div className="p-4 flex flex-col gap-3 flex-1">
                    <div className="flex items-start gap-3">
                      <span className="w-9 h-9 rounded-xl bg-navy-700 text-white flex items-center justify-center shrink-0 font-bold text-[13px] shadow-sm">{letter}</span>
                      <div className="min-w-0 flex-1">
                        <div className="text-[14px] font-bold text-navy-800 truncate leading-tight">{t.title}</div>
                        <div className="text-[12px] text-muted truncate mt-0.5">{t.description || '— no description —'}</div>
                      </div>
                      <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-bold tracking-[.06em] uppercase bg-navy-50 text-navy-700 border border-border rounded-full px-2 py-1">{t.question_count} Qs</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge tone="info">{EXAM_TYPE_LABELS[t.type] || t.type}</Badge>
                      <span className="inline-flex items-center gap-1 text-[11px] text-muted bg-canvas border border-border rounded-full px-2 py-1"><Clock size={11}/> {t.time_limit}m</span>
                      <span className="inline-flex items-center gap-1 text-[11px] text-muted bg-canvas border border-border rounded-full px-2 py-1"><GraduationCap size={11}/> {t.passing_score}% pass</span>
                    </div>
                    <div className="text-[11px] text-faint">Updated {new Date(t.updated_at+'Z').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                  </div>
                  <div className="px-4 py-2.5 bg-canvas/40 border-t border-border flex items-center justify-between gap-2">
                    <div className="flex gap-1.5">
                      <Button size="sm" icon={Copy} onClick={()=>openUse(t)}>Use</Button>
                      <Button size="sm" variant="soft" icon={Eye} onClick={()=>openPreview(t)}>View</Button>
                    </div>
                    <button onClick={()=>setDeleteTarget(t)} className="w-7 h-7 flex items-center justify-center rounded-lg text-faint hover:text-danger hover:bg-danger-bg transition-colors cursor-pointer" title="Delete"><Trash2 size={13} /></button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Use modal */}
        <Modal open={!!useTarget} onClose={()=>setUseTarget(null)} title={`Use template: ${useTarget?.title}`} icon={Copy} size="sm"
          footer={<><Button variant="ghost" onClick={()=>setUseTarget(null)}>Cancel</Button><Button icon={ArrowRight} loading={using} onClick={confirmUse}>Create Exam</Button></>}>
          <Input label="New exam title" value={useTitle} onChange={e=>setUseTitle(e.target.value)} placeholder={useTarget?.title + ' Copy'} />
          <p className="text-[11px] text-faint mt-2 leading-relaxed">A new draft exam will be created with this template’s description, type, time limit, passing score, and {useTarget?.question_count || 0} questions. You can edit it before publishing.</p>
        </Modal>

        {/* Preview modal — improved */}
        <Modal open={!!preview} onClose={()=>setPreview(null)} title={preview?.title} icon={FileText} size="md">
          {preview && (
            <div className="flex flex-col gap-4">
              <div className="bg-canvas/40 border border-border rounded-xl p-3.5">
                <div className="text-[13px] text-navy-800 leading-relaxed">{preview.description || '— no description —'}</div>
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  <Badge tone="info">{EXAM_TYPE_LABELS[preview.type] || preview.type}</Badge>
                  <Badge tone="neutral">{preview.time_limit} min</Badge>
                  <Badge tone="neutral">{preview.question_count || preview.questions?.length || 0} questions</Badge>
                  <Badge tone="neutral">{preview.passing_score}% pass</Badge>
                </div>
              </div>
              <div className="max-h-[360px] overflow-y-auto border border-border rounded-xl divide-y divide-border bg-surface">
                {(preview.questions || []).map((q,i)=> (
                  <div key={q.id} className="px-4 py-3">
                    <div className="flex items-start gap-2">
                      <span className="w-6 h-6 rounded-full bg-navy-700 text-white flex items-center justify-center text-[11px] font-bold shrink-0">{i+1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-medium text-navy-800 leading-relaxed">{q.text}</div>
                        <div className="text-[11px] text-muted mt-1.5 bg-canvas border border-border rounded-lg px-2.5 py-1.5">
                          {(q.type||'multiple_choice')==='fill_blank' ? <span>Answer: <strong className="text-navy-700">{q.answer}</strong></span> : <span>{(JSON.parse(q.choices||'[]').map(c=>c.key+'. '+c.text).join('  ') || '—')} <span className="text-success font-bold">→ {q.answer}</span></span>}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {!preview.questions?.length && <p className="text-[12px] text-faint p-6 text-center">No questions in template.</p>}
              </div>
            </div>
          )}
        </Modal>

        <ConfirmDialog open={!!deleteTarget} onClose={()=>setDeleteTarget(null)} title="Delete template?" body={deleteTarget ? <>Delete <strong>{deleteTarget.title}</strong>? This cannot be undone.</>:''} confirmLabel="Delete" loading={deleting} onConfirm={del} />
      </main>
    </AdminLayout>
  );
}
