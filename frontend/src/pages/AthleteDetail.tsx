import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import api from '../utils/api'
import { apiErrorMessage } from '../utils/apiError'
import Button from '../components/Button'
import Card from '../components/Card'
import Select from '../components/Select'
import Badge from '../components/Badge'
import Avatar from '../components/Avatar'
import EmptyState from '../components/EmptyState'
import ConfirmDialog from '../components/ConfirmDialog'
import Modal from '../components/Modal'
import Input from '../components/Input'
import ProgressChart from '../components/ProgressChart'
import MeasurementSheet from '../components/MeasurementSheet'
import { AthleteNoteCard } from '../components/AthleteNote'
import ExerciseHistoryViews from '../components/ExerciseHistoryViews'
import ProgramPreviewSheet from '../components/ProgramPreviewSheet'
import { fetchExerciseHistory, fetchFrequentExercises } from '../utils/exerciseHistoryApi'
import {
  EMPTY_HISTORY,
  persianText,
  repeatBadgeLabel,
  type ExerciseHistory,
  type ExerciseHistoryRow,
  type FrequentExercise,
} from '../utils/exerciseHistory'
import { SkeletonCard } from '../components/Skeleton'
import { useToast } from '../components/Toast'
import { ChevronLeftIcon, PlusIcon } from '../components/icons'
import { toJalali } from '../utils/jalali'
import { toPersianDigits } from '../utils/persianDigits'
import { downloadProgramPdf, programPdfFilename } from '../utils/programPdf'
import { LEVEL_LABELS, LEVEL_OPTIONS, bmiOf, changeSinceStart, formatChange } from '../utils/progress'
import type { MeasurementPoint } from '../utils/progress'

interface Program {
  id: number
  sequence_number: number
  title: string
  start_date: string
  status: string
  days_per_week: number
}

