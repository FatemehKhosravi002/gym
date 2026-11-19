import { useState } from 'react'
import Modal from './Modal'
import Button from './Button'
import ExerciseHistoryViews from './ExerciseHistoryViews'
import ProgramPreviewSheet from './ProgramPreviewSheet'
import { fetchExerciseHistory } from '../utils/exerciseHistoryApi'
import {
  EMPTY_HISTORY,
  repeatBadgeLabel,
  repeatSummary,
  type ExerciseHistory,
  type ExerciseHistoryRow,
} from '../utils/exerciseHistory'

interface Props {
  athleteId: number | string
  exerciseId: number
  exerciseName: string
  count: number
  /** Reuse an already-loaded history instead of asking again. */
  history?: ExerciseHistory | null
  /** Override the default «تکرار ×N» wording. */
  label?: string
  className?: string
}

/** Small clickable «تکرار ×۱۰» badge; opens the list/calendar without leaving the page. */
export default function RepeatBadge({ athleteId, exerciseId, exerciseName, count, history, label, className = '' }: Props) {
  const [open, setOpen] = useState(false)
  const [loaded, setLoaded] = useState<ExerciseHistory | null>(history ?? null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const [previewId, setPreviewId] = useState<number | null>(null)
  const [previewRow, setPreviewRow] = useState<ExerciseHistoryRow | null>(null)

  if (count <= 0) return null

  const badgeLabel = label || repeatBadgeLabel(count)

  const openDialog = async () => {
    setOpen(true)
    if (loaded) return
    setStatus('loading')
    try {
      const data = await fetchExerciseHistory(athleteId, exerciseId)
      setLoaded(data)
      setStatus('ready')
    } catch {
      setLoaded(EMPTY_HISTORY)
      setStatus('error')
    }
  }

  const openProgram = (programId: number) => {
    setPreviewRow(loaded?.programs.find((row) => row.id === programId) || null)
    setPreviewId(programId)
  }

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        aria-label={`${badgeLabel} — مشاهده سابقه ${exerciseName}`}
        data-testid="repeat-badge"
        className={`inline-flex min-h-[32px] shrink-0 items-center rounded-pill border border-accent-200 bg-accent-50 px-2.5 py-0.5 text-xs font-bold text-accent-800 transition-colors duration-fast hover:bg-accent-100 ${className}`}
      >
        {badgeLabel}
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={`سابقه «${exerciseName}»`}
        variant="dialog"
        footer={
          <Button variant="outline" fullWidth onClick={() => setOpen(false)}>بستن</Button>
        }
      >
        {status === 'loading' && <p className="py-4 text-center text-sm text-ink-600">در حال دریافت سابقه…</p>}
        {status === 'error' && <p className="pb-2 text-sm text-ink-600">دریافت سابقه انجام نشد؛ بعداً دوباره تلاش کنید.</p>}
        {loaded && loaded.count > 0 && (
          <div className="space-y-3">
            <p className="text-base font-bold leading-7 text-primary-900">{repeatSummary(loaded)}</p>
            <ExerciseHistoryViews rows={loaded.programs} onOpenProgram={openProgram} />
          </div>
        )}
        {loaded && loaded.count === 0 && status === 'ready' && (
          <p className="py-2 text-sm text-ink-600">سابقه‌ای برای این حرکت ثبت نشده است.</p>
        )}
      </Modal>

      <ProgramPreviewSheet
        open={previewId !== null}
        programId={previewId}
        row={previewRow}
        onClose={() => setPreviewId(null)}
      />
    </>
  )
}
