import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

const variants = {
  primary: 'bg-navy-700 text-white hover:bg-navy-600',
  outline: 'bg-transparent text-navy-800 border-[1.5px] border-border-strong hover:bg-navy-50 hover:border-navy-700',
  danger: 'bg-danger text-white hover:bg-[#e74c3c]',
  dangerOutline: 'bg-transparent text-danger border-[1.5px] border-danger/35 hover:bg-danger-bg hover:border-danger',
  soft: 'bg-navy-50 text-navy-700 hover:bg-navy-100',
  dangerSoft: 'bg-danger-bg text-danger hover:bg-[#fbdcd9]',
  ghost: 'bg-transparent text-muted hover:bg-navy-50 hover:text-navy-800',
  success: 'bg-success text-white hover:bg-[#0ea371]',
};

const sizes = {
  sm: { base: 'text-[11px] rounded-md', boxed: 'px-3 py-1.5 gap-1.5', icon: 'p-2 rounded-lg' },
  md: { base: 'text-[13px] rounded-lg', boxed: 'px-4 py-2 gap-2', icon: 'p-2.5 rounded-lg' },
  lg: { base: 'text-[14px] rounded-lg', boxed: 'px-5 py-2.5 gap-2', icon: 'p-3 rounded-lg' },
};

export default function Button({
  variant = 'primary',
  size = 'md',
  icon: Icon,
  loading,
  disabled,
  to,
  className = '',
  children,
  ...rest
}) {
  const iconOnly = !children && !!Icon;
  const s = sizes[size] || sizes.md;
  const sizeClass = iconOnly ? s.icon : `${s.base} ${s.boxed}`;
  const classes = `inline-flex items-center justify-center font-semibold cursor-pointer transition-all duration-150 select-none
    ${variants[variant]} ${sizeClass}
    disabled:opacity-60 disabled:cursor-not-allowed
    active:scale-[.98] ${className}`;

  const inner = (
    <>
      {loading ? <Loader2 size={size === 'sm' ? 13 : 15} className="animate-spin" /> : Icon && <Icon size={size === 'sm' ? 14 : 15} />}
      {children}
    </>
  );

  if (to) {
    return (
      <Link to={to} className={classes} {...rest}>
        {inner}
      </Link>
    );
  }

  return (
    <button disabled={disabled || loading} className={classes} {...rest}>
      {inner}
    </button>
  );
}