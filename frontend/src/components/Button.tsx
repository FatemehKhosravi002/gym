import React from 'react'

type Variant = 'primary' | 'secondary' | 'tertiary' | 'outline' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  fullWidth?: boolean
  icon?: React.ReactNode
}

const base =
  'inline-flex items-center justify-center gap-2 font-semibold rounded-pill ' +
  'transition-all duration-base active:scale-[0.98] select-none ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2 ' +
  'disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100'

// Colours are chosen for WCAG AA on top of each fill:
// primary  = green-700 + white        (5.3:1)
// secondary= orange-500 + ink-900     (6.2:1)
// tertiary = orange-50 + orange-700   (5.0:1) — orange text always uses 700 on light
const variants: Record<Variant, string> = {
  primary: 'bg-primary-700 text-white hover:bg-primary-800 shadow-glow',
  secondary: 'bg-accent-500 text-ink-900 hover:bg-accent-400',
  tertiary: 'bg-accent-50 text-accent-700 border border-accent-200 hover:bg-accent-100 hover:border-accent-300',
  outline: 'bg-surface text-primary-900 border border-border-strong hover:border-primary-600 hover:bg-primary-50',
  ghost: 'bg-transparent text-ink-700 hover:bg-surface-2',
  danger: 'bg-error-700 text-white hover:bg-error-600',
}

const sizes: Record<Size, string> = {
  sm: 'px-4 text-sm min-h-[44px]',
  md: 'px-5 text-base min-h-[48px]',
  lg: 'px-7 text-lg min-h-[56px]',
}

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  icon,
  className = '',
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (
        <span
          className="inline-block h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin"
          aria-hidden="true"
        />
      ) : (
        icon
      )}
      {children}
    </button>
  )
}

