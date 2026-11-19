import { useMemo, useState } from 'react'
import {
  WEEKDAYS,
  calendarMonth,
  isoToJalaliParts,
  jalaliToday,
  persianDigits,
  shiftMonth,
  yearStrip,
  type ExerciseHistoryRow,
} from '../utils/exerciseHistory'

interface Props {
  rows: ExerciseHistoryRow[]
  onOpenProgram: (programId: number) => void
}

/** Self-written Jalali month calendar; days containing the exercise get an orange dot. */
export default function ExerciseHistoryCalendar({ rows, onOpenProgram }: Props) {
  const initial = useMemo(() => {
    const newest = rows.find((row) => isoToJalaliParts(row.date))
    return newest ? isoToJalaliParts(newest.date)! : jalaliToday()
  }, [rows])
  const [view, setView] = useState({ jy: initial.jy, jm: initial.jm })

  const month = useMemo(() => calendarMonth(rows, view.jy, view.jm), [rows, view.jy, view.jm])
  const years = useMemo(() => yearStrip(rows), [rows])
  const today = jalaliToday()

  const go = (delta: number) => setView((current) => shiftMonth(current.jy, current.jm, delta))
  const openDay = (rowsOnDay: ExerciseHistoryRow[]) => {
    if (rowsOnDay.length > 0) onOpenProgram(rowsOnDay[0].id)
  }

  return (
    <div className="space-y-3" data-testid="history-calendar">
      <div className="rounded-card border border-border bg-surface p-3">
        <div className="mb-2 flex items-center justify-between">
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="ماه قبل"
            className="flex h-11 w-11 items-center justify-center rounded-full text-ink-600 hover:bg-surface-2"
          >
            ›
          </button>
          <p className="text-sm font-bold text-primary-900" data-testid="calendar-label">{month.label}</p>
          <button
            type="button"
            onClick={() => go(1)}
            aria-label="ماه بعد"
            className="flex h-11 w-11 items-center justify-center rounded-full text-ink-600 hover:bg-surface-2"
          >
            ‹
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-ink-500">
          {WEEKDAYS.map((day) => (
            <span key={day} className="py-1">{day}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: month.offset }).map((_, index) => (
            <span key={`pad-${index}`} aria-hidden="true" />
          ))}
          {month.days.map((day) => {
            const isToday = today.jy === view.jy && today.jm === view.jm && today.jd === day.jd
            const className =
              'relative flex h-11 items-center justify-center rounded-field text-sm font-semibold transition-colors duration-fast'
            if (!day.marked) {
              return (
                <span
                  key={day.jd}
                  data-testid="calendar-day"
                  className={`${className} ${isToday ? 'bg-accent-50 text-accent-800' : 'text-ink-600'}`}
                >
                  {persianDigits(day.jd)}
                </span>
              )
            }
            return (
              <button
                key={day.jd}
                type="button"
                data-testid="calendar-mark"
                onClick={() => openDay(day.rows)}
                aria-label={`${persianDigits(day.jd)} ${month.label} — ${persianDigits(day.rows.length)} برنامه`}
                className={`${className} bg-accent-100 text-accent-900 hover:bg-accent-200`}
              >
                {persianDigits(day.jd)}
                <span className="absolute bottom-1 h-1.5 w-1.5 rounded-full bg-accent-600" aria-hidden="true" />
              </button>
            )
          })}
        </div>
        {month.markedCount === 0 ? (
          <p className="mt-2 border-t border-border pt-2 text-center text-xs text-ink-500">
            در این ماه سابقه‌ای برای این حرکت نیست.
          </p>
        ) : null}
      </div>

      {years.length > 0 && (
        <div className="space-y-2" data-testid="year-strip">
          {years.map((year) => (
            <div key={year.jy} className="rounded-card border border-border bg-surface-2 p-2">
              <p className="mb-1 text-xs font-bold text-ink-600">سال {persianDigits(year.jy)}</p>
              <div className="grid grid-cols-12 gap-1">
                {year.months.map((entry) => {
                  const active = entry.jm === view.jm && year.jy === view.jy
                  return (
                    <button
                      key={entry.jm}
                      type="button"
                      data-testid="year-month"
                      onClick={() => setView({ jy: year.jy, jm: entry.jm })}
                      title={`${entry.label} — ${persianDigits(entry.count)} برنامه`}
                      aria-label={`${entry.label} ${persianDigits(year.jy)} — ${persianDigits(entry.count)} برنامه`}
                      aria-pressed={active}
                      className={`flex min-h-[40px] flex-col items-center justify-center rounded-field px-0.5 text-[10px] font-semibold transition-colors duration-fast ${
                        active
                          ? 'bg-primary-700 text-white'
                          : entry.count > 0
                            ? 'bg-accent-100 text-accent-800 hover:bg-accent-200'
                            : 'bg-surface text-ink-500 hover:bg-surface-3'
                      }`}
                    >
                      <span className="truncate">{entry.label.slice(0, 3)}</span>
                      <span className="tabular-nums">{persianDigits(entry.count)}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
