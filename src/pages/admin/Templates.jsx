import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api';
import AdminLayout from '../../components/AdminLayout';
import { PageHeader, Card, Button, Input, Select, TextArea, Badge, EmptyState, Spinner, Modal, ConfirmDialog, useToast } from '../../components/ui';
import { FileText, Plus, Trash2, Copy, Eye, Clock, Layers, GraduationCap, Pencil, Library, Save, ArrowRight, Check } from 'lucide-react';
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
  const toast = useToast();
  const navigate = useNavigate();

  const load = useCallback(() => {
    setLoading(true);
    api.listTemplates().then(setTemplates).catch(e=>toast.error(e.message)).finally(()=>setLoading(false));
  }, [toast]);

  useEffect(()=>{ load(); }, [load]);

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

  return (
    <AdminLayout title="Exam Templates">
      <main className="max-w-[960px] mx-auto px-4 py-6">
        <PageHeader
          eyebrow="Exams · Upscale §66"
          title="Exam Templates"
          subtitle={`${templates.length} template${templates.length!==1?'s':''} — save exam shells + questions, then one-click create next term`}
          icon={Library}
        />

        {loading ? <Spinner label="Loading templates..." /> : !templates.length ? (
          <EmptyState icon={Library} title="No templates yet" body="Open any exam in Create Exam and click 'Save as Template' to reuse its title, settings, and questions." compact />
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {templates.map(t => (
              <Card key={t.id} className="!p-4 !mb-0 flex flex-col gap-2.5">
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0">
                    <div className="text-[14px] font-semibold text-navy-800 truncate">{t.title}</div>
                    <div className="text-[12px] text-muted truncate">{t.description || '— no description —'}</div>
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      <Badge tone="info">{EXAM_TYPE_LABELS[t.type] || t.type}</Badge>
                      <span className="inline-flex items-center gap-1 text-[11px] text-muted"><Clock size={11}/> {t.time_limit}m</span>
                      <span className="inline-flex items-center gap-1 text-[11px] text-muted"><Layers size={11}/> {t.question_count} Qs</span>
                      <span className="inline-flex items-center gap-1 text-[11px] text-muted"><GraduationCap size={11}/> {t.passing_score}% pass</span>
                    </div>
                    <div className="text-[11px] text-faint mt-1">Updated {new Date(t.updated_at+'Z').toLocaleDateString()}</div>
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    <Button size="sm" icon={Copy} onClick={()=>openUse(t)}>Use</Button>
                    <Button size="sm" variant="soft" icon={Eye} onClick={()=>openPreview(t)}>View</Button>
                    <button onClick={()=>setDeleteTarget(t)} className="text-[11px] text-faint hover:text-danger text-center py-1">Delete</button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Use modal */}
        <Modal open={!!useTarget} onClose={()=>setUseTarget(null)} title={`Use template: ${useTarget?.title}`} icon={Copy} size="sm"
          footer={<><Button variant="ghost" onClick={()=>setUseTarget(null)}>Cancel</Button><Button icon={ArrowRight} loading={using} onClick={confirmUse}>Create Exam</Button></>}>
          <Input label="New exam title" value={useTitle} onChange={e=>setUseTitle(e.target.value)} placeholder={useTarget?.title + ' Copy'} />
          <p className="text-[11px] text-faint mt-2">A new draft exam will be created with this template’s description, type, time limit, passing score, and {useTarget?.question_count || 0} questions. You can edit it before publishing.</p>
        </Modal>

        {/* Preview modal */}
        <Modal open={!!preview} onClose={()=>setPreview(null)} title={preview?.title} icon={FileText} size="md">
          {preview && (
            <div className="flex flex-col gap-3">
              <div className="text-[13px] text-muted">{preview.description || '—'}</div>
              <div className="flex flex-wrap gap-1.5">
                <Badge tone="info">{EXAM_TYPE_LABELS[preview.type] || preview.type}</Badge>
                <Badge tone="neutral">{preview.time_limit} min</Badge>
                <Badge tone="neutral">{preview.question_count || preview.questions?.length || 0} questions</Badge>
              </div>
              <div className="max-h-[320px] overflow-y-auto border border-border rounded-lg divide-y divide-border">
                {(preview.questions || []).map((q,i)=> (
                  <div key={q.id} className="px-3 py-2.5 text-[13px]">
                    <div className="font-medium">Q{i+1}. {q.text}</div>
                    <div className="text-[11px] text-muted mt-1">{(q.type||'multiple_choice')==='fill_blank' ? `Answer: ${q.answer}` : `${JSON.parse(q.choices||'[]').map(c=>c.key+'. '+c.text).join('  ')} → ${q.answer}`}</div>
                  </div>
                ))}
                {!preview.questions?.length && <p className="text-[12px] text-faint p-4">No questions in template.</p>}
              </div>
            </div>
          )}
        </Modal>

        <ConfirmDialog open={!!deleteTarget} onClose={()=>setDeleteTarget(null)} title="Delete template?" body={deleteTarget ? <>Delete <strong>{deleteTarget.title}</strong>? This cannot be undone.</>:''} confirmLabel="Delete" loading={deleting} onConfirm={del} />
      </main>
    </AdminLayout>
  );
}
