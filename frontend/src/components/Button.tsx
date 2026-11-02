import React from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'glass' | 'secondary' | 'tertiary'
  size?: 'sm' | 'md' | 'lg'
}

export default function Button({ variant = 'primary', size = 'md', className = '', children, ...props }: ButtonProps) {
  const base = 'inline-flex items-center justify-center font-semibold transition-transform active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#B6F500] focus:ring-offset-2 focus:ring-offset-[#0A0A0A] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 min-h-[48px]'
  const variants = {
    primary: 'bg-[#B6F500] text-[#0A0A0A] rounded-full shadow-[0_0_40px_-10px_rgba(182,245,0,0.5)]',
    glass: 'bg-white/5 backdrop-blur-sm border border-white/10 text-white rounded-full',
    secondary: 'bg-[#1B1F1D] text-white border border-white/10 rounded-full',
    tertiary: 'bg-transparent text-[#9AA3A0] hover:text-white rounded-full',
  }
  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  }
  return (
    <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
      {children}
    </button>
  )
}
