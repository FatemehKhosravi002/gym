import * as jalaali from 'jalaali-js'

/**
 * Pure helpers for the repeat-history feature (list, calendar, summary copy).
 *
 * Kept free of React/axios so the same code is unit-tested directly with
 * `node --test` (see scripts/exercise-history.test.mjs).
 */

export const HISTORY_TIMEOUT_MS = 3500

export const JALALI_MONTHS = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند',
]

export const WEEKDAYS = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج']

export interface ExerciseHistoryRow {
  id: number
  sequence_number: number
  date: string
  date_jalali: string
  day_index: number
  sets: string
  reps: string
}

export interface ExerciseHistory {
  count: number
  last: ExerciseHistoryRow | null
  programs: ExerciseHistoryRow[]
}

export interface FrequentExercise {
  exercise_id: number
  name: string
  count: number
  last_sequence_number: number | null
  last_date: string
  last_date_jalali: string
}

export const EMPTY_HISTORY: ExerciseHistory = { count: 0, last: null, programs: [] }

const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹'

export function persianDigits(value: number | string): string {
  return String(value).replace(/\d/g, (d) => PERSIAN_DIGITS[Number(d)])
}

/** Convert ASCII digits inside an already formatted label (e.g. backend `date_jalali`). */
export function persianText(value: string): string {
  return persianDigits(value || '')
}

/** Gregorian YYYY-MM-DD -> Jalali parts, without timezone drift. */
export function isoToJalaliParts(iso: string): { jy: number; jm: number; jd: number } | null {
  const [gy, gm, gd] = (iso || '').slice(0, 10).split('-').map(Number)
  if (!gy || !gm || !gd) return null
  return jalaali.toJalaali(gy, gm, gd)
}

/** 'آبان ۱۴۰۵' for a Gregorian ISO date. */
export function jalaliMonthLabel(iso: string): string {
  const parts = isoToJalaliParts(iso)
  if (!parts) return ''
  return `${JALALI_MONTHS[parts.jm - 1]} ${persianDigits(parts.jy)}`
}

/** '۲۳ آبان ۱۴۰۵' for a Gregorian ISO date. */
export function jalaliDateLabel(iso: string): string {
  const parts = isoToJalaliParts(iso)
  if (!parts) return ''
  return `${persianDigits(parts.jd)} ${JALALI_MONTHS[parts.jm - 1]} ${persianDigits(parts.jy)}`
}

export function programLabel(row: ExerciseHistoryRow): string {
  return `برنامهٔ ${persianDigits(row.sequence_number)} (${jalaliMonthLabel(row.date)})`
}

/** «این حرکت قبلاً در ۱۰ برنامه تکرار شده است. آخرین بار: برنامهٔ ۹ (آبان ۱۴۰۵)» */
export function repeatSummary(history: ExerciseHistory | null): string {
  if (!history || !history.count || !history.last) return ''
  return (
    `این حرکت قبلاً در ${persianDigits(history.count)} برنامه تکرار شده است. ` +
    `آخرین بار: ${programLabel(history.last)}`
  )
}

/** «تکرار ×۱۰» badge text. */
export function repeatBadgeLabel(count: number): string {
  return `تکرار ×${persianDigits(count)}`
}

export interface MonthGroup {
  key: string
  jy: number
  jm: number
  label: string
  rows: ExerciseHistoryRow[]
}

/** Programs grouped by Jalali month, newest first (input is already newest first). */
export function groupByMonth(rows: ExerciseHistoryRow[]): MonthGroup[] {
  const groups = new Map<string, MonthGroup>()
  for (const row of rows) {
    const parts = isoToJalaliParts(row.date)
    if (!parts) continue
    const key = `${parts.jy}-${parts.jm}`
    const existing = groups.get(key)
    if (existing) {
      existing.rows.push(row)
    } else {
      groups.set(key, {
        key,
        jy: parts.jy,
        jm: parts.jm,
        label: `${JALALI_MONTHS[parts.jm - 1]} ${persianDigits(parts.jy)}`,
        rows: [row],
      })
    }
  }
  return Array.from(groups.values())
}

export interface CalendarDay {
  jd: number
  rows: ExerciseHistoryRow[]
  marked: boolean
}

export interface CalendarMonth {
  jy: number
  jm: number
  label: string
  /** Empty slots before the 1st, so Saturday is the first column. */
  offset: number
  days: CalendarDay[]
  markedCount: number
}

/** 0 = Saturday … 6 = Friday. */
export function jalaliWeekday(jy: number, jm: number, jd: number): number {
  const g = jalaali.toGregorian(jy, jm, jd)
  return (new Date(g.gy, g.gm - 1, g.gd).getDay() + 1) % 7
}

export function jalaliToday(): { jy: number; jm: number; jd: number } {
  const now = new Date()
  return jalaali.toJalaali(now.getFullYear(), now.getMonth() + 1, now.getDate())
}

/** Jalali month grid with the days that contain the exercise marked. */
export function calendarMonth(rows: ExerciseHistoryRow[], jy: number, jm: number): CalendarMonth {
  const byDay = new Map<number, ExerciseHistoryRow[]>()
  for (const row of rows) {
    const parts = isoToJalaliParts(row.date)
    if (!parts || parts.jy !== jy || parts.jm !== jm) continue
    byDay.set(parts.jd, [...(byDay.get(parts.jd) || []), row])
  }
  const length = jalaali.jalaaliMonthLength(jy, jm)
  const days: CalendarDay[] = Array.from({ length }, (_, index) => {
    const jd = index + 1
    const dayRows = byDay.get(jd) || []
    return { jd, rows: dayRows, marked: dayRows.length > 0 }
  })
  return {
    jy,
    jm,
    label: `${JALALI_MONTHS[jm - 1]} ${persianDigits(jy)}`,
    offset: jalaliWeekday(jy, jm, 1),
    days,
    markedCount: byDay.size,
  }
}

/** Step one month forward/backwards. */
export function shiftMonth(jy: number, jm: number, delta: number): { jy: number; jm: number } {
  let month = jm + delta
  let year = jy
  while (month < 1) {
    month += 12
    year -= 1
  }
  while (month > 12) {
    month -= 12
    year += 1
  }
  return { jy: year, jm: month }
}

export interface YearStripEntry {
  jy: number
  months: { jm: number; label: string; count: number }[]
}

/** Compact year strip: frequency per month for every year that has history. */
export function yearStrip(rows: ExerciseHistoryRow[]): YearStripEntry[] {
  const frequency = new Map<string, number>()
  for (const row of rows) {
    const parts = isoToJalaliParts(row.date)
    if (!parts) continue
    const key = `${parts.jy}-${parts.jm}`
    frequency.set(key, (frequency.get(key) || 0) + 1)
  }
  const years = Array.from(new Set(rows.map((row) => isoToJalaliParts(row.date)?.jy).filter(Boolean))) as number[]
  return years.sort((a, b) => b - a).map((jy) => ({
    jy,
    months: JALALI_MONTHS.map((label, index) => ({
      jm: index + 1,
      label,
      count: frequency.get(`${jy}-${index + 1}`) || 0,
    })),
  }))
}

/** Day numbers of the current program that already contain the exercise. */
export function daysInProgram(rows: ExerciseHistoryRow[], programId: number | null | undefined): number[] {
  if (!programId) return []
  return Array.from(new Set(rows.filter((row) => row.id === programId).map((row) => row.day_index)))
}
