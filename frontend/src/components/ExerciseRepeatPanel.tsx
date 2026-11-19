import { useMemo } from 'react'
import Button from './Button'
import ExerciseHistoryViews from './ExerciseHistoryViews'
import { persianDigits, repeatSummary, type ExerciseHistory } from '../utils/exerciseHistory'

interface Props {
  exerciseName: string
  history: ExerciseHistory
  onAdd: () => void
  onCancel: () => void
  onOpenProgram: (programId: number) => void
  /** Days of the program being built that already hold this exercise. */
  warningDays?: number[]
  /** Still waiting for the API answer. */
  loading?: boolean
}

/** Body of the repeat dialog: summary, add/cancel and list ⇄ calendar. */
export default function ExerciseRepeatPanel({
  exerciseName,
  history,
  onAdd,
  onCancel,
  onOpenProgram,
  warningDays = [],
  loading = false,
}: Props) {
  const summary = useMemo(() => repeatSummary(history), [history])

  return (
    <div className="space-y-3" data-testid="repeat-panel">
      <p className="text-base font-bold leading-7 text-primary-900" data-testid="repeat-summary">
        {summary || (loading ? 'در حال بررسی سابقه…' : `«${exerciseName}» سابقه‌ای در برنامه‌های این ورزشکار ندارد.`)}
      </p>

      {warningDays.length > 0 && (
        <div className="rounded-field border border-warning-200 bg-warning-50 p-3 text-sm font-medium text-warning-700" data-testid="same-program-warning">
          این حرکت قبلاً در {warningDays.map((day) => `روز ${persianDigits(day)}`).join(' و ')} همین برنامه اضافه شده است.
        </div>
      )}

      {history.count > 0 && <ExerciseHistoryViews rows={history.programs} onOpenProgram={onOpenProgram} />}

      <div className="grid grid-cols-2 gap-2 pt-1">
        <Button variant="outline" size="lg" onClick={onCancel}>انصراف</Button>
        <Button size="lg" onClick={onAdd}>اضافه کن</Button>
      </div>
    </div>
  )
}
