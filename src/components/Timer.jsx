import { useState, useEffect, useRef } from 'react';

export default function Timer({ initialSeconds, onExpire, onTick }) {
  const [display, setDisplay] = useState('');
  const [className, setClassName] = useState('');
  const intervalRef = useRef(null);
  const secondsRef = useRef(initialSeconds);
  const onExpireRef = useRef(onExpire);
  const onTickRef = useRef(onTick);

  useEffect(() => { onExpireRef.current = onExpire; }, [onExpire]);
  useEffect(() => { onTickRef.current = onTick; }, [onTick]);

  useEffect(() => {
    secondsRef.current = initialSeconds;
    intervalRef.current = setInterval(() => {
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
      setClassName(s <= 300 ? 'danger' : s <= 900 ? 'warn' : '');
      if (onTickRef.current) onTickRef.current(s);
      if (s <= 0) {
        clearInterval(intervalRef.current);
        if (onExpireRef.current) onExpireRef.current();
      }
    }, 1000);

    return () => clearInterval(intervalRef.current);
  }, [initialSeconds]);

  const color = className === 'danger' ? '#ff6b6b' : className === 'warn' ? '#e8a020' : '#fff';
  const anim = className === 'danger' ? 'pulse 0.8s infinite' : 'none';

  return (
    <div id="timer-box" style={{ background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.2)', borderRadius: 8, padding: '8px 16px', textAlign: 'center' }}>
      <div style={{ fontSize: 9, color: '#9ab', letterSpacing: '.08em', textTransform: 'uppercase' }}>Remaining</div>
      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 26, fontWeight: 600, color, animation: anim }}>{display}</div>
      <style>{`@keyframes pulse { 0%,100%{opacity:1}50%{opacity:.4} }`}</style>
    </div>
  );
}
