import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

const sizes = {
  sm: 'max-w-[min(380px,100%)]',
  md: 'max-w-[min(480px,100%)]',
  lg: 'max-w-[min(680px,100%)]',
};

export default function Modal({ open, onClose, title, icon: Icon, size = 'md', footer, children }) {
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div
        ref={panelRef}
        className={`modal-panel ${sizes[size] || sizes.md}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            {Icon && <Icon size={18} className="text-navy-700" />}
            {title && <h3 className="text-[15px] font-semibold text-navy-800">{title}</h3>}
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-faint hover:text-navy-800 hover:bg-navy-50 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 px-5 pb-4 pt-1">{footer}</div>}
      </div>
    </div>
  );
}