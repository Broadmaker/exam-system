import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

let toastId = 0;

const toneStyles = {
  success: { bg: 'bg-success', icon: CheckCircle2 },
  error: { bg: 'bg-danger', icon: AlertCircle },
  info: { bg: 'bg-navy-700', icon: Info },
};

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);

  const remove = useCallback((id) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((msg, tone = 'success', duration = 2500) => {
    const id = ++toastId;
    setItems((prev) => [...prev, { id, msg, tone }]);
    setTimeout(() => remove(id), duration);
  }, [remove]);

  const api = useMemo(() => ({
    success: (msg) => push(msg, 'success'),
    error: (msg) => push(msg, 'error', 4000),
    info: (msg) => push(msg, 'info', 3000),
    show: (msg, tone, duration) => push(msg, tone, duration),
  }), [push]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[70] flex flex-col items-center gap-2 pointer-events-none w-[min(92vw,420px)]">
        {items.map((t) => {
          const s = toneStyles[t.tone] || toneStyles.info;
          const Icon = s.icon;
          return (
            <div
              key={t.id}
              onClick={() => remove(t.id)}
              className={`${s.bg} text-white px-5 py-3 rounded-lg text-[13px] font-semibold shadow-pop flex items-center gap-2.5 pointer-events-auto cursor-pointer`}
              style={{ animation: 'fadeInUp .25s ease' }}
            >
              <Icon size={16} className="shrink-0" />
              <span className="flex-1">{t.msg}</span>
              <X size={14} className="opacity-70 shrink-0" />
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return { success: () => {}, error: () => {}, info: () => {}, show: () => {} };
  }
  return ctx;
}