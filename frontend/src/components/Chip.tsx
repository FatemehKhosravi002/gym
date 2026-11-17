import React from 'react'

interface ChipProps {
  children: React.ReactNode
  active?: boolean
  onClick?: () => void
  className?: string
  as?: 'button' | 'span'
}

export default function Chip({ children, active = false, onClick, className = '', as = 'button' }: ChipProps) {
  const styles = `inline-flex items-center justify-center gap-1.5 rounded-pill px-4 text-sm font-medium min-h-[44px]
    border transition-colors duration-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2
    ${active
      ? 'bg-primary-700 border-primary-700 text-white'
      : 'bg-surface border-border-strong text-ink-700 hover:border-primary-600 hover:text-primary-900'} ${className}`

  if (as === 'span' || !onClick) {
    return <span className={styles}>{children}</span>
  }
  return (
    <button type="button" onClick={onClick} aria-pressed={active} className={styles}>
      {children}
    </button>
  )
}
