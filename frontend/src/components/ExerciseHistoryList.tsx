import { useMemo } from 'react'
import {
  groupByMonth,
  persianDigits,
  persianText,
  programLabel,
  type ExerciseHistoryRow,
} from '../utils/exerciseHistory'

interface Props {
  rows: ExerciseHistoryRow[]
  onOpenProgram: (programId: number) => void
  /** Shown when there is nothing to list. */
  emptyText?: string
}

/** One row per programme: number, Jalali date, day and sets×reps. */
export default function ExerciseHistoryList({ rows, onOpenProgram, emptyText = 'سابقه‌ای ثبت نشده است.' }: Props) {
  const groups = useMemo(() => groupByMonth(rows), [rows])

  if (rows.length === 0) {
    return <p className="py-4 text-center text-sm text-ink-500">{emptyText}</p>
  }

  return (
    <div className="space-y-3" data-testid="history-list">
      {groups.map((group) => (
        <section key={group.key}>
          <h3 className="mb-1.5 text-xs font-bold text-ink-500">{group.label}</h3>
          <ul className="space-y-2">
            {group.rows.map((row) => (
              <li key={`${row.id}-${row.day_index}`}>
                <button
                  type="button"
                  data-testid="history-row"
                  onClick={() => onOpenProgram(row.id)}
                  className="flex w-full min-h-[52px] items-center gap-2 rounded-field border border-border bg-surface-2 p-3 text-right transition-colors duration-fast hover:border-primary-300 hover:bg-surface-3"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-ink-900">{programLabel(row)}</span>
                    <span className="mt-0.5 block text-xs text-ink-600">
                      {row.date_jalali ? persianText(row.date_jalali) : '—'} • روز {persianDigits(row.day_index)}
                    </span>
                  </span>
                  <span className="shrink-0 rounded-pill bg-primary-100 px-2 py-0.5 text-xs font-bold text-primary-900">
                    {persianDigits(row.sets)} × {persianDigits(row.reps)}
                  </span>
                  <span className="shrink-0 text-ink-400" aria-hidden="true">›</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
