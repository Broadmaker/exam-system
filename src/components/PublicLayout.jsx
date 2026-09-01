import { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';
import { Home, UserPlus, Trophy, GraduationCap, ShieldCheck, Menu, X, Lock, Scan } from 'lucide-react';
import BrowserBanner from './BrowserBanner';

const navLinks = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/scan', label: 'Scan QR', icon: Scan },
  { to: '/enroll', label: 'Enroll', icon: UserPlus },
  { to: '/leaderboard', label: 'Scoreboard', icon: Trophy },
  { to: '/records', label: 'Records', icon: GraduationCap },
];

export default function PublicLayout({ children, hideFooter = false }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-canvas">
      <header className="sticky top-0 z-[50] bg-navy-900 text-white shadow-card pt-safe border-b border-white/10">
        <div className="max-w-[1000px] mx-auto px-3 sm:px-6 h-14 flex items-center gap-2 sm:gap-3">
          <Link to="/" className="flex items-center gap-2.5 min-w-0 shrink-0" onClick={() => setMobileOpen(false)}>
            <img src="/product_brand_logo.png" alt="WMSU Exam System" className="h-10 sm:h-11 w-auto object-contain shrink-0" />
          </Link>

          {/* Desktop nav — pill style, hidden on mobile */}
          <nav className="hidden lg:flex flex-1 items-center justify-center">
            <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-full p-1">
              {navLinks.map(link => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.end}
                  className={({ isActive }) => `
                    inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-medium whitespace-nowrap transition-all duration-150
                    ${isActive ? 'bg-white text-navy-900 shadow-card' : 'text-white/70 hover:text-white hover:bg-white/10'}
                  `}
                >
                  <link.icon size={15} />
                  {link.label}
                </NavLink>
              ))}
            </div>
          </nav>

          {/* Spacer for mobile: push actions to right */}
          <div className="flex-1 lg:hidden" />

          {/* Right actions — always visible */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <Link
              to="/admin"
              className="inline-flex items-center gap-1.5 bg-accent text-navy-900 hover:bg-accent/90 active:bg-accent/80 font-semibold text-[12px] sm:text-[13px] px-3 sm:px-3.5 py-2 rounded-full shadow-card transition-colors whitespace-nowrap"
              title="Open admin panel"
            >
              <Lock size={14} className="shrink-0" />
              <span className="hidden xs:inline sm:inline">Admin</span>
              <span className="hidden sm:inline font-normal opacity-70">Login</span>
            </Link>

            <span className="hidden sm:block w-px h-6 bg-white/15 mx-1" />

            <ThemeToggle className="!text-white/70 hover:!text-white hover:!bg-white/10 shrink-0" />

            <button
              onClick={() => setMobileOpen(o => !o)}
              aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'}
              aria-expanded={mobileOpen}
              className="lg:hidden p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors shrink-0"
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile drawer */}
        {mobileOpen && (
          <div className="lg:hidden border-t border-white/10 bg-navy-900">
            <nav className="max-w-[1000px] mx-auto px-3 py-3 flex flex-col gap-1">
              {navLinks.map(link => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.end}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) => `
                    flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] font-medium transition-colors
                    ${isActive ? 'bg-white text-navy-900' : 'text-white/75 hover:text-white hover:bg-white/10'}
                  `}
                >
                  <link.icon size={18} />
                  {link.label}
                </NavLink>
              ))}
              <div className="h-px bg-white/10 my-2" />
              <Link
                to="/admin"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] font-semibold bg-white text-navy-900 hover:bg-white/90 transition-colors"
              >
                <ShieldCheck size={18} />
                Admin Panel
                <span className="ml-auto text-[11px] font-normal text-navy-700/60">Staff only</span>
              </Link>
              <p className="px-3 py-1 text-[11px] text-white/35 leading-relaxed">
                Instructors use the Admin Panel to manage classes, exams and proctoring.
              </p>
            </nav>
          </div>
        )}
      </header>

      {/* Backdrop for mobile drawer */}
      {mobileOpen && (
        <button
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 top-14 bg-navy-950/40 backdrop-blur-sm z-[40] lg:hidden"
          tabIndex={-1}
        />
      )}

      <BrowserBanner />
      <main className="flex-1 flex flex-col">{children}</main>

      {!hideFooter && (
        <footer className="bg-navy-900 text-white pb-safe border-t border-white/10">
          <div className="max-w-[1000px] mx-auto px-4 sm:px-6">
            {/* Top grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-[1.6fr_1fr_1fr] gap-8 py-8 sm:py-10">
              {/* Brand */}
              <div>
                <Link to="/" className="flex items-center gap-2.5">
                  <img src="/product_brand_logo.png" alt="WMSU Exam System" className="h-11 sm:h-12 w-auto object-contain shrink-0" />
                </Link>
                <p className="text-[12px] leading-relaxed text-white/55 mt-3 max-w-[320px]">
                  Secure exam platform for WMSU — timed assessments, QR attendance, live scoreboards, and student records in one place.
                </p>
                <div className="inline-flex items-center gap-1.5 mt-3 bg-white/5 border border-white/10 rounded-full px-2.5 py-1 text-[11px] font-medium text-white/70">
                  <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                  System operational
                </div>
              </div>

              {/* Student Portal */}
              <div>
                <div className="text-[11px] font-semibold tracking-[.12em] uppercase text-white/40 mb-3">Student Portal</div>
                <ul className="space-y-2">
                  {navLinks.map(l => (
                    <li key={l.to}>
                      <Link to={l.to} className="inline-flex items-center gap-2 text-[13px] text-white/65 hover:text-white transition-colors">
                        <l.icon size={13} className="text-white/35" /> {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Resources */}
              <div>
                <div className="text-[11px] font-semibold tracking-[.12em] uppercase text-white/40 mb-3">Resources</div>
                <ul className="space-y-2">
                  <li>
                    <Link to="/records" className="inline-flex items-center gap-2 text-[13px] text-white/65 hover:text-white transition-colors">
                      <GraduationCap size={13} className="text-white/35" /> Student Records
                    </Link>
                  </li>
                  <li>
                    <Link to="/leaderboard" className="inline-flex items-center gap-2 text-[13px] text-white/65 hover:text-white transition-colors">
                      <Trophy size={13} className="text-white/35" /> Live Scoreboard
                    </Link>
                  </li>
                  <li>
                    <Link to="/admin" className="inline-flex items-center gap-2 text-[13px] text-white hover:text-accent transition-colors font-medium">
                      <ShieldCheck size={13} className="text-accent" /> Admin Panel
                    </Link>
                  </li>
                  <li className="pt-2 text-[11px] text-white/35 leading-relaxed">
                    Instructors manage classes, exams and proctoring from the admin panel (top navigation → Admin).
                  </li>
                </ul>
              </div>
            </div>

            {/* Bottom bar */}
            <div className="border-t border-white/10 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-3 gap-y-1 text-[11px] text-white/35">
                <span>© {new Date().getFullYear()} M.K Sanig. All rights reserved.</span>
                <span className="hidden sm:inline text-white/15">·</span>
                <span className="inline-flex items-center gap-1.5">Exam System <span className="bg-white/10 border border-white/10 rounded-full px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-white/60">v1.0</span></span>
              </div>
              <div className="flex items-center gap-3 text-[11px]">
                <span className="hidden sm:inline-flex items-center gap-1.5 text-white/30">
                  <Lock size={11} className="text-white/20" /> Staff access via top navigation
                </span>
                <Link to="/admin" className="inline-flex items-center gap-1.5 bg-white text-navy-900 hover:bg-white/90 font-semibold px-3 py-1.5 rounded-full transition-colors">
                  <ShieldCheck size={12} /> Admin Login
                </Link>
              </div>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}