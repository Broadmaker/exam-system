const tones = {
  navy: { iconBg: 'bg-navy-100', iconText: 'text-navy-700' },
  blue: { iconBg: 'bg-navy-100', iconText: 'text-navy-700' },
  green: { iconBg: 'bg-success-bg', iconText: 'text-success' },
  accent: { iconBg: 'bg-warning-bg', iconText: 'text-accent' },
  red: { iconBg: 'bg-danger-bg', iconText: 'text-danger' },
  purple: { iconBg: 'bg-purple-bg', iconText: 'text-purple' },
  info: { iconBg: 'bg-info-bg', iconText: 'text-info' },
  muted: { iconBg: 'bg-navy-50', iconText: 'text-muted' },
};

const trendTones = {
  up: 'bg-success-bg text-success',
  down: 'bg-danger-bg text-danger',
  flat: 'bg-navy-50 text-muted',
  info: 'bg-info-bg text-info',
};

function TrendPill({ trend }) {
  const t = trendTones[trend.dir] || trendTones.flat;
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${t}`}>
      {trend.icon}
      {trend.text}
    </span>
  );
}

export default function StatCard({
  icon: Icon,
  value,
  label,
  tone = 'navy',
  suffix,
  trend,
  note,
  className = '',
}) {
  const t = tones[tone] || tones.navy;
  return (
    <div className={`bg-surface border border-border rounded-xl shadow-card p-5 flex flex-col gap-3 hover:shadow-pop transition-shadow ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${t.iconBg}`}>
          {Icon && <Icon size={18} className={t.iconText} />}
        </div>
        {trend && <TrendPill trend={trend} />}
      </div>
      <div>
        <div className="text-[26px] font-bold text-navy-800 leading-none tracking-tight">
          {value}
          {suffix && <span className="text-[13px] text-muted font-medium ml-0.5">{suffix}</span>}
        </div>
        <div className="text-[11px] text-muted mt-1.5">{label}</div>
      </div>
      {note && <div className="text-[11px] text-faint border-t border-border pt-2.5">{note}</div>}
    </div>
  );
}