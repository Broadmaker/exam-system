export default function Card({ title, eyebrow, icon: Icon, actions, padded = true, className = '', children, style, ...rest }) {
  const hasHead = title || actions || eyebrow;
  return (
    <div
      className={`bg-surface border border-border rounded-[10px] shadow-card mb-3.5 ${padded ? 'p-4' : ''} ${className}`}
      style={style}
      {...rest}
    >
      {hasHead && (
        <div className={`flex items-center gap-2.5 ${padded ? 'mb-3.5' : 'mb-3.5 px-4 pt-4'}`}>
          {Icon && (
            <span className="w-7 h-7 rounded-lg bg-navy-100 text-navy-700 flex items-center justify-center shrink-0">
              <Icon size={15} />
            </span>
          )}
          <div className="min-w-0 flex-1">
            {eyebrow && (
              <div className="text-[9px] font-semibold tracking-[.14em] uppercase text-faint leading-tight">{eyebrow}</div>
            )}
            {title && <h3 className="text-[15px] font-semibold text-navy-800 leading-tight truncate">{title}</h3>}
          </div>
          {actions && <div className="flex items-center gap-2 ml-auto">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
}