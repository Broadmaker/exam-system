const tones = {
  success: 'bg-success-bg text-success',
  warning: 'bg-warning-bg text-warning',
  danger: 'bg-danger-bg text-danger',
  info: 'bg-info-bg text-info',
  purple: 'bg-purple-bg text-purple',
  neutral: 'bg-navy-50 text-muted',
};

export default function Badge({ tone = 'neutral', children, className = '', ...rest }) {
  return (
    <span className={`badge ${tones[tone] || tones.neutral} ${className}`} {...rest}>
      {children}
    </span>
  );
}