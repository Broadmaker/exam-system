import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../api';
import '../styles.css';
import { UserPlus, CheckCircle, AlertTriangle, ArrowLeft, Home, GraduationCap } from 'lucide-react';

export default function StudentEnroll() {
  const [params] = useSearchParams();
  const urlCode = (params.get('code') || '').toUpperCase();

  const [codeEntry, setCodeEntry] = useState(urlCode);
  const [klass, setKlass] = useState(null);

  const [studentId, setStudentId] = useState('');
  const [name, setName] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(null); // { name, already }

  const lookup = async (e) => {
    if (e) e.preventDefault();
    const code = codeEntry.trim().toUpperCase();
    if (!code) { setError('Enter the class code.'); return; }
    setError(''); setKlass(null); setDone(null);
    try {
      const k = await api.lookupClassCode(code);
      setKlass(k);
    } catch (err) { setError(err.message); }
  };

  const submit = async () => {
    if (!studentId.trim() || !name.trim()) {
      setError('Please fill in your Student ID and name.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await api.enrollByCode({
        access_code: codeEntry.trim().toUpperCase(),
        student_id: studentId.trim().toUpperCase(),
        student_name: name.trim(),
      });
      setDone({ name: res.class.name, already: !!res.already });
      if (!res.already) { setKlass(null); setCodeEntry(''); setStudentId(''); setName(''); }
    } catch (err) {
      setError(err.message);
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
            <UserPlus size={22} color="#1a4fad" />
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0f2044' }}>Enroll in a Class</h1>
          </div>
          <p style={{ fontSize: 13, color: '#5a7090', marginBottom: 24, lineHeight: 1.5 }}>
            Enter the class code given by your instructor to enroll. You can view your records afterwards.
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
              <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0f2044', marginBottom: 6 }}>
                {done.already ? 'Already enrolled' : 'You are now enrolled'}
              </h2>
              <p style={{ fontSize: 14, color: '#5a7090', marginBottom: 20 }}>
                {done.already ? 'You were already enrolled in' : 'Welcome to'} <strong>{done.name}</strong>.
              </p>
              <Link to="/records" className="btn" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <GraduationCap size={15} /> View My Records
              </Link>
              <button onClick={() => setDone(null)} className="btn btn-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginLeft: 8 }}>
                Enroll Another
              </button>
            </div>
          ) : (
            <>
              <form onSubmit={lookup} style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 22 }}>
                {renderInput('Class Code', codeEntry, setCodeEntry, 'e.g. ' + 'BSCS2A', true)}
                <button type="submit" className="btn" style={{ width: '100%', justifyContent: 'center' }}>
                  Find Class
                </button>
              </form>

              {klass && (
                <div style={{ animation: 'fadeIn .25s' }}>
                  <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(-6px); } }`}</style>
                  <div style={{ border: '2px solid #d4f5e2', background: '#f0fbf5', borderRadius: 10, padding: '12px 16px', marginBottom: 18 }}>
                    <div style={{ fontSize: 12, color: '#1a7a4a', fontWeight: 600, marginBottom: 2 }}>Class found</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#0f2044' }}>{klass.name}</div>
                    <div style={{ fontSize: 12, color: '#5a7090' }}>
                      {[klass.subject, klass.section].filter(Boolean).join(' · ') || ' '}
                    </div>
                    {klass.section && (
                      <div style={{ fontSize: 11, color: '#1a7a4a', marginTop: 6, background: '#d4f5e2', display: 'inline-block', padding: '3px 10px', borderRadius: 5, fontWeight: 600 }}>
                        You will be enrolled in section {klass.section}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {renderInput('Student ID', studentId, setStudentId, 'e.g. 2019-12345', true)}
                    {renderInput('Full Name', name, setName, 'e.g. Dela Cruz, Juan A.')}
                    <button onClick={submit} disabled={loading} className="btn"
                      style={{ width: '100%', justifyContent: 'center', opacity: loading ? .7 : 1, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <UserPlus size={15} /> {loading ? 'Enrolling…' : 'Enroll Me'}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          <div style={{ marginTop: 24, display: 'flex', justifyContent: 'space-between' }}>
            <Link to="/" style={{ fontSize: 12, color: '#1a4fad', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Home size={13} /> Back to home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}