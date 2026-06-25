import { useState } from 'react';
import { Lock, AlertTriangle, ArrowLeft } from 'lucide-react';

const PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || 'admin123';

export default function AuthGate({ children }) {
  const [authed, setAuthed] = useState(sessionStorage.getItem('admin_auth') === 'true');
  const [pw, setPw] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const login = () => {
    setLoading(true);
    setError('');
    setTimeout(() => {
      if (pw === PASSWORD) {
        sessionStorage.setItem('admin_auth', 'true');
        setAuthed(true);
        setPw('');
      } else {
        setError('Incorrect password. Please try again.');
        setLoading(false);
      }
    }, 400);
  };

  if (!authed) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg, #0f2044 0%, #1a4fad 100%)', padding: 24,
      }}>
        <div style={{
          background: '#fff', borderRadius: 18, padding: '48px 40px', maxWidth: 400,
          width: '100%', boxShadow: '0 24px 64px rgba(0,0,0,.35)', textAlign: 'center',
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%', background: '#0f2044',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px', color: '#fff',
          }}><Lock size={28} /></div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0f2044', marginBottom: 6 }}>Admin Access</h1>
          <p style={{ fontSize: 13, color: '#5a7090', marginBottom: 28, lineHeight: 1.5 }}>
            Enter the admin password to continue.
          </p>
          <div style={{ position: 'relative', marginBottom: error ? 8 : 20 }}>
            <input
              type="password"
              value={pw}
              onChange={e => { setPw(e.target.value); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && login()}
              placeholder="Enter password"
              autoFocus
              style={{
                width: '100%', border: `1.5px solid ${error ? '#c0392b' : '#c8d8f0'}`,
                borderRadius: 10, padding: '13px 16px', fontSize: 15,
                fontFamily: 'inherit', outline: 'none', transition: 'border-color .2s',
                background: error ? '#fff5f5' : '#fff',
              }} />
          </div>
          {error && (
            <div style={{
              fontSize: 12, color: '#c0392b', marginBottom: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
            }}>
              <AlertTriangle size={12} /> {error}
            </div>
          )}
          <button
            onClick={login}
            disabled={loading}
            style={{
              width: '100%', background: loading ? '#5a7090' : '#0f2044', color: '#fff',
              border: 'none', borderRadius: 10, fontFamily: 'inherit', fontSize: 15,
              fontWeight: 600, padding: '14px', cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background .2s, transform .15s', letterSpacing: '.02em',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
            onMouseEnter={e => { if (!loading) e.target.style.background = '#1a4fad'; }}
            onMouseLeave={e => { if (!loading) e.target.style.background = '#0f2044'; }}
            onMouseDown={e => { if (!loading) e.target.style.transform = 'scale(.97)'; }}
            onMouseUp={e => { if (!loading) e.target.style.transform = 'scale(1)'; }}
          >
            {loading ? (
              <>
                <span style={{
                  display: 'inline-block', width: 16, height: 16, border: '2px solid rgba(255,255,255,.3)',
                  borderTopColor: '#fff', borderRadius: '50%', animation: 'spin .6s linear infinite',
                }} />
                Verifying...
              </>
            ) : (
              'Login →'
            )}
          </button>
          <div style={{ marginTop: 20 }}>
            <a href="/" style={{
              fontSize: 13, color: '#5a7090', textDecoration: 'none',
              display: 'inline-flex', alignItems: 'center', gap: 4,
              transition: 'color .2s',
            }} onMouseEnter={e => e.target.style.color = '#0f2044'}
               onMouseLeave={e => e.target.style.color = '#5a7090'}>
              <ArrowLeft size={12} /> Back to Student Portal
            </a>
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      </div>
    );
  }
  return children;
}
