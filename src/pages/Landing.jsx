import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FileText, Trophy, Lock, CalendarCheck, GraduationCap, UserPlus, ArrowRight, Search, ShieldCheck, BarChart3, Clock3, Layers, QrCode, Bell } from 'lucide-react';
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
    { to: '/checkin', label: 'Attendance Check-in', desc: 'Scan the QR or enter the code your instructor shares.', icon: CalendarCheck, tone: 'bg-success-bg text-success' },
    { to: '/enroll', label: 'Enroll in a Class', desc: 'Join your class with the code from your instructor.', icon: UserPlus, tone: 'bg-navy-100 text-navy-700' },
    { to: '/leaderboard', label: 'Live Scoreboard', desc: 'See rankings update in real time after exams.', icon: Trophy, tone: 'bg-warning-bg text-warning' },
    { to: '/notifications', label: 'Notifications', desc: 'New exams, grade updates & announcements.', icon: Bell, tone: 'bg-info-bg text-info' },
  ];

  return (
    <PublicLayout>
      {/* Hero */}
      <section
        className="relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0b1b3a 0%, #143a8a 45%, #1a4fad 100%)' }}
      >
        <div
          className="absolute inset-0 pointer-events-none opacity-40"
          style={{
            backgroundImage:
              'radial-gradient(700px 340px at 78% -8%, rgba(255,255,255,.14), transparent 60%), radial-gradient(520px 280px at 8% 108%, rgba(232,160,32,.18), transparent 60%), linear-gradient(to bottom, rgba(255,255,255,.06), transparent 40%)',
          }}
        />
        <div className="absolute inset-0 pointer-events-none opacity-[0.06]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

        <div className="relative max-w-[1000px] mx-auto px-4 sm:px-6 py-8 sm:py-12 lg:py-14 grid lg:grid-cols-[1.05fr_430px] gap-8 lg:gap-10 items-center">
          {/* Copy */}
          <div className="text-center lg:text-left">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur border border-white/10 rounded-full px-3.5 py-1.5 text-[11px] font-semibold text-accent">
              <ShieldCheck size={13} /> Secure exam platform for students & instructors
            </div>

            <h1 className="text-white text-[32px] sm:text-[40px] lg:text-[42px] font-bold leading-[1.05] tracking-tight mt-5">
              Take exams, check in,
              <span className="block text-white">and track your progress.</span>
            </h1>
            <p className="text-white/70 text-[14px] sm:text-[15px] leading-relaxed mt-4 max-w-[520px] mx-auto lg:mx-0">
              Your one-stop portal for class check-ins, timed exams, live scoreboards, and student records — built for WMSU.
            </p>

            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 mt-6">
              <span className="inline-flex items-center gap-1.5 bg-white/10 border border-white/10 text-white/90 rounded-full px-3 py-1.5 text-[11px] font-medium">
                <Clock3 size={13} className="text-accent" /> Timed & auto-graded
              </span>
              <span className="inline-flex items-center gap-1.5 bg-white/10 border border-white/10 text-white/90 rounded-full px-3 py-1.5 text-[11px] font-medium">
                <QrCode size={13} className="text-accent" /> QR check-in
              </span>
              <span className="inline-flex items-center gap-1.5 bg-white/10 border border-white/10 text-white/90 rounded-full px-3 py-1.5 text-[11px] font-medium">
                <Layers size={13} className="text-accent" /> Offline-ready
              </span>
            </div>

            <div className="hidden lg:flex items-center gap-6 mt-8 pt-6 border-t border-white/10">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white"><FileText size={15} /></span>
                <div className="text-left">
                  <div className="text-white text-[13px] font-semibold leading-none">Randomized per student</div>
                  <div className="text-white/50 text-[11px]">Fair, seeded shuffling</div>
                </div>
              </div>
              <span className="w-px h-8 bg-white/10" />
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white"><BarChart3 size={15} /></span>
                <div className="text-left">
                  <div className="text-white text-[13px] font-semibold leading-none">Instant records</div>
                  <div className="text-white/50 text-[11px]">Scores & attendance</div>
                </div>
              </div>
            </div>
          </div>

          {/* Exam ID card */}
          <div className="bg-surface rounded-[20px] shadow-modal border border-border p-6 sm:p-7">
            <div className="flex items-start justify-between gap-3 mb-5">
              <div>
                <div className="text-[11px] font-semibold tracking-[.14em] uppercase text-navy-700">Quick start</div>
                <h2 className="text-[18px] font-bold text-navy-800 leading-tight mt-1">Enter Exam ID or class code</h2>
                <p className="text-[12px] text-muted leading-relaxed mt-1">Paste the code your instructor shared to begin.</p>
              </div>
              <span className="w-10 h-10 rounded-xl bg-navy-900 text-white flex items-center justify-center shrink-0">
                <Search size={18} />
              </span>
            </div>

            <label className="block text-[11px] font-semibold tracking-[.08em] uppercase text-muted mb-2">
              Exam ID <span className="normal-case font-normal tracking-normal text-faint">or class code</span>
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint pointer-events-none" />
                <input
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && go()}
                  placeholder="e.g. EXM-8F3A2 or CLS-..."
                  className="input !pl-9 !py-3 !text-[15px] !bg-canvas focus:!bg-surface"
                  aria-label="Exam ID or class code"
                />
              </div>
              <Button
                onClick={go}
                disabled={!code.trim()}
                className="!px-5 sm:!px-6 !py-3 !text-[14px] sm:!text-[15px] shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                size="lg"
              >
                Go <ArrowRight size={16} />
              </Button>
            </div>
            <p className="text-[11px] text-faint mt-2.5 leading-relaxed">
              Exam IDs are shared by your proctor. Class codes work too — you’ll be guided to enroll.
            </p>

            <div className="grid grid-cols-3 gap-2 mt-5 pt-5 border-t border-border">
              <Link to="/checkin" className="group flex flex-col items-center gap-1.5 rounded-xl bg-canvas hover:bg-navy-50 border border-transparent hover:border-border px-2 py-3 text-center transition-colors no-underline">
                <span className="w-8 h-8 rounded-lg bg-success-bg text-success flex items-center justify-center"><CalendarCheck size={16} /></span>
                <span className="text-[11px] font-semibold text-navy-800 group-hover:text-navy-700">Check in</span>
              </Link>
              <Link to="/enroll" className="group flex flex-col items-center gap-1.5 rounded-xl bg-canvas hover:bg-navy-50 border border-transparent hover:border-border px-2 py-3 text-center transition-colors no-underline">
                <span className="w-8 h-8 rounded-lg bg-navy-100 text-navy-700 flex items-center justify-center"><UserPlus size={16} /></span>
                <span className="text-[11px] font-semibold text-navy-800 group-hover:text-navy-700">Enroll</span>
              </Link>
              <Link to="/records" className="group flex flex-col items-center gap-1.5 rounded-xl bg-canvas hover:bg-navy-50 border border-transparent hover:border-border px-2 py-3 text-center transition-colors no-underline">
                <span className="w-8 h-8 rounded-lg bg-purple-bg text-purple flex items-center justify-center"><GraduationCap size={16} /></span>
                <span className="text-[11px] font-semibold text-navy-800 group-hover:text-navy-700">Records</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Feature grid */}
      <section className="max-w-[1000px] mx-auto px-4 sm:px-6 py-10 sm:py-12">
        <div className="flex items-end justify-between gap-4 mb-5">
          <div>
            <div className="text-[11px] font-semibold tracking-[.14em] uppercase text-navy-700 mb-1">Student Portal</div>
            <h2 className="text-[20px] sm:text-[22px] font-bold text-navy-800 tracking-tight">What would you like to do?</h2>
            <p className="text-[13px] text-muted mt-1">Pick a task — everything is one tap away.</p>
          </div>
          <Link to="/leaderboard" className="hidden sm:inline-flex items-center gap-1 text-[12px] font-semibold text-navy-700 hover:text-navy-800 no-underline">
            View scoreboard <ArrowRight size={14} />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {features.map(f => (
            <Link
              key={f.to}
              to={f.to}
              className="group flex flex-col gap-3 bg-surface border border-border rounded-[14px] p-5 hover:shadow-card hover:border-navy-700/30 hover:-translate-y-0.5 transition-all duration-150 no-underline"
            >
              <span className={`w-10 h-10 rounded-xl flex items-center justify-center ${f.tone}`}>
                <f.icon size={19} />
              </span>
              <div>
                <div className="text-[14px] font-semibold text-navy-800 mb-0.5">{f.label}</div>
                <div className="text-[12px] text-muted leading-relaxed">{f.desc}</div>
              </div>
              <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-navy-700 mt-auto">
                Open <ArrowRight size={13} className="transition-transform duration-150 group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </div>

        <div className="grid sm:grid-cols-2 gap-3 mt-3">
          <Link
            to="/records"
            className="group flex items-center gap-4 bg-gradient-to-br from-navy-900 to-navy-700 text-white rounded-[14px] p-5 hover:opacity-[0.97] hover:shadow-card transition-all duration-150 no-underline"
          >
            <span className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
              <BarChart3 size={20} className="text-accent" />
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-[15px] font-semibold leading-tight">View your exam records</div>
              <div className="text-[12px] text-white/60 leading-relaxed mt-0.5">Scores, sections, and attendance history for every class.</div>
            </div>
            <ArrowRight size={18} className="text-white/60 shrink-0 transition-transform duration-150 group-hover:translate-x-0.5" />
          </Link>

          <div className="bg-surface border border-border rounded-[14px] p-5">
            <div className="flex items-center gap-2.5 mb-3">
              <span className="w-8 h-8 rounded-lg bg-navy-100 text-navy-700 flex items-center justify-center">
                <Layers size={16} />
              </span>
              <div className="text-[13px] font-semibold text-navy-800">How it works</div>
              <span className="ml-auto text-[11px] font-medium text-faint">3 steps</span>
            </div>
            <ol className="grid grid-cols-3 gap-2 text-center">
              <li className="rounded-xl bg-canvas border border-border px-2 py-3">
                <div className="w-6 h-6 rounded-full bg-navy-900 text-white text-[11px] font-bold flex items-center justify-center mx-auto">1</div>
                <div className="text-[11px] font-semibold text-navy-800 mt-1.5 leading-tight">Get code</div>
                <div className="text-[11px] text-muted leading-tight">From instructor</div>
              </li>
              <li className="rounded-xl bg-canvas border border-border px-2 py-3">
                <div className="w-6 h-6 rounded-full bg-navy-900 text-white text-[11px] font-bold flex items-center justify-center mx-auto">2</div>
                <div className="text-[11px] font-semibold text-navy-800 mt-1.5 leading-tight">Enter ID</div>
                <div className="text-[11px] text-muted leading-tight">Above to start</div>
              </li>
              <li className="rounded-xl bg-canvas border border-border px-2 py-3">
                <div className="w-6 h-6 rounded-full bg-accent text-navy-900 text-[11px] font-bold flex items-center justify-center mx-auto">3</div>
                <div className="text-[11px] font-semibold text-navy-800 mt-1.5 leading-tight">Submit</div>
                <div className="text-[11px] text-muted leading-tight">View results</div>
              </li>
            </ol>
            <div className="flex items-center gap-1.5 text-[11px] text-muted mt-3">
              <Lock size={12} className="text-faint" /> Instructors: use <Link to="/admin" className="font-semibold text-navy-700 hover:text-navy-800 no-underline">Admin</Link> in the top navigation.
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
