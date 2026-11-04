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
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: blur ? 'blur(10px)' : 'none',
        WebkitBackdropFilter: blur ? 'blur(10px)' : 'none',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '24px',
      }}
    >
      {children}
    </div>
  )
}
