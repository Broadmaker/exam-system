import { useState, useEffect } from 'react';
import { AlertTriangle, ExternalLink, Scan, X } from 'lucide-react';
import { Link } from 'react-router-dom';

function detectInAppBrowser() {
  const ua = navigator.userAgent || '';
  const isFB = /FBAN|FBAV|FBAN\/Messenger|FB_IAB|FBAN\/Messenger/i.test(ua);
  const isInstagram = /Instagram/i.test(ua);
  const isMIUIBrowser = /MiuiBrowser|XiaoMi\/MiuiBrowser/i.test(ua);
  const isXiaomi = /xiaomi|miui|Redmi/i.test(ua) && !/Chrome\/\d+/.test(ua);
  // MIUI Browser often has "MiuiBrowser" and low Chrome version
  if (isFB || isInstagram) return { type: 'messenger', label: 'Messenger / Instagram in-app browser' };
  if (isMIUIBrowser) return { type: 'miui', label: 'MIUI Browser' };
  if (isXiaomi && /Version\//.test(ua)) return { type: 'miui', label: 'Xiaomi browser' };
  return null;
}

export default function BrowserBanner() {
  const [info, setInfo] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const d = detectInAppBrowser();
    if (d) setInfo(d);
    // Also show for Xiaomi devices in any browser as help
    if (!d && /xiaomi|redmi|miui/i.test(navigator.userAgent || '')) {
      // Show subtle Xiaomi help but not as warning
      setInfo({ type: 'xiaomi', label: 'Xiaomi device' });
    }
  }, []);

  if (!info || dismissed) return null;
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  if (isStandalone) return null;

  if (info.type === 'messenger') {
    return (
      <div className="bg-warning text-warning-foreground border-b border-warning/20 px-4 py-3 flex items-start gap-3 text-[13px]">
        <AlertTriangle size={16} className="shrink-0 mt-0.5 text-warning" />
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-navy-800">You’re viewing in Messenger</div>
          <div className="text-[11px] text-muted leading-relaxed mt-0.5">
            Tap <strong>⋮</strong> top-right → <strong>Open in browser</strong> → choose <strong>Chrome</strong>, then go to <strong>Scan QR</strong> to stay inside the app.
          </div>
          <div className="flex gap-2 mt-2">
            <Link to="/scan" className="inline-flex items-center gap-1.5 bg-navy-700 text-white px-3 py-1.5 rounded-full text-[11px] font-semibold no-underline"><Scan size={12} /> Open Scanner</Link>
            <button onClick={() => setDismissed(true)} className="text-[11px] text-muted hover:text-navy-800 px-2 py-1">Dismiss</button>
          </div>
        </div>
        <button onClick={() => setDismissed(true)} className="p-1 text-faint hover:text-navy-800"><X size={14} /></button>
      </div>
    );
  }

  if (info.type === 'miui') {
    return (
      <div className="bg-navy-700 text-white px-4 py-3 flex items-start gap-3 text-[13px]">
        <AlertTriangle size={16} className="shrink-0 mt-0.5 text-accent" />
        <div className="flex-1 min-w-0">
          <div className="font-semibold">MIUI Browser detected</div>
          <div className="text-[11px] text-white/70 leading-relaxed mt-0.5">
            For best results open this site in <strong className="text-white">Chrome</strong>: tap <strong>⋮</strong> → <strong>Open in Chrome</strong> or copy link to Chrome. Camera scan works in Chrome even without installing.
          </div>
          <div className="flex gap-2 mt-2">
            <Link to="/scan" className="inline-flex items-center gap-1.5 bg-white text-navy-700 px-3 py-1.5 rounded-full text-[11px] font-bold no-underline"><Scan size={12} /> Scan QR in Chrome</Link>
            <a href="intent://exam-system-4h2.pages.dev/scan#Intent;scheme=https;package=com.android.chrome;end" className="inline-flex items-center gap-1.5 bg-white/10 border border-white/20 text-white px-3 py-1.5 rounded-full text-[11px] no-underline"><ExternalLink size={12} /> Try open Chrome</a>
          </div>
        </div>
        <button onClick={() => setDismissed(true)} className="p-1 text-white/60 hover:text-white"><X size={14} /></button>
      </div>
    );
  }

  // Generic Xiaomi help (subtle)
  return (
    <div className="bg-canvas border-b border-border px-4 py-2.5 flex items-center gap-2 text-[11px] text-muted">
      <Scan size={12} className="text-navy-700 shrink-0" />
      <span>Xiaomi tip: use <strong className="text-navy-700">Chrome</strong> for camera scan — MIUI Browser may block camera. <Link to="/scan" className="text-navy-700 font-semibold underline">Open scanner</Link></span>
      <button onClick={() => setDismissed(true)} className="ml-auto p-1 text-faint hover:text-navy-800"><X size={12} /></button>
    </div>
  );
}
