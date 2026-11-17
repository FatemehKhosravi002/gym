type IconProps = { className?: string; strokeWidth?: number }

function base(className?: string) {
  return `h-6 w-6 ${className || ''}`
}

export function UsersIcon({ className, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg className={base(className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M16 19v-1.5a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4V19" />
      <circle cx="9" cy="7" r="3.2" />
      <path d="M22 19v-1.5a4 4 0 0 0-3-3.87" />
      <path d="M16.5 4.2a3.2 3.2 0 0 1 0 5.9" />
    </svg>
  )
}

export function PlusIcon({ className, strokeWidth = 2 }: IconProps) {
  return (
    <svg className={base(className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

export function DumbbellIcon({ className, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg className={base(className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6.5 6.5v11M3.5 9v5M17.5 6.5v11M20.5 9v5M6.5 12h11" />
    </svg>
  )
}

export function LayersIcon({ className, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg className={base(className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3.5 3.5 8l8.5 4.5L20.5 8 12 3.5Z" />
      <path d="m4 12.5 8 4.2 8-4.2" />
      <path d="m4 16.8 8 4.2 8-4.2" />
    </svg>
  )
}

export function UserCircleIcon({ className, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg className={base(className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="10" r="3.2" />
      <path d="M5.6 18.6a7 7 0 0 1 12.8 0" />
    </svg>
  )
}

export function LogoutIcon({ className, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg className={base(className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3" />
      <path d="m15 16 4-4-4-4" />
      <path d="M19 12H9" />
    </svg>
  )
}

export function KeyIcon({ className, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg className={base(className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="8" cy="15" r="4" />
      <path d="m11 12 8-8M17 4l3 3M14.5 6.5 17 9" />
    </svg>
  )
}

export function ShieldIcon({ className, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg className={base(className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3l7 3v5.5c0 4.6-3 8-7 9.5-4-1.5-7-4.9-7-9.5V6l7-3Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  )
}

export function CheckIcon({ className, strokeWidth = 2.2 }: IconProps) {
  return (
    <svg className={base(className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m5 13 4 4L19 7" />
    </svg>
  )
}

export function AlertIcon({ className, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg className={base(className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5.5M12 16.5h.01" />
    </svg>
  )
}

export function SearchIcon({ className, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg className={base(className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5" />
    </svg>
  )
}

export function ChevronLeftIcon({ className, strokeWidth = 2 }: IconProps) {
  return (
    <svg className={base(className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m14 6-6 6 6 6" />
    </svg>
  )
}

export const navIcons = {
  athletes: UsersIcon,
  newProgram: PlusIcon,
  library: DumbbellIcon,
  templates: LayersIcon,
  profile: UserCircleIcon,
} as const

export type NavIconName = keyof typeof navIcons

export function NavIcon({ name, className }: { name: NavIconName; className?: string }) {
  const Icon = navIcons[name]
  return <Icon className={className} />
}
