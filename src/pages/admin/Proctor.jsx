import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../../api';
import AdminLayout from '../../components/AdminLayout';
import QRCode from 'qrcode';
import { PageHeader, Card, Select, Badge, Button, EmptyState, Spinner, ConfirmDialog, useToast } from '../../components/ui';
import { Radio, UserCheck, AlertTriangle, XCircle, CheckCircle, QrCode, Copy, RefreshCw, Ban, Clock, MonitorUp } from 'lucide-react';

export default function Proctor() {
  const [params] = useSearchParams();
  const [exams, setExams] = useState([]);
  const [examId, setExamId] = useState(params.get('id') || '');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const [qr, setQr] = useState('');
  const [qrOpen, setQrOpen] = useState(false);
  const [kickTarget, setKickTarget] = useState(null);
  const [kicking, setKicking] = useState(false);

  useEffect(() => { api.listExams().then(setExams).catch(e => toast.error(e.message)); }, []);

  const load = useCallback(() => {
    if (!examId) return;
    setLoading(true);
    api.getProctor(examId).then(setData).catch(e => toast.error(e.message)).finally(() => setLoading(false));
  }, [examId, toast]);

  useEffect(() => {
    if (!examId) { setData(null); return; }
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [examId, load]);

  const exam = useMemo(() => exams.find(e => e.id === examId), [exams, examId]);

  useEffect(() => {
    if (!examId || !qrOpen) return;
    QRCode.toDataURL(window.location.origin + '/exam?id=' + encodeURIComponent(examId), {
      width: 280, margin: 1, color: { dark: '#0b1b3a', light: '#ffffff' },
    }).then(url => setQr(url)).catch(() => {});
  }, [examId, qrOpen]);

  const [clearing, setClearing] = useState(false);
  const kick = async () => {
    if (!kickTarget) return;
    setKicking(true);
    try {
      const res = await api.kickStudent(examId, kickTarget.id);
      if (res.offline || res.isStale) {
        toast.info(res.note || `Stale session closed for ${kickTarget.student_name} — student is offline, score preserved. Use Allow Retry if they need a retake.`);
      } else {
        toast.success(res.note || `Session ended for ${kickTarget.student_name}`);
      }
      setKickTarget(null);
      load();
    } catch (e) { toast.error(e.message); }
    setKicking(false);
  };
  const clearStale = async () => {
    setClearing(true);
    try {
      const res = await api.cleanupStale(examId);
      toast.success(`Cleared ${res.cleared ?? 0} stale session(s)`);
      load();
    } catch (e) { toast.error(e.message); }
    setClearing(false);
  };

  const toggleRetry = async (sub) => {
    const next = !sub.retry_allowed;
    try {
      await api.allowRetry(examId, sub.student_id, next);
      toast.success(`${sub.student_name}: retry ${next ? 'allowed' : 'revoked'}`);
      load();
    } catch (e) { toast.error(e.message); }
  };

  const copyExamLink = () => {
    navigator.clipboard.writeText(window.location.origin + '/exam?id=' + encodeURIComponent(examId));
    toast.info('Exam link copied');
  };

  const now = Date.now();
  const fmtLastSeen = (ts) => {
    const t = new Date(ts + (ts.includes('T') ? '' : 'Z'));
    const diff = Math.floor((now - t.getTime()) / 1000);
    if (diff < 60) return diff + 's ago';
    if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
    return t.toLocaleTimeString();
  };

  const SessionRow = ({ s, action }) => (
    <div className={`flex items-center gap-3 px-3.5 py-2.5 border rounded-lg flex-wrap ${s.tab_switches > 0 ? 'bg-warning-bg/50 border-warning' : 'bg-surface border-border'}`}>
      <div className="flex-1 min-w-[180px]">
        <div className="font-semibold text-[14px] text-navy-800">
          {s.student_name} <span className="font-normal text-muted text-[12px]">· {s.student_section}</span>
        </div>
        <div className="text-[11px] text-faint font-mono">{s.student_id}</div>
      </div>
      {s.tab_switches > 0 && (
        <Badge tone="warning"><AlertTriangle size={12} /> {s.tab_switches} tab switch{s.tab_switches > 1 ? 'es' : ''}</Badge>
      )}
      {s.last_seen && <span className="text-[12px] text-muted">seen {fmtLastSeen(s.last_seen)}</span>}
      {s.submitted_at && <span className="text-[12px] text-muted">{fmtLastSeen(s.submitted_at)}</span>}
      {s.score !== undefined && (
        <span className={`text-[14px] font-bold ${s.score >= s.total * 0.7 ? 'text-success' : 'text-danger'}`}>{s.score}/{s.total}</span>
      )}
      {action}
    </div>
  );

  return (
    <AdminLayout title="Live Proctoring">
      <main className="max-w-[1000px] mx-auto px-4 py-6">
        <PageHeader
          eyebrow="Monitoring"
          title="Live Proctoring"
          subtitle="Auto-refreshes every 5 seconds."
          icon={Radio}
          actions={
            <Select value={examId} onChange={e => setExamId(e.target.value)} className="!w-64 !m-0">
              <option value="" disabled>Select an exam…</option>
              {exams.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
            </Select>
          }
        />

        {!examId ? (
          <EmptyState icon={MonitorUp} title="Select an exam to start monitoring" body="Watch live sessions, violations, and kick students mid-exam." />
        ) : (
          <>
            <div className="flex gap-2 flex-wrap mb-5">
              <Button size="sm" variant="outline" icon={Copy} onClick={copyExamLink}>Copy Exam Link</Button>
              <Button size="sm" variant="outline" icon={QrCode} onClick={() => setQrOpen(!qrOpen)}>{qrOpen ? 'Hide Check-in QR' : 'Show Check-in QR'}</Button>
              <Button size="sm" variant="outline" icon={RefreshCw} onClick={load}>Refresh Now</Button>
              {exam?.access_code && (
                <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-navy-700 bg-navy-100 border border-border rounded-md px-3 py-1.5">
                  <Clock size={13} /> Access Code: <strong className="tracking-[.08em]">{exam.access_code}</strong>
                </span>
              )}
            </div>

            {qrOpen && (
              <Card className="mb-5 flex items-center gap-5 p-5 flex-wrap">
                <div className="bg-surface p-2.5 rounded-lg border border-border">
                  {qr ? <img src={qr} alt="Check-in QR" className="block" /> : <div className="w-[280px] h-[280px] flex items-center justify-center text-faint text-[12px]">Generating…</div>}
                </div>
                <div className="flex-1 min-w-[220px]">
                  <h3 className="text-[16px] text-navy-800 mb-2 flex items-center gap-1.5"><QrCode size={16} /> Check-in QR</h3>
                  <p className="text-[13px] text-muted leading-relaxed">
                    Project this for students to scan. It opens the exam page where they enter their
                    Student ID, name, section, and the <strong>access code</strong>{' '}
                    {exam?.access_code ? <span className="font-mono text-navy-700">“{exam.access_code}”</span> : '(none set — add one in Edit Exam to require check-in)'}.
                  </p>
                </div>
              </Card>
            )}

            {loading && <Spinner label="Loading live sessions..." />}

            {data && (
              <div className="flex flex-col gap-5">
                {/* Active */}
                <Card title={`Currently Taking (${data.active.length})`} icon={UserCheck} className="!mb-0">
                  {!data.active.length ? (
                    <p className="text-[13px] text-muted">No active sessions right now.</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {data.active.map(s => (
                        <SessionRow key={s.id} s={s}
                          action={
                            <>
                              <span className="text-[12px] text-muted">started {fmtLastSeen(s.started_at)}</span>
                              <Button size="sm" variant="danger" icon={Ban} onClick={() => setKickTarget(s)}>Kick</Button>
                            </>
                          }
                        />
                      ))}
                    </div>
                  )}
                </Card>

                {/* Stale */}
                {data.stale.length > 0 && (
                  <Card title={`Stale / Disconnected (${data.stale.length})`} icon={AlertTriangle} className="!mb-0"
                    actions={
                      <span className="flex items-center gap-2">
                        <span className="text-[11px] text-muted">no heartbeat for 75s+ (offline or closed)</span>
                        <Button size="sm" variant="outline" icon={RefreshCw} onClick={clearStale} loading={clearing}>Clear Stale</Button>
                      </span>
                    }>
                    <p className="text-[11px] text-faint mb-2 leading-relaxed">Kick on a stale row only closes it — it does not submit or overwrite the score (server guard). Use <strong>Allow Retry</strong> below to let the student re-take.</p>
                    <div className="flex flex-col gap-2">
                      {data.stale.map(s => (
                        <SessionRow key={s.id} s={s}
                          action={<Button size="sm" variant="danger" icon={Ban} onClick={() => setKickTarget(s)}>Close</Button>} />
                      ))}
                    </div>
                  </Card>
                )}

                {/* Kicked */}
                {data.kicked.length > 0 && (
                  <Card title={`Kicked Sessions (${data.kicked.length})`} icon={XCircle} className="!mb-0">
                    <div className="flex flex-col gap-2">
                      {data.kicked.map(s => (
                        <SessionRow key={s.id} s={s} />
                      ))}
                    </div>
                  </Card>
                )}

                {/* Submitted */}
                <Card title={`Recently Submitted (${data.submitted.length})`} icon={CheckCircle} className="!mb-0">
                  {!data.submitted.length ? (
                    <p className="text-[13px] text-muted">No submissions yet.</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {data.submitted.slice(0, 15).map((s, i) => (
                        <SessionRow key={i} s={s}
                          action={
                            <>
                              {s.retry_allowed && <Badge tone="success">Retry on</Badge>}
                              <Button size="sm" variant={s.retry_allowed ? 'danger' : 'outline'}
                                onClick={() => toggleRetry(s)}>
                                {s.retry_allowed ? 'Revoke Retry' : 'Allow Retry'}
                              </Button>
                              <Button size="sm" variant="outline" to={"/admin/answers?id=" + examId}>View</Button>
                            </>
                          }
                        />
                      ))}
                    </div>
                  )}
                </Card>
              </div>
            )}
          </>
        )}
      </main>

      <ConfirmDialog
        open={!!kickTarget}
        onClose={() => setKickTarget(null)}
        title="End Student Session?"
        body={
          kickTarget ? <><div>End <strong>{kickTarget.student_name}</strong>'s exam session?</div><div className="text-[11px] text-muted mt-2">If the student is online their answers auto-submit. If offline/stale, kicking only closes the row and preserves the previous score — it does not create a zero.</div></> : ''
        }
        confirmLabel="End Session"
        loading={kicking}
        onConfirm={kick}
      />
    </AdminLayout>
  );
}