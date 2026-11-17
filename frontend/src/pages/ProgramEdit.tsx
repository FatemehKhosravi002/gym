import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import api from '../utils/api'
import Button from '../components/Button'
import Card from '../components/Card'
import Input from '../components/Input'
import JalaliDatePicker from '../components/JalaliDatePicker'
import ProgramStructureEditor, { type EditorDay, type EditorItem } from '../components/ProgramStructureEditor'
import { apiErrorMessage } from '../utils/apiError'
import { toJalali } from '../utils/jalali'
import { toPersianDigits } from '../utils/persianDigits'

type Notice = { kind: 'ok' | 'error'; text: string } | null

function mapDays(rawDays: any[]): EditorDay[] {
  return (rawDays || []).map((day: any) => ({
    id: day.id,
    day_index: day.day_index,
    label: day.label || '',
    items: (day.items || []).map((item: any) => ({
      id: item.id,
      exercise: item.exercise,
      name: item.exercise_detail?.name || item.exercise_name_snapshot || 'حرکت',
      sets: item.sets,
      reps: item.reps,
      rest_seconds: item.rest_seconds,
      note: item.note || '',
    })),
  }))
}

export default function ProgramEdit() {
  const { id } = useParams()
  const [program, setProgram] = useState<any>(null)
  const [days, setDays] = useState<EditorDay[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [loadError, setLoadError] = useState('')
  const [notice, setNotice] = useState<Notice>(null)
  const [form, setForm] = useState({ title: '', start_date: '', notes: '', status: 'draft' })
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setStatus('loading')
    try {
      const res = await api.get(`/programs/${id}/`)
      setProgram(res.data)
      setDays(mapDays(res.data.days))
      setForm({
        title: res.data.title || '',
        start_date: res.data.start_date || '',
        notes: res.data.notes || '',
        status: res.data.status || 'draft',
      })
      setStatus('ready')
    } catch (e) {
      setLoadError(apiErrorMessage(e, 'برنامه پیدا نشد'))
      setStatus('error')
    }
  }, [id])

  useEffect(() => { load() }, [load])

  const changed = !!program && (
    form.title !== program.title ||
    form.start_date !== program.start_date ||
    form.notes !== (program.notes || '') ||
    form.status !== program.status
  )

  const saveHeader = async () => {
    if (!form.title.trim()) {
      setNotice({ kind: 'error', text: 'عنوان برنامه را وارد کنید' })
      return
    }
    setSaving(true)
    try {
      const res = await api.patch(`/programs/${id}/`, { ...form, title: form.title.trim() })
      setProgram(res.data)
      setDays(mapDays(res.data.days))
      setForm({
        title: res.data.title || '',
        start_date: res.data.start_date || '',
        notes: res.data.notes || '',
        status: res.data.status || 'draft',
      })
      setNotice({ kind: 'ok', text: 'تغییرات ذخیره شد' })
    } catch (e) {
      setNotice({ kind: 'error', text: apiErrorMessage(e, 'ذخیره نشد') })
    } finally {
      setSaving(false)
    }
  }

  const updateDayLabel = async (dayId: number, label: string) => {
    try {
      await api.patch(`/program-days/${dayId}/`, { label })
      setDays(list => list.map(d => (d.id === dayId ? { ...d, label } : d)))
      setNotice({ kind: 'ok', text: 'برچسب روز ذخیره شد' })
    } catch (e) {
      setNotice({ kind: 'error', text: apiErrorMessage(e, 'برچسب ذخیره نشد') })
    }
  }

  const addItem = async (dayId: number, exercise: { id: number; name: string }) => {
    const day = days.find(d => d.id === dayId)
    if (!day) return
    try {
      const res = await api.post('/program-items/', {
        program_day: dayId,
        exercise: exercise.id,
        order: day.items.length,
      })
      const created = res.data
      const item: EditorItem = {
        id: created.id,
        exercise: exercise.id,
        name: exercise.name,
        sets: created.sets,
        reps: created.reps,
        rest_seconds: created.rest_seconds,
        note: created.note || '',
      }
      setDays(list => list.map(d => (d.id === dayId ? { ...d, items: [...d.items, item] } : d)))
      setNotice({ kind: 'ok', text: `«${exercise.name}» اضافه شد` })
    } catch (e) {
      setNotice({ kind: 'error', text: apiErrorMessage(e, 'حرکت اضافه نشد') })
    }
  }

  const updateItem = async (itemId: number, patch: Partial<EditorItem>) => {
    try {
      await api.patch(`/program-items/${itemId}/`, patch)
      setDays(list => list.map(d => ({
        ...d,
        items: d.items.map(it => (it.id === itemId ? { ...it, ...patch } : it)),
      })))
      setNotice({ kind: 'ok', text: 'ذخیره شد' })
    } catch (e) {
      setNotice({ kind: 'error', text: apiErrorMessage(e, 'ذخیره نشد') })
    }
  }

  const deleteItem = async (itemId: number) => {
    try {
      await api.delete(`/program-items/${itemId}/`)
      setDays(list => list.map(d => ({ ...d, items: d.items.filter(it => it.id !== itemId) })))
      setNotice({ kind: 'ok', text: 'حرکت حذف شد' })
    } catch (e) {
      setNotice({ kind: 'error', text: apiErrorMessage(e, 'حذف نشد') })
    }
  }

  const addDay = async () => {
    if (!program) return
    const nextIndex = days.reduce((max, d) => Math.max(max, d.day_index), 0) + 1
    if (nextIndex > 7) {
      setNotice({ kind: 'error', text: 'حداکثر ۷ روز مجاز است' })
      return
    }
    try {
      const res = await api.post('/program-days/', { program: program.id, day_index: nextIndex, label: '' })
      const count = days.length + 1
      await api.patch(`/programs/${program.id}/`, { days_per_week: count })
      setDays(list => [...list, { id: res.data.id, day_index: nextIndex, label: '', items: [] }])
      setProgram((p: any) => ({ ...p, days_per_week: count }))
      setNotice({ kind: 'ok', text: `روز ${toPersianDigits(nextIndex)} اضافه شد` })
    } catch (e) {
      setNotice({ kind: 'error', text: apiErrorMessage(e, 'روز اضافه نشد') })
    }
  }

  const deleteDay = async (dayId: number) => {
    if (!program) return
    const day = days.find(d => d.id === dayId)
    if (!day) return
    if (!window.confirm(`روز ${toPersianDigits(day.day_index)} و همه حرکات آن حذف شود؟`)) return
    try {
      await api.delete(`/program-days/${dayId}/`)
      const count = Math.max(days.length - 1, 0)
      await api.patch(`/programs/${program.id}/`, { days_per_week: count })
      setDays(list => list.filter(d => d.id !== dayId))
      setProgram((p: any) => ({ ...p, days_per_week: count }))
      setNotice({ kind: 'ok', text: 'روز حذف شد' })
    } catch (e) {
      setNotice({ kind: 'error', text: apiErrorMessage(e, 'روز حذف نشد') })
    }
  }

  if (status === 'loading') {
    return <p className="text-ink-600">در حال بارگذاری برنامه...</p>
  }

  if (status === 'error' || !program) {
    return (
      <Card>
        <p className="text-ink-900">{loadError || 'برنامه پیدا نشد'}</p>
        <Link to="/athletes" className="inline-block mt-3">
          <Button variant="secondary">بازگشت به ورزشکاران</Button>
        </Link>
      </Card>
    )
  }

  const athleteName = `${program.athlete_detail?.first_name || ''} ${program.athlete_detail?.last_name || ''}`.trim()

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-xl font-bold text-primary-900">ویرایش برنامه {toPersianDigits(program.sequence_number)}</h2>
          <p className="text-sm text-ink-600">
            {athleteName ? `${athleteName} • ` : ''}شروع: {toJalali(program.start_date)}
          </p>
        </div>
        <Link to={`/programs/${program.id}`} className="min-h-[48px] flex items-center text-sm text-ink-900 hover:text-accent-700">
          مشاهده برنامه
        </Link>
      </div>

      {notice && (
        <Card>
          <p className={notice.kind === 'error' ? 'text-ink-900 font-medium' : 'text-accent-700 font-medium'}>{notice.text}</p>
        </Card>
      )}

      <Card>
        <div className="space-y-3">
          <Input
            label="عنوان برنامه"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <div>
            <JalaliDatePicker
              label="تاریخ شروع"
              value={form.start_date}
              onChange={(val) => setForm({ ...form, start_date: val })}
            />
            <p className="text-sm text-ink-600 mt-1">
              {form.start_date ? toJalali(form.start_date) : 'تاریخی انتخاب نشده'}
            </p>
          </div>
          <div>
            <label className="block text-sm text-ink-600 mb-2" htmlFor="program-status">وضعیت</label>
            <select
              id="program-status"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="w-full bg-surface-2 border border-border rounded-[16px] px-4 py-3 text-ink-900 min-h-[48px] focus:outline-none focus:border-accent-500/50"
            >
              <option value="draft">پیش‌نویس</option>
              <option value="final">نهایی</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-ink-600 mb-2" htmlFor="program-notes">یادداشت کلی (اختیاری)</label>
            <textarea
              id="program-notes"
              className="w-full min-h-[96px] bg-surface-2 border border-border rounded-[16px] px-4 py-3 text-ink-900 placeholder-text-secondary focus:outline-none focus:border-accent-500/50"
              placeholder="مثال: این ماه تمرکز روی فرم صحیح است"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
          <Button onClick={saveHeader} disabled={!changed || saving} className="w-full">
            {saving ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
          </Button>
        </div>
      </Card>

      <h3 className="font-semibold text-primary-900 pt-2">روزها و حرکات</h3>
      <ProgramStructureEditor
        days={days}
        onUpdateDayLabel={updateDayLabel}
        onAddItem={addItem}
        onUpdateItem={updateItem}
        onDeleteItem={deleteItem}
        onAddDay={addDay}
        onDeleteDay={deleteDay}
      />
    </div>
  )
}
