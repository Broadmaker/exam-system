import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import AuthGate from './AuthGate';
import { LayoutDashboard, FileText, BookOpen, RotateCcw, Clock, LogOut, Menu, X, ChevronLeft } from 'lucide-react';

const nav = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/bank', label: 'Question Bank', icon: BookOpen },
  { to: '/admin/regrade', label: 'Regrade', icon: RotateCcw },
  { to: '/admin/logs', label: 'Activity Log', icon: Clock },
];

export default function AdminLayout({ children, title }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const linkStyle = (isActive) => ({
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '10px 14px', borderRadius: 8, fontSize: 13, fontWeight: isActive ? 600 : 400,
    color: isActive ? '#fff' : '#9ab',
    background: isActive ? 'rgba(255,255,255,.12)' : 'transparent',
    textDecoration: 'none', transition: 'background .15s, color .15s',
  });

  const closeMobile = () => setSidebarOpen(false);

  return (
    <AuthGate>
      <div style={{ display: 'flex', minHeight: '100vh', background: '#f5f8ff' }}>
        {/* Mobile overlay */}
        {sidebarOpen && (
          <div onClick={closeMobile}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 199 }} />
        )}

        {/* Sidebar */}
        <aside style={{
          width: 240, background: '#0f2044', color: '#fff',
          display: 'flex', flexDirection: 'column',
          position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 200,
          transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform .25s ease',
          overflowY: 'auto',
        }}>
          <div style={{ padding: '20px 16px 12px', borderBottom: '1px solid rgba(255,255,255,.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <FileText size={20} color="#e8a020" />
              <span style={{ fontSize: 16, fontWeight: 700 }}>Admin Panel</span>
            </div>
            <div style={{ fontSize: 10, color: '#5a7090', letterSpacing: '.06em', textTransform: 'uppercase' }}>
              Exam System v1.0
            </div>
          </div>

          <nav style={{ flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {nav.map(item => (
              <NavLink key={item.to} to={item.to} end={item.end}
                onClick={closeMobile}
                style={({ isActive }) => linkStyle(isActive)}>
                <item.icon size={16} />
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div style={{ padding: '12px 10px', borderTop: '1px solid rgba(255,255,255,.08)' }}>
            <a href="/" onClick={closeMobile}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 8, fontSize: 13, color: '#5a7090', textDecoration: 'none' }}>
              <ChevronLeft size={16} /> Student Portal
            </a>
            <button onClick={() => { sessionStorage.removeItem('admin_auth'); window.location.reload(); }}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 8, fontSize: 13, color: '#5a7090', background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left' }}>
              <LogOut size={16} /> Logout
            </button>
          </div>
        </aside>

        {/* Desktop sidebar (always visible) */}
        <aside style={{
          width: 240, background: '#0f2044', color: '#fff', flexShrink: 0,
          display: 'flex', flexDirection: 'column', minHeight: '100vh',
          position: 'sticky', top: 0, height: '100vh', overflowY: 'auto',
        }}>
          <div style={{ padding: '24px 16px 12px', borderBottom: '1px solid rgba(255,255,255,.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <FileText size={20} color="#e8a020" />
              <span style={{ fontSize: 16, fontWeight: 700 }}>Admin Panel</span>
            </div>
            <div style={{ fontSize: 10, color: '#5a7090', letterSpacing: '.06em', textTransform: 'uppercase' }}>
              Exam System v1.0
            </div>
          </div>

          <nav style={{ flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {nav.map(item => (
              <NavLink key={item.to} to={item.to} end={item.end}
                style={({ isActive }) => linkStyle(isActive)}>
                <item.icon size={16} />
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div style={{ padding: '12px 10px', borderTop: '1px solid rgba(255,255,255,.08)' }}>
            <a href="/"
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 8, fontSize: 13, color: '#5a7090', textDecoration: 'none' }}>
              <ChevronLeft size={16} /> Student Portal
            </a>
            <button onClick={() => { sessionStorage.removeItem('admin_auth'); window.location.reload(); }}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 8, fontSize: 13, color: '#5a7090', background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left' }}>
              <LogOut size={16} /> Logout
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          {/* Top bar (mobile) */}
          <div style={{
            display: 'none', background: '#0f2044', color: '#fff',
            padding: '12px 16px', alignItems: 'center', gap: 12,
          }} className="admin-topbar">
            <button onClick={() => setSidebarOpen(true)}
              style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 4 }}>
              <Menu size={22} />
            </button>
            <span style={{ fontSize: 15, fontWeight: 600, flex: 1 }}>{title || 'Admin'}</span>
            <button onClick={() => { sessionStorage.removeItem('admin_auth'); window.location.reload(); }}
              style={{ background: 'none', border: 'none', color: '#9ab', cursor: 'pointer' }}>
              <LogOut size={18} />
            </button>
          </div>

          {children}
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .admin-topbar { display: flex !important; }
          aside:last-of-type { display: none !important; }
        }
      `}</style>
    </AuthGate>
  );
}
