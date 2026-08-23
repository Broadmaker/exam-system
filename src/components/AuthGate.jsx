import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Lock, AlertTriangle, ArrowLeft, Eye, EyeOff, GraduationCap, LayoutDashboard, Radio } from 'lucide-react';
import { Button, Input } from './ui';

const PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || 'admin123';

export default function AuthGate({ children }) {
  const [authed, setAuthed] = useState(sessionStorage.getItem('admin_auth') === 'true');
  const [pw, setPw] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const login = () => {
    if (!pw.trim()) { setError('Please enter the admin password.'); return; }
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
      <div className="min-h-screen flex items-stretch justify-center relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0b1b3a 0%, #143a8a 45%, #1a4fad 100%)' }}>
        <div className="absolute inset-0 pointer-events-none opacity-40" style={{ backgroundImage: 'radial-gradient(700px 340px at 78% -8%, rgba(255,255,255,.14), transparent 60%), radial-gradient(520px 280px at 8% 108%, rgba(232,160,32,.18), transparent 60%)' }} />
        <div className="absolute inset-0 pointer-events-none opacity-[0.06]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

        <div className="relative max-w-[1000px] mx-auto w-full px-4 py-8 sm:py-10 grid lg:grid-cols-[1fr_420px] gap-6 lg:gap-8 items-center">
          {/* Info panel */}
          <div className="text-white text-center lg:text-left">
            <img src="/product_brand_logo.png" alt="WMSU Exam System" className="h-11 sm:h-12 w-auto object-contain mx-auto lg:mx-0" />
            <h1 className="text-white text-[28px] sm:text-[32px] lg:text-[34px] font-bold leading-[1.05] tracking-tight mt-6">
              Admin Access
            </h1>
            <p className="text-white/70 text-[14px] sm:text-[15px] leading-relaxed mt-3 max-w-[420px] mx-auto lg:mx-0">
              Manage classes, create exams, and monitor live proctoring. Enter the admin password to continue.
            </p>

            <div className="hidden lg:flex flex-col gap-2.5 max-w-[380px] mt-8">
              <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-left">
                <span className="w-8 h-8 rounded-lg bg-white text-navy-700 flex items-center justify-center shrink-0"><LayoutDashboard size={16} /></span>
                <div>
                  <div className="text-[13px] font-semibold">Exam & class control</div>
                  <div className="text-[11px] text-white/50">Create, schedule, and archive assessments.</div>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-left">
                <span className="w-8 h-8 rounded-lg bg-white text-navy-700 flex items-center justify-center shrink-0"><Radio size={16} /></span>
                <div>
                  <div className="text-[13px] font-semibold">Live proctoring</div>
                  <div className="text-[11px] text-white/50">Monitor sessions, kicks, and tab violations.</div>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-left">
                <span className="w-8 h-8 rounded-lg bg-white text-navy-700 flex items-center justify-center shrink-0"><GraduationCap size={16} /></span>
                <div>
                  <div className="text-[13px] font-semibold">Student records</div>
                  <div className="text-[11px] text-white/50">Results, attendance, and activity log.</div>
                </div>
              </div>
            </div>

            <p className="hidden lg:block text-[11px] text-white/35 mt-6">© {new Date().getFullYear()} WMSU Exam System · Secure by design</p>
          </div>

          {/* Login card */}
          <div className="bg-surface rounded-[20px] w-full shadow-modal border border-border">
            <div className="px-6 sm:px-8 py-8 sm:py-9">
              <div className="flex items-center gap-3 mb-6">
                <span className="w-10 h-10 rounded-xl bg-navy-900 text-white flex items-center justify-center shrink-0">
                  <Lock size={18} />
                </span>
                <div>
                  <div className="text-[11px] font-semibold tracking-[.12em] uppercase text-faint">Admin Panel</div>
                  <div className="text-[17px] font-bold text-navy-800 leading-tight">Welcome back</div>
                </div>
                <span className="ml-auto hidden sm:inline-flex items-center gap-1.5 bg-success-bg border border-success/15 text-success rounded-full px-2.5 py-1 text-[11px] font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" /> Secure
                </span>
              </div>

              <div className="text-[13px] text-muted leading-relaxed mb-5">
                Enter the admin password shared with instructors. You’ll stay signed in on this device until you log out.
              </div>

              <div>
                <label className="label">Password</label>
                <div className="relative">
                  <Input
                    type={show ? 'text' : 'password'}
                    value={pw}
                    onChange={e => { setPw(e.target.value); setError(''); }}
                    onKeyDown={e => e.key === 'Enter' && login()}
                    placeholder="Enter your admin password"
                    autoFocus
                    icon={Lock}
                    className={`${error ? '!border-danger' : ''} !bg-canvas focus:!bg-surface !pr-10 !mt-0`}
                  />
                  <button
                    type="button"
                    onClick={() => setShow(s => !s)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-faint hover:text-navy-800 transition-colors"
                    aria-label={show ? 'Hide password' : 'Show password'}
                  >
                    {show ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="text-[12px] text-danger mt-2.5 flex items-center gap-1.5 bg-danger-bg border border-danger/15 rounded-xl px-3 py-2.5">
                  <AlertTriangle size={14} className="shrink-0" /> {error}
                </div>
              )}

              <Button className="!w-full !mt-4 !py-3.5 !text-[15px]" onClick={login} loading={loading}>
                {loading ? 'Verifying…' : 'Login →'}
              </Button>

              <div className="flex items-center gap-3 mt-5">
                <span className="h-px flex-1 bg-border" />
                <span className="text-[11px] text-faint">or</span>
                <span className="h-px flex-1 bg-border" />
              </div>

              <Link to="/" className="mt-5 flex items-center justify-center gap-1.5 text-[13px] font-medium text-muted hover:text-navy-800 transition-colors no-underline">
                <ArrowLeft size={14} /> Back to Student Portal
              </Link>

              <p className="text-center text-[11px] text-faint mt-6 leading-relaxed">
                Forgot the password? Ask your system administrator. Never share it with students.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }
  return children;
}
