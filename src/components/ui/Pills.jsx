import { X } from 'lucide-react';

export function PillsContainer({ children, className = '' }) {
  return (
    <div className={`flex gap-2 overflow-x-auto no-scrollbar snap-x snap-mandatory scroll-px-4 pr-2 flex-nowrap pb-1 ${className}`}>
      {children}
    </div>
  );
}

export function Pill({ active, onClick, label, count, icon: Icon, children }) {
  const content = children ?? label;
  return (
    <button
      onClick={onClick}
      className={`shrink-0 snap-start inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[12px] font-semibold transition-colors ${
        active ? 'bg-navy-700 text-white border-navy-700' : 'bg-surface text-muted border-border hover:border-navy-700/30 hover:text-navy-800'
      }`}
    >
      {Icon && <Icon size={12} className={active ? 'text-white' : 'text-navy-700'} />}
      {content}
      {count !== undefined && (
        <span className={`min-w-5 h-5 flex items-center justify-center rounded-full text-[11px] ${active ? 'bg-white/20 text-white' : 'bg-navy-50 text-muted'}`}>
          {count}
        </span>
      )}
    </button>
  );
}

export function TabPill({ active, onClick, icon, label }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 snap-start inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[13px] font-semibold cursor-pointer font-sans whitespace-nowrap transition-all duration-150 ${
        active ? 'bg-navy-700 text-white shadow-card' : 'bg-surface border border-border text-muted hover:bg-navy-50 hover:text-navy-800'
      }`}
    >
      <span className={active ? 'text-white' : 'text-navy-700'}>{icon}</span> {label}
    </button>
  );
}
