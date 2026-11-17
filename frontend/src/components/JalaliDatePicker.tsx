import { useId, useState } from 'react'
import * as jalaali from 'jalaali-js'
import { toJalali } from '../utils/jalali'
import { toPersianDigits } from '../utils/persianDigits'

const MONTHS = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند']
const WEEKDAYS = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج']

const pad = (n: number) => String(n).padStart(2, '0')

/** Gregorian YYYY-MM-DD -> Jalali parts (no Date parsing, no timezone drift). */
function isoToJalali(iso: string) {
  const [gy, gm, gd] = iso.split('-').map(Number)
  if (!gy || !gm || !gd) return null
  return jalaali.toJalaali(gy, gm, gd)
}

/** Jalali y/m/d -> Gregorian YYYY-MM-DD. */
function jalaliToIso(jy: number, jm: number, jd: number) {
  const g = jalaali.toGregorian(jy, jm, jd)
  return `${g.gy}-${pad(g.gm)}-${pad(g.gd)}`
}

function todayJalali() {
  const d = new Date()
  return jalaali.toJalaali(d.getFullYear(), d.getMonth() + 1, d.getDate())
}

/** 0 = Saturday … 6 = Friday, the Persian week order. */
function weekdayIndex(jy: number, jm: number, jd: number) {
  const g = jalaali.toGregorian(jy, jm, jd)
  return (new Date(g.gy, g.gm - 1, g.gd).getDay() + 1) % 7
}


interface Props {
  value: string
  onChange: (val: string) => void
  label?: string
  error?: string
  hint?: string
}

export default function JalaliDatePicker({ value, onChange, label, error, hint }: Props) {
  const autoId = useId()
  const id = `date-${autoId}`
  const [open, setOpen] = useState(false)
  const selected = value ? isoToJalali(value) : null
  const today = todayJalali()
  const [view, setView] = useState({ jy: (selected ?? today).jy, jm: (selected ?? today).jm })

  const monthLength = jalaali.jalaaliMonthLength(view.jy, view.jm)
  const offset = weekdayIndex(view.jy, view.jm, 1)

  const step = (delta: number) => {
    let { jy, jm } = view
    jm += delta
    if (jm < 1) {
      jm = 12
      jy -= 1
    } else if (jm > 12) {
      jm = 1
      jy += 1
    }
    setView({ jy, jm })
  }

  const pick = (jd: number) => {
    onChange(jalaliToIso(view.jy, view.jm, jd))
    setOpen(false)
  }

  const isSelected = (jd: number) =>
    Boolean(selected && selected.jy === view.jy && selected.jm === view.jm && selected.jd === jd)
  const isToday = (jd: number) => today.jy === view.jy && today.jm === view.jm && today.jd === jd

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-ink-700">
          {label}
        </label>
      )}
      <button
        id={id}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-invalid={error ? true : undefined}
        className={`field flex items-center justify-between gap-2 text-right ${error ? 'field-invalid' : ''}`}
      >
        <span className={value ? 'text-ink-900' : 'text-ink-500'}>
          {value ? toJalali(value) : 'انتخاب تاریخ'}
        </span>
        <span className="text-ink-400" aria-hidden="true">▾</span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="تقویم شمسی"
          className="mt-2 animate-slide-up rounded-card border border-border bg-surface p-3 shadow-lifted"
        >
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => step(-1)}
              aria-label="ماه قبل"
              className="flex h-11 w-11 items-center justify-center rounded-full text-ink-600 hover:bg-surface-2"
            >
              ›
            </button>
            <p className="text-sm font-bold text-primary-900">
              {MONTHS[view.jm - 1]} {toPersianDigits(view.jy)}
            </p>
            <button
              type="button"
              onClick={() => step(1)}
              aria-label="ماه بعد"
              className="flex h-11 w-11 items-center justify-center rounded-full text-ink-600 hover:bg-surface-2"
            >
              ‹
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-ink-500">
            {WEEKDAYS.map((d) => (
              <span key={d} className="py-1">{d}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: offset }).map((_, i) => (
              <span key={`pad-${i}`} />
            ))}
            {Array.from({ length: monthLength }).map((_, i) => {
              const jd = i + 1
              const active = isSelected(jd)
              return (
                <button
                  key={jd}
                  type="button"
                  onClick={() => pick(jd)}
                  aria-pressed={active}
                  className={`h-11 rounded-field text-sm font-semibold transition-colors duration-fast ${
                    active
                      ? 'bg-primary-700 text-white'
                      : isToday(jd)
                        ? 'bg-accent-100 text-accent-800 hover:bg-accent-200'
                        : 'text-ink-800 hover:bg-surface-2'
                  }`}
                >
                  {toPersianDigits(jd)}
                </button>
              )
            })}
          </div>
          <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
            <button
              type="button"
              onClick={() => onChange('')}
              className="min-h-[44px] px-3 text-sm font-semibold text-ink-600 hover:text-ink-900"
            >
              پاک کردن
            </button>
            <button
              type="button"
              onClick={() => {
                onChange(jalaliToIso(today.jy, today.jm, today.jd))
                setOpen(false)
              }}
              className="min-h-[44px] px-3 text-sm font-semibold text-primary-800 hover:text-primary-900"
            >
              امروز
            </button>
          </div>
        </div>
      )}

      {error ? (
        <p className="mt-1.5 text-sm text-error-700">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-sm text-ink-500">{hint}</p>
      ) : null}
    </div>
  )
}




export function getTodayJalaliString() {
  const j = todayJalali()
  return `${toPersianDigits(j.jd)} ${MONTHS[j.jm - 1]} ${toPersianDigits(j.jy)}`
}
