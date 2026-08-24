import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import PublicLayout from '../components/PublicLayout';
import { Card, Button, Input, Badge, EmptyState, Spinner, useToast } from '../components/ui';
import { Bell, CheckCheck, Eye, GraduationCap, Megaphone, BookOpen, CalendarCheck, Search, BellRing, Smartphone, ShieldCheck, BellOff } from 'lucide-react';

const TYPE_LABELS = {
  assessment_published: 'New Assessment',
  assessment_reminder: 'Reminder',
  assessment_submitted: 'Submitted',
  result_published: 'Result',
  grade_changed: 'Grade Updated',
  attendance_recorded: 'Attendance',
  announcement: 'Announcement',
};

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export default function Notifications() {
  const [studentId, setStudentId] = useState(() => localStorage.getItem('notif_student_id') || '');
  const [inputId, setInputId] = useState(studentId);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [unread, setUnread] = useState(0);
  const [error, setError] = useState('');
  const [pushSupported, setPushSupported] = useState(false);
  const [pushPermission, setPushPermission] = useState('default');
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [pushError, setPushError] = useState('');
  const toast = useToast();

  const load = useCallback(async (sid) => {
    if (!sid) { setItems([]); setUnread(0); return; }
    setLoading(true); setError('');
    try {
      const data = await api.listNotifications({ student_id: sid, limit: 50 });
      setItems(Array.isArray(data) ? data : []);
      try { const u = await api.getUnreadCount(sid); setUnread(u.count || 0); } catch { setUnread(data.filter(r=>!r.is_read).length); }
    } catch (e) { setError(e.message); }
    setLoading(false);
  }, []);

  useEffect(() => { if (studentId) { localStorage.setItem('notif_student_id', studentId); load(studentId); } }, [studentId, load]);

  // Push support check
  useEffect(() => {
    const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    setPushSupported(supported);
    if (supported) setPushPermission(Notification.permission);
  }, []);

  // Check existing subscription for this student
  useEffect(() => {
    if (!pushSupported || !studentId) { setPushSubscribed(false); return; }
    (async () => {
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        setPushSubscribed(!!sub);
        if (sub) setPushPermission(Notification.permission);
      } catch { setPushSubscribed(false); }
    })();
  }, [pushSupported, studentId]);

  const refreshPushState = async () => {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      setPushSubscribed(!!sub);
      setPushPermission(Notification.permission);
    } catch {}
  };

  const enablePush = async () => {
    if (!studentId) { toast.error('Enter Student ID first'); return; }
    if (!pushSupported) { toast.error('Push not supported in this browser'); return; }
    setPushLoading(true); setPushError('');
    try {
      if (Notification.permission === 'denied') { setPushError('Notifications blocked — enable in browser settings.'); setPushLoading(false); return; }
      if (Notification.permission === 'default') {
        const perm = await Notification.requestPermission();
        setPushPermission(perm);
        if (perm !== 'granted') { setPushError('Permission not granted'); setPushLoading(false); return; }
      }
      // Get VAPID public key from Worker (or fallback to Vite env)
      let vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';
      try { const res = await api.getVapidPublicKey(); vapidKey = res.publicKey || vapidKey; } catch {}
      if (!vapidKey) { setPushError('VAPID key not configured — contact admin.'); setPushLoading(false); return; }
      const reg = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      if (existing) await existing.unsubscribe().catch(()=>{});
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(vapidKey) });
      const json = sub.toJSON();
      await api.pushSubscribe(studentId, { endpoint: json.endpoint, expirationTime: json.expirationTime, keys: json.keys });
      setPushSubscribed(true);
      toast.success('Real push enabled — you’ll get OS banners even when the tab is closed.');
    } catch (e) {
      setPushError(e.message || 'Failed to enable push');
    }
    setPushLoading(false);
  };

  const disablePush = async () => {
    setPushLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await api.pushUnsubscribe(studentId, sub.endpoint).catch(()=>{});
        await sub.unsubscribe();
      }
      setPushSubscribed(false);
      toast.info('Push disabled');
    } catch (e) { setPushError(e.message); }
    setPushLoading(false);
  };

  const submit = (e) => { e.preventDefault(); const id = inputId.trim().toUpperCase(); if (!id) return; setStudentId(id); };

  const markOne = async (nid) => {
    try { await api.markRead(nid, studentId); setItems(prev => prev.map(x=> x.id===nid ? {...x, is_read:1}: x)); setUnread(u=> Math.max(0, u-1)); } catch {}
  };
  const markAll = async () => {
    try { await api.markAllRead(studentId); setItems(prev => prev.map(x=>({...x, is_read:1}))); setUnread(0); } catch {}
  };

  return (
    <PublicLayout>
      <main className="max-w-[760px] mx-auto px-4 py-8">
        <div className="text-center mb-6">
          <span className="inline-flex w-10 h-10 rounded-xl bg-navy-700 text-white items-center justify-center mb-2"><Bell size={18}/></span>
          <h1 className="text-[22px] font-bold text-navy-800">Notification Center</h1>
          <p className="text-[12px] text-muted mt-1">Assessment publishes, grade updates, and announcements for your classes (Upscale §43).</p>
          <div className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full bg-navy-50 border border-border text-[11px] text-muted">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse"/> Real Web Push via Service Worker v3 + VAPID
          </div>
        </div>

        <Card className="!mb-4">
          <form onSubmit={submit} className="flex gap-2 items-end">
            <div className="flex-1">
              <Input label="Student ID" value={inputId} onChange={e=>setInputId(e.target.value.toUpperCase())} placeholder="e.g. 2019-12345" className="!font-mono !uppercase" autoComplete="off" />
            </div>
            <Button type="submit" icon={Search}>View</Button>
          </form>
          {studentId && <p className="text-[11px] text-faint mt-2">Showing notifications for <strong className="font-mono text-navy-800">{studentId}</strong> — class broadcasts + personal updates.</p>}
        </Card>

        {/* Real Push panel */}
        {studentId && (
          <Card className="!mb-4">
            <div className="flex items-start gap-3">
              <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${pushSubscribed ? 'bg-success-bg text-success' : 'bg-navy-100 text-navy-700'}`}>
                {pushSubscribed ? <BellRing size={16}/> : <Smartphone size={16}/>}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold text-navy-800">Real push notifications</div>
                <p className="text-[11px] text-muted leading-relaxed">Get OS banners even when the browser is closed — via Service Worker + VAPID (no polling). Requires HTTPS + permission.</p>
                {!pushSupported ? (
                  <p className="text-[11px] text-warning mt-2 inline-flex items-center gap-1"><ShieldCheck size={11}/> Push not supported in this browser / insecure context.</p>
                ) : pushPermission === 'denied' ? (
                  <p className="text-[11px] text-danger mt-2">Blocked — enable notifications in your browser site settings, then reload.</p>
                ) : pushSubscribed ? (
                  <div className="flex items-center gap-2 mt-2">
                    <Badge tone="success" className="!text-[11px]">Enabled ✓</Badge>
                    <Button size="sm" variant="soft" icon={BellOff} onClick={disablePush} loading={pushLoading}>Disable</Button>
                    <Button size="sm" variant="ghost" onClick={refreshPushState}>Refresh</Button>
                  </div>
                ) : (
                  <div className="mt-2 flex items-center gap-2">
                    <Button size="sm" icon={BellRing} onClick={enablePush} loading={pushLoading}>Enable push for {studentId}</Button>
                    <span className="text-[11px] text-faint">Uses your Student ID to target pushes</span>
                  </div>
                )}
                {pushError && <p className="text-[11px] text-danger mt-2">{pushError}</p>}
                <p className="text-[10px] text-faint mt-2">SW: {navigator.serviceWorker?.controller ? 'controlling ✓' : 'not controlling (open via https://.../notifications)'} · SW cache v3</p>
              </div>
            </div>
          </Card>
        )}

        {!studentId ? (
          <EmptyState icon={Bell} title="Enter your Student ID" body="We’ll show assessment-published, grade-changed, and announcement notifications from your enrolled classes." compact />
        ) : loading ? (
          <Spinner label="Loading notifications..." />
        ) : error ? (
          <EmptyState icon={Bell} title="Couldn’t load" body={error} />
        ) : !items.length ? (
          <EmptyState icon={Bell} title="No notifications yet" body="You’ll get notified when an instructor publishes an exam or updates your grade. Ask your instructor to publish or enable push above to test." compact />
        ) : (
          <>
            <div className="flex items-center gap-2 mb-3">
              <Badge tone={unread? 'warning':'neutral'}>{unread} unread</Badge>
              <span className="text-[12px] text-muted">{items.length} total</span>
              <div className="ml-auto flex gap-1.5">
                <Button size="sm" variant="soft" icon={CheckCheck} onClick={markAll}>Mark all read</Button>
                <Button size="sm" variant="ghost" tag={Link} to="/records">Academic Records</Button>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              {items.map(n => (
                <div key={n.id} className={`flex gap-3 bg-surface border rounded-lg px-4 py-3.5 ${n.is_read ? 'border-border opacity-80' : 'border-navy-200 shadow-card'}`}>
                  <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${n.type==='grade_changed'?'bg-warning-bg text-warning': n.type==='announcement'?'bg-navy-100 text-navy-700':'bg-info-bg text-info'}`}>
                    {n.type==='announcement'? <Megaphone size={14}/>: n.type==='grade_changed'? <GraduationCap size={14}/>: <BookOpen size={14}/>}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge tone={n.is_read?'neutral':'info'} className="!text-[10px]">{TYPE_LABELS[n.type]||n.type}</Badge>
                      {!n.is_read && <span className="w-1.5 h-1.5 rounded-full bg-info animate-pulse"/>}
                    </div>
                    <div className={`text-[13px] mt-1 ${n.is_read?'text-navy-800':'font-semibold text-navy-900'}`}>{n.title}</div>
                    {n.body && <div className="text-[12px] text-muted mt-1">{n.body}</div>}
                    <div className="text-[11px] text-faint mt-2 inline-flex items-center gap-1.5"><CalendarCheck size={11}/> {new Date(n.created_at+'Z').toLocaleString('en-PH',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}</div>
                  </div>
                  {!n.is_read && <Button size="sm" variant="soft" icon={Eye} onClick={()=>markOne(n.id)}>Mark read</Button>}
                </div>
              ))}
            </div>
          </>
        )}

        <p className="text-[11px] text-faint text-center mt-6">Tip: Enable real push above, then ask admin to publish an exam — you’ll get an OS banner even with the tab closed.</p>
      </main>
    </PublicLayout>
  );
}
