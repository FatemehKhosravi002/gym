interface Point {
  x: string
  y: number
}

export default function LineChart({ points }: { points: Point[] }) {
  if (points.length === 0) return <p className="text-sm text-gray-500">داده‌ای موجود نیست</p>
  const max = Math.max(...points.map(p => p.y))
  const min = Math.min(...points.map(p => p.y))
  const range = max - min || 1
  return (
    <svg viewBox="0 0 300 150" className="w-full h-40">
      <polyline
        fill="none"
        stroke="#2563eb"
        strokeWidth="2"
        points={points.map((p, i) => {
          const x = (i / Math.max(1, points.length - 1)) * 280 + 10
          const y = 140 - ((p.y - min) / range) * 120
          return `${x},${y}`
        }).join(' ')}
      />
      {points.map((p, i) => {
        const x = (i / Math.max(1, points.length - 1)) * 280 + 10
        const y = 140 - ((p.y - min) / range) * 120
        return <circle key={i} cx={x} cy={y} r="4" fill="#2563eb" />
      })}
    </svg>
  )
}
