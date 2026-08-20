export default function PageHeader({ title, subtitle, breadcrumb, actions, icon: Icon, eyebrow }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
      <div className="min-w-0">
        {breadcrumb && (
          <div className="text-[11px] text-faint mb-1.5 flex items-center gap-1.5 flex-wrap">
            {breadcrumb.map((crumb, i) => (
              <span key={i} className="flex items-center gap-1.5">
                {i > 0 && <span className="text-border-strong">/</span>}
                {crumb}
              </span>
            ))}
          </div>
        )}
        {eyebrow && (
          <div className="text-[10px] font-semibold tracking-[.14em] uppercase text-faint mb-1">{eyebrow}</div>
        )}
        <div className="flex items-center gap-2.5">
          {Icon && (
            <span className="w-8 h-8 rounded-lg bg-navy-100 text-navy-700 flex items-center justify-center shrink-0">
              <Icon size={16} />
            </span>
          )}
          <h2 className="text-xl font-bold text-navy-800 leading-tight">{title}</h2>
        </div>
        {subtitle && <p className="text-[13px] text-muted mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2.5 flex-wrap">{actions}</div>}
    </div>
  );
}