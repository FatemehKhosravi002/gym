import React from 'react'

interface EmptyStateProps {
  title: string
  description?: string
  action?: React.ReactNode
  illustration?: React.ReactNode
}

/** Friendly inline SVG illustration — no external asset, no CDN. */
function DefaultIllustration() {
  return (
    <svg width="120" height="96" viewBox="0 0 120 96" fill="none" aria-hidden="true">
      <ellipse cx="60" cy="84" rx="42" ry="7" fill="#E7EFE3" />
      <rect x="26" y="30" width="68" height="46" rx="12" fill="#F0FDF4" stroke="#BBF7D0" strokeWidth="2" />
      <rect x="36" y="42" width="26" height="5" rx="2.5" fill="#86EFAC" />
      <rect x="36" y="54" width="42" height="5" rx="2.5" fill="#DCFCE7" />
      <circle cx="86" cy="26" r="12" fill="#FFEDD5" stroke="#FDBA74" strokeWidth="2" />
      <path d="M86 20v12M80 26h12" stroke="#C2410C" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="34" cy="24" r="4" fill="#4ADE80" />
    </svg>
  )
}

export default function EmptyState({ title, description, action, illustration }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center px-4 py-10">
      <div className="mb-4">{illustration ?? <DefaultIllustration />}</div>
      <h3 className="text-lg font-bold text-primary-900 mb-1">{title}</h3>
      {description && <p className="text-sm text-ink-600 max-w-sm leading-relaxed">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
