import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import PublicLayout from '../components/PublicLayout';
import { Button, Card, useToast } from '../components/ui';
import { Camera, QrCode, Upload, X, ShieldCheck, ArrowRight, AlertTriangle, Image as ImageIcon } from 'lucide-react';

export default function Scan() {
  const navigate = useNavigate();
  const toast = useToast();
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');
  const [manualCode, setManualCode] = useState('');
  const html5QrRef = useRef(null);
  const readerId = 'qr-reader';

  const handleDecoded = (decodedText) => {
    const text = String(decodedText || '').trim();
    if (!text) return;
    // Stop scanning to prevent double navigation
    try { html5QrRef.current?.stop().catch(() => {}); } catch {}
    setScanning(false);

    // Try to parse as URL first
    try {
      const url = new URL(text);
      const sameHost = url.hostname === window.location.hostname || url.hostname.endsWith('pages.dev') || url.hostname.endsWith('workers.dev');
      // Only allow our app paths
      if (url.pathname.startsWith('/exam') || url.pathname.startsWith('/checkin') || url.pathname.startsWith('/enroll')) {
        // Keep search params
        const target = url.pathname + url.search + url.hash;
        toast.info('QR scanned — opening ' + url.pathname);
        navigate(target);
        return;
      }
      if (sameHost && url.searchParams.get('id')) {
        // Generic id param -> try exam first
        const id = url.searchParams.get('id');
        navigate('/exam?id=' + encodeURIComponent(id));
        return;
      }
      // If it's a full URL but not our path, show warning
      setError('This QR is not for this system: ' + text.slice(0, 80));
      return;
    } catch {
      // Not a URL — treat as plain code (exam id, class code, attendance code)
    }

    // Plain code fallback: if it looks like an ID, try exam
    if (/^[A-Za-z0-9_-]{4,64}$/.test(text)) {
      // Heuristic: if starts with CLS or contains dash, try enroll, else exam
      if (text.toUpperCase().startsWith('CLS') || text.includes('CLS')) {
        navigate('/enroll?code=' + encodeURIComponent(text));
      } else {
        // Try exam first, fallback will redirect to enroll if needed (Exam.jsx handles class code)
        navigate('/exam?id=' + encodeURIComponent(text));
      }
      return;
    }
    setError('Could not interpret QR: ' + text.slice(0, 80));
  };

  const startScanning = async () => {
    setError('');
    setScanning(true);
    // Ensure element exists
    await new Promise(r => setTimeout(r, 100));
    const qr = new Html5Qrcode(readerId, { verbose: false });
    html5QrRef.current = qr;
    try {
      await qr.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
        (decodedText) => handleDecoded(decodedText),
        () => {}
      );
    } catch (e) {
      setScanning(false);
      const msg = String(e?.message || e || '');
      if (msg.includes('NotAllowedError') || msg.includes('Permission')) {
        setError('Camera permission denied. Please allow camera in browser settings or use image upload below.');
      } else if (msg.includes('NotFoundError')) {
        setError('No camera found on this device.');
      } else {
        setError('Could not start camera: ' + msg.slice(0, 120));
      }
      try { await qr.stop().catch(() => {}); } catch {}
      html5QrRef.current = null;
    }
  };

  const stopScanning = async () => {
    try { await html5QrRef.current?.stop().catch(() => {}); } catch {}
    try { await html5QrRef.current?.clear().catch(() => {}); } catch {}
    html5QrRef.current = null;
    setScanning(false);
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const qr = new Html5Qrcode(readerId, { verbose: false });
    try {
      const decoded = await qr.scanFile(file, false);
      handleDecoded(decoded);
    } catch {
      setError('Could not read QR from image. Try a clearer photo.');
    }
    e.target.value = '';
  };

  const goManual = () => {
    const c = manualCode.trim();
    if (!c) { setError('Enter a code first.'); return; }
    handleDecoded(c);
  };

  useEffect(() => {
    return () => {
      try { html5QrRef.current?.stop().catch(() => {}); } catch {}
      try { html5QrRef.current?.clear().catch(() => {}); } catch {}
    };
  }, []);

  return (
    <PublicLayout>
      <main className="max-w-[640px] mx-auto px-4 py-6">
        <div className="flex items-center gap-2 mb-4 text-[11px] font-semibold tracking-[.12em] uppercase text-navy-700">
          <QrCode size={14} /> In-App Scanner
        </div>
        <h1 className="text-[22px] font-bold text-navy-800 leading-tight">Scan QR directly in the app</h1>
        <p className="text-[13px] text-muted mt-1.5 leading-relaxed">
          Point your camera at an exam or check-in QR. You’ll stay inside the app — no Messenger or external browser.
        </p>
        <div className="inline-flex items-center gap-2 bg-info-bg border border-info/15 rounded-full px-3 py-1.5 mt-3 text-[11px] text-info">
          <ShieldCheck size={12} /> Requires camera permission — uses <code className="font-mono">https</code> only
        </div>

        <Card className="mt-5 !p-0 overflow-hidden">
          <div className="px-5 pt-5 pb-3 border-b border-border bg-gradient-to-r from-navy-50 to-surface">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-lg bg-navy-700 text-white flex items-center justify-center shrink-0"><Camera size={16} /></span>
              <div>
                <div className="text-[14px] font-semibold text-navy-800">Camera</div>
                <div className="text-[11px] text-muted">Back camera preferred; works on PWA (installed or https)</div>
              </div>
              <span className={`ml-auto text-[11px] px-2 py-1 rounded-full border ${scanning ? 'bg-success-bg text-success border-success/20' : 'bg-surface text-muted border-border'}`}>{scanning ? 'Scanning…' : 'Idle'}</span>
            </div>
          </div>

          <div className="p-5">
            <div id={readerId} className="w-full rounded-xl overflow-hidden bg-canvas border border-border min-h-[280px] flex items-center justify-center" style={{ minHeight: 280 }} />
            {!scanning ? (
              <div className="flex gap-2 mt-4">
                <Button icon={Camera} onClick={startScanning} className="flex-1">Start Camera</Button>
                <Button variant="outline" icon={X} onClick={stopScanning} disabled={!html5QrRef.current}>Stop</Button>
              </div>
            ) : (
              <Button variant="outline" icon={X} onClick={stopScanning} className="w-full mt-4">Stop Scanning</Button>
            )}

            {error && <div className="text-[12px] text-danger bg-danger-bg border border-danger/15 rounded-xl px-3 py-2.5 mt-4 flex items-start gap-1.5"><AlertTriangle size={14} className="shrink-0 mt-0.5" /> <span>{error}</span></div>}

            <div className="flex items-center gap-3 my-4">
              <span className="h-px flex-1 bg-border" />
              <span className="text-[11px] text-faint">or</span>
              <span className="h-px flex-1 bg-border" />
            </div>

            <div className="bg-canvas/60 border border-border rounded-xl p-3.5">
              <div className="text-[11px] font-bold tracking-[.08em] uppercase text-faint mb-2 flex items-center gap-1.5"><ImageIcon size={12} /> Upload QR image</div>
              <label className="flex items-center gap-2 bg-surface border border-border rounded-lg px-3 py-2.5 cursor-pointer hover:bg-navy-50 transition-colors">
                <Upload size={14} className="text-navy-700" />
                <span className="text-[13px] font-medium text-navy-800">Choose image</span>
                <input type="file" accept="image/*" onChange={handleFile} className="hidden" />
                <span className="ml-auto text-[11px] text-muted">for no-camera devices</span>
              </label>
            </div>

            <div className="bg-canvas/60 border border-border rounded-xl p-3.5 mt-3">
              <div className="text-[11px] font-bold tracking-[.08em] uppercase text-faint mb-2">Manual code</div>
              <div className="flex gap-2">
                <input value={manualCode} onChange={e => setManualCode(e.target.value)} onKeyDown={e => e.key === 'Enter' && goManual()} placeholder="Paste exam ID, class or attendance code" className="input flex-1 !bg-surface" />
                <Button variant="outline" icon={ArrowRight} onClick={goManual}>Go</Button>
              </div>
            </div>

            <p className="text-[11px] text-faint mt-3 leading-relaxed text-center">Tip: Open this page <strong className="text-navy-700">inside the installed PWA</strong> first, then scan — you’ll never leave the app, even if the QR was shared via Messenger.</p>
          </div>
        </Card>
      </main>
    </PublicLayout>
  );
}
