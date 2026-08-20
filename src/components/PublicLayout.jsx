import { NavLink, Link } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';
import { FileText, Home, CalendarCheck, UserPlus, Trophy, GraduationCap, ShieldCheck } from 'lucide-react';

const navLinks = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/checkin', label: 'Check In', icon: CalendarCheck },
  { to: '/enroll', label: 'Enroll', icon: UserPlus },
  { to: '/leaderboard', label: 'Scoreboard', icon: Trophy },
  { to: '/records', label: 'Records', icon: GraduationCap },
];

export default function PublicLayout({ children, hideFooter = false }) {
  return (
    <div className="min-h-screen flex flex-col bg-canvas">
      <header className="sticky top-0 z-[50] bg-navy-900 text-white shadow-card pt-safe">
        <div className="max-w-[1000px] mx-auto px-3 sm:px-6 h-14 flex items-center gap-2 sm:gap-3">
          <Link to="/" className="flex items-center gap-2.5 min-w-0 shrink-0">
            <span className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
              <FileText size={16} className="text-accent" />
            </span>
            <span className="min-w-0 hidden sm:block">
              <span className="block text-[15px] font-bold leading-tight truncate">Exam Portal</span>
              <span className="block text-[9px] text-white/40 tracking-[.14em] uppercase">WMSU Exam System</span>
            </span>
          </Link>

          <nav className="flex-1 flex items-center gap-1 justify-end overflow-x-auto no-scrollbar min-w-0">
            {navLinks.map(link => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) => `
                  inline-flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg text-[13px] font-medium whitespace-nowrap transition-colors shrink-0
                  ${isActive ? 'bg-white/15 text-white' : 'text-white/70 hover:text-white hover:bg-white/10'}
                `}
              >
                <link.icon size={15} />
                <span className="hidden sm:inline">{link.label}</span>
              </NavLink>
            ))}
          </nav>

          <ThemeToggle className="!text-white/70 hover:!text-white hover:!bg-white/10 shrink-0" />
        </div>
      </header>

      <main className="flex-1 flex flex-col">{children}</main>

      {!hideFooter && (
        <footer className="bg-navy-900 text-white pb-safe">
          <div className="max-w-[1000px] mx-auto px-4 sm:px-6 py-5 flex items-center justify-between gap-3 flex-wrap">
            <div className="text-[11px] text-white/50">
              Exam System v1.0 · © {new Date().getFullYear()} M.K Sanig. All rights reserved.
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-white/50">
              <ShieldCheck size={12} className="text-white/30" />
              <Link to="/admin" className="text-white/50 hover:text-accent transition-colors">Admin Panel</Link>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}