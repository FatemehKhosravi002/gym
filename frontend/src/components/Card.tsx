import React from 'react'

export default function Card({ children, className = '', glass = false }: { children: React.ReactNode, className?: string, glass?: boolean }) {
  if (glass) {
    return (
      <div className={`bg-white/5 backdrop-blur-sm border border-white/10 rounded-[24px] p-4 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.8)] ${className}`}>
        {children}
      </div>
    )
  }
  return (
    <div className={`bg-[#141716] border border-white/10 rounded-[24px] p-4 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.8)] ${className}`}>
      {children}
    </div>
  )
}
