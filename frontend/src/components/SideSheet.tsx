import React, { useEffect } from 'react'
import { createPortal } from 'react-dom'

interface Props {
  open: boolean
  onClose: () => void
  title?: string
  description?: string
  children?: React.ReactNode
  footer?: React.ReactNode
}

/**
 * Side sheet (full height, slides in from the start edge) used for read-only
 * previews that must not replace the page underneath — the draft stays alive.
 */
export default function SideSheet({ open, onClose, title, description, children, footer }: Props) {
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-ink-900/40 animate-fade-in" onClick={onClose} aria-hidden="true" />
      <div className="absolute inset-y-0 left-0 flex w-full max-w-md flex-col bg-surface shadow-lifted animate-slide-up md:animate-fade-in">
        <div className="flex items-start justify-between gap-3 border-b border-border p-4">
          <div className="min-w-0">
            {title && <h2 className="text-lg font-bold text-primary-900">{title}</h2>}
            {description && <p className="mt-1 text-sm text-ink-600">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="بستن"
            className="-mt-1 h-11 w-11 shrink-0 rounded-full text-ink-500 transition-colors duration-fast hover:bg-surface-2 hover:text-ink-800"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
        {footer && (
          <div className="border-t border-border p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">{footer}</div>
        )}
      </div>
    </div>,
    document.body,
  )
}
