import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../utils/api'
import { apiErrorMessage } from '../utils/apiError'
import Button from '../components/Button'
import Card from '../components/Card'
import Chip from '../components/Chip'
import Select from '../components/Select'
import Input from '../components/Input'
import Modal from '../components/Modal'
import Avatar from '../components/Avatar'
import Badge from '../components/Badge'
import EmptyState from '../components/EmptyState'
import { SkeletonList } from '../components/Skeleton'
import { useToast } from '../components/Toast'
import { AlertIcon, ChevronLeftIcon, PlusIcon, SearchIcon } from '../components/icons'
import { toPersianDigits } from '../utils/persianDigits'
import { toJalali } from '../utils/jalali'
import { LEVEL_LABELS, LEVEL_OPTIONS } from '../utils/progress'

interface Student {
  id: number
  first_name: string
  last_name: string
  unique_code: string
  phone?: string
  level: string
  level_display?: string
  has_note: boolean
  note_tags?: string[]
  last_program_date?: string | null
  programs_count?: number | null
}

const SORT_OPTIONS = [
  { value: 'newest', label: 'تازه‌ترین' },
  { value: 'last_active', label: 'آخرین فعالیت' },
  { value: 'name', label: 'نام (الف تا ی)' },
  { value: '-name', label: 'نام (ی تا الف)' },
  { value: 'last_program', label: 'آخرین برنامه' },
  { value: 'code', label: 'کد ورزشکار' },
]

