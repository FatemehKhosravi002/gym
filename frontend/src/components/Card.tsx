import React from 'react'

interface CardProps {
  children: React.ReactNode
  className?: string
  padded?: boolean
  as?: 'div' | 'section' | 'article' | 'li'
  onClick?: () => void
}

export default function Card({
  children,
  className = '',
  padded = true,
  as = 'div',
  onClick,
}: CardProps) {
  const Tag = as as any
  const interactive = onClick ? 'cursor-pointer transition-all duration-base hover:shadow-lifted hover:border-border-strong active:scale-[0.995] text-right w-full' : ''
  return (
    <Tag
      className={`card-surface ${padded ? 'p-4 sm:p-5' : ''} ${interactive} ${className}`}
      onClick={onClick}
      {...(onClick ? { role: 'button', tabIndex: 0, onKeyDown: (e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() } } } : {})}
    >
      {children}
    </Tag>
  )
}

