import React, { useEffect } from 'react'
import { createPortal } from 'react-dom'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  description?: string
  children?: React.ReactNode
  footer?: React.ReactNode
  /** Bottom sheet on phones, centered dialog from md up (default). */
  variant?: 'sheet' | 'dialog'
}

export default function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  variant = 'sheet',
}: ModalProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
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

  const panel =
    variant === 'sheet'
      ? 'w-full md:max-w-md md:mx-auto rounded-t-sheet md:rounded-sheet'
      : 'w-full max-w-md mx-auto rounded-sheet'

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-ink-900/40 animate-fade-in" onClick={onClose} aria-hidden="true" />
      <div className={`relative bg-surface shadow-lifted ${panel} animate-sheet-up md:animate-slide-up max-h-[90vh] overflow-y-auto`}>
        <div className="p-5">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              {title && <h2 className="text-lg font-bold text-primary-900">{title}</h2>}
              {description && <p className="text-sm text-ink-600 mt-1">{description}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="بستن"
              className="shrink-0 h-11 w-11 -mt-1 rounded-full text-ink-500 hover:bg-surface-2 hover:text-ink-800 transition-colors duration-fast"
            >
              ✕
            </button>
          </div>
          {children}
        </div>
        {footer && <div className="sticky bottom-0 bg-surface border-t border-border p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}
