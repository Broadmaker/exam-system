import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../api';
import '../styles.css';
import { CalendarCheck, CheckCircle, AlertTriangle, UserCheck, ArrowLeft } from 'lucide-react';

export default function Checkin() {
  const [params] = useSearchParams();
  const urlSessionId = params.get('id') || '';

  // Code lookup state (no ?id= provided)
  const [codeEntry, setCodeEntry] = useState('');

  // Session state
  const [sessionId, setSessionId] = useState(urlSessionId);
  const [session, setSession] = useState(null);

  // Form state
  const [studentId, setStudentId] = useState('');
  const [name, setName] = useState('');
  const [section, setSection] = useState('');
  const [accessCode, setAccessCode] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(null); // { title, checked_in, already }

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

  const renderInput = (label, val, set, placeholder, mono = false) => (
    <label style={{ fontSize: 12, fontWeight: 600, color: '#0f2044', display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label}
      <input value={val} onChange={e => set(e.target.value)} placeholder={placeholder} autoComplete="off"
        style={{
          border: '1.5px solid #c8d8f0', borderRadius: 8,
          fontFamily: mono ? "'IBM Plex Mono', sans-serif" : "'IBM Plex Sans', sans-serif",
          fontSize: 14, padding: '11px 14px', color: '#1a2a3a', outline: 'none',
        }} />
    </label>
  );

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '32px 16px', background: 'linear-gradient(135deg, #0f2044 0%, #1a4fad 100%)',
    }}>
      <div style={{ background: '#fff', borderRadius: 18, maxWidth: 460, width: '100%', boxShadow: '0 24px 64px rgba(0,0,0,.35)' }}>
        <div style={{ padding: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <CalendarCheck size={22} color="#1a4fad" />
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0f2044' }}>Attendance Check-in</h1>
          </div>
          <p style={{ fontSize: 13, color: '#5a7090', marginBottom: 24, lineHeight: 1.5 }}>
            {session ? session.title : (done ? done.title : 'Scan your instructor\'s QR code or enter the attendance code.' )}
            {session && session.date && <span style={{ display: 'block', marginTop: 2, fontSize: 12 }}>{session.date}</span>}
            {session?.expires_at && (
              <span style={{ display: 'inline-block', marginTop: 8, fontSize: 12, fontWeight: 600,
                padding: '3px 10px', borderRadius: 5,
                background: new Date(session.expires_at).getTime() <= Date.now() ? '#fdecea' : '#fff3d4',
                color: new Date(session.expires_at).getTime() <= Date.now() ? '#c0392b' : '#b8860b' }}>
                {new Date(session.expires_at).getTime() <= Date.now() ? 'This session has expired.' : 'Open until ' + new Date(session.expires_at).toLocaleString()}
              </span>
            )}
          </p>

          {error && (
            <div style={{ fontSize: 12, color: '#c0392b', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 4 }}>
              <AlertTriangle size={12} /> {error}
            </div>
          )}

          {done ? (
            <div style={{ textAlign: 'center', padding: '12px 0 4px' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
                <span style={{
                  width: 64, height: 64, borderRadius: '50%',
                  background: done.already ? '#fff3d4' : '#d4f5e2',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: done.already ? '#e8a020' : '#1a7a4a',
                }}>
                  <CheckCircle size={32} />
                </span>
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0f2044', marginBottom: 6 }}>
                {done.already ? 'Already Checked In' : 'You\'re Checked In!'}
              </h2>
              <p style={{ fontSize: 13, color: '#5a7090', lineHeight: 1.6, marginBottom: 4 }}>
                {done.already
                  ? 'Your attendance was already recorded for this session.'
                  : 'Your attendance has been recorded. See your instructor for confirmation.'}
              </p>
              {done.checked_in && (
                <div style={{ fontSize: 12, color: '#1a4fad', fontFamily: "'IBM Plex Mono', monospace", marginBottom: 20 }}>
                  {done.checked_in.replace('T', ' ').slice(0, 16)}
                </div>
              )}
              <Link to="/" className="btn" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '12px 32px' }}>
                <ArrowLeft size={14} /> Back to Home
              </Link>
            </div>
          ) : !session ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {renderInput('Attendance Code', codeEntry, setCodeEntry, 'e.g. BSCS2-AUG19', true)}
              <button onClick={lookup} style={{
                width: '100%', background: '#0f2044', color: '#fff', border: 'none', borderRadius: 10,
                fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 15, fontWeight: 600, padding: 15, cursor: 'pointer',
              }}>Continue →</button>
              <Link to="/" style={{ fontSize: 13, color: '#5a7090', textAlign: 'center', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                <ArrowLeft size={12} /> Back to Home
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {renderInput('Student ID Number', studentId, setStudentId, 'e.g. 2019-12345', true)}
              {renderInput('Full Name (Last Name, First Name, M.I.)', name, setName, 'e.g. Dela Cruz, Juan A.')}
              {renderInput('Section', section, setSection, 'e.g. BSCS 2-A')}
              {session.has_access_code && renderInput('Access Code', accessCode, setAccessCode, 'Ask your instructor for the code', true)}
              <button onClick={submit} disabled={loading}
                style={{
                  width: '100%', background: loading ? '#5a7090' : '#0f2044', color: '#fff', border: 'none', borderRadius: 10,
                  fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 15, fontWeight: 600, padding: 15, cursor: loading ? 'not-allowed' : 'pointer',
                }}>
                {loading ? 'Checking in…' : <><UserCheck size={16} style={{ verticalAlign: '-2px', marginRight: 6 }} /> Check In</>}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}