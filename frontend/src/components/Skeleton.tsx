interface SkeletonProps {
  className?: string
  /** Number of stacked lines; each line is a rounded bar. */
  lines?: number
}

export default function Skeleton({ className = 'h-4 w-full', lines }: SkeletonProps) {
  if (lines && lines > 1) {
    return (
      <div className="space-y-2" aria-hidden="true">
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} className={`skeleton ${i === lines - 1 ? 'h-4 w-2/3' : 'h-4 w-full'}`} />
        ))}
      </div>
    )
  }
  return <div className={`skeleton ${className}`} aria-hidden="true" />
}

export function SkeletonCard({ rows = 3 }: { rows?: number }) {
  return (
    <div className="card-surface p-4 sm:p-5 space-y-3" aria-hidden="true">
      <div className="skeleton h-5 w-1/2" />
      <Skeleton lines={rows} />
    </div>
  )
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3" role="status" aria-label="در حال بارگذاری">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} rows={2} />
      ))}
    </div>
  )
}
