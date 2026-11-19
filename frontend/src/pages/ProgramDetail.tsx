import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import api from '../utils/api'
import { apiErrorMessage } from '../utils/apiError'
import Button from '../components/Button'
import Card from '../components/Card'
import Badge from '../components/Badge'
import Modal from '../components/Modal'
import ConfirmDialog from '../components/ConfirmDialog'
import { SkeletonCard } from '../components/Skeleton'
import { useToast } from '../components/Toast'
import RepeatBadge from '../components/RepeatBadge'
import { toJalali } from '../utils/jalali'
import { toPersianDigits } from '../utils/persianDigits'
import { groupApiItems, itemTag } from '../utils/programView'
import { downloadProgramPdf, programPdfFilename } from '../utils/programPdf'
import { programShareUrl, shareProgramLink } from '../utils/programShare'

const LEVEL_LABELS: Record<string, string> = {
  beginner: 'مبتدی',
  intermediate: 'متوسط',
  advanced: 'پیشرفته',
  pro: 'ورزشکار حرفه‌ای',
}

export default function ProgramDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const [program, setProgram] = useState<any>(null)
  const [repeatCounts, setRepeatCounts] = useState<Record<string, number>>({})
  const [status, setStatus] = useState<'loading' | 'ready' | 'missing'>('loading')
  const [downloading, setDownloading] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [working, setWorking] = useState<'duplicate' | 'template' | null>(null)

  useEffect(() => {
    let cancelled = false
    setStatus('loading')
    api
      .get(`/programs/${id}/`)
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
  }, [id])

  useEffect(() => {
    if (!program?.athlete) return
    const ids = Array.from(new Set((program.days || []).flatMap((day: any) => (day.items || []).map((item: any) => item.exercise))))
    if (ids.length === 0) return
    let cancelled = false
    api
      .get(`/athletes/${program.athlete}/repeat_counts/`, { params: { exercise_ids: ids.join(','), exclude_program: program.id } })
      .then((res) => {
        if (!cancelled) setRepeatCounts(res.data.counts || {})
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [program])

  const downloadPdf = async () => {
    if (!program) return
    setDownloading(true)
    try {
      await downloadProgramPdf(program.id, {
        filename: programPdfFilename(program.id, program.sequence_number),
      })
      toast.success('فایل PDF دانلود شد')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'دانلود PDF انجام نشد')
    } finally {
      setDownloading(false)
    }
  }

  const shareLink = async () => {
    if (!program?.share_token) return
    setSharing(true)
    try {
      const result = await shareProgramLink(program.id, program.share_token, `برنامه ${program.title}`)
      if (result === 'copied') toast.success('لینک اشتراک کپی شد')
      if (result === 'shared') toast.success('لینک اشتراک ارسال شد')
      if (result !== 'cancelled') setProgram((current: any) => (current ? { ...current, shared_at: new Date().toISOString() } : current))
    } catch {
      toast.error('اشتراک‌گذاری انجام نشد؛ لینک را دستی کپی کنید.')
    } finally {
      setSharing(false)
    }
  }

  const useAsNewProgram = async () => {
    setWorking('duplicate')
    try {
      const res = await api.post(`/programs/${program.id}/duplicate/`)
      toast.success('نسخه جدید ساخته شد')
      setMoreOpen(false)
      navigate(`/programs/${res.data.id}`)
    } catch (err) {
      toast.error(apiErrorMessage(err, 'ساخت نسخه جدید انجام نشد'))
    } finally {
      setWorking(null)
    }
  }

  const saveAsTemplate = async () => {
    setWorking('template')
    try {
      await api.post('/program-templates/create-from-program/', {
        program_id: program.id,
        name: `قالب ${program.title}`,
      })
      toast.success('به قالب‌ها اضافه شد')
      setMoreOpen(false)
    } catch (err) {
      toast.error(apiErrorMessage(err, 'ذخیره قالب انجام نشد'))
    } finally {
      setWorking(null)
    }
  }

  const deleteProgram = async () => {
    setDeleting(true)
    try {
      await api.delete(`/programs/${program.id}/`)
      toast.success('برنامه به سبد حذف منتقل شد')
      navigate(`/athletes/${program.athlete}`)
    } catch (err) {
      toast.error(apiErrorMessage(err, 'حذف برنامه انجام نشد'))
    } finally {
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  if (status === 'loading') return <SkeletonCard rows={4} />

  if (status === 'missing' || !program) {
    return (
      <Card>
        <p className="text-sm font-semibold text-ink-900">این برنامه پیدا نشد یا حذف شده است.</p>
        <p className="mt-1 text-sm text-ink-600">ممکن است به سبد حذف منتقل شده باشد.</p>
        <div className="mt-3 flex gap-2">
          <Button variant="outline" onClick={() => navigate('/athletes')}>بازگشت به ورزشکاران</Button>
        </div>
      </Card>
    )
  }

  const athlete = program.athlete_detail || {}
  const totalExercises = (program.days || []).reduce((sum: number, day: any) => sum + (day.items?.length || 0), 0)
  const shared = Boolean(program.shared_at)

  const itemCard = (item: ReturnType<typeof groupApiItems>[number]['items'][number], tag: string) => {
    const count = Number(repeatCounts[String(item.exerciseId)] || 0)
    return (
      <li key={item.id} className="rounded-field border border-border bg-surface p-3">
        <div className="flex items-start gap-3">
          {item.gifUrl ? (
            <img
              src={item.gifUrl}
              alt=""
              loading="lazy"
              className="h-16 w-16 shrink-0 rounded-field border border-border bg-surface-2 object-cover"
            />
          ) : null}
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <p className="min-w-0 font-semibold text-ink-900">
                {tag ? <span className="ml-1 rounded bg-ink-900 px-1.5 py-0.5 text-[11px] font-bold text-white">{tag}</span> : null}
                {item.name}
              </p>
              <span className="shrink-0 rounded-pill bg-primary-100 px-2 py-0.5 text-xs font-bold text-primary-900">
                {toPersianDigits(item.sets)} × {toPersianDigits(item.reps)}
              </span>
            </div>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-500">
              {item.category ? <span>{item.category}</span> : null}
              {item.restSeconds ? <span>استراحت: {toPersianDigits(item.restSeconds)} ثانیه</span> : null}
            </p>
            {item.note ? <p className="mt-1 text-sm text-ink-600">{item.note}</p> : null}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {item.videoUrl ? (
                <a
                  href={item.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-[32px] items-center rounded-pill border border-primary-200 bg-primary-50 px-2.5 text-xs font-bold text-primary-900"
                >
                  ویدیو حرکت
                </a>
              ) : null}
              {count > 0 ? (
                <RepeatBadge athleteId={program.athlete} exerciseId={item.exerciseId} exerciseName={item.name} count={count} />
              ) : null}
            </div>
          </div>
        </div>
      </li>
    )
  }

  const dayCard = (day: any) => {
    const groups = groupApiItems(day.items)
    return (
      <Card key={day.id} as="section">
        <div className="mb-3 flex items-start justify-between gap-2">
          <h2 className="text-base font-bold text-primary-900">
            روز {toPersianDigits(day.day_index)}
            {day.label ? <span className="mr-2 text-sm font-medium text-ink-600">— {day.label}</span> : null}
          </h2>
          <span className="shrink-0 text-xs text-ink-500">{toPersianDigits(day.items?.length || 0)} حرکت</span>
        </div>
        {groups.length === 0 ? (
          <p className="text-sm text-ink-500">حرکتی برای این روز ثبت نشده است.</p>
        ) : (
          <div className="space-y-3">
            {groups.map((block) =>
              block.group === null ? (
                <ul key={block.key} className="space-y-2">
                  {block.items.map((item, index) => itemCard(item, itemTag(block, index)))}
                </ul>
              ) : (
                <div key={block.key} className="rounded-card border-2 border-dashed border-accent-300 bg-accent-50/40 p-2">
                  <p className="mb-2 px-1 text-xs font-bold text-accent-800">
                    سوپرست {block.letter} — حرکات پشت سر هم و بدون استراحت
                  </p>
                  <ul className="space-y-2">
                    {block.items.map((item, index) => itemCard(item, itemTag(block, index)))}
                  </ul>
                </div>
              ),
            )}
          </div>
        )}
      </Card>
    )
  }


  return (
    <div className="space-y-4 pb-28 md:pb-4">
      <Card>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs text-ink-500">
              {athlete.first_name} {athlete.last_name}
              {athlete.unique_code ? <span> • کد {toPersianDigits(athlete.unique_code)}</span> : null}
            </p>
            <h1 className="mt-1 truncate text-xl font-bold text-primary-900">{program.title}</h1>
            <p className="mt-1 text-sm text-ink-600">
              برنامه {toPersianDigits(program.sequence_number)} • {toJalali(program.start_date)}
              {athlete.level ? ` • ${LEVEL_LABELS[athlete.level] || ''}` : ''}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <Badge tone={program.status === 'final' ? 'success' : 'accent'}>
              {program.status === 'final' ? 'نهایی' : 'پیش‌نویس'}
            </Badge>
            {shared ? <Badge tone="primary">لینک ارسال شده</Badge> : null}
          </div>
        </div>
        <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-field bg-surface-2 p-2">
            <dt className="text-xs text-ink-500">روزهای تمرین</dt>
            <dd className="text-sm font-semibold text-ink-900">{toPersianDigits(program.days_per_week)}</dd>
          </div>
          <div className="rounded-field bg-surface-2 p-2">
            <dt className="text-xs text-ink-500">حرکات</dt>
            <dd className="text-sm font-semibold text-ink-900">{toPersianDigits(totalExercises)}</dd>
          </div>
          <div className="rounded-field bg-surface-2 p-2">
            <dt className="text-xs text-ink-500">آخرین ویرایش</dt>
            <dd className="text-sm font-semibold text-ink-900">
              {program.updated_at ? toJalali(String(program.updated_at).slice(0, 10)) : '—'}
            </dd>
          </div>
        </dl>
      </Card>

      {(program.days || []).map(dayCard)}

      {program.share_token ? (
        <Card>
          <h2 className="text-sm font-bold text-primary-900">لینک اشتراک ورزشکار</h2>
          <p className="mt-1 break-all rounded-field bg-surface-2 p-2 text-xs text-ink-600" dir="ltr">
            {programShareUrl(program.share_token)}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button size="sm" variant="tertiary" onClick={shareLink} loading={sharing}>ارسال / کپی لینک</Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={async () => {
                try {
                  await api.post(`/programs/${program.id}/regenerate_token/`)
                  const res = await api.get(`/programs/${program.id}/`)
                  setProgram(res.data)
                  toast.success('لینک قبلی باطل و لینک جدید ساخته شد')
                } catch (err) {
                  toast.error(apiErrorMessage(err, 'ساخت لینک جدید انجام نشد'))
                }
              }}
            >
              ساخت لینک جدید
            </Button>
          </div>
        </Card>
      ) : null}

      <div className="fixed inset-x-0 bottom-[calc(var(--tabbar-height)+0.5rem)] z-30 px-3 md:sticky md:bottom-4 md:px-0">
        <div className="mx-auto flex max-w-md items-center gap-1.5 rounded-pill border border-border bg-surface p-1.5 shadow-lifted">
          <Button size="sm" onClick={downloadPdf} loading={downloading} className="flex-1">دانلود PDF</Button>
          <Button size="sm" variant="outline" onClick={shareLink} loading={sharing} className="flex-1">اشتراک</Button>
          <Link to={`/programs/${program.id}/edit`} className="flex-1">
            <Button size="sm" variant="outline" fullWidth>ویرایش</Button>
          </Link>
          <Button size="sm" variant="ghost" onClick={() => setMoreOpen(true)} aria-label="کارهای بیشتر">•••</Button>
        </div>
      </div>

      <Modal open={moreOpen} onClose={() => setMoreOpen(false)} title="کارهای بیشتر" variant="sheet">
        <div className="space-y-2">
          <Button variant="outline" fullWidth loading={working === 'duplicate'} onClick={useAsNewProgram}>
            استفاده به‌عنوان برنامه جدید
          </Button>
          <Button variant="outline" fullWidth loading={working === 'template'} onClick={saveAsTemplate}>
            ذخیره به‌عنوان قالب
          </Button>
          <Button variant="ghost" fullWidth onClick={() => { setMoreOpen(false); setConfirmDelete(true) }}>
            انتقال به سبد حذف
          </Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmDelete}
        title="انتقال برنامه به سبد حذف؟"
        description="لینک اشتراک این برنامه غیرفعال می‌شود. می‌توانید بعداً آن را از سبد حذف بازگردانید."
        confirmLabel={deleting ? 'در حال حذف…' : 'حذف کن'}
        onConfirm={deleteProgram}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  )
}

