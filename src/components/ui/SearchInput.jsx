import { Search, X } from 'lucide-react';

export function SearchInput({ value, onChange, placeholder = 'Search…', onClear, className = '', inputClassName = '' }) {
  return (
    <div className={`relative flex-1 min-w-[200px] ${className}`}>
      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint pointer-events-none" />
      <input
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`input !pl-9 !pr-9 !py-2.5 !text-[13px] !bg-canvas focus:!bg-surface w-full !rounded-xl ${inputClassName}`}
      />
      {value ? (
        <button
          onClick={onClear ?? (() => onChange({ target: { value: '' } }))}
          title="Clear search"
          aria-label="Clear search"
          className="absolute right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full bg-surface border border-border text-faint hover:text-navy-800 hover:border-navy-700/20 transition-colors cursor-pointer"
        >
          <X size={12} />
        </button>
      ) : null}
    </div>
  );
}

export function SearchInputLarge({ value, onChange, placeholder = 'Search…', onClear }) {
  return (
    <div className="relative flex-1 min-w-[200px]">
      <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-faint pointer-events-none" />
      <input
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="input !pl-10 !pr-9 !py-3 !text-[13px] !bg-canvas focus:!bg-surface !rounded-xl w-full"
      />
      {value ? (
        <button
          onClick={onClear ?? (() => onChange({ target: { value: '' } }))}
          title="Clear search"
          aria-label="Clear search"
          className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full bg-surface border border-border text-faint hover:text-navy-700 hover:border-navy-700/20 transition-colors cursor-pointer"
        >
          <X size={12} />
        </button>
      ) : null}
    </div>
  );
}
