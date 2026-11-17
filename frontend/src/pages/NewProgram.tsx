import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../utils/api'
import { apiErrorMessage } from '../utils/apiError'
import Card from '../components/Card'
import Input from '../components/Input'
import Button from '../components/Button'
import Avatar from '../components/Avatar'
import EmptyState from '../components/EmptyState'
import { SkeletonList } from '../components/Skeleton'
import { ChevronLeftIcon } from '../components/icons'
import { toPersianDigits } from '../utils/persianDigits'

export default function NewProgram() {
  const [query, setQuery] = useState('')
  const [athletes, setAthletes] = useState<any[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = useState('')

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

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-xl font-bold text-primary-900 sm:text-2xl">برنامه جدید برای کیست؟</h1>
        <p className="text-sm text-ink-600">ورزشکار را انتخاب کنید تا ساخت برنامه شروع شود.</p>
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
              <Link to={`/programs/builder/${a.id}`} className="block">
                <Card className="flex items-center gap-3 hover:border-primary-300">
                  <Avatar firstName={a.first_name} lastName={a.last_name} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-primary-900">{a.first_name} {a.last_name}</p>
                    <p className="text-sm text-ink-600">کد: {toPersianDigits(a.unique_code)}</p>
                  </div>
                  <ChevronLeftIcon className="h-5 w-5 shrink-0 text-ink-400" />
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
