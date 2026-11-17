import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import api from '../utils/api'
import Card from '../components/Card'
import Button from '../components/Button'
import Avatar from '../components/Avatar'
import Badge from '../components/Badge'
import EmptyState from '../components/EmptyState'
import { SkeletonCard } from '../components/Skeleton'
import { ChevronLeftIcon } from '../components/icons'
import { toJalali } from '../utils/jalali'
import { toPersianDigits } from '../utils/persianDigits'

export default function AthleteDetail() {
  const { id } = useParams()
  const [athlete, setAthlete] = useState<any>(null)
  const [programs, setPrograms] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [a, p] = await Promise.all([
          api.get(`/athletes/${id}/`),
          api.get('/programs/', { params: { athlete: id } }),
        ])
        setAthlete(a.data)
        const all = p.data.results || p.data
        setPrograms(all.filter((row: any) => String(row.athlete) === String(id)))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  if (loading) return <SkeletonCard rows={3} />
  if (!athlete) return <EmptyState title="ورزشکار پیدا نشد" description="ممکن است حذف شده باشد." action={<Link to="/athletes"><Button variant="outline">بازگشت به ورزشکاران</Button></Link>} />

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-center gap-3">
          <Avatar firstName={athlete.first_name} lastName={athlete.last_name} size="lg" />
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold text-primary-900">{athlete.first_name} {athlete.last_name}</h1>
            <p className="text-sm text-ink-600">کد ورزشکار: {toPersianDigits(athlete.unique_code)}</p>
            {athlete.phone && <p className="text-sm text-ink-600">{toPersianDigits(athlete.phone)}</p>}
          </div>
        </div>
        {athlete.notes && <p className="mt-3 rounded-field bg-surface-2 p-3 text-sm text-ink-700">{athlete.notes}</p>}
      </Card>

      <Link to={`/programs/builder/${id}`}>
        <Button fullWidth size="lg">ساخت برنامه جدید</Button>
      </Link>

      <section className="space-y-2">
        <h2 className="pt-1 text-base font-bold text-primary-900">برنامه‌ها</h2>
        {programs.length === 0 && (
          <EmptyState title="هنوز برنامه‌ای ندارد" description="اولین برنامه این ورزشکار را بسازید." />
        )}
        {programs.map((p) => (
          <Link key={p.id} to={`/programs/${p.id}`} className="block">
            <Card className="flex items-center gap-3 hover:border-primary-300">
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-ink-900">برنامه {toPersianDigits(p.sequence_number)} — {p.title}</p>
                <p className="text-sm text-ink-600">{toJalali(p.start_date)} • {toPersianDigits(p.days_per_week)} روز</p>
              </div>
              <Badge tone={p.status === 'final' ? 'success' : 'accent'}>{p.status === 'final' ? 'نهایی' : 'پیش‌نویس'}</Badge>
              <ChevronLeftIcon className="h-5 w-5 shrink-0 text-ink-400" />
            </Card>
          </Link>
        ))}
      </section>
    </div>
  )
}
