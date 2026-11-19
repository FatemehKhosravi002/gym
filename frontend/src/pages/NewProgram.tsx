import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../utils/api'
import { apiErrorMessage } from '../utils/apiError'
import Card from '../components/Card'
import Input from '../components/Input'
import Button from '../components/Button'
import Avatar from '../components/Avatar'
import EmptyState from '../components/EmptyState'
import Modal from '../components/Modal'
import { SkeletonList } from '../components/Skeleton'
import { useToast } from '../components/Toast'
import { AlertIcon, ChevronLeftIcon } from '../components/icons'
import { toPersianDigits } from '../utils/persianDigits'
import { toJalali } from '../utils/jalali'

type Choice = 'template' | 'copy' | null

export default function NewProgram() {
  const navigate = useNavigate()
  const toast = useToast()
  const [query, setQuery] = useState('')
  const [athletes, setAthletes] = useState<any[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = useState('')

  const [athlete, setAthlete] = useState<any>(null)
  const [choice, setChoice] = useState<Choice>(null)
  const [templates, setTemplates] = useState<any[]>([])
  const [programs, setPrograms] = useState<any[]>([])
  const [loadingOptions, setLoadingOptions] = useState(false)
  const [workingId, setWorkingId] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    const timer = setTimeout(async () => {
      setStatus('loading')
      try {
        const res = await api.get('/athletes/', { params: query ? { search: query } : {} })
        if (cancelled) return
        setAthletes(res.data.results || res.data)
        setStatus('ready')
      } catch (err) {
        if (cancelled) return
        setError(apiErrorMessage(err, 'دریافت فهرست ورزشکاران انجام نشد'))
        setStatus('error')
      }
    }, 250)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [query])

  useEffect(() => {
    if (!choice || !athlete) return
    let cancelled = false
    setLoadingOptions(true)
    const request = choice === 'template'
      ? api.get('/program-templates/')
      : api.get('/programs/', { params: { athlete: athlete.id } })
    request
      .then((res) => {
        if (cancelled) return
        const rows = res.data.results || res.data
        if (choice === 'template') setTemplates(rows)
        else setPrograms(rows)
      })
      .catch(() => {
        if (!cancelled) toast.error('دریافت گزینه‌ها انجام نشد')
      })
      .finally(() => {
        if (!cancelled) setLoadingOptions(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [choice, athlete])

  const openChoices = (selected: any) => {
    setAthlete(selected)
    setTemplates([])
    setPrograms([])
  }

  const closeSheet = () => {
    setAthlete(null)
    setChoice(null)
  }

  const applyTemplate = async (template: any) => {
    if (!athlete) return
    setWorkingId(template.id)
    try {
      const res = await api.post(`/program-templates/${template.id}/apply-to-athlete/`, { athlete_id: athlete.id })
      toast.success('برنامه پیش‌نویس از قالب ساخته شد')
      navigate(`/programs/${res.data.program_id}/edit`)
    } catch (err) {
      toast.error(apiErrorMessage(err, 'ساخت برنامه از قالب انجام نشد'))
    } finally {
      setWorkingId(null)
    }
  }

  const copyProgram = async (program: any) => {
    setWorkingId(program.id)
    try {
      const res = await api.post(`/programs/${program.id}/duplicate/`)
      toast.success('برنامه قبلی کپی شد')
      navigate(`/programs/${res.data.id}/edit`)
    } catch (err) {
      toast.error(apiErrorMessage(err, 'کپی برنامه انجام نشد'))
    } finally {
      setWorkingId(null)
    }
  }

  const startFromScratch = () => {
    if (!athlete) return
    navigate(`/programs/builder/${athlete.id}`)
  }


  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-xl font-bold text-primary-900 sm:text-2xl">برنامه جدید برای کیست؟</h1>
        <p className="text-sm text-ink-600">ورزشکار را انتخاب کنید؛ بعد از صفر، از قالب یا کپی برنامه قبلی شروع می‌کنید.</p>
      </div>

      <Input
        label="جستجوی ورزشکار"
        placeholder="نام، نام خانوادگی یا کد"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoFocus
      />

      {status === 'loading' && <SkeletonList count={3} />}

      {status === 'error' && (
        <Card>
          <p className="text-sm text-error-700">{error}</p>
          <div className="pt-3">
            <Button variant="outline" size="sm" onClick={() => setQuery((q) => q + ' ')}>تلاش دوباره</Button>
          </div>
        </Card>
      )}

      {status === 'ready' && athletes.length === 0 && (
        <EmptyState
          title="ورزشکاری پیدا نشد"
          description="برای ساخت برنامه ابتدا یک ورزشکار ثبت کنید."
          action={<Link to="/athletes"><Button>رفتن به ورزشکاران</Button></Link>}
        />
      )}

      {status === 'ready' && athletes.length > 0 && (
        <ul className="space-y-2">
          {athletes.map((a) => (
            <li key={a.id}>
              <button type="button" onClick={() => openChoices(a)} className="w-full text-right">
                <Card className="flex items-center gap-3 hover:border-primary-300">
                  <Avatar firstName={a.first_name} lastName={a.last_name} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-primary-900">{a.first_name} {a.last_name}</p>
                    <p className="text-sm text-ink-600">کد: {toPersianDigits(a.unique_code)}</p>
                    {a.has_note && (
                      <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-warning-700">
                        <AlertIcon className="h-3.5 w-3.5" />
                        یادداشت محدودیت
                        {(a.note_tags || []).length > 0 ? `: ${(a.note_tags || []).join('، ')}` : ''}
                      </p>
                    )}
                  </div>
                  <ChevronLeftIcon className="h-5 w-5 shrink-0 text-ink-400" />
                </Card>
              </button>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={athlete !== null && choice === null}
        onClose={closeSheet}
        title={`برنامه برای ${athlete?.first_name || ''} ${athlete?.last_name || ''}`}
        description="از کجا شروع کنیم؟"
        variant="sheet"
      >
        <div className="space-y-2">
          <Button size="lg" fullWidth onClick={startFromScratch}>شروع از صفر</Button>
          <Button size="lg" variant="secondary" fullWidth onClick={() => setChoice('template')}>استفاده از قالب</Button>
          <Button size="lg" variant="outline" fullWidth onClick={() => setChoice('copy')}>کپی برنامهٔ قبلی</Button>
        </div>
      </Modal>

      <Modal
        open={choice === 'template'}
        onClose={() => setChoice(null)}
        title="انتخاب قالب"
        description="یک کپی مستقل برای این ورزشکار ساخته می‌شود؛ بعد می‌توانید آزادانه ویرایش کنید."
        variant="sheet"
      >
        {loadingOptions && <p className="py-3 text-center text-sm text-ink-600">در حال بارگذاری…</p>}
        {!loadingOptions && templates.length === 0 && (
          <div className="space-y-3">
            <p className="text-sm text-ink-600">هنوز قالبی نساخته‌اید.</p>
            <Link to="/templates/new"><Button fullWidth variant="outline">ساخت قالب جدید</Button></Link>
          </div>
        )}
        <ul className="space-y-2">
          {templates.map((template) => (
            <li key={template.id}>
              <Button
                variant="outline"
                fullWidth
                loading={workingId === template.id}
                onClick={() => applyTemplate(template)}
              >
                {template.name}
                <span className="text-xs font-medium text-ink-500">
                  {toPersianDigits(template.days_count ?? (template.days || []).length)} روز
                </span>
              </Button>
            </li>
          ))}
        </ul>
      </Modal>

      <Modal
        open={choice === 'copy'}
        onClose={() => setChoice(null)}
        title="کپی برنامهٔ قبلی"
        description="ساختار و حرکات برنامه انتخاب‌شده در یک پیش‌نویس تازه کپی می‌شود."
        variant="sheet"
      >
        {loadingOptions && <p className="py-3 text-center text-sm text-ink-600">در حال بارگذاری…</p>}
        {!loadingOptions && programs.length === 0 && (
          <p className="text-sm text-ink-600">این ورزشکار هنوز برنامه‌ای ندارد؛ از صفر شروع کنید.</p>
        )}
        <ul className="space-y-2">
          {programs.map((program) => (
            <li key={program.id}>
              <Button
                variant="outline"
                fullWidth
                loading={workingId === program.id}
                onClick={() => copyProgram(program)}
              >
                {program.title}
                <span className="text-xs font-medium text-ink-500">
                  {toPersianDigits(program.sequence_number)} • {toJalali(program.start_date)}
                </span>
              </Button>
            </li>
          ))}
        </ul>
      </Modal>
    </div>
  )
}

