import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../utils/api'
import { apiErrorMessage } from '../utils/apiError'
import Card from '../components/Card'
import Button from '../components/Button'
import Input from '../components/Input'
import Modal from '../components/Modal'
import Avatar from '../components/Avatar'
import EmptyState from '../components/EmptyState'
import { SkeletonList } from '../components/Skeleton'
import { useToast } from '../components/Toast'
import { ChevronLeftIcon, SearchIcon } from '../components/icons'
import { toPersianDigits } from '../utils/persianDigits'

export default function Athletes() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ first_name: '', last_name: '', phone: '', notes: '' })
  const toast = useToast()

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const t = setTimeout(async () => {
      try {
        const res = query.trim()
          ? await api.get('/athletes/search_combined/', { params: { q: query.trim() } })
          : await api.get('/athletes/')
        if (cancelled) return
        setResults(res.data.results || res.data)
        setError('')
      } catch (err) {
        if (cancelled) return
        setError(apiErrorMessage(err, 'دریافت فهرست ورزشکاران انجام نشد'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, 250)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [query])

  const createAthlete = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await api.post('/athletes/', form)
      setShowNew(false)
      setForm({ first_name: '', last_name: '', phone: '', notes: '' })
      toast.success('ورزشکار اضافه شد')
      window.location.href = `/athletes/${res.data.id}`
    } catch (err) {
      toast.error(apiErrorMessage(err, 'ورزشکار اضافه نشد'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-primary-900 sm:text-2xl">ورزشکاران</h1>
          <p className="text-sm text-ink-600">ورزشکار را انتخاب کنید تا برنامه‌هایش را ببینید.</p>
        </div>
        <Button onClick={() => setShowNew(true)}>ورزشکار جدید</Button>
      </div>

      <div className="relative">
        <span className="pointer-events-none absolute end-4 top-1/2 -translate-y-1/2 text-ink-400">
          <SearchIcon className="h-5 w-5" />
        </span>
        <Input
          placeholder="جستجو بر اساس نام یا کد…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pe-12"
          aria-label="جستجوی ورزشکار"
        />
      </div>

      {loading && <SkeletonList count={4} />}

      {!loading && error && (
        <Card>
          <p className="text-sm text-error-700">{error}</p>
        </Card>
      )}

      {!loading && !error && results.length === 0 && (
        <EmptyState
          title={query ? 'ورزشکاری پیدا نشد' : 'هنوز ورزشکاری ثبت نشده'}
          description={query ? 'املای نام یا کد را بررسی کنید.' : 'اولین ورزشکار را اضافه کنید و ساخت برنامه را شروع کنید.'}
          action={!query ? <Button onClick={() => setShowNew(true)}>افزودن ورزشکار</Button> : undefined}
        />
      )}

      {!loading && results.length > 0 && (
        <ul className="space-y-2">
          {results.map((a) => (
            <li key={a.id}>
              <Link to={`/athletes/${a.id}`} className="block">
                <Card className="flex items-center gap-3 hover:border-primary-300">
                  <Avatar firstName={a.first_name} lastName={a.last_name} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-ink-900">{a.first_name} {a.last_name}</p>
                    <p className="text-sm text-ink-600">کد: {toPersianDigits(a.unique_code)}</p>
                  </div>
                  <ChevronLeftIcon className="h-5 w-5 shrink-0 text-ink-400" />
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={showNew}
        onClose={() => setShowNew(false)}
        title="ورزشکار جدید"
        description="نام و نام خانوادگی الزامی است."
      >
        <form onSubmit={createAthlete} className="space-y-3">
          <Input label="نام" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} required autoFocus />
          <Input label="نام خانوادگی" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} required />
          <Input label="شماره تلفن (اختیاری)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} inputMode="tel" />
          <div>
            <label htmlFor="athlete-notes" className="mb-1.5 block text-sm font-semibold text-ink-700">یادداشت (اختیاری)</label>
            <textarea
              id="athlete-notes"
              className="field min-h-[88px]"
              placeholder="مثال: زانوی راست حساس است"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
          <Button type="submit" fullWidth loading={saving}>ذخیره ورزشکار</Button>
        </form>
      </Modal>
    </div>
  )
}

