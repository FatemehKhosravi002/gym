import Modal from './Modal'
import Button from './Button'

interface ConfirmDialogProps {
  open: boolean
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  tone?: 'danger' | 'primary'
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'تأیید',
  cancelLabel = 'انصراف',
  tone = 'danger',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      description={description}
      variant="dialog"
      footer={
        <div className="flex gap-3">
          <Button variant="outline" fullWidth onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} fullWidth onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </div>
      }
    />
  )
}
