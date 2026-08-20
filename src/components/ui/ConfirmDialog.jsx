import { TriangleAlert } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';

export default function ConfirmDialog({
  open,
  title = 'Are you sure?',
  body,
  confirmLabel = 'Confirm',
  tone = 'danger',
  loading,
  onConfirm,
  onClose,
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <div className="flex flex-col items-center text-center mb-5">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${tone === 'danger' ? 'bg-danger-bg text-danger' : 'bg-navy-100 text-navy-700'}`}>
          <TriangleAlert size={22} />
        </div>
        <div className="text-[13px] text-muted leading-relaxed">{body}</div>
      </div>
      <div className="flex gap-2.5">
        <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
        <Button variant={tone === 'danger' ? 'danger' : 'primary'} className="flex-1" onClick={onConfirm} loading={loading}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}