import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'

type Tone = 'success' | 'error' | 'neutral'

export interface ToastOptions {
  message: string
  tone?: Tone
  /** Optional undo action, shown as a button inside the toast. */
  actionLabel?: string
  onAction?: () => void
  duration?: number
}

interface ToastItem extends ToastOptions {
  id: number
}

interface ToastApi {
  show: (options: ToastOptions) => void
  success: (message: string, options?: Omit<ToastOptions, 'message' | 'tone'>) => void
  error: (message: string) => void
}

const ToastContext = createContext<ToastApi>({ show: () => {}, success: () => {}, error: () => {} })

// Light surfaces with dark text keep every pair AA on the light theme.
const tones: Record<Tone, string> = {
  success: 'bg-primary-50 text-primary-900 border border-primary-200',
  error: 'bg-error-50 text-error-700 border border-error-200',
  neutral: 'bg-surface text-ink-900 border border-border',
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const counter = useRef(0)

  const dismiss = useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const show = useCallback(
    ({ duration = 5000, ...options }: ToastOptions) => {
      const id = ++counter.current
      setItems((prev) => [...prev.slice(-2), { ...options, id }])
      window.setTimeout(() => dismiss(id), duration)
    },
    [dismiss],
  )

  const api = useMemo<ToastApi>(
    () => ({
      show,
      success: (message, options) => show({ ...options, message, tone: 'success' }),
      error: (message) => show({ message, tone: 'error', duration: 6000 }),
    }),
    [show],
  )

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        className="fixed inset-x-0 bottom-[calc(var(--tabbar-height)+0.75rem)] md:bottom-6 z-[60] flex flex-col items-center gap-2 px-4 pointer-events-none"
        role="status"
        aria-live="polite"
      >
        {items.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-pill px-4 py-3 shadow-lifted animate-slide-up ${tones[t.tone || 'neutral']}`}
          >
            <span className="flex-1 text-sm font-medium">{t.message}</span>
            {t.actionLabel && t.onAction && (
              <button
                type="button"
                onClick={() => {
                  t.onAction?.()
                  dismiss(t.id)
                }}
                className="shrink-0 rounded-pill bg-ink-900/10 px-3 py-1.5 text-sm font-bold hover:bg-ink-900/20 transition-colors duration-fast"
              >
                {t.actionLabel}
              </button>
            )}
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              aria-label="بستن پیام"
              className="shrink-0 h-9 w-9 rounded-full hover:bg-ink-900/10 transition-colors duration-fast"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
