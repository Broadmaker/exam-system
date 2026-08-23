import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { Button, Input } from '../components/ui';
import PublicLayout from '../components/PublicLayout';
import { CalendarCheck, CheckCircle, AlertTriangle, UserCheck, KeyRound, QrCode, Zap, ShieldCheck } from 'lucide-react';

export default function Checkin() {
  const [params] = useSearchParams();
  const urlSessionId = params.get('id') || '';

  const [codeEntry, setCodeEntry] = useState('');
  const [sessionId, setSessionId] = useState(urlSessionId);
  const [session, setSession] = useState(null);

  const [studentId, setStudentId] = useState('');
  const [name, setName] = useState('');
  const [section, setSection] = useState('');
  const [accessCode, setAccessCode] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(null);

  useEffect(() => {
    if (!sessionId) return;
    api.getAttendanceSession(sessionId)
      .then(setSession)
      .catch(e => { setError(e.message); setSession(null); });
  }, [sessionId]);

  const lookup = async () => {
    if (!codeEntry.trim()) { setError('Enter the code shown by your instructor.'); return; }
    setError('');
    try {
      const s = await api.lookupAttendanceSession(codeEntry.trim());
      setSessionId(s.id);
    } catch (e) { setError(e.message); }
  };

  const submit = async () => {
    if (!studentId.trim() || !name.trim() || !section.trim()) {
      setError('Please fill in your Student ID, name and section.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await api.checkin(sessionId, {
        student_id: studentId.trim().toUpperCase(),
        student_name: name.trim(),
        student_section: section.trim(),
        access_code: accessCode.trim(),
      });
      setDone({ title: session.title, checked_in: res.checked_in, already: !!res.already });
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  const sessionExpired = session?.expires_at && new Date(session.expires_at).getTime() <= Date.now();

  return (
    <PublicLayout>
      <div className="flex-1 flex items-stretch justify-center relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0b1b3a 0%, #143a8a 45%, #1a4fad 100%)' }}>
        <div className="absolute inset-0 pointer-events-none opacity-40" style={{ backgroundImage: 'radial-gradient(700px 340px at 78% -8%, rgba(255,255,255,.14), transparent 60%), radial-gradient(520px 280px at 8% 108%, rgba(232,160,32,.18), transparent 60%)' }} />
        <div className="absolute inset-0 pointer-events-none opacity-[0.06]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

        <div className="relative max-w-[1000px] mx-auto w-full px-4 py-8 sm:py-10 grid lg:grid-cols-[1fr_460px] gap-6 lg:gap-8 items-start lg:items-center">
          {/* Info panel — white hero text like Home, always visible */}
          <div className="text-white text-center lg:text-left">
            <span className="inline-flex items-center gap-2 bg-white/10 backdrop-blur border border-white/10 rounded-full px-3 py-1.5 text-[11px] font-semibold text-accent mb-4">
              <ShieldCheck size={12} /> Attendance made simple
            </span>
            <span className="hidden lg:flex w-12 h-12 rounded-xl bg-white/10 items-center justify-center mb-5"><CalendarCheck size={24} className="text-accent" /></span>
            <h1 className="text-white text-[28px] sm:text-[32px] lg:text-[34px] font-bold leading-[1.05] tracking-tight">
              Attendance<br className="hidden sm:block" /> Check-in
            </h1>
            <p className="text-white/70 text-[14px] sm:text-[15px] leading-relaxed mt-3 max-w-[380px] mx-auto lg:mx-0">
              Check in to your class session with the code or QR from your instructor. It takes less than a minute.
            </p>
            <div className="hidden lg:flex flex-col gap-2.5 max-w-[380px] mt-8">
              <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-left">
                <span className="w-8 h-8 rounded-lg bg-success-bg text-success flex items-center justify-center shrink-0"><QrCode size={16} /></span>
                <div>
                  <div className="text-[13px] font-semibold">Scan or type a code</div>
                  <div className="text-[11px] text-white/50">No app needed — works in any browser.</div>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-left">
                <span className="w-8 h-8 rounded-lg bg-warning-bg text-warning flex items-center justify-center shrink-0"><Zap size={16} /></span>
                <div>
                  <div className="text-[13px] font-semibold">Instant confirmation</div>
                  <div className="text-[11px] text-white/50">You'll know immediately if you're checked in.</div>
                </div>
              </div>
            </div>
          </div>

          {/* Form card */}
          <div className="bg-surface rounded-[20px] w-full shadow-modal border border-border">
            <div className="p-6 sm:p-8">
              <div className="flex items-center gap-2.5 mb-1.5">
                <span className="w-10 h-10 rounded-xl bg-navy-900 text-white flex items-center justify-center"><CalendarCheck size={20} /></span>
                <div>
                  <h1 className="text-[18px] font-bold text-navy-800 leading-tight">Attendance Check-in</h1>
                  <p className="text-[11px] font-semibold tracking-[.08em] uppercase text-faint">Mark your presence</p>
                </div>
              </div>
              <p className="text-[13px] text-muted mb-6 leading-relaxed">
                {session ? session.title : (done ? done.title : "Scan your instructor's QR code or enter the attendance code.")}
                {session && session.date && <span className="block mt-1 text-[12px] text-faint">{session.date}</span>}
                {session?.expires_at && (
                  <span className={`inline-block mt-2.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border ${sessionExpired ? 'bg-danger-bg text-danger border-danger/15' : 'bg-warning-bg text-warning border-warning/15'}`}>
                    {sessionExpired ? 'This session has expired.' : 'Open until ' + new Date(session.expires_at).toLocaleString()}
                  </span>
                )}
              </p>

            {error && (
              <div className="text-[12px] text-danger mb-3.5 flex items-center gap-1.5 bg-danger-bg border border-danger/15 rounded-xl px-3.5 py-2.5">
                <AlertTriangle size={14} className="shrink-0" /> {error}
              </div>
            )}

            {done ? (
              <div className="text-center py-3">
                <div className="flex justify-center mb-3.5">
                  <span className={`w-16 h-16 rounded-full flex items-center justify-center ${done.already ? 'bg-warning-bg text-warning' : 'bg-success-bg text-success'}`}>
                    <CheckCircle size={32} />
                  </span>
                </div>
                <h2 className="text-[20px] font-bold text-navy-800 mb-1.5">
                  {done.already ? "Already Checked In" : "You're Checked In!"}
                </h2>
                <p className="text-[13px] text-muted leading-relaxed mb-1">
                  {done.already
                    ? 'Your attendance was already recorded for this session.'
                    : 'Your attendance has been recorded. See your instructor for confirmation.'}
                </p>
                {done.checked_in && (
                  <div className="text-[12px] text-navy-700 font-mono mb-5">{done.checked_in.replace('T', ' ').slice(0, 16)}</div>
                )}
              </div>
            ) : !session ? (
              <div className="flex flex-col gap-3">
                <Input label="Attendance Code" value={codeEntry} onChange={e => setCodeEntry(e.target.value)}
                  placeholder="e.g. BSCS2-AUG19" icon={KeyRound} className="!font-mono !tracking-wide !uppercase !bg-canvas focus:!bg-surface"
                  onKeyDown={e => e.key === 'Enter' && lookup()} />
                <Button className="!w-full !py-3.5 !text-[15px]" onClick={lookup}>Continue →</Button>
                <p className="text-[11px] text-faint text-center leading-relaxed">The code is shown by your instructor or in the session QR.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3.5">
                <Input label="Student ID Number" value={studentId} onChange={e => setStudentId(e.target.value)}
                  placeholder="e.g. 2019-12345" className="!font-mono !tracking-wide !bg-canvas focus:!bg-surface" />
                <Input label="Full Name (Last Name, First Name, M.I.)" value={name} onChange={e => setName(e.target.value)}
                  placeholder="e.g. Dela Cruz, Juan A." className="!bg-canvas focus:!bg-surface" />
                <Input label="Section" value={section} onChange={e => setSection(e.target.value)} placeholder="e.g. BSCS 2-A" className="!bg-canvas focus:!bg-surface" />
                {session.has_access_code && (
                  <Input label="Access Code" value={accessCode} onChange={e => setAccessCode(e.target.value)}
                    placeholder="Ask your instructor for the code" icon={KeyRound} className="!font-mono !tracking-wide !uppercase !bg-canvas focus:!bg-surface" />
                )}
                <Button className="!w-full !py-3.5 !text-[15px]" onClick={submit} loading={loading} icon={loading ? null : UserCheck}>
                  {loading ? 'Checking in…' : 'Check In'}
                </Button>
              </div>
            )}
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
