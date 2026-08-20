import { useState, useRef, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import AuthGate from './AuthGate';
import ThemeToggle from './ThemeToggle';
import {
  LayoutDashboard, Users, BookOpen, Eye, RotateCcw, Radio, Clock, LogOut,
  Menu, X, ChevronLeft, GraduationCap, PanelLeftClose, PanelLeftOpen, ShieldCheck,
} from 'lucide-react';

const navGroups = [
  {
    label: 'Overview',
    items: [
      { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
    ],
  },
  {
    label: 'Classes & Students',
    items: [
      { to: '/admin/classes', label: 'Classes', icon: Users },
    ],
  },
  {
    label: 'Exams',
    items: [
      { to: '/admin/bank', label: 'Question Bank', icon: BookOpen },
      { to: '/admin/answers', label: 'Student Answers', icon: Eye },
      { to: '/admin/regrade', label: 'Regrade', icon: RotateCcw },
    ],
  },
  {
    label: 'Monitoring',
    items: [
      { to: '/admin/proctor', label: 'Live Proctoring', icon: Radio },
    ],
  },
  {
    label: 'System',
    items: [
      { to: '/admin/logs', label: 'Activity Log', icon: Clock },
    ],
  },
];

function SidebarContent({ collapsed, onNavigate }) {
  return (
    <>
      {/* Brand */}
      <div className="px-4 pt-5 pb-4 border-b border-border flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-navy-700 text-white flex items-center justify-center shrink-0 shadow-card">
          <GraduationCap size={18} />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <div className="text-[15px] font-bold text-navy-800 leading-tight truncate">Exam System</div>
            <div className="text-[9px] text-faint tracking-[.14em] uppercase">Admin Panel</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2.5 py-3 overflow-y-auto flex flex-col gap-1">
        {navGroups.map((group) => (
          <div key={group.label}>
            <div className="px-2.5 pt-3 pb-1.5 text-[9px] font-bold text-faint tracking-[.12em] uppercase whitespace-nowrap">
              {collapsed ? '·' : group.label}
            </div>
            {group.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={onNavigate}
                title={collapsed ? item.label : undefined}
                className={({ isActive }) => `
                  flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium
                  transition-colors duration-150 whitespace-nowrap relative
                  ${isActive
                    ? 'bg-navy-100 text-navy-700 font-semibold'
                    : 'text-muted hover:text-navy-800 hover:bg-navy-50'}
                `}
              >
                {({ isActive }) => (
                  <>
                    {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-navy-700 rounded-full" />}
                    <item.icon size={16} className="shrink-0" />
                    {!collapsed && item.label}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-2.5 border-t border-border">
        <a href="/" onClick={onNavigate}
          className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] text-muted hover:text-navy-800 hover:bg-navy-50 transition-colors"
          title={collapsed ? 'Student Portal' : undefined}>
          <ChevronLeft size={16} className="shrink-0" />
          {!collapsed && 'Student Portal'}
        </a>
        <button onClick={() => { sessionStorage.removeItem('admin_auth'); window.location.reload(); }}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] text-muted hover:text-danger hover:bg-danger-bg transition-colors cursor-pointer text-left"
          title={collapsed ? 'Logout' : undefined}>
          <LogOut size={16} className="shrink-0" />
          {!collapsed && 'Logout'}
        </button>
      </div>
    </>
  );
}

function UserMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 p-1.5 pl-1.5 pr-2.5 rounded-full hover:bg-navy-50 transition-colors cursor-pointer"
      >
        <span className="w-7 h-7 rounded-full bg-navy-700 text-white flex items-center justify-center text-[11px] font-bold">
          A
        </span>
        <span className="hidden sm:block text-[13px] font-semibold text-navy-800">Admin</span>
        <ShieldCheck size={14} className="text-faint" />
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+6px)] w-52 bg-surface border border-border rounded-lg shadow-pop py-1.5 z-[65]" style={{ animation: 'popIn .15s ease' }}>
          <div className="px-3.5 py-2 border-b border-border">
            <div className="text-[13px] font-semibold text-navy-800">Administrator</div>
            <div className="text-[11px] text-faint">Exam System v1.0</div>
          </div>
          <a href="/" className="flex items-center gap-2 px-3.5 py-2 text-[13px] text-muted hover:bg-navy-50 hover:text-navy-800 transition-colors">
            <ChevronLeft size={14} /> Student Portal
          </a>
          <button
            onClick={() => { sessionStorage.removeItem('admin_auth'); window.location.reload(); }}
            className="w-full flex items-center gap-2 px-3.5 py-2 text-[13px] text-danger hover:bg-danger-bg transition-colors cursor-pointer text-left">
            <LogOut size={14} /> Logout
          </button>
        </div>
      )}
    </div>
  );
}

export default function AdminLayout({ children, title }) {
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();
  const current = title;

  useEffect(() => { setDrawerOpen(false); }, [location.pathname]);

  return (
    <AuthGate>
      <div className="flex min-h-screen bg-canvas text-text">
        {/* Mobile overlay */}
        {drawerOpen && (
          <div onClick={() => setDrawerOpen(false)}
            className="fixed inset-0 bg-navy-950/50 z-[55] lg:hidden" />
        )}

        {/* Mobile drawer */}
        <aside className={`fixed inset-y-0 left-0 z-[60] w-60 bg-surface border-r border-border flex flex-col transition-transform duration-250 ease-in-out lg:hidden ${drawerOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <button onClick={() => setDrawerOpen(false)}
            className="absolute top-3 right-3 p-1.5 rounded-md text-faint hover:text-navy-800 hover:bg-navy-50 cursor-pointer">
            <X size={18} />
          </button>
          <SidebarContent onNavigate={() => setDrawerOpen(false)} />
        </aside>

        {/* Desktop sidebar */}
        <aside className={`hidden lg:flex flex-col sticky top-0 h-screen bg-surface border-r border-border text-navy-800 shrink-0 transition-[width] duration-250 ease-in-out overflow-hidden ${collapsed ? 'w-16' : 'w-60'}`}>
          <SidebarContent collapsed={collapsed} />
        </aside>

        {/* Main */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* Top bar */}
          <header className="sticky top-0 z-[50] min-h-14 bg-surface/85 backdrop-blur border-b border-border flex items-center gap-3 px-3 sm:px-5 pt-safe">
            <button
              onClick={() => setCollapsed((c) => !c)}
              className="hidden lg:flex p-2 rounded-lg text-muted hover:text-navy-800 hover:bg-navy-50 transition-colors cursor-pointer"
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
              {collapsed ? <PanelLeftOpen size={19} /> : <PanelLeftClose size={19} />}
            </button>
            <button
              onClick={() => setDrawerOpen(true)}
              className="lg:hidden p-2 rounded-lg text-navy-800 hover:bg-navy-50 transition-colors cursor-pointer">
              <Menu size={20} />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-[15px] sm:text-[16px] font-semibold text-navy-800 truncate">{current || 'Admin'}</h1>
            </div>
            <ThemeToggle />
            <UserMenu />
          </header>

          <main className="flex-1">{children}</main>
        </div>
      </div>
    </AuthGate>
  );
}