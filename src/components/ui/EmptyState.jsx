import { Inbox } from 'lucide-react';

export default function EmptyState({
  icon: Icon = Inbox,
  title = 'No data',
  body,
  action,
  compact = false,
  className = '',
}) {
  return (
    <div className={`empty-state ${compact ? '!py-10' : ''} ${className}`}>
      <div className="empty-icon flex justify-center">{Icon && <Icon size={44} />}</div>
      <h3>{title}</h3>
      {body && <p>{body}</p>}
      {action && <div className="flex justify-center">{action}</div>}
    </div>
  );
}