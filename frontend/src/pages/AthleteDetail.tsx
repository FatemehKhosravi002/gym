import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../utils/api'
import Card from '../components/Card'
import Button from '../components/Button'
import { toJalali, toJalaliMonth } from '../utils/jalali'
import { toPersianDigits } from '../utils/persianDigits'

export default function AthleteDetail() {
  const { id } = useParams()
  const [athlete, setAthlete] = useState<any>(null)
  const [programs, setPrograms] = useState<any[]>([])

  useEffect(() => {
    api.get(`/athletes/${id}/`).then(res => setAthlete(res.data))
    api.get('/programs/').then(res => {
      const all = res.data.results || res.data
      const filtered = all.filter((p: any) => p.athlete === parseInt(id!) || p.athlete_detail?.id === parseInt(id!))
      setPrograms(filtered)
    })
  }, [id])

  if (!athlete) return <p className="text-white">در حال بارگذاری...</p>

  const latest = programs.slice(0, 2)
  const older = programs.slice(2)

  return (
    <div className="space-y-4">
      <Card>
        <h2 className="text-xl font-bold text-white">{athlete.first_name} {athlete.last_name}</h2>
        <p className="text-[#d1d5db]">کد: {toPersianDigits(athlete.unique_code)}</p>
        {athlete.phone && <p className="text-[#d1d5db]">تلفن: {athlete.phone}</p>}
      </Card>

      <Link to={`/programs/builder/${id}`}>
        <Button className="w-full">ایجاد برنامه جدید برای این ماه</Button>
      </Link>

      <div className="space-y-2">
        <h3 className="font-semibold text-white">آخرین برنامه‌ها</h3>
        {latest.map(p => (
          <Link key={p.id} to={`/programs/${p.id}`}>
            <Card className="hover:border-[#B6F500]/50 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-white">برنامه {toPersianDigits(p.sequence_number)} - {p.title}</p>
                  <p className="text-sm text-[#d1d5db]">{toJalali(p.start_date)} | {toJalaliMonth(p.start_date)}</p>
                </div>
                <span className="text-[#B6F500]">←</span>
              </div>
            </Card>
          </Link>
        ))}
        {latest.length === 0 && <p className="text-[#9CA3AF]">هنوز برنامه‌ای ثبت نشده است</p>}
      </div>

      {older.length > 0 && (
        <details className="space-y-2">
          <summary className="font-semibold text-white cursor-pointer min-h-[44px] flex items-center">تاریخچه برنامه‌ها</summary>
          <div className="space-y-2 mt-2">
            {older.map(p => (
              <Link key={p.id} to={`/programs/${p.id}`}>
                <Card className="hover:border-[#B6F500]/50 transition-colors">
                  <p className="font-medium text-white">برنامه {toPersianDigits(p.sequence_number)} - {p.title}</p>
                  <p className="text-sm text-[#d1d5db]">{toJalali(p.start_date)} | {toJalaliMonth(p.start_date)}</p>
                </Card>
              </Link>
            ))}
          </div>
        </details>
      )}
    </div>
  )
}
