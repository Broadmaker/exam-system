import { useState, useEffect, useRef } from 'react';
import { Timer as TimerIcon } from 'lucide-react';

function formatSeconds(s) {
  const total = Math.max(0, Math.floor(s));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const sec = total % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
    : `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function toneFor(s) {
  return s <= 300 ? 'danger' : s <= 900 ? 'warn' : '';
}

export default function Timer({ initialSeconds, deadlineAt, onExpire, onTick }) {
  const fallbackAnchorRef = useRef(null);
  if (fallbackAnchorRef.current == null) {
    fallbackAnchorRef.current = Date.now() + (Number(initialSeconds) || 0) * 1000;
  }
  const anchorMs = Number(deadlineAt) > 0 ? Number(deadlineAt) : fallbackAnchorRef.current;
  const remainingNow = () => Math.max(0, Math.ceil((anchorMs - Date.now()) / 1000));

  const [display, setDisplay] = useState(() => formatSeconds(remainingNow()));
  const [tone, setTone] = useState(() => toneFor(remainingNow()));
  const intervalRef = useRef(null);
  const expiredRef = useRef(false);
  const onExpireRef = useRef(onExpire);
  const onTickRef = useRef(onTick);

  useEffect(() => { onExpireRef.current = onExpire; }, [onExpire]);
  useEffect(() => { onTickRef.current = onTick; }, [onTick]);

  useEffect(() => {
    expiredRef.current = false;
    const apply = (s) => {
      setDisplay(formatSeconds(s));
      setTone(toneFor(s));
      if (onTickRef.current) onTickRef.current(s);
    };
    const tick = () => {
      const s = remainingNow();
      apply(s);
      if (s <= 0 && !expiredRef.current) {
        expiredRef.current = true;
        clearInterval(intervalRef.current);
        if (onExpireRef.current) onExpireRef.current();
      }
    };
    const onVisible = () => { if (!document.hidden) tick(); };
    tick();
    intervalRef.current = setInterval(tick, 1000);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      clearInterval(intervalRef.current);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [anchorMs]);

  const styles = {
    danger: 'bg-danger-bg border-danger/30 text-danger',
    warn: 'bg-warning-bg border-warning/30 text-warning',
    '': 'bg-white/10 border-white/15 text-white',
  };

  return (
    <div
      className={`inline-flex items-center gap-2.5 border rounded-xl px-3.5 py-2 shadow-sm backdrop-blur ${styles[tone]}`}
      style={{ animation: tone === 'danger' ? 'pulse 0.9s infinite' : 'none' }}
      role="timer"
      aria-live="polite"
    >
      <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${tone === 'danger' ? 'bg-danger text-white' : tone === 'warn' ? 'bg-warning text-white' : 'bg-white/15 text-white'}`}>
        <TimerIcon size={14} />
      </span>
      <div className="text-left leading-none">
        <div className={`text-[9px] font-semibold tracking-[.1em] uppercase ${tone ? 'opacity-80' : 'text-white/60'}`}>Remaining</div>
        <div className="font-mono text-[18px] font-bold leading-none mt-0.5 tabular-nums">{display}</div>
      </div>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.75} }`}</style>
    </div>
  );
}
