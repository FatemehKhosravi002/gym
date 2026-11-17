import React from 'react'

type Tone = 'success' | 'warning' | 'error' | 'accent' | 'neutral' | 'primary'

interface BadgeProps {
  children: React.ReactNode
  tone?: Tone
  className?: string
}

const tones: Record<Tone, string> = {
  success: 'bg-success-50 text-success-700 border-success-200',
  warning: 'bg-warning-50 text-warning-700 border-warning-200',
  error: 'bg-error-50 text-error-700 border-error-200',
  accent: 'bg-accent-50 text-accent-700 border-accent-200',
  primary: 'bg-primary-50 text-primary-900 border-primary-200',
  neutral: 'bg-surface-2 text-ink-600 border-border',
}

export default function Badge({ children, tone = 'neutral', className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-pill border px-2.5 py-0.5 text-xs font-semibold ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  )
}
