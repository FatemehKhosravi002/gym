import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import api from '../utils/api'
import Button from '../components/Button'
import { toJalali } from '../utils/jalali'
import { toPersianDigits } from '../utils/persianDigits'
import { groupApiItems, itemTag } from '../utils/programView'
import { downloadProgramPdf, programPdfFilename } from '../utils/programPdf'

const LEVEL_LABELS: Record<string, string> = {
  beginner: 'مبتدی',
  intermediate: 'متوسط',
  advanced: 'پیشرفته',
  pro: 'ورزشکار حرفه‌ای',
}

export default function PublicProgram() {
  const { token } = useParams()
  const [program, setProgram] = useState<any>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'missing'>('loading')
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setStatus('loading')
    api
      .get(`/programs/public/${token}/`)
      .then((res) => {
        if (cancelled) return
        setProgram(res.data)
        setStatus('ready')
      })
      .catch(() => {
        if (!cancelled) setStatus('missing')
      })
    return () => {
      cancelled = true
    }
  }, [token])

  const downloadPdf = async () => {
    setDownloading(true)
    setError('')
    try {
      await downloadProgramPdf(token || 'public', {
        publicToken: token,
        filename: programPdfFilename(token || 'public', program?.sequence_number),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'دانلود PDF انجام نشد')
    } finally {
      setDownloading(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-canvas px-4 py-10 text-center text-sm text-ink-600">در حال دریافت برنامه…</div>
    )
  }

  if (status === 'missing' || !program) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-canvas px-6 text-center">
        <div className="rounded-card border border-border bg-surface p-6">
          <p className="text-lg font-bold text-primary-900">این برنامه در دسترس نیست</p>
          <p className="mt-2 text-sm leading-6 text-ink-600">
            لینک اشتراک باطل شده یا برنامه توسط مربی حذف شده است. برای دریافت برنامه جدید با مربی خود تماس بگیرید.
          </p>
        </div>
        <p className="text-xs text-ink-500">Physique</p>
      </div>
    )
  }

  const athlete = program.athlete_detail || {}
  const days = program.days || []

  return (
    <div className="min-h-screen bg-canvas pb-16">
      <header className="bg-primary-900 px-4 pb-4 pt-6 text-white">
        <div className="mx-auto max-w-2xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs text-primary-100">برنامه تمرینی</p>
              <h1 className="mt-1 text-xl font-bold">{program.title}</h1>
              <p className="mt-1 text-sm text-primary-100">
                {athlete.first_name} {athlete.last_name}
                {athlete.unique_code ? <span> • کد {toPersianDigits(athlete.unique_code)}</span> : null}
              </p>
            </div>
            <span className="shrink-0 rounded-pill bg-white/15 px-3 py-1 text-sm font-bold">
              {toPersianDigits(program.sequence_number)}
            </span>
          </div>
          <p className="mt-2 text-xs text-primary-100">
            شروع: {toJalali(program.start_date)}
            {athlete.level ? ` • ${LEVEL_LABELS[athlete.level] || ''}` : ''}
            {program.coach_name ? ` • مربی: ${program.coach_name}` : ''}
          </p>
          <div className="mt-4">
            <Button size="sm" variant="secondary" onClick={downloadPdf} loading={downloading}>
              دانلود PDF
            </Button>
          </div>
          {error ? <p className="mt-2 rounded-field bg-white/10 p-2 text-xs text-white">{error}</p> : null}
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-4 px-4 py-4">
        {days.map((day: any) => {
          const groups = groupApiItems(day.items)
          return (
            <section key={day.id} className="rounded-card border border-border bg-surface p-4 shadow-card">
              <h2 className="text-base font-bold text-primary-900">
                روز {toPersianDigits(day.day_index)}
                {day.label ? <span className="mr-2 text-sm font-medium text-ink-600">— {day.label}</span> : null}
              </h2>
              <div className="mt-3 space-y-3">
                {groups.length === 0 ? <p className="text-sm text-ink-500">حرکتی ثبت نشده است.</p> : null}
                {groups.map((block) => (
                  <div key={block.key} className={block.group !== null ? 'rounded-card border border-accent-200 bg-accent-50/50 p-2' : ''}>
                    {block.group !== null ? (
                      <p className="mb-2 text-xs font-bold text-accent-800">سوپرست {block.letter}</p>
                    ) : null}
                    <ul className="space-y-2">
                      {block.items.map((item, index) => (
                        <li key={item.id} className="rounded-field border border-border bg-surface p-3">
                          <div className="flex items-start gap-3">
                            {item.gifUrl ? (
                              <img
                                src={item.gifUrl}
                                alt=""
                                loading="lazy"
                                className="h-20 w-20 shrink-0 rounded-field border border-border bg-surface-2 object-cover"
                              />
                            ) : null}
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-ink-900">
                                {itemTag(block, index) ? (
                                  <span className="ml-1 rounded bg-primary-900 px-1.5 py-0.5 text-[11px] font-bold text-white">
                                    {itemTag(block, index)}
                                  </span>
                                ) : null}
                                {item.name}
                              </p>
                              <p className="mt-1 text-sm text-ink-700">
                                {toPersianDigits(item.sets)} ست × {toPersianDigits(item.reps)} تکرار
                              </p>
                              {item.category ? <p className="mt-0.5 text-xs text-ink-500">{item.category}</p> : null}
                              {item.restSeconds ? (
                                <p className="mt-0.5 text-xs text-ink-500">استراحت: {toPersianDigits(item.restSeconds)} ثانیه</p>
                              ) : null}
                              {item.note ? <p className="mt-1 text-sm text-ink-600">{item.note}</p> : null}
                              {item.videoUrl ? (
                                <a
                                  href={item.videoUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="mt-2 inline-flex min-h-[36px] items-center rounded-pill border border-primary-200 bg-primary-50 px-3 text-xs font-bold text-primary-900"
                                >
                                  مشاهده ویدیو
                                </a>
                              ) : null}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          )
        })}
      </main>

      <footer className="border-t border-border bg-surface px-4 py-6 text-center">
        <p className="text-sm font-bold text-primary-900">Physique</p>
        <p className="mt-1 text-xs text-ink-600">قدرت از انضباط شروع می‌شود</p>
      </footer>
    </div>
  )
}

