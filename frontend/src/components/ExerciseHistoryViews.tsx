import { useState } from 'react'
import ExerciseHistoryList from './ExerciseHistoryList'
import ExerciseHistoryCalendar from './ExerciseHistoryCalendar'
import type { ExerciseHistoryRow } from '../utils/exerciseHistory'

interface Props {
  rows: ExerciseHistoryRow[]
  onOpenProgram: (programId: number) => void
}

/** List ⇄ calendar toggle shared by the repeat dialog and the info dialog. */
export default function ExerciseHistoryViews({ rows, onOpenProgram }: Props) {
  const [view, setView] = useState<'list' | 'calendar'>('list')

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2" role="tablist" aria-label="نمایش سابقه">
        <button
          type="button"
          role="tab"
          aria-selected={view === 'list'}
          data-testid="history-view-list"
          onClick={() => setView('list')}
          className={`min-h-[44px] rounded-pill border px-3 text-sm font-semibold transition-colors duration-fast ${
            view === 'list'
              ? 'border-primary-700 bg-primary-700 text-white'
              : 'border-border-strong bg-surface text-ink-700 hover:border-primary-600'
          }`}
        >
          فهرست برنامه‌ها
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={view === 'calendar'}
          data-testid="history-view-calendar"
          onClick={() => setView('calendar')}
          className={`min-h-[44px] rounded-pill border px-3 text-sm font-semibold transition-colors duration-fast ${
            view === 'calendar'
              ? 'border-primary-700 bg-primary-700 text-white'
              : 'border-border-strong bg-surface text-ink-700 hover:border-primary-600'
          }`}
        >
          تقویم شمسی
        </button>
      </div>

      <div className="max-h-[46vh] overflow-y-auto pr-0.5">
        {view === 'list' ? (
          <ExerciseHistoryList rows={rows} onOpenProgram={onOpenProgram} />
        ) : (
          <ExerciseHistoryCalendar rows={rows} onOpenProgram={onOpenProgram} />
        )}
      </div>
    </div>
  )
}
