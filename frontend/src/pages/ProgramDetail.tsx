import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import api from '../utils/api'
import Button from '../components/Button'
import Card from '../components/Card'
import { toJalali, toJalaliMonth } from '../utils/jalali'
import { toPersianDigits } from '../utils/persianDigits'

export default function ProgramDetail() {
  const { id } = useParams()
  const [program, setProgram] = useState<any>(null)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    api.get(`/programs/${id}/`).then(res => setProgram(res.data))
  }, [id])

  const downloadPDF = async () => {
    setDownloading(true)
    try {
      const res = await api.get(`/programs/${id}/pdf/`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `physique_program_${id}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch {
      alert('خطا در دانلود PDF')
    } finally {
      setDownloading(false)
    }
  }

  if (!program) return <p className="p-4 text-white">در حال بارگذاری...</p>

  return (
    <div className="space-y-4">
      <Card>
        <h2 className="text-xl font-bold text-white mb-2">برنامه {toPersianDigits(program.sequence_number)} - {program.title}</h2>
        <p className="text-[#d1d5db]">تاریخ شروع: {toJalali(program.start_date)} ({toJalaliMonth(program.start_date)})</p>
        <p className="text-[#d1d5db]">تعداد روز: {toPersianDigits(program.days_per_week)}</p>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button onClick={downloadPDF} disabled={downloading}>{downloading ? 'در حال دانلود...' : 'دانلود PDF'}</Button>
        <Link to={`/programs/${program.id}/edit`}>
          <Button variant="secondary">ویرایش برنامه</Button>
        </Link>
        <Button variant="secondary" onClick={() => {
          const url = `${window.location.origin}/public/program/${program.share_token}`
          navigator.clipboard.writeText(url)
          alert('لینک کپی شد')
        }}>کپی لینک اشتراک</Button>
      </div>

      {program.days?.map((day: any) => (
        <Card key={day.id}>
          <h3 className="font-bold text-white mb-3">روز {toPersianDigits(day.day_index)} {day.label && `- ${day.label}`}</h3>
          <div className="space-y-2">
            {day.items?.map((item: any, idx: number) => (
              <div key={item.id} className="p-3 bg-[#1B1F1D] rounded-xl border border-white/10">
                <p className="font-medium text-white">{toPersianDigits(idx + 1)}. {item.exercise_detail?.name || item.exercise_name_snapshot}</p>
                <p className="text-sm text-[#d1d5db]">{toPersianDigits(item.sets)} × {toPersianDigits(item.reps)}</p>
                {item.note && <p className="text-sm text-[#9CA3AF] mt-1">{item.note}</p>}
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  )
}