export default function AthleteDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()

  const [athlete, setAthlete] = useState<any>(null)
  const [measurements, setMeasurements] = useState<MeasurementPoint[]>([])
  const [programs, setPrograms] = useState<Program[]>([])
  const [historyNext, setHistoryNext] = useState<number | null>(null)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [pdfBusyId, setPdfBusyId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<MeasurementPoint | null>(null)
  const [levelSaving, setLevelSaving] = useState(false)
  const [goalOpen, setGoalOpen] = useState(false)
  const [goalDraft, setGoalDraft] = useState('')
  const [profileOpen, setProfileOpen] = useState(false)
  const [profileForm, setProfileForm] = useState({ first_name: '', last_name: '', phone: '', goal: '' })
  const [profileError, setProfileError] = useState('')
  const [profileSaving, setProfileSaving] = useState(false)
  const [trashOpen, setTrashOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [frequent, setFrequent] = useState<FrequentExercise[]>([])
  const [frequentPick, setFrequentPick] = useState<FrequentExercise | null>(null)
  const [frequentHistory, setFrequentHistory] = useState<ExerciseHistory>(EMPTY_HISTORY)
  const [frequentStatus, setFrequentStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const [previewProgram, setPreviewProgram] = useState<{ id: number | null; row: ExerciseHistoryRow | null }>({
    id: null,
    row: null,
  })

  const loadAthlete = useCallback(async () => {
    try {
      const [detail, list] = await Promise.all([
        api.get(`/athletes/${id}/`),
        api.get(`/athletes/${id}/measurements/`),
      ])
      setAthlete(detail.data)
      setMeasurements(list.data || [])
      setError('')
    } catch (err) {
      setError(apiErrorMessage(err, 'دریافت پرونده ورزشکار انجام نشد'))
    } finally {
      setLoading(false)
    }
  }, [id])

  const loadPrograms = useCallback(
    async (page: number) => {
      setHistoryLoading(true)
      try {
        const res = await api.get('/programs/', { params: { athlete: id, page } })
        const data = res.data
        const incoming: Program[] = data.results || data
        setPrograms((prev) => (page === 1 ? incoming : [...prev, ...incoming]))
        setHistoryNext(data.next ? page + 1 : null)
      } catch (err) {
        toast.error(apiErrorMessage(err, 'دریافت برنامه‌ها انجام نشد'))
      } finally {
        setHistoryLoading(false)
      }
    },
    [id, toast],
  )

  useEffect(() => {
    loadAthlete()
    loadPrograms(1)
  }, [loadAthlete, loadPrograms])

  useEffect(() => {
    let cancelled = false
    if (!id) return
    fetchFrequentExercises(id)
      .then((rows) => {
        if (!cancelled) setFrequent(rows)
      })
      .catch(() => {
        if (!cancelled) setFrequent([])
      })
    return () => {
      cancelled = true
    }
  }, [id])

  const openFrequent = async (exercise: FrequentExercise) => {
    setFrequentPick(exercise)
    setFrequentHistory(EMPTY_HISTORY)
    setFrequentStatus('loading')
    try {
      const history = await fetchExerciseHistory(id!, exercise.exercise_id)
      setFrequentHistory(history)
      setFrequentStatus('ready')
    } catch {
      setFrequentStatus('error')
    }
  }

  const changeLevel = async (level: string) => {
    if (!athlete || level === athlete.level) return
    setLevelSaving(true)
    try {
      const res = await api.patch(`/athletes/${id}/`, { level })
      setAthlete((prev: any) => ({ ...prev, ...res.data }))
      toast.success('سطح ورزشکار به‌روز شد')
    } catch (err) {
      toast.error(apiErrorMessage(err, 'تغییر سطح انجام نشد'))
    } finally {
      setLevelSaving(false)
    }
  }

  const saveGoal = async () => {
    try {
      const res = await api.patch(`/athletes/${id}/`, { goal: goalDraft })
      setAthlete((prev: any) => ({ ...prev, goal: res.data.goal }))
      setGoalOpen(false)
      toast.success('هدف ذخیره شد')
    } catch (err) {
      toast.error(apiErrorMessage(err, 'ذخیره هدف انجام نشد'))
    }
  }

  const openProfile = () => {
    setProfileForm({
      first_name: athlete?.first_name || '',
      last_name: athlete?.last_name || '',
      phone: athlete?.phone || '',
      goal: athlete?.goal || '',
    })
    setProfileError('')
    setProfileOpen(true)
  }

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profileForm.first_name.trim() || !profileForm.last_name.trim()) {
      setProfileError('نام و نام خانوادگی الزامی است.')
      return
    }
    setProfileSaving(true)
    setProfileError('')
    try {
      const payload = {
        first_name: profileForm.first_name.trim(),
        last_name: profileForm.last_name.trim(),
        phone: profileForm.phone.trim(),
        goal: profileForm.goal.trim(),
      }
      const res = await api.patch(`/athletes/${id}/`, payload)
      setAthlete((prev: any) => ({ ...prev, ...res.data }))
      setProfileOpen(false)
      toast.success('مشخصات ورزشکار ذخیره شد')
    } catch (err) {
      setProfileError(apiErrorMessage(err, 'ذخیره مشخصات انجام نشد'))
    } finally {
      setProfileSaving(false)
    }
  }

  const moveToTrash = async () => {
    setBusy(true)
    try {
      await api.delete(`/athletes/${id}/`)
      toast.success('ورزشکار به سطل زباله رفت', {
        actionLabel: 'بازگردانی',
        onAction: async () => {
          try {
            await api.post(`/athletes/${id}/restore/`)
            toast.success('ورزشکار بازگردانده شد')
            loadAthlete()
          } catch {
            toast.error('بازگردانی انجام نشد')
          }
        },
        duration: 8000,
      })
      navigate('/athletes')
    } catch (err) {
      toast.error(apiErrorMessage(err, 'حذف انجام نشد'))
    } finally {
      setBusy(false)
      setTrashOpen(false)
    }
  }

  const openNewMeasurement = () => {
    // Same day already measured? Open that row for editing instead of failing on the unique-day rule.
    const todayIso = new Date().toISOString().slice(0, 10)
    setEditing(measurements.find((m) => m.date === todayIso) || null)
    setSheetOpen(true)
  }

  if (loading) return <SkeletonCard rows={4} />
  if (error || !athlete) {
    return (
      <EmptyState
        title="پرونده ورزشکار پیدا نشد"
        description={error || 'ممکن است حذف شده باشد.'}
        action={<Link to="/athletes"><Button variant="outline">بازگشت به ورزشکاران</Button></Link>}
      />
    )
  }

  const weights = measurements.map((m) => Number(m.weight_kg))
  const heights = measurements.filter((m) => m.height_cm).map((m) => Number(m.height_cm))
  const weightDelta = changeSinceStart(weights)
  const heightDelta = changeSinceStart(heights)
  const todayIso = new Date().toISOString().slice(0, 10)
  const latestWeight = athlete.weight_kg ?? (weights.length ? weights[weights.length - 1] : null)
  const latestHeight = athlete.height_cm ?? (heights.length ? heights[heights.length - 1] : null)
  const bmi = athlete.bmi ?? bmiOf(latestWeight, latestHeight)
  const downloadCardPdf = async (program: Program) => {
    setPdfBusyId(program.id)
    try {
      await downloadProgramPdf(program.id, { filename: programPdfFilename(program.id, program.sequence_number) })
      toast.success('فایل PDF دانلود شد')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'دانلود PDF انجام نشد')
    } finally {
      setPdfBusyId(null)
    }
  }

  const latestTwo = programs.slice(0, 2)
  const levelLabel = athlete.level_display || LEVEL_LABELS[athlete.level] || athlete.level

  const pdfButton = (program: Program) => (
    <button
      type="button"
      onClick={() => downloadCardPdf(program)}
      disabled={pdfBusyId === program.id}
      aria-label={`دانلود PDF برنامه ${program.title}`}
      title="دانلود PDF"
      className="flex min-h-[44px] w-16 shrink-0 flex-col items-center justify-center rounded-field border border-border-strong bg-surface px-1 text-[10px] font-bold leading-tight text-primary-900 transition-colors duration-fast hover:border-primary-600 hover:bg-primary-50 disabled:opacity-50"
    >
      {pdfBusyId === program.id ? '…' : 'دانلود PDF'}
    </button>
  )

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-start gap-3">
          <Avatar firstName={athlete.first_name} lastName={athlete.last_name} size="lg" />
          <div className="min-w-0 flex-1 space-y-1">
            <h1 className="truncate text-xl font-bold text-primary-900">
              {athlete.first_name} {athlete.last_name}
            </h1>
            <p className="text-sm text-ink-600">کد ورزشکار: {toPersianDigits(athlete.unique_code)}</p>
            {athlete.phone && <p className="text-sm text-ink-600">{toPersianDigits(athlete.phone)}</p>}
          </div>
          <Badge tone="primary">{levelLabel}</Badge>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-field bg-surface-2 p-3 text-center">
            <p className="text-xs text-ink-500">وزن فعلی</p>
            <p className="text-lg font-bold text-ink-900">
              {latestWeight !== null ? `${toPersianDigits(latestWeight)} کیلو` : '—'}
            </p>
            {weightDelta !== null && (
              <p className={`text-xs font-semibold ${weightDelta > 0 ? 'text-accent-700' : 'text-primary-700'}`}>
                {formatChange(weightDelta, 'کیلو')}
              </p>
            )}
          </div>
          <div className="rounded-field bg-surface-2 p-3 text-center">
            <p className="text-xs text-ink-500">قد</p>
            <p className="text-lg font-bold text-ink-900">
              {latestHeight !== null ? `${toPersianDigits(latestHeight)} سانتی` : '—'}
            </p>
          </div>
          <div className="rounded-field bg-surface-2 p-3 text-center">
            <p className="text-xs text-ink-500">شاخص توده بدنی</p>
            <p className="text-lg font-bold text-ink-900">{bmi !== null ? toPersianDigits(bmi) : '—'}</p>
          </div>
          <div className="rounded-field bg-surface-2 p-3 text-center">
            <p className="text-xs text-ink-500">اندازه‌گیری‌ها</p>
            <p className="text-lg font-bold text-ink-900">{toPersianDigits(measurements.length)}</p>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="level-select" className="text-sm font-semibold text-ink-700">سطح:</label>
            <Select
              id="level-select"
              aria-label="سطح ورزشکار"
              options={LEVEL_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
              value={athlete.level}
              disabled={levelSaving}
              onChange={(e) => changeLevel(e.target.value)}
              className="max-w-[220px]"
            />
            <Button variant="ghost" size="sm" onClick={() => { setGoalDraft(athlete.goal || ''); setGoalOpen(true) }}>
              {athlete.goal ? `هدف: ${athlete.goal}` : 'افزودن هدف'}
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={openNewMeasurement} icon={<PlusIcon className="h-5 w-5" />}>
              ثبت وزن/قد جدید
            </Button>
            <Link to={`/programs/builder/${id}`}>
              <Button variant="secondary">ساخت برنامه جدید</Button>
            </Link>
            <Button variant="outline" onClick={openProfile}>ویرایش مشخصات</Button>
            <Button variant="ghost" onClick={() => setTrashOpen(true)} className="text-error-700">
              حذف ورزشکار
            </Button>
          </div>
        </div>
      </Card>

      <AthleteNoteCard
        athleteId={id!}
        notes={athlete.notes || ''}
        noteTags={athlete.note_tags || []}
        onSaved={({ notes, note_tags }) => setAthlete((prev: any) => ({ ...prev, notes, note_tags }))}
      />

      <Card>
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-base font-bold text-primary-900">حرکات پرتکرار</h2>
          {frequent.length > 0 && <span className="text-xs text-ink-500">۱۰ حرکت اول</span>}
        </div>
        {frequent.length === 0 ? (
          <p className="text-sm text-ink-600">با ثبت اولین برنامه، پرتکرارترین حرکات این ورزشکار اینجا نمایش داده می‌شود.</p>
        ) : (
          <ul className="divide-y divide-border" data-testid="frequent-list">
            {frequent.map((row, index) => (
              <li key={row.exercise_id}>
                <button
                  type="button"
                  onClick={() => openFrequent(row)}
                  className="flex w-full min-h-[52px] items-center gap-2 py-2 text-right"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-2 text-xs font-bold text-ink-600">
                    {toPersianDigits(index + 1)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-ink-900">{row.name}</span>
                    {row.last_sequence_number ? (
                      <span className="block text-xs text-ink-500">
                        آخرین بار: برنامه {toPersianDigits(row.last_sequence_number)}
                        {row.last_date_jalali ? ` — ${persianText(row.last_date_jalali)}` : ''}
                      </span>
                    ) : null}
                  </span>
                  <span className="shrink-0 rounded-pill border border-accent-200 bg-accent-50 px-2.5 py-0.5 text-xs font-bold text-accent-800">
                    {repeatBadgeLabel(row.count)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <section className="card-surface p-4 sm:p-5">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-primary-900">روند پیشرفت</h2>
            <p className="text-sm text-ink-600">
              {measurements.length > 0
                ? `از ${toJalali(measurements[0].date)} تا ${toJalali(measurements[measurements.length - 1].date)}`
                : 'هنوز اندازه‌گیری ثبت نشده'}
            </p>
          </div>
          {measurements.length > 0 && (
            <Button variant="ghost" size="sm" onClick={openNewMeasurement}>افزودن</Button>
          )}
        </div>

        {measurements.length === 0 ? (
          <div className="rounded-field bg-surface-2 p-4 text-center">
            <p className="text-sm font-semibold text-ink-800">برای دیدن نمودار، اولین اندازه‌گیری را ثبت کنید</p>
            <p className="mt-1 text-sm text-ink-600">
              دکمه «ثبت وزن/قد جدید» را بزنید؛ فقط وزن لازم است و کمتر از ۱۰ ثانیه وقت می‌گیرد. دفعه بعد مقدار قبلی از قبل پر شده است.
            </p>
            <Button className="mt-3" onClick={openNewMeasurement}>ثبت اولین اندازه‌گیری</Button>
          </div>
        ) : (
          <>
            <ProgressChart
              points={measurements}
              onEdit={(point) => {
                setEditing(point)
                setSheetOpen(true)
              }}
            />
            {weightDelta !== null && (
              <p className="mt-3 text-sm text-ink-700">
                تغییر وزن از اولین اندازه‌گیری: <span className="font-bold">{formatChange(weightDelta, 'کیلوگرم')}</span>
                {heightDelta !== null && (
                  <span className="text-ink-600"> • تغییر قد: {formatChange(heightDelta, 'سانتی‌متر')}</span>
                )}
              </p>
            )}
            <p className="mt-1 text-xs text-ink-500">برای ویرایش هر نقطه، روی آن بزنید.</p>
          </>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="pt-1 text-base font-bold text-primary-900">آخرین برنامه‌ها</h2>
        {latestTwo.length === 0 && (
          <EmptyState
            title="هنوز برنامه‌ای ندارد"
            description="اولین برنامه این ورزشکار را در چند مرحله بسازید."
            action={<Link to={`/programs/builder/${id}`}><Button>ساخت برنامه</Button></Link>}
          />
        )}
        {latestTwo.length > 0 && (
          <ul className="space-y-2">
            {latestTwo.map((program) => (
              <li key={program.id} className="flex items-stretch gap-2">
                <Link to={`/programs/${program.id}`} className="block min-w-0 flex-1">
                  <Card className="flex items-center gap-3 hover:border-primary-300">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-ink-500">برنامه {toPersianDigits(program.sequence_number)}</p>
                      <p className="truncate text-base font-bold text-ink-900">{program.title}</p>
                      <p className="text-sm text-ink-600">
                        شروع: {toJalali(program.start_date)} • {toPersianDigits(program.days_per_week)} روز در هفته
                      </p>
                    </div>
                    <Badge tone={program.status === 'final' ? 'success' : 'accent'}>
                      {program.status === 'final' ? 'نهایی' : 'پیش‌نویس'}
                    </Badge>
                    <ChevronLeftIcon className="h-5 w-5 shrink-0 text-ink-400" />
                  </Card>
                </Link>
                {pdfButton(program)}
              </li>
            ))}
          </ul>
        )}
      </section>

      {programs.length > 0 && (
        <section className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-bold text-primary-900">تاریخچه کامل برنامه‌ها</h2>
            <span className="text-xs text-ink-500">{toPersianDigits(programs.length)} برنامه</span>
          </div>
          <ul className="space-y-2">
            {programs.map((program) => (
              <li key={program.id} className="flex items-stretch gap-2">
                <Link to={`/programs/${program.id}`} className="block min-w-0 flex-1">
                  <Card className="flex items-center gap-3 hover:border-primary-300">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-ink-900">
                        برنامه {toPersianDigits(program.sequence_number)} — {program.title}
                      </p>
                      <p className="text-sm text-ink-600">
                        {toJalali(program.start_date)} • {toPersianDigits(program.days_per_week)} روز در هفته
                      </p>
                    </div>
                    <Badge tone={program.status === 'final' ? 'success' : 'accent'}>
                      {program.status === 'final' ? 'نهایی' : 'پیش‌نویس'}
                    </Badge>
                    <ChevronLeftIcon className="h-5 w-5 shrink-0 text-ink-400" />
                  </Card>
                </Link>
                <button
                  type="button"
                  onClick={() => downloadCardPdf(program)}
                  disabled={pdfBusyId === program.id}
                  aria-label={`دانلود PDF برنامه ${program.title}`}
                  className="flex min-h-[44px] w-16 shrink-0 flex-col items-center justify-center rounded-field border border-border-strong bg-surface px-1 text-[10px] font-bold leading-tight text-primary-900 transition-colors duration-fast hover:border-primary-600 hover:bg-primary-50 disabled:opacity-50"
                >
                  {pdfBusyId === program.id ? '…' : 'دانلود PDF'}
                </button>
              </li>
            ))}
          </ul>
          {historyNext !== null && (
            <Button variant="outline" fullWidth loading={historyLoading}
              onClick={() => loadPrograms(historyNext)}>
              نمایش برنامه‌های قدیمی‌تر
            </Button>
          )}
        </section>
      )}

      <MeasurementSheet
        open={sheetOpen}
        athleteId={id!}
        measurement={editing}
        lastWeight={latestWeight}
        lastHeight={latestHeight}
        today={todayIso}
        onClose={() => { setSheetOpen(false); setEditing(null) }}
        onSaved={() => { loadAthlete() }}
      />

      <Modal open={goalOpen} onClose={() => setGoalOpen(false)} title="هدف ورزشکار"
        description="هدف در پرونده و برنامه‌های بعدی نشان داده می‌شود.">
        <div className="space-y-3">
          <Input label="هدف" value={goalDraft} onChange={(e) => setGoalDraft(e.target.value)}
            placeholder="مثال: کاهش چربی تا ۸۰ کیلو" autoFocus />
          <Button fullWidth onClick={saveGoal}>ذخیره هدف</Button>
        </div>
      </Modal>

      <Modal open={profileOpen} onClose={() => setProfileOpen(false)} title="ویرایش مشخصات ورزشکار"
        description={`کد ورزشکار ${toPersianDigits(athlete.unique_code)} قابل تغییر نیست.`}>
        <form onSubmit={saveProfile} className="space-y-3">
          {profileError && (
            <p className="rounded-field bg-error-50 p-3 text-sm text-error-700" role="alert">{profileError}</p>
          )}
          <Input label="نام" value={profileForm.first_name} required autoFocus
            onChange={(e) => setProfileForm({ ...profileForm, first_name: e.target.value })} />
          <Input label="نام خانوادگی" value={profileForm.last_name} required
            onChange={(e) => setProfileForm({ ...profileForm, last_name: e.target.value })} />
          <Input label="شماره تلفن (اختیاری)" inputMode="tel" value={profileForm.phone}
            onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })} />
          <Input label="هدف (اختیاری)" value={profileForm.goal}
            onChange={(e) => setProfileForm({ ...profileForm, goal: e.target.value })} />
          <div className="flex gap-3">
            <Button type="button" variant="outline" fullWidth onClick={() => setProfileOpen(false)}>انصراف</Button>
            <Button type="submit" fullWidth loading={profileSaving}>ذخیره</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={trashOpen}
        title="انتقال به سطل زباله؟"
        description="پرونده و اندازه‌گیری‌های این ورزشکار پنهان می‌شود. تا وقتی سطل زباله را خالی نکرده‌اید، می‌توانید بازگردانید."
        confirmLabel="انتقال به سطل زباله"
        tone="danger"
        loading={busy}
        onCancel={() => setTrashOpen(false)}
        onConfirm={moveToTrash}
      />

      <Modal
        open={frequentPick !== null}
        onClose={() => setFrequentPick(null)}
        title={frequentPick ? `سابقه «${frequentPick.name}»` : undefined}
        variant="dialog"
        footer={<Button variant="outline" fullWidth onClick={() => setFrequentPick(null)}>بستن</Button>}
      >
        {frequentStatus === 'loading' && <p className="py-4 text-center text-sm text-ink-600">در حال دریافت سابقه…</p>}
        {frequentStatus === 'error' && (
          <p className="py-2 text-sm text-ink-600">دریافت سابقه انجام نشد؛ دوباره تلاش کنید.</p>
        )}
        {frequentStatus === 'ready' && frequentHistory.count > 0 && (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-primary-900">
              این حرکت در {toPersianDigits(frequentHistory.count)} برنامه استفاده شده است.
            </p>
            <ExerciseHistoryViews
              rows={frequentHistory.programs}
              onOpenProgram={(programId) =>
                setPreviewProgram({
                  id: programId,
                  row: frequentHistory.programs.find((row) => row.id === programId) || null,
                })
              }
            />
          </div>
        )}
        {frequentStatus === 'ready' && frequentHistory.count === 0 && (
          <p className="py-2 text-sm text-ink-600">سابقه‌ای ثبت نشده است.</p>
        )}
      </Modal>

      <ProgramPreviewSheet
        open={previewProgram.id !== null}
        programId={previewProgram.id}
        row={previewProgram.row}
        onClose={() => setPreviewProgram({ id: null, row: null })}
      />
    </div>
  )
}
