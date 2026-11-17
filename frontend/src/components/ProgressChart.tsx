import { useMemo, useState } from 'react'
import { toJalali } from '../utils/jalali'
import { toPersianDigits } from '../utils/persianDigits'
import { niceTicks, normalize } from '../utils/progress'
import type { MeasurementPoint } from '../utils/progress'

interface Props {
  points: MeasurementPoint[]
  /** Called when the coach taps an editable point (opens the edit sheet). */
  onEdit?: (point: MeasurementPoint) => void
}

const W = 320
const H = 190
const PAD = { top: 14, right: 10, bottom: 26, left: 34 }
const INK_GRID = '#DCE7DC'
const INK_AXIS = '#64756A'
const SERIES = {
  weight: '#16A34A',
  height: '#F97316',
} as const

type SeriesKey = keyof typeof SERIES

export default function ProgressChart({ points, onEdit }: Props) {
  const [visible, setVisible] = useState<SeriesKey[]>(['weight'])
  const [active, setActive] = useState<number | null>(null)

  const series = useMemo(() => {
    return (['weight', 'height'] as SeriesKey[]).map((key) => {
      const rows = points
        .filter((p) => (key === 'weight' ? p.weight_kg : p.height_cm))
        .map((p) => ({ id: p.id, date: p.date, value: Number(key === 'weight' ? p.weight_kg : p.height_cm) }))
      return { key, rows }
    })
  }, [points])

  const shown = series.filter((s) => visible.includes(s.key) && s.rows.length > 0)
  const values = shown.flatMap((s) => s.rows.map((r) => r.value))
  if (points.length === 0 || values.length === 0) return null

  const min = Math.min(...values)
  const max = Math.max(...values)
  const ticks = niceTicks(min, max, 4)
  const lo = ticks[0]
  const hi = ticks[ticks.length - 1]
  const plotW = W - PAD.left - PAD.right
  const plotH = H - PAD.top - PAD.bottom
  const x = (index: number, total: number) =>
    PAD.left + (total <= 1 ? plotW / 2 : (index / (total - 1)) * plotW)
  const y = (value: number) => PAD.top + plotH - normalize(value, lo, hi) * plotH
  const toggle = (key: SeriesKey) =>
    setVisible((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]))

  const activeRow = active !== null ? shown.flatMap((s) => s.rows.map((r) => ({ ...r, key: s.key }))).find((r) => r.id === active) : null

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2" role="group" aria-label="انتخاب نمودار">
        {series.map((s) => {
          const isOn = visible.includes(s.key)
          const disabled = s.rows.length === 0
          return (
            <button
              key={s.key}
              type="button"
              disabled={disabled}
              aria-pressed={isOn}
              onClick={() => toggle(s.key)}
              className={`inline-flex min-h-[40px] items-center gap-2 rounded-pill border px-3 text-sm font-semibold transition-colors duration-fast disabled:opacity-40 ${
                isOn ? 'border-transparent bg-primary-50 text-primary-900' : 'border-border bg-surface text-ink-600'
              }`}
            >
              <span
                aria-hidden="true"
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: SERIES[s.key] }}
              />
              {s.key === 'weight' ? 'وزن (کیلوگرم)' : 'قد (سانتی‌متر)'}
            </button>
          )
        })}
      </div>

      <div dir="ltr" className="relative rounded-card bg-surface-2 p-2">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img"
          aria-label={`نمودار پیشرفت، ${points.length} اندازه‌گیری`}>
          {ticks.map((tick) => (
            <g key={tick}>
              <line x1={PAD.left} x2={W - PAD.right} y1={y(tick)} y2={y(tick)} stroke={INK_GRID} strokeWidth="1" />
              <text x={PAD.left - 6} y={y(tick) + 4} textAnchor="end" fontSize="9" fill={INK_AXIS}>
                {toPersianDigits(Math.round(tick * 10) / 10)}
              </text>
            </g>
          ))}
          {shown.map((s) => {
            const path = s.rows
              .map((row, i) => `${i === 0 ? 'M' : 'L'} ${x(i, s.rows.length).toFixed(1)} ${y(row.value).toFixed(1)}`)
              .join(' ')
            return (
              <g key={s.key}>
                <path d={path} fill="none" stroke={SERIES[s.key]} strokeWidth="2.5"
                  strokeLinecap="round" strokeLinejoin="round" className="chart-line" />
                {s.rows.map((row, i) => (
                  <circle
                    key={row.id}
                    cx={x(i, s.rows.length)}
                    cy={y(row.value)}
                    r={active === row.id ? 5.5 : 4}
                    fill="#FFFFFF"
                    stroke={SERIES[s.key]}
                    strokeWidth="2.5"
                    tabIndex={0}
                    role="button"
                    aria-label={`${toJalali(row.date)}: ${toPersianDigits(row.value)}`}
                    onMouseEnter={() => setActive(row.id)}
                    onMouseLeave={() => setActive(null)}
                    onFocus={() => setActive(row.id)}
                    onBlur={() => setActive(null)}
                    onClick={() => onEdit?.(points.find((p) => p.id === row.id)!)}
                    className="cursor-pointer"
                  />
                ))}
              </g>
            )
          })}
        </svg>
        {activeRow && (
          <div className="pointer-events-none absolute inset-x-3 top-2 rounded-field bg-primary-900 px-3 py-1.5 text-center text-xs text-white shadow-soft">
            {toJalali(activeRow.date)} — {toPersianDigits(activeRow.value)}{' '}
            {activeRow.key === 'weight' ? 'کیلوگرم' : 'سانتی‌متر'}
          </div>
        )}
        <div className="flex justify-between px-2 pt-1 text-[11px] text-ink-500" dir="rtl">
          <span>{toJalali(points[0].date)}</span>
          <span>{toJalali(points[points.length - 1].date)}</span>
        </div>
      </div>
    </div>
  )
}
