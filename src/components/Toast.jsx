import { useState, useEffect, useCallback } from 'react';

let toastId = 0;
let addToastExternal = null;

export function toast(msg, sub) {
  if (addToastExternal) addToastExternal(msg, sub);
}

export default function ToastContainer() {
  const [items, setItems] = useState([]);

  const add = useCallback((msg, sub) => {
    const id = ++toastId;
    setItems((prev) => [...prev, { id, msg, sub }]);
    setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 6000);
  }, []);

  useEffect(() => {
    addToastExternal = add;
    return () => { addToastExternal = null; };
  }, [add]);

  if (!items.length) return null;

  return (
    <div style={{
      position: 'fixed', bottom: 20, right: 20,
      zIndex: 300, display: 'flex', flexDirection: 'column', gap: 10,
      width: 360, pointerEvents: 'none',
    }}>
      {items.map((t) => (
        <div key={t.id} onClick={() => setItems((prev) => prev.filter((x) => x.id !== t.id))}
          style={{
            pointerEvents: 'auto', background: '#c0392b', color: '#fff',
            padding: '16px 20px', borderRadius: 10, fontSize: 14, fontWeight: 600,
            lineHeight: 1.5, boxShadow: '0 8px 32px rgba(192,57,43,.35)',
            cursor: 'pointer', textAlign: 'center', border: '2px solid rgba(255,255,255,.25)',
            animation: 'toastIn .3s ease-out',
          }}>
          {t.msg}
          {t.sub && <small style={{ display: 'block', fontWeight: 400, fontSize: 12, opacity: 0.8, marginTop: 4 }}>{t.sub}</small>}
        </div>
      ))}
    </div>
  );
}
