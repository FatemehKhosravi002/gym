interface Tab {
  key: string
  label: string
  badge?: string | number
}

interface TabsProps {
  tabs: Tab[]
  active: string
  onChange: (key: string) => void
  className?: string
}

export default function Tabs({ tabs, active, onChange, className = '' }: TabsProps) {
  return (
    <div className={`flex gap-1 overflow-x-auto rounded-pill bg-surface-2 p-1 ${className}`} role="tablist">
      {tabs.map((tab) => {
        const isActive = tab.key === active
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.key)}
            className={`flex min-h-[44px] flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-pill px-4 text-sm font-semibold transition-colors duration-base
              ${isActive ? 'bg-surface text-primary-900 shadow-soft' : 'text-ink-600 hover:text-ink-800'}`}
          >
            {tab.label}
            {tab.badge !== undefined && (
              <span className={`rounded-pill px-1.5 text-xs ${isActive ? 'bg-primary-100 text-primary-900' : 'bg-surface-3 text-ink-600'}`}>
                {tab.badge}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