export default function Athletes() {
  const toast = useToast()
  const [query, setQuery] = useState('')
  const [levels, setLevels] = useState<string[]>([])
  const [hasNote, setHasNote] = useState(false)
  const [hasPrograms, setHasPrograms] = useState(false)
  const [active, setActive] = useState(false)
  const [ordering, setOrdering] = useState('newest')

  const [rows, setRows] = useState<Student[]>([])
  const [nextPage, setNextPage] = useState<number | null>(1)
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')

  const [showNew, setShowNew] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [form, setForm] = useState({ first_name: '', last_name: '', phone: '', level: 'beginner', goal: '' })
  const requestId = useRef(0)

  const params = useMemo(() => {
    const p: Record<string, string> = { ordering, page_size: '12' }
    if (query.trim()) p.search = query.trim()
    if (levels.length) p.level = levels.join(',')
    if (hasNote) p.has_note = '1'
    if (hasPrograms) p.has_programs = '1'
    if (active) p.active = '1'
    return p
  }, [query, levels, hasNote, hasPrograms, active, ordering])

  const load = useCallback(async (page: number) => {
    const ticket = ++requestId.current
    if (page === 1) setLoading(true)
    else setLoadingMore(true)
    try {
      const res = await api.get('/athletes/', { params: { ...params, page } })
      if (ticket !== requestId.current) return
      const data = res.data
      const incoming: Student[] = data.results || data
      setRows((prev) => (page === 1 ? incoming : [...prev, ...incoming]))
      setCount(data.count ?? incoming.length)
      setNextPage(data.next ? page + 1 : null)
      setError('')
    } catch (err) {
      if (ticket !== requestId.current) return
      setError(apiErrorMessage(err, 'دریافت فهرست ورزشکاران انجام نشد'))
    } finally {
      if (ticket === requestId.current) {
        setLoading(false)
        setLoadingMore(false)
      }
    }
  }, [params])

  useEffect(() => {
    setNextPage(1)
    const timer = setTimeout(() => load(1), 250)
    return () => clearTimeout(timer)
  }, [load])

  const toggleLevel = (value: string) =>
    setLevels((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]))

  const resetFilters = () => {
    setQuery('')
    setLevels([])
    setHasNote(false)
    setHasPrograms(false)
    setActive(false)
  }

  const filtersOn = Boolean(query.trim() || levels.length || hasNote || hasPrograms || active)

  const createStudent = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setFormError('')
    try {
      const res = await api.post('/athletes/', form)
      toast.success('ورزشکار اضافه شد')
      setShowNew(false)
      setForm({ first_name: '', last_name: '', phone: '', level: 'beginner', goal: '' })
      window.location.href = `/athletes/${res.data.id}`
    } catch (err) {
      setFormError(apiErrorMessage(err, 'ورزشکار اضافه نشد'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-primary-900 sm:text-2xl">ورزشکاران</h1>
          <p className="text-sm text-ink-600">
            {loading ? 'در حال بارگذاری…' : count ? `${toPersianDigits(count)} ورزشکار` : 'ورزشکاری ثبت نشده'}
          </p>
        </div>
        <Button onClick={() => setShowNew(true)} icon={<PlusIcon className="h-5 w-5" />}>
          ورزشکار جدید
        </Button>
      </div>

      <div className="relative">
        <span className="pointer-events-none absolute end-4 top-1/2 -translate-y-1/2 text-ink-400">
          <SearchIcon className="h-5 w-5" />
        </span>
        <Input
          placeholder="جستجو با نام، نام خانوادگی یا کد…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pe-12"
          aria-label="جستجوی ورزشکار"
          inputMode="search"
        />
      </div>

      <div className="space-y-2">
        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
          {LEVEL_OPTIONS.map((opt) => (
            <Chip key={opt.value} active={levels.includes(opt.value)} onClick={() => toggleLevel(opt.value)}>
              {opt.label}
            </Chip>
          ))}
          <Chip active={hasNote} onClick={() => setHasNote((v) => !v)}>دارای یادداشت</Chip>
          <Chip active={hasPrograms} onClick={() => setHasPrograms((v) => !v)}>دارای برنامه</Chip>
          <Chip active={active} onClick={() => setActive((v) => !v)}>فعال اخیر</Chip>
        </div>
        <div className="flex items-end gap-2">
          <Select
            label="مرتب‌سازی"
            options={SORT_OPTIONS}
            value={ordering}
            onChange={(e) => setOrdering(e.target.value)}
            className="min-h-[48px]"
          />
          {filtersOn && (
            <Button variant="ghost" onClick={resetFilters} className="shrink-0">
              پاک کردن فیلترها
            </Button>
          )}
        </div>
      </div>

      {loading && <SkeletonList count={4} />}

      {!loading && error && (
        <Card>
          <p className="text-sm text-error-700">{error}</p>
          <Button variant="outline" className="mt-3" onClick={() => load(1)}>تلاش دوباره</Button>
        </Card>
      )}

      {!loading && !error && rows.length === 0 && (
        <EmptyState
          title={filtersOn ? 'ورزشکاری با این مشخصات پیدا نشد' : 'هنوز ورزشکاری ثبت نشده'}
          description={
            filtersOn
              ? 'جستجو یا فیلترها را تغییر دهید. جستجو تفاوت ی/ي و ک/ك را نادیده می‌گیرد.'
              : 'اولین ورزشکار را اضافه کنید و بعد برنامه بسازید.'
          }
          action={
            filtersOn ? (
              <Button variant="outline" onClick={resetFilters}>پاک کردن فیلترها</Button>
            ) : (
              <Button onClick={() => setShowNew(true)}>افزودن ورزشکار</Button>
            )
          }
        />
      )}

      {rows.length > 0 && (
        <ul className="space-y-3">
          {rows.map((student) => (
            <li key={student.id}>
              <Link to={`/athletes/${student.id}`} className="block">
                <Card className="flex items-center gap-3 hover:border-primary-300">
                  <Avatar firstName={student.first_name} lastName={student.last_name} size="lg" />
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-base font-bold text-ink-900">
                        {student.first_name} {student.last_name}
                      </p>
                      <Badge tone="primary">
                        {student.level_display || LEVEL_LABELS[student.level] || student.level}
                      </Badge>
                    </div>
                    <p className="text-sm text-ink-600">کد: {toPersianDigits(student.unique_code)}</p>
                    <p className="text-xs text-ink-500">
                      {student.last_program_date
                        ? `آخرین برنامه: ${toJalali(student.last_program_date)}`
                        : 'هنوز برنامه‌ای ندارد'}
                    </p>
                    {student.has_note && (
                      <p className="inline-flex items-center gap-1 rounded-pill bg-warning-50 px-2.5 py-1 text-xs font-semibold text-warning-700">
                        <AlertIcon className="h-3.5 w-3.5" />
                        یادداشت محدودیت
                      </p>
                    )}
                  </div>
                  <ChevronLeftIcon className="h-5 w-5 shrink-0 text-ink-400" />
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {nextPage !== null && rows.length > 0 && (
        <Button variant="outline" fullWidth loading={loadingMore} onClick={() => load(nextPage)}>
          نمایش بیشتر
        </Button>
      )}

      <div className="pt-2 text-center">
        <Link to="/athletes/trash" className="text-sm font-semibold text-ink-600 underline underline-offset-4 hover:text-primary-700">
          سطل زباله ورزشکاران
        </Link>
      </div>

      <Modal open={showNew} onClose={() => setShowNew(false)} title="ورزشکار جدید" description="نام و نام خانوادگی الزامی است.">
        <form onSubmit={createStudent} className="space-y-3">
          {formError && (
            <p className="rounded-field bg-error-50 p-3 text-sm text-error-700" role="alert">{formError}</p>
          )}
          <Input label="نام" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} required autoFocus />
          <Input label="نام خانوادگی" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} required />
          <Input label="شماره تلفن (اختیاری)" inputMode="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Select
            label="سطح"
            options={LEVEL_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
            value={form.level}
            onChange={(e) => setForm({ ...form, level: e.target.value })}
          />
          <Input label="هدف (اختیاری)" placeholder="مثال: افزایش حجم" value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })} />
          <Button type="submit" fullWidth loading={saving}>ذخیره ورزشکار</Button>
        </form>
      </Modal>
    </div>
  )
}
