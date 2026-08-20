import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Download, X, Smartphone, Info } from 'lucide-react';
import Modal from './ui/Modal';

let deferredPrompt = null;
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    window.dispatchEvent(new Event('installpromptready'));
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    window.dispatchEvent(new Event('installpromptdone'));
  });
}

const isStandalone = () =>
  (typeof window !== 'undefined') &&
  (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true);

function detectPlatform() {
  const ua = navigator.userAgent || '';
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios';
  if (/xiaomi|miui/i.test(ua)) return 'xiaomi';
  return 'android';
}

export default function FloatingInstall() {
  const { pathname } = useLocation();
  const [ready, setReady] = useState(!!deferredPrompt && !isStandalone());
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem('install_dismissed') === '1'; } catch { return false; }
  });
  const [helpOpen, setHelpOpen] = useState(false);
  const [smallScreen, setSmallScreen] = useState(false);
  const readyRef = useRef(ready);

  const isExam = pathname.startsWith('/exam');

  useEffect(() => {
    const onReady = () => { if (!isStandalone()) setReady(true); };
    const onDone = () => setReady(false);
    window.addEventListener('installpromptready', onReady);
    window.addEventListener('installpromptdone', onDone);
    if (deferredPrompt && !isStandalone()) setReady(true);
    return () => {
      window.removeEventListener('installpromptready', onReady);
      window.removeEventListener('installpromptdone', onDone);
    };
  }, []);

  useEffect(() => {
    readyRef.current = ready;
  }, [ready]);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const update = () => setSmallScreen(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  const install = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        await deferredPrompt.userChoice;
      } catch {}
      deferredPrompt = null;
      setReady(false);
    } else {
      setHelpOpen(true);
    }
  };

  const dismiss = (e) => {
    e.stopPropagation();
    try { localStorage.setItem('install_dismissed', '1'); } catch {}
    setDismissed(true);
  };

  const platform = detectPlatform();
  const steps = platform === 'ios' ? [
    'Open this site in Safari',
    'Tap the Share button at the bottom',
    'Scroll and tap "Add to Home Screen"',
    'Tap Add and the app icon will appear on your home screen',
  ] : platform === 'xiaomi' ? [
    'Open this site in your browser',
    'Tap the ⋮ (three-dot) menu in the top-right corner',
    'Look for "Add to Home Screen" or "Install app"',
    'If you can\'t find it, tap "Settings" then "Install App"',
    'Confirm and the app icon will appear on your home screen',
  ] : [
    'Open this site in Chrome',
    'Tap the ⋮ (three-dot) menu in the top-right corner',
    'Tap "Add to Home Screen" or "Install app"',
    'Confirm and the app icon will appear on your home screen',
  ];

  const show = smallScreen && !isStandalone() && !isExam && !dismissed;

  return (
    <>
      {show && (
        <div className="fixed bottom-4 left-4 right-4 z-[300] sm:left-auto sm:right-4 sm:w-auto">
          <div className="flex items-center gap-3 bg-navy-900 text-white rounded-2xl px-4 py-3.5 shadow-card border border-white/10"
            style={{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom))' }}>
            <span className="w-9 h-9 rounded-xl bg-accent/20 text-accent flex items-center justify-center shrink-0">
              <Smartphone size={18} />
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-semibold leading-tight">Install Exam Portal</div>
              <div className="text-[11px] text-white/60 truncate">Get it on your home screen for quick access</div>
            </div>
            <button onClick={install}
              className="inline-flex items-center gap-1.5 bg-accent text-white text-[12px] font-bold rounded-lg px-3.5 py-2 shrink-0 cursor-pointer hover:opacity-90 transition-opacity">
              <Download size={14} /> {ready ? 'Install' : 'Guide'}
            </button>
            <button onClick={dismiss} aria-label="Dismiss"
              className="text-white/50 hover:text-white p-1 rounded-md cursor-pointer shrink-0">
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      <Modal open={helpOpen} onClose={() => setHelpOpen(false)} title="Install Exam Portal" icon={Smartphone} size="sm">
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center gap-2 text-[12px] text-muted mb-1">
            <Info size={14} className="text-navy-700 shrink-0" /> Your browser doesn't offer a one-tap install. Follow these steps instead:
          </div>
          {steps.map((s, i) => (
            <div key={i} className="flex items-start gap-2.5 text-[13px]">
              <span className="w-5 h-5 rounded-full bg-navy-100 text-navy-700 flex items-center justify-center text-[11px] font-bold shrink-0 mt-px">{i + 1}</span>
              <span className="text-navy-800">{s}</span>
            </div>
          ))}
        </div>
      </Modal>
    </>
  );
}