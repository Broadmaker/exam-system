import { Loader2 } from 'lucide-react';

export default function Spinner({ size = 20, label, className = '' }) {
  return (
    <div className={`flex items-center justify-center gap-2.5 py-6 text-muted ${className}`}>
      <Loader2 size={size} className="animate-spin text-navy-700" />
      {label && <span className="text-[13px]">{label}</span>}
    </div>
  );
}