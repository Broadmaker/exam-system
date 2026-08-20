import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../api';
import AdminLayout from '../../components/AdminLayout';
import { parseChoices } from '../../utils';
import { PageHeader, Spinner, Card, EmptyState } from '../../components/ui';
import { FileText, FolderOpen, Lightbulb, CheckCircle2, HelpCircle } from 'lucide-react';

export default function Preview() {
  return <AdminLayout title="Preview Exam"><PreviewInner /></AdminLayout>;
}

function PreviewInner() {
  const [params] = useSearchParams();
  const examId = params.get('id');
  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!examId) return;
    api.getExam(examId).then(data => {
      setExam(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [examId]);

  if (!examId) {
    return <main className="max-w-[860px] mx-auto px-4 py-6"><EmptyState icon={FolderOpen} title="No exam selected" body="Select an exam from the Dashboard to preview." /></main>;
  }
  if (loading) return <main className="max-w-[860px] mx-auto px-4 py-6"><Spinner label="Loading exam..." /></main>;
  if (!exam) return <main className="max-w-[860px] mx-auto px-4 py-6"><EmptyState icon={HelpCircle} title="Exam not found" /></main>;

  const parts = [...new Set((exam.questions || []).map(q => q.part))].sort();

  return (
    <main className="max-w-[860px] mx-auto px-4 py-6">
      <PageHeader
        eyebrow="Exams"
        title={exam.title || 'Exam Preview'}
        subtitle={`${exam.questions?.length || 0} questions · ${exam.time_limit} min`}
        icon={FileText}
      />

      {exam.description && (
        <div className="bg-navy-50 border border-border rounded-[10px] px-5 py-4 mb-6 text-[13px] text-muted">
          {exam.description}
        </div>
      )}

      {!exam.questions?.length ? (
        <EmptyState icon={FileText} title="No questions in this exam" />
      ) : (
        parts.map(part => (
          <div key={part} className="mb-7">
            <div className="flex items-center gap-2.5 mb-3.5 pb-2 border-b-2 border-navy-900">
              <span className="bg-navy-900 text-white text-[10px] font-bold px-2.5 py-0.5 rounded tracking-[.06em]">PART {part}</span>
              <span className="text-[12px] text-muted">
                {exam.questions.filter(q => q.part === part).length} question{exam.questions.filter(q => q.part === part).length !== 1 ? 's' : ''}
              </span>
            </div>

            {exam.questions
              .filter(q => q.part === part)
              .sort((a, b) => a.sort_order - b.sort_order)
              .map((q, i) => {
                const qType = q.type || 'multiple_choice';
                const choices = parseChoices(q.choices);
                return (
                  <Card key={q.id} className="!p-5 mb-3">
                    <div className="font-mono text-[10px] text-muted mb-2 tracking-wide">Q{i + 1}</div>
                    <div className="text-[14.5px] leading-relaxed mb-3.5" dangerouslySetInnerHTML={{ __html: q.text }} />
                    {qType === 'fill_blank' ? (
                      <div className="flex items-center gap-2.5 px-3.5 py-2.5 border-[1.5px] border-dashed border-navy-700 rounded-md text-[14px] bg-navy-50 text-navy-700">
                        Answer: <strong>{q.answer}</strong>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1.5">
                        {choices.map(c => {
                          const correct = c.key === q.answer;
                          return (
                            <div key={c.key} className={`flex items-center gap-2.5 px-3 py-2 border-[1.5px] rounded-md text-[14px] ${correct ? 'border-success bg-success-bg text-success font-semibold' : 'border-border bg-navy-50 text-text'}`}>
                              <span className="font-mono text-[12px] font-bold min-w-[18px]">{c.key})</span>
                              <span>{c.text}</span>
                              {correct && <span className="ml-auto"><CheckCircle2 size={14} /></span>}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {q.explain && (
                      <div className="mt-3 text-[12px] text-navy-700 leading-relaxed px-3.5 py-2 bg-navy-100 rounded-md">
                        <Lightbulb size={12} className="inline -mt-0.5 mr-1" /> {q.explain}
                      </div>
                    )}
                  </Card>
                );
              })}
          </div>
        ))
      )}
    </main>
  );
}