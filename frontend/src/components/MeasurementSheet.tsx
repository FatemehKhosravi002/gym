import { useEffect, useState } from 'react'
import api from '../utils/api'
import { apiErrorMessage, getFieldErrors } from '../utils/apiError'
import Button from './Button'
import Input from './Input'
import Modal from './Modal'
import JalaliDatePicker from './JalaliDatePicker'
import { useToast } from './Toast'
import { toJalali } from '../utils/jalali'
import type { MeasurementPoint } from '../utils/progress'

interface Props {
  open: boolean
  athleteId: number | string
  /** Editing an existing row; omit to create a new one. */
  measurement?: MeasurementPoint | null
  /** Prefill values from the last measurement (2-tap flow). */
  lastWeight?: number | null
  lastHeight?: number | null
  today: string
  onClose: () => void
  onSaved: () => void
}

type Errors = Record<string, string>

export default function MeasurementSheet({
  open, athleteId, measurement, lastWeight, lastHeight, today, onClose, onSaved,
}: Props) {
  const toast = useToast()
  const [date, setDate] = useState(today)
  const [weight, setWeight] = useState('')
  const [height, setHeight] = useState('')
  const [note, setNote] = useState('')
  const [errors, setErrors] = useState<Errors>({})
  const [saving, setSaving] = useState(false)
  const [removing, setRemoving] = useState(false)

  useEffect(() => {
    if (!open) return
    setErrors({})
    setDate(measurement?.date || today)
    setWeight(measurement ? String(measurement.weight_kg) : lastWeight ? String(lastWeight) : '')
    setHeight(
      measurement?.height_cm ? String(measurement.height_cm) : lastHeight ? String(lastHeight) : '',
    )
    setNote('')
  }, [open, measurement, lastWeight, lastHeight, today])

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    const weightNumber = Number(weight.replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))))
    if (!weightNumber || Number.isNaN(weightNumber)) {
      setErrors({ weight_kg: 'وزن را وارد کنید.' })
      return
    }
    const payload: Record<string, unknown> = { date, weight_kg: weightNumber }
    const heightNumber = Number(height.replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))))
    if (height.trim()) payload.height_cm = heightNumber
    if (note.trim()) payload.note = note.trim()

    setSaving(true)
    setErrors({})
    try {
      if (measurement) {
        await api.patch(`/athletes/${athleteId}/measurements/${measurement.id}/`, payload)
        toast.success('اندازه‌گیری ویرایش شد')
      } else {
        await api.post(`/athletes/${athleteId}/measurements/`, payload)
        toast.success('اندازه‌گیری ثبت شد')
      }
      onSaved()
      onClose()
    } catch (err) {
      const fieldErrors = getFieldErrors(err)
      if (Object.keys(fieldErrors).length) setErrors(fieldErrors)
      else toast.error(apiErrorMessage(err, 'ثبت اندازه‌گیری انجام نشد'))
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!measurement) return
    setRemoving(true)
    try {
      await api.delete(`/athletes/${athleteId}/measurements/${measurement.id}/`)
      toast.success('اندازه‌گیری حذف شد')
      onSaved()
      onClose()
    } catch (err) {
      toast.error(apiErrorMessage(err, 'حذف انجام نشد'))
    } finally {
      setRemoving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={measurement ? 'ویرایش اندازه‌گیری' : 'ثبت وزن و قد جدید'}
      description={measurement ? toJalali(measurement.date) : 'مقادیر قبلی از قبل پر شده‌اند؛ فقط تغییرات را وارد کنید.'}
    >
      <form onSubmit={save} className="space-y-3">
        <JalaliDatePicker label="تاریخ" value={date} onChange={setDate} error={errors.date} />
        <Input
          label="وزن (کیلوگرم)"
          inputMode="decimal"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          error={errors.weight_kg}
          autoFocus
          required
        />
        <Input
          label="قد (سانتی‌متر) — اختیاری"
          inputMode="decimal"
          value={height}
          onChange={(e) => setHeight(e.target.value)}
          error={errors.height_cm}
        />
        <div>
          <label htmlFor="measurement-note" className="mb-1.5 block text-sm font-semibold text-ink-700">
            یادداشت (اختیاری)
          </label>
          <textarea
            id="measurement-note"
            className="field min-h-[72px]"
            placeholder="مثال: بعد از تمرین صبح"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
        <Button type="submit" fullWidth loading={saving}>
          {measurement ? 'ذخیره تغییرات' : 'ثبت اندازه‌گیری'}
        </Button>
        {measurement && (
          <Button type="button" variant="ghost" fullWidth loading={removing} onClick={remove}
            className="text-error-700">
            حذف این اندازه‌گیری
          </Button>
        )}
      </form>
    </Modal>
  )
}
