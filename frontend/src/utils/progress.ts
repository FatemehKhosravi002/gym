/** Pure helpers for the student progress chart and BMI (unit-tested). */

export interface MeasurementPoint {
  id: number
  date: string
  weight_kg: number
  height_cm?: number | null
}

export const LEVEL_OPTIONS = [
  { value: 'beginner', label: 'مبتدی' },
  { value: 'intermediate', label: 'متوسط' },
  { value: 'advanced', label: 'پیشرفته' },
  { value: 'pro', label: 'ورزشکار حرفه‌ای' },
] as const

export const LEVEL_LABELS: Record<string, string> = {
  beginner: 'مبتدی',
  intermediate: 'متوسط',
  advanced: 'پیشرفته',
  pro: 'ورزشکار حرفه‌ای',
}

export function bmiOf(weightKg?: number | null, heightCm?: number | null): number | null {
  if (!weightKg || !heightCm) return null
  const meters = heightCm / 100
  if (meters <= 0) return null
  return Math.round((weightKg / (meters * meters)) * 10) / 10
}

/** Difference between the last and the first value of a series (null when < 2 points). */
export function changeSinceStart(values: number[]): number | null {
  if (!values || values.length < 2) return null
  const first = values[0]
  const last = values[values.length - 1]
  return Math.round((last - first) * 10) / 10
}

/** Rounded axis ticks that always contain the data range. */
export function niceTicks(min: number, max: number, count = 4): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return []
  if (min === max) {
    const pad = min === 0 ? 1 : Math.abs(min) * 0.05
    min -= pad
    max += pad
  }
  const rawStep = (max - min) / Math.max(count - 1, 1)
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)))
  const normalized = rawStep / magnitude
  const stepMultiplier = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10
  const step = stepMultiplier * magnitude
  const start = Math.floor(min / step) * step
  const end = Math.ceil(max / step) * step
  const ticks: number[] = []
  for (let value = start; value <= end + step / 2; value += step) {
    ticks.push(Math.round(value * 1000) / 1000)
  }
  return ticks
}

/** Map a value into [0,1] inside a padded range; safe when range is 0. */
export function normalize(value: number, min: number, max: number): number {
  if (max === min) return 0.5
  return (value - min) / (max - min)
}

export function formatChange(value: number | null, unit: string): string {
  if (value === null) return '—'
  if (value === 0) return `بدون تغییر`
  const sign = value > 0 ? '+' : '−'
  return `${sign}${Math.abs(value)} ${unit}`
}
