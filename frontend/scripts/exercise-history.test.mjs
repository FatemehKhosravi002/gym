/**
 * Frontend tests for the repeat-history feature (node:test, no new packages).
 *
 *   npm run test:history
 *
 * Pure helpers are imported directly (Node strips the TypeScript types). The
 * modal body, list and calendar are compiled with sucrase (already present as a
 * Tailwind dependency) and rendered with react-dom/server, so the real markup
 * is asserted — no extra test framework needed.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { transform } from 'sucrase'
import { renderToStaticMarkup } from 'react-dom/server'
import React from 'react'
import * as jalaali from 'jalaali-js'

import {
  calendarMonth,
  daysInProgram,
  groupByMonth,
  isoToJalaliParts,
  jalaliMonthLabel,
  programLabel,
  repeatBadgeLabel,
  repeatSummary,
  shiftMonth,
  yearStrip,
} from '../src/utils/exerciseHistory.ts'

const here = new URL('.', import.meta.url)
const requireTs = createRequire(import.meta.url)
for (const extension of ['.ts', '.tsx']) {
  requireTs.extensions[extension] = (module, filename) => {
    const source = readFileSync(filename, 'utf8')
    const { code } = transform(source, {
      transforms: ['typescript', 'jsx', 'imports'],
      filePath: filename,
      jsxRuntime: 'automatic',
    })
    module._compile(code, filename)
  }
}
const load = (path) => requireTs(new URL(path, here).pathname)

const isoOf = (jy, jm, jd) => {
  const g = jalaali.toGregorian(jy, jm, jd)
  return `${g.gy}-${String(g.gm).padStart(2, '0')}-${String(g.gd).padStart(2, '0')}`
}

const row = (id, sequence, jy, jm, jd, day = 1, sets = '3', reps = '10') => ({
  id,
  sequence_number: sequence,
  date: isoOf(jy, jm, jd),
  date_jalali: '',
  day_index: day,
  sets,
  reps,
})

const TEN_ROWS = [
  row(101, 10, 1405, 8, 20, 2, '4', '8-12'),
  row(102, 9, 1405, 8, 5),
  row(103, 8, 1405, 7, 12),
  row(104, 7, 1405, 6, 2),
  row(105, 6, 1405, 5, 21),
  row(106, 5, 1405, 4, 9),
  row(107, 4, 1405, 3, 15),
  row(108, 3, 1405, 2, 7),
  row(109, 2, 1405, 1, 19),
  row(110, 1, 1404, 12, 28),
]


test('repeat summary matches the coach copy', () => {
  const history = { count: 10, last: TEN_ROWS[1], programs: TEN_ROWS }
  assert.equal(
    repeatSummary(history),
    'این حرکت قبلاً در ۱۰ برنامه تکرار شده است. آخرین بار: برنامهٔ ۹ (آبان ۱۴۰۵)',
  )
  assert.equal(repeatSummary({ count: 0, last: null, programs: [] }), '')
  assert.equal(repeatBadgeLabel(10), 'تکرار ×۱۰')
  assert.equal(programLabel(TEN_ROWS[1]), 'برنامهٔ ۹ (آبان ۱۴۰۵)')
  assert.equal(jalaliMonthLabel(TEN_ROWS[1].date), 'آبان ۱۴۰۵')
})

test('list data: one entry per programme, newest first, grouped by month', () => {
  const groups = groupByMonth(TEN_ROWS)
  assert.equal(groups[0].label, 'آبان ۱۴۰۵')
  assert.equal(groups[0].rows.length, 2)
  assert.equal(groups[1].label, 'مهر ۱۴۰۵')
  assert.equal(groups.length, 9)
  assert.deepEqual(daysInProgram(TEN_ROWS, 101), [2])
  assert.deepEqual(daysInProgram(TEN_ROWS, 999), [])
})

test('calendar marks the months/days containing the exercise', () => {
  const month = calendarMonth(TEN_ROWS, 1405, 8)
  assert.equal(month.label, 'آبان ۱۴۰۵')
  assert.equal(month.markedCount, 2)
  assert.equal(month.days.length, jalaali.jalaaliMonthLength(1405, 8))
  assert.deepEqual(month.days.filter((day) => day.marked).map((day) => day.jd), [5, 20])
  assert.equal(month.days[4].rows[0].sequence_number, 9)
  assert.equal(calendarMonth(TEN_ROWS, 1405, 9).markedCount, 0)
})

test('calendar month navigation wraps across years', () => {
  assert.deepEqual(shiftMonth(1405, 1, -1), { jy: 1404, jm: 12 })
  assert.deepEqual(shiftMonth(1405, 12, 1), { jy: 1406, jm: 1 })
  assert.deepEqual(shiftMonth(1405, 8, 3), { jy: 1405, jm: 11 })
})

test('year strip shows frequency per month', () => {
  const years = yearStrip(TEN_ROWS)
  assert.deepEqual(years.map((year) => year.jy), [1405, 1404])
  const aban = years[0].months.find((month) => month.jm === 8)
  assert.equal(aban.count, 2)
  assert.equal(years[0].months.find((month) => month.jm === 12).count, 0)
  assert.equal(years[1].months.find((month) => month.jm === 12).count, 1)

const noop = () => undefined
const HISTORY = { count: 10, last: TEN_ROWS[1], programs: TEN_ROWS }

const ExerciseRepeatPanel = load('../src/components/ExerciseRepeatPanel.tsx').default
const ExerciseHistoryList = load('../src/components/ExerciseHistoryList.tsx').default
const ExerciseHistoryCalendar = load('../src/components/ExerciseHistoryCalendar.tsx').default

test('repeat modal body: summary, same-program warning, both buttons and toggle', () => {
  const html = renderToStaticMarkup(
    React.createElement(ExerciseRepeatPanel, {
      exerciseName: 'پرس سینه',
      history: HISTORY,
      warningDays: [3],
      onAdd: noop,
      onCancel: noop,
      onOpenProgram: noop,
    }),
  )
  assert.match(html, /data-testid="repeat-panel"/)
  assert.match(html, /این حرکت قبلاً در ۱۰ برنامه تکرار شده است/)
  assert.match(html, /آخرین بار: برنامهٔ ۹ \(آبان ۱۴۰۵\)/)
  assert.match(html, /اضافه کن/)
  assert.match(html, /انصراف/)
  assert.match(html, /data-testid="same-program-warning"/)
  assert.match(html, /روز ۳/)
  assert.match(html, /data-testid="history-view-list"/)
  assert.match(html, /data-testid="history-view-calendar"/)
  assert.match(html, /data-testid="history-row"/)
})

test('repeat modal body without history skips the list', () => {
  const html = renderToStaticMarkup(
    React.createElement(ExerciseRepeatPanel, {
      exerciseName: 'پرس سینه',
      history: { count: 0, last: null, programs: [] },
      onAdd: noop,
      onCancel: noop,
      onOpenProgram: noop,
    }),
  )
  assert.match(html, /سابقه‌ای در برنامه‌های این ورزشکار ندارد/)
  assert.doesNotMatch(html, /data-testid="history-view-list"/)
})

test('history list renders one row per programme with Jalali date and sets×reps', () => {
  const html = renderToStaticMarkup(
    React.createElement(ExerciseHistoryList, { rows: TEN_ROWS, onOpenProgram: noop }),
  )
  assert.equal((html.match(/data-testid="history-row"/g) || []).length, 10)
  assert.match(html, /برنامهٔ ۱۰ \(آبان ۱۴۰۵\)/)
  assert.match(html, /برنامهٔ ۹ \(آبان ۱۴۰۵\)/)
  assert.match(html, /روز ۲/)
  assert.match(html, /۴ × ۸-۱۲/)
  assert.match(html, /۳ × ۱۰/)
})

test('Jalali calendar renders orange-dotted marks and the year strip', () => {
  const html = renderToStaticMarkup(
    React.createElement(ExerciseHistoryCalendar, { rows: TEN_ROWS, onOpenProgram: noop }),
  )
  assert.match(html, /data-testid="history-calendar"/)
  assert.match(html, /آبان ۱۴۰۵/)
  assert.match(html, /aria-label="ماه قبل"/)
  assert.match(html, /aria-label="ماه بعد"/)
  assert.equal((html.match(/data-testid="calendar-mark"/g) || []).length, 2)
  assert.match(html, /bg-accent-100/)
  assert.match(html, /data-testid="year-strip"/)
  assert.equal((html.match(/data-testid="year-month"/g) || []).length, 24)
})

test('calendar without history in the month shows the empty notice', () => {
  const html = renderToStaticMarkup(
    React.createElement(ExerciseHistoryCalendar, { rows: [], onOpenProgram: noop }),
  )
  assert.equal((html.match(/data-testid="calendar-mark"/g) || []).length, 0)
  assert.match(html, /در این ماه سابقه‌ای برای این حرکت نیست/)
})

})
