import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import api from '../utils/api'
import { apiErrorMessage } from '../utils/apiError'
import Button from '../components/Button'
import Card from '../components/Card'
import Badge from '../components/Badge'
import { SkeletonCard } from '../components/Skeleton'
import { useToast } from '../components/Toast'
import { toJalali } from '../utils/jalali'
import { toPersianDigits } from '../utils/persianDigits'

export default function ProgramDetail() {
  const { id } = useParams()
  const [program, setProgram] = useState<any>(null)
  const [downloading, setDownloading] = useState(false)
  const toast = useToast()

  useEffect(() => {
    api.get(`/programs/${id}/`).then((res) => setProgram(res.data)).catch(() => setProgram(null))
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
      window.URL.revokeObjectURL(url)
    } catch (err) {
      toast.error(apiErrorMessage(err, 'دانلود PDF انجام نشد'))
    } finally {
      setDownloading(false)
    }
  }

  const copyShareLink = async () => {
    const url = `${window.location.origin}/public/program/${program.share_token}`
    try {
      await navigator.clipboard.writeText(url)
      toast.success('لینک اشتراک کپی شد')
    } catch {
      toast.error('کپی لینک انجام نشد')
    }
  }

  if (!program) return <SkeletonCard rows={4} />

  const totalExercises = (program.days || []).reduce((sum: number, d: any) => sum + (d.items?.length || 0), 0)

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-start justify-between gap-2">
          <div>
            <h1 className="text-xl font-bold text-primary-900">برنامه {toPersianDigits(program.sequence_number)}</h1>
            <p className="mt-1 text-sm text-ink-600">{program.title}</p>
          </div>
          <Badge tone={program.status === 'final' ? 'success' : 'accent'}>
            {program.status === 'final' ? 'نهایی' : 'پیش‌نویس'}
          </Badge>
        </div>
        <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-field bg-surface-2 p-2">
            <dt className="text-xs text-ink-500">شروع</dt>
            <dd className="text-sm font-semibold text-ink-900">{toJalali(program.start_date)}</dd>
          </div>
          <div className="rounded-field bg-surface-2 p-2">
            <dt className="text-xs text-ink-500">روز در هفته</dt>
            <dd className="text-sm font-semibold text-ink-900">{toPersianDigits(program.days_per_week)}</dd>
          </div>
          <div className="rounded-field bg-surface-2 p-2">
            <dt className="text-xs text-ink-500">حرکات</dt>
            <dd className="text-sm font-semibold text-ink-900">{toPersianDigits(totalExercises)}</dd>
          </div>
        </dl>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button onClick={downloadPDF} loading={downloading}>{downloading ? 'در حال دانلود...' : 'دانلود PDF'}</Button>
        <Link to={`/programs/${program.id}/edit`}>
          <Button variant="outline">ویرایش برنامه</Button>
        </Link>
        <Button variant="tertiary" onClick={copyShareLink}>کپی لینک اشتراک</Button>
      </div>

      {program.notes && <Card><p className="text-sm text-ink-700">{program.notes}</p></Card>}

      {(program.days || []).map((day: any) => (
        <Card key={day.id}>
          <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-primary-900">
            روز {toPersianDigits(day.day_index)}
            {day.label && <span className="text-sm font-medium text-ink-600">— {day.label}</span>}
          </h2>
          <ul className="space-y-2">
            {(day.items || []).map((item: any, idx: number) => (
              <li key={item.id} className="rounded-field border border-border bg-surface-2 p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-ink-900">
                    {toPersianDigits(idx + 1)}. {item.exercise_detail?.name || item.exercise_name_snapshot}
                  </p>
                  <span className="shrink-0 rounded-pill bg-primary-100 px-2 py-0.5 text-xs font-bold text-primary-900">
                    {toPersianDigits(item.sets)} × {toPersianDigits(item.reps)}
                  </span>
                </div>
                {item.rest_seconds ? <p className="mt-1 text-xs text-ink-500">استراحت: {toPersianDigits(item.rest_seconds)} ثانیه</p> : null}
                {item.note && <p className="mt-1 text-sm text-ink-600">{item.note}</p>}
              </li>
            ))}
            {(day.items || []).length === 0 && <li className="text-sm text-ink-500">حرکتی برای این روز ثبت نشده است.</li>}
          </ul>
        </Card>
      ))}
    </div>
  )
}
