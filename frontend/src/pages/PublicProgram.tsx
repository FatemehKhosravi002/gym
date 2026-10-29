import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import api from '../utils/api'
import Card from '../components/Card'

export default function PublicProgram() {
  const { token } = useParams()
  const [program, setProgram] = useState<any>(null)

  useEffect(() => {
    api.get(`/programs/public/${token}/`).then(res => setProgram(res.data)).catch(() => setProgram(null))
  }, [token])

  if (!program) return <p className="p-4">برنامه یافت نشد</p>

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto space-y-4">
        <Card>
          <h1 className="text-xl font-bold text-gray-900">{program.athlete_detail?.first_name} {program.athlete_detail?.last_name}</h1>
          <p className="text-sm text-gray-500">کد: {program.athlete_detail?.unique_code} | برنامه {program.sequence_number}</p>
        </Card>
        {program.days?.map((day: any) => (
          <Card key={day.id}>
            <h2 className="font-semibold mb-3 text-gray-900">روز {day.day_index} {day.label && `- ${day.label}`}</h2>
            <div className="space-y-3">
              {day.items?.map((item: any, idx: number) => (
                <div key={item.id} className="border-b border-gray-100 pb-2 last:border-0">
                  <p className="font-medium text-gray-900">{idx + 1}. {item.exercise_detail?.name || item.exercise_name_snapshot}</p>
                  <p className="text-sm text-gray-600">{item.sets} × {item.reps}</p>
                  {item.exercise_detail?.video_url && (
                    <a href={item.exercise_detail.video_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary-600">مشاهده ویدیو</a>
                  )}
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
