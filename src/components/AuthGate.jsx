import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Lock, AlertTriangle, ArrowLeft } from 'lucide-react';
import { Button, Input } from './ui';

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
      <div className="min-h-screen flex items-center justify-center px-6 pt-safe pb-8"
        style={{ background: 'linear-gradient(135deg, #0b1b3a 0%, #1a4fad 100%)' }}>
        <div className="bg-surface rounded-[18px] max-w-[400px] w-full shadow-modal text-center">
          <div className="px-8 py-10">
            <span className="w-16 h-16 rounded-full bg-navy-700 flex items-center justify-center mx-auto mb-5 text-white shadow-card">
              <Lock size={28} />
            </span>
            <h1 className="text-[22px] font-bold text-navy-800 mb-1.5">Admin Access</h1>
            <p className="text-[13px] text-muted mb-7 leading-relaxed">Enter the admin password to continue.</p>

            <Input
              type="password"
              value={pw}
              onChange={e => { setPw(e.target.value); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && login()}
              placeholder="Enter password"
              autoFocus
              icon={Lock}
              className={error ? '!border-danger' : ''}
            />

            {error && (
              <div className="text-[12px] text-danger mt-2.5 flex items-center justify-center gap-1.5">
                <AlertTriangle size={12} /> {error}
              </div>
            )}

            <Button className="!w-full !mt-4 !py-3.5 !text-[15px]" onClick={login} loading={loading}>
              {loading ? 'Verifying…' : 'Login →'}
            </Button>

            <Link to="/" className="text-[13px] text-muted no-underline inline-flex items-center gap-1.5 mt-6 hover:text-navy-800 transition-colors">
              <ArrowLeft size={12} /> Back to Student Portal
            </Link>
          </div>
        </div>
      </div>
    );
  }
  return children;
}