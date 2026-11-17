import React from 'react'

interface LiquidGlassProps {
  children: React.ReactNode
  className?: string
  blur?: boolean
}

export default function LiquidGlass({ children, className = '', blur = true }: LiquidGlassProps) {
  return (
    <div 
      className={`relative ${className}`}
      style={{
        background: 'var(--color-surface)',
        backdropFilter: blur ? 'blur(10px)' : 'none',
        WebkitBackdropFilter: blur ? 'blur(10px)' : 'none',
        border: '1px solid var(--color-border)',
        borderRadius: '24px',
        boxShadow: 'var(--shadow-soft)',
      }}
    >
      {children}
    </div>
  )
}
