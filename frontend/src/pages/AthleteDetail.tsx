import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../utils/api'
import Card from '../components/Card'
import Button from '../components/Button'

export default function AthleteDetail() {
  const { id } = useParams()
  const [athlete, setAthlete] = useState<any>(null)
  const [programs, setPrograms] = useState<any[]>([])

  useEffect(() => {
    api.get(`/athletes/${id}/`).then(res => setAthlete(res.data))
    api.get('/programs/').then(res => {
      const all = res.data.results || res.data
      setPrograms(all.filter((p: any) => p.athlete === parseInt(id!) || p.athlete_detail?.id === parseInt(id!)))
    })
  }, [id])

  if (!athlete) return <p>در حال بارگذاری...</p>

  const latest = programs.slice(0, 2)
  const older = programs.slice(2)

  return (
    <div className="space-y-4">
      <Card>
        <h2 className="text-xl font-bold text-gray-900">{athlete.first_name} {athlete.last_name}</h2>
        <p className="text-sm text-gray-500">کد: {athlete.unique_code}</p>
        {athlete.phone && <p className="text-sm text-gray-500">تلفن: {athlete.phone}</p>}
      </Card>

      <Link to={`/programs/builder/${id}`}>
        <Button className="w-full">ایجاد برنامه جدید برای این ماه</Button>
      </Link>

      <div className="space-y-2">
        <h3 className="font-semibold text-gray-900">آخرین برنامه‌ها</h3>
        {latest.map(p => (
          <Card key={p.id}>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">برنامه {p.sequence_number} - {p.title}</p>
                <p className="text-sm text-gray-500">{p.start_date}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {older.length > 0 && (
        <details className="space-y-2">
          <summary className="font-semibold text-gray-900 cursor-pointer min-h-[44px] flex items-center">تاریخچه برنامه‌ها</summary>
          <div className="space-y-2 mt-2">
            {older.map(p => (
              <Card key={p.id}>
                <p className="font-medium text-gray-900">برنامه {p.sequence_number} - {p.title}</p>
                <p className="text-sm text-gray-500">{p.start_date}</p>
              </Card>
            ))}
          </div>
        </details>
      )}
    </div>
  )
}
