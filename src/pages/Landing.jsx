import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FileText, Trophy, Lock } from 'lucide-react';

export default function Landing() {
  const [code, setCode] = useState('');
  const navigate = useNavigate();

  const go = () => {
    if (!code.trim()) return;
    navigate('/exam?id=' + encodeURIComponent(code.trim()));
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24, background: 'linear-gradient(135deg, #0f2044 0%, #1a4fad 100%)',
    }}>
      <div style={{
        background: '#fff', borderRadius: 18, padding: '48px 40px', maxWidth: 460,
        width: '100%', boxShadow: '0 24px 64px rgba(0,0,0,.35)', textAlign: 'center',
      }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: '#0f2044', marginBottom: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          <FileText size={24} /> Exam Portal</h1>
        <p style={{ fontSize: 14, color: '#5a7090', marginBottom: 32, lineHeight: 1.5 }}>
          Take your exam or check the live scoreboard.
        </p>

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#0f2044', marginBottom: 6, textAlign: 'left' }}>
            Enter Exam ID
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={code} onChange={e => setCode(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && go()}
              placeholder="Paste exam ID here"
              style={{
                flex: 1, border: '1.5px solid #c8d8f0', borderRadius: 8,
                padding: '11px 14px', fontSize: 14, fontFamily: 'inherit', outline: 'none',
              }} />
            <button onClick={go}
              style={{
                background: '#0f2044', color: '#fff', border: 'none', borderRadius: 8,
                padding: '11px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}>Go</button>
          </div>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid #c8d8f0', margin: '24px 0' }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Link to="/leaderboard" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            padding: 16, borderRadius: 12, fontSize: 16, fontWeight: 600,
            background: '#0f2044', color: '#fff',
          }}><Trophy size={18} /> Live Scoreboard</Link>
          <Link to="/admin" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            padding: 16, borderRadius: 12, fontSize: 16, fontWeight: 600,
            background: '#f5f8ff', color: '#0f2044', border: '1.5px solid #c8d8f0',
          }}><Lock size={18} /> Admin Panel</Link>
        </div>

        <div style={{ fontSize: 11, color: '#5a7090', marginTop: 24 }}>
          Exam System v1.0 &nbsp;·&nbsp; © {new Date().getFullYear()} M.K Sanig. All rights reserved.
        </div>
      </div>
    </div>
  );
}
