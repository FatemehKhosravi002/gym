import { useEffect, useState } from 'react'
import api from '../utils/api'
import { apiErrorMessage } from '../utils/apiError'
import SideSheet from './SideSheet'
import Badge from './Badge'
import Button from './Button'
import { jalaliDateLabel, persianDigits, programLabel, type ExerciseHistoryRow } from '../utils/exerciseHistory'
import { downloadProgramPdf, programPdfFilename } from '../utils/programPdf'

interface Props {
  open: boolean
  programId: number | null
  /** Optional row from the history list, so the header can show the number/date instantly. */
  row?: ExerciseHistoryRow | null
  onClose: () => void
}

/** Read-only programme preview used by the repeat dialog (never touches the draft). */
export default function ProgramPreviewSheet({ open, programId, row, onClose }: Props) {
  const [program, setProgram] = useState<any>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const [error, setError] = useState('')
  const [downloading, setDownloading] = useState(false)
  const [pdfError, setPdfError] = useState('')

  useEffect(() => {
    if (!open || !programId) {
      setProgram(null)
      setStatus('idle')
      return
    }
    let cancelled = false
    setStatus('loading')
    setError('')
    api
      .get(`/programs/${programId}/`)
      .then((res) => {
        if (cancelled) return
        setProgram(res.data)
        setStatus('ready')
      })
      .catch((err) => {
        if (cancelled) return
        setError(apiErrorMessage(err, 'نمایش برنامه انجام نشد'))
        setStatus('error')
      })
    return () => {
      cancelled = true
    }
  }, [open, programId])

  const title = row ? programLabel(row) : 'پیش‌نمایش برنامه'

  const downloadPdf = async () => {
    if (!programId) return
    setDownloading(true)
    setPdfError('')
    try {
      await downloadProgramPdf(programId, {
        filename: programPdfFilename(programId, program?.sequence_number),
      })
    } catch (err) {
      setPdfError(err instanceof Error ? err.message : 'دانلود PDF انجام نشد')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <SideSheet open={open} onClose={onClose} title={title} description="نمایش فقط‌خواندنی — پیش‌نویس شما حفظ می‌شود.">
      {status === 'loading' && <p className="text-sm text-ink-600">در حال دریافت برنامه…</p>}
      {status === 'error' && <p className="text-sm text-error-700">{error}</p>}
      {status === 'ready' && program && (
        <div className="space-y-3">
          {pdfError ? <p className="text-sm text-error-700">{pdfError}</p> : null}
          <div className="flex items-center justify-between gap-2 rounded-field bg-surface-2 p-3">
            <div>
              <p className="text-sm font-bold text-ink-900">{program.title}</p>
              <p className="mt-0.5 text-xs text-ink-600">{jalaliDateLabel(program.start_date)}</p>
            </div>
            <Badge tone={program.status === 'final' ? 'success' : 'accent'}>
              {program.status === 'final' ? 'نهایی' : 'پیش‌نویس'}
            </Badge>
          </div>

          {(program.days || []).map((day: any) => (
            <section key={day.id} className="rounded-field border border-border p-3">
              <h3 className="mb-2 text-sm font-bold text-primary-900">
                روز {persianDigits(day.day_index)}
                {day.label ? <span className="mr-1 font-medium text-ink-600">— {day.label}</span> : null}
              </h3>
              <ul className="space-y-1.5">
                {(day.items || []).map((item: any, index: number) => (
                  <li key={item.id} className="flex items-start justify-between gap-2 text-sm">
                    <span className="text-ink-800">
                      {persianDigits(index + 1)}. {item.exercise_detail?.name || item.exercise_name_snapshot}
                    </span>
                    <span className="shrink-0 rounded-pill bg-primary-50 px-2 py-0.5 text-xs font-bold text-primary-900">
                      {persianDigits(item.sets)} × {persianDigits(item.reps)}
                    </span>
                  </li>
                ))}
                {(day.items || []).length === 0 && <li className="text-xs text-ink-500">حرکتی ثبت نشده است.</li>}
              </ul>
            </section>
          ))}
        </div>
      )}
      <div className="grid grid-cols-2 gap-2 pt-4">
        <Button variant="tertiary" onClick={downloadPdf} loading={downloading} disabled={status !== 'ready'}>
          دانلود PDF
        </Button>
        <Button variant="outline" onClick={onClose}>بازگشت</Button>
      </div>
    </SideSheet>
  )
}
