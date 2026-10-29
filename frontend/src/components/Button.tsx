import React from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'tertiary'
  size?: 'sm' | 'md' | 'lg'
}

export default function Button({ variant = 'primary', size = 'md', className = '', children, ...props }: ButtonProps) {
  const base = 'inline-flex items-center justify-center font-medium rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'
  const variants = {
    primary: 'bg-primary-600 text-white hover:bg-primary-700',
    secondary: 'bg-white text-gray-900 border border-gray-300 hover:bg-gray-50',
    tertiary: 'bg-transparent text-gray-700 hover:bg-gray-100',
  }
  const sizes = {
    sm: 'px-3 py-1.5 text-sm min-h-[44px]',
    md: 'px-4 py-2 text-base min-h-[44px]',
    lg: 'px-6 py-3 text-lg min-h-[48px]',
  }
  return (
    <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
      {children}
    </button>
  )
}
