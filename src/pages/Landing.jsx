import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FileText, Trophy, Lock, CalendarCheck, GraduationCap, UserPlus, ArrowRight, Search, MonitorSmartphone, ShieldCheck, Zap, BarChart3, QrCode } from 'lucide-react';
import PublicLayout from '../components/PublicLayout';
import { Button } from '../components/ui';

export default function Landing() {
  const [code, setCode] = useState('');
  const navigate = useNavigate();

  const go = () => {
    if (!code.trim()) return;
    navigate('/exam?id=' + encodeURIComponent(code.trim()));
  };

  const features = [
    { to: '/checkin', label: 'Attendance Check-in', desc: 'Scan the QR or enter the code your instructor gives.', icon: CalendarCheck, tone: 'bg-success-bg text-success' },
    { to: '/enroll', label: 'Enroll in a Class', desc: 'Join your class with the code shared by your instructor.', icon: UserPlus, tone: 'bg-navy-100 text-navy-700' },
    { to: '/leaderboard', label: 'Live Scoreboard', desc: 'See who tops the exam in real time.', icon: Trophy, tone: 'bg-warning-bg text-warning' },
    { to: '/records', label: 'Student Records', desc: 'Review your exam results and attendance history.', icon: GraduationCap, tone: 'bg-purple-bg text-purple' },
  ];

  return (
    <PublicLayout>
      {/* Hero */}
      <section className="relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0b1b3a 0%, #1a4fad 100%)' }}>
        <div className="absolute inset-0 opacity-40 pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(600px 300px at 80% -10%, rgba(255,255,255,.14), transparent), radial-gradient(400px 250px at 10% 110%, rgba(232,160,32,.18), transparent)' }} />
        <div className="relative max-w-[1000px] mx-auto px-4 sm:px-6 py-14 sm:py-20 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur rounded-full px-3.5 py-1.5 text-[11px] font-semibold text-accent mb-6">
            <ShieldCheck size={13} /> Secure exam platform for instructors & students
          </div>
          <h1 className="text-white text-[34px] sm:text-[44px] font-bold leading-tight mb-4">
            Take exams, check in,<br className="hidden sm:block" /> and track your progress.
          </h1>
          <p className="text-white/70 text-[15px] sm:text-[16px] max-w-[520px] mx-auto mb-9 leading-relaxed">
            Your one-stop portal for class check-ins, exams, live scoreboards, and student records.
          </p>

          <div className="max-w-[540px] mx-auto bg-white/10 backdrop-blur border border-white/15 rounded-2xl p-4 sm:p-5 mb-10">
            <label className="block text-left text-[11px] font-semibold tracking-[.1em] uppercase text-white/60 mb-2">
              Enter Exam ID <span className="normal-case font-normal tracking-normal">(or class code to enroll)</span>
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
                <input
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && go()}
                  placeholder="Paste exam ID here"
                  className="input !pl-9 !py-3 !text-[15px] !bg-white !border-transparent"
                />
              </div>
              <Button onClick={go} className="!px-6 !py-3 !text-[15px]" size="lg">Go</Button>
            </div>
            <p className="text-left text-[11px] text-white/50 mt-2">
              Exam IDs are shared by your instructor or proctor.
            </p>
          </div>
        </div>
      </section>

      {/* Feature grid */}
      <section className="max-w-[1000px] mx-auto px-4 sm:px-6 py-12 -mt-0">
        <div className="flex items-end justify-between mb-5">
          <div>
            <div className="text-[11px] font-semibold tracking-[.14em] uppercase text-navy-700 mb-1">Student Portal</div>
            <h2 className="text-[22px] font-bold text-navy-800">What would you like to do?</h2>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {features.map(f => (
            <Link key={f.to} to={f.to}
              className="group flex flex-col gap-3 bg-surface border border-border rounded-[12px] p-5 hover:shadow-card hover:border-navy-700 hover:-translate-y-0.5 transition-all duration-150 no-underline">
              <span className={`w-10 h-10 rounded-xl flex items-center justify-center ${f.tone}`}><f.icon size={19} /></span>
              <div>
                <div className="text-[14px] font-semibold text-navy-800 mb-0.5">{f.label}</div>
                <div className="text-[12px] text-muted leading-relaxed">{f.desc}</div>
              </div>
              <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-navy-700 mt-auto">
                Open <ArrowRight size={13} className="transition-transform duration-150 group-hover:translate-x-1" />
              </span>
            </Link>
          ))}
        </div>

        <div className="grid sm:grid-cols-2 gap-3 mt-3">
          <Link to="/records" className="group flex items-center gap-4 bg-gradient-to-br from-navy-900 to-navy-700 text-white rounded-[12px] p-5 hover:opacity-95 transition-all duration-150 no-underline">
            <span className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center shrink-0"><BarChart3 size={20} className="text-accent" /></span>
            <div className="flex-1">
              <div className="text-[15px] font-semibold mb-0.5">View your exam records</div>
              <div className="text-[12px] text-white/60 leading-relaxed">Scores, sections, and attendance history for every class.</div>
            </div>
            <ArrowRight size={18} className="text-white/60 transition-transform duration-150 group-hover:translate-x-1" />
          </Link>
          <Link to="/admin" className="group flex items-center gap-4 bg-surface border border-border rounded-[12px] p-5 hover:shadow-card hover:border-navy-700 transition-all duration-150 no-underline">
            <span className="w-11 h-11 rounded-xl bg-navy-100 text-navy-700 flex items-center justify-center shrink-0"><Lock size={20} /></span>
            <div className="flex-1">
              <div className="text-[15px] font-semibold text-navy-800 mb-0.5">Instructor? Open the admin panel</div>
              <div className="text-[12px] text-muted leading-relaxed">Manage classes, create exams, and monitor proctoring.</div>
            </div>
            <ArrowRight size={18} className="text-faint transition-transform duration-150 group-hover:translate-x-1" />
          </Link>
        </div>
      </section>
    </PublicLayout>
  );
}