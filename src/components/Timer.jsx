import { useState, useEffect, useRef } from 'react';
import { Timer as TimerIcon } from 'lucide-react';

export default function Timer({ initialSeconds, onExpire, onTick }) {
  const [display, setDisplay] = useState(() => {
    const h = Math.floor(initialSeconds / 3600);
    const m = Math.floor((initialSeconds % 3600) / 60);
    const s = initialSeconds % 60;
    return h > 0
      ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
      : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  });
  const [tone, setTone] = useState(() => (initialSeconds <= 300 ? 'danger' : initialSeconds <= 900 ? 'warn' : ''));
  const intervalRef = useRef(null);
  const secondsRef = useRef(initialSeconds);
  const onExpireRef = useRef(onExpire);
  const onTickRef = useRef(onTick);

  useEffect(() => { onExpireRef.current = onExpire; }, [onExpire]);
  useEffect(() => { onTickRef.current = onTick; }, [onTick]);

  useEffect(() => {
    secondsRef.current = initialSeconds;
    const tick = () => {
      secondsRef.current--;
      const s = secondsRef.current;
      const h = Math.floor(s / 3600);
      const m = Math.floor((s % 3600) / 60);
      const sec = s % 60;
      setDisplay(
        h > 0
          ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
          : `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
      );
      setTone(s <= 300 ? 'danger' : s <= 900 ? 'warn' : '');
      if (onTickRef.current) onTickRef.current(s);
      if (s <= 0) {
        clearInterval(intervalRef.current);
        if (onExpireRef.current) onExpireRef.current();
      }
    };
    intervalRef.current = setInterval(tick, 1000);
    return () => clearInterval(intervalRef.current);
  }, [initialSeconds]);

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
