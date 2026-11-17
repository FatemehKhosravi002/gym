interface AvatarProps {
  firstName?: string
  lastName?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizes = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-11 w-11 text-sm',
  lg: 'h-16 w-16 text-xl',
}

// Deterministic tint from the name, so the same athlete keeps the same colour.
const tints = [
  'bg-primary-100 text-primary-900',
  'bg-accent-100 text-accent-800',
  'bg-success-100 text-success-700',
  'bg-warning-100 text-warning-700',
  'bg-surface-3 text-ink-800',
]

export default function Avatar({ firstName = '', lastName = '', size = 'md', className = '' }: AvatarProps) {
  const initials = `${firstName.trim().charAt(0)}${lastName.trim().charAt(0)}` || '؟'
  const seed = `${firstName}${lastName}`.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
  const tint = tints[seed % tints.length]

  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-bold ${sizes[size]} ${tint} ${className}`}
    >
      {initials}
    </span>
  )
}
