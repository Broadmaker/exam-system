import { useState, useEffect } from 'react';
import { Download } from 'lucide-react';

let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  window.dispatchEvent(new Event('installpromptready'));
});

export default function InstallPrompt({ style = {} }) {
  const [ready, setReady] = useState(!!deferredPrompt);

  useEffect(() => {
    const onReady = () => setReady(true);
    window.addEventListener('installpromptready', onReady);
    return () => window.removeEventListener('installpromptready', onReady);
  }, []);

  const install = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    setReady(false);
  };

  if (!ready) return null;

  return (
    <button onClick={install} style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
      padding: 16, borderRadius: 12, fontSize: 16, fontWeight: 600,
      background: '#0f2044', color: '#fff', cursor: 'pointer', border: 'none',
      ...style,
    }}>
      <Download size={18} /> Install App for Best Experience
    </button>
  );
}