import { useEffect, useState } from 'react'
import api from '../utils/api'
import Button from './Button'
import Card from './Card'
import Input from './Input'
import { apiErrorMessage } from '../utils/apiError'
import { toPersianDigits } from '../utils/persianDigits'

export interface EditorItem {
  id: number
  exercise: number
  name: string
  sets: string
  reps: string
  rest_seconds: number | null
  note: string
}

export interface EditorDay {
  id: number
  day_index: number
  label: string
  items: EditorItem[]
}

interface Exercise {
  id: number
  name: string
  category: number | null
}

interface ExercisePickerProps {
  onPick: (exercise: Exercise) => void
  onClose: () => void
}

function ExercisePicker({ onPick, onClose }: ExercisePickerProps) {
  const [categories, setCategories] = useState<any[]>([])
  const [results, setResults] = useState<Exercise[]>([])
  const [nextPage, setNextPage] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    api.get('/library/categories/')
      .then(res => setCategories((res.data.results || res.data).filter((c: any) => c.is_active !== false)))
      .catch(() => setCategories([]))
  }, [])

  const loadExercises = async (page: number, append: boolean) => {
    setLoading(true)
    setLoadError('')
    try {
      const params: Record<string, string | number> = { page }
      if (search.trim()) params.search = search.trim()
      if (category) params.category = category
      const res = await api.get('/library/exercises/', { params })
      const rows: Exercise[] = res.data.results || res.data
      setResults(append ? [...results, ...rows] : rows)
      setNextPage(res.data.next ? page + 1 : null)
    } catch (e) {
      setLoadError(apiErrorMessage(e, 'خطا در دریافت حرکات'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => { loadExercises(1, false) }, 250)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, category])

  return (
    <div className="mt-3 p-3 bg-surface-2 rounded-xl border border-border">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-ink-900">افزودن حرکت</p>
        <button type="button" onClick={onClose} className="text-sm text-ink-600 hover:text-ink-900 min-h-[48px] px-2">
          بستن
        </button>
      </div>
      <div className="flex flex-wrap gap-2 mb-2">
        <button
          type="button"
          onClick={() => setCategory(null)}
          className={`px-3 py-2 rounded-xl min-h-[48px] text-sm ${category === null ? 'bg-accent-500 text-ink-900' : 'bg-surface text-ink-900 border border-border'}`}
        >
          همه
        </button>
        {categories.map((cat: any) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setCategory(cat.id)}
            className={`px-3 py-2 rounded-xl min-h-[48px] text-sm ${category === cat.id ? 'bg-accent-500 text-ink-900' : 'bg-surface text-ink-900 border border-border'}`}
          >
            {cat.name}
          </button>
        ))}
      </div>
      <Input placeholder="جستجوی حرکت..." value={search} onChange={(e) => setSearch(e.target.value)} />
      <div className="mt-2 space-y-2 max-h-56 overflow-y-auto">
        {loading && <p className="text-sm text-ink-600">در حال بارگذاری...</p>}
        {!loading && loadError && <p className="text-sm text-ink-900">{loadError}</p>}
        {!loading && !loadError && results.length === 0 && (
          <p className="text-sm text-ink-600">حرکتی پیدا نشد.</p>
        )}
        {results.map((ex) => (
          <button
            key={ex.id}
            type="button"
            onClick={() => onPick(ex)}
            className="w-full text-right p-3 bg-surface rounded-xl hover:bg-surface-3 min-h-[48px] text-ink-900 border border-border"
          >
            {ex.name}
          </button>
        ))}
        {nextPage !== null && !loading && (
          <Button type="button" variant="secondary" className="w-full" onClick={() => loadExercises(nextPage, true)}>
            نمایش حرکات بیشتر
          </Button>
        )}
      </div>
    </div>
  )
}


interface ItemRowProps {
  item: EditorItem
  index: number
  onUpdate: (itemId: number, patch: Partial<EditorItem>) => Promise<void>
  onDelete: (itemId: number) => Promise<void>
}

function ItemRow({ item, index, onUpdate, onDelete }: ItemRowProps) {
  const [sets, setSets] = useState(item.sets)
  const [reps, setReps] = useState(item.reps)
  const [rest, setRest] = useState(item.rest_seconds === null ? '' : String(item.rest_seconds))
  const [note, setNote] = useState(item.note)
  const [removing, setRemoving] = useState(false)

  useEffect(() => {
    setSets(item.sets)
    setReps(item.reps)
    setRest(item.rest_seconds === null ? '' : String(item.rest_seconds))
    setNote(item.note)
  }, [item.id, item.sets, item.reps, item.rest_seconds, item.note])

  const commit = (patch: Partial<EditorItem>) => { onUpdate(item.id, patch) }

  return (
    <div className="p-3 bg-surface-2 rounded-xl border border-border">
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="font-medium text-ink-900">
          {toPersianDigits(index + 1)}. {item.name}
        </p>
        <button
          type="button"
          disabled={removing}
          onClick={() => { setRemoving(true); onDelete(item.id).finally(() => setRemoving(false)) }}
          className="text-sm text-ink-600 hover:text-ink-900 min-h-[48px] px-2 disabled:opacity-50"
        >
          {removing ? 'در حال حذف...' : 'حذف'}
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Input
          label="ست"
          inputMode="numeric"
          value={sets}
          onChange={(e) => setSets(e.target.value)}
          onBlur={() => { if (sets !== item.sets) commit({ sets: sets.trim() || '3' }) }}
        />
        <Input
          label="تکرار"
          inputMode="numeric"
          value={reps}
          onChange={(e) => setReps(e.target.value)}
          onBlur={() => { if (reps !== item.reps) commit({ reps: reps.trim() || '10' }) }}
        />
        <Input
          label="استراحت (ثانیه)"
          inputMode="numeric"
          value={rest}
          onChange={(e) => setRest(e.target.value.replace(/\D/g, ''))}
          onBlur={() => {
            const next = rest === '' ? null : Number(rest)
            if (next !== item.rest_seconds) commit({ rest_seconds: next })
          }}
        />
      </div>
      <div className="mt-2">
        <Input
          label="یادداشت (اختیاری)"
          placeholder="مثال: آرام و کنترل‌شده"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onBlur={() => { if (note !== item.note) commit({ note }) }}
        />
      </div>
    </div>
  )
}

function DayLabelInput({ day, onSave }: { day: EditorDay; onSave: (dayId: number, label: string) => Promise<void> }) {
  const [label, setLabel] = useState(day.label)

  useEffect(() => { setLabel(day.label) }, [day.id, day.label])

  return (
    <Input
      label={`برچسب روز ${toPersianDigits(day.day_index)} (اختیاری)`}
      placeholder="مثال: سینه + پشت بازو"
      value={label}
      onChange={(e) => setLabel(e.target.value)}
      onBlur={() => { if (label !== day.label) onSave(day.id, label.trim()) }}
    />
  )
}

interface ProgramStructureEditorProps {
  days: EditorDay[]
  onUpdateDayLabel: (dayId: number, label: string) => Promise<void>
  onAddItem: (dayId: number, exercise: Exercise) => Promise<void>
  onUpdateItem: (itemId: number, patch: Partial<EditorItem>) => Promise<void>
  onDeleteItem: (itemId: number) => Promise<void>
  onAddDay?: () => Promise<void>
  onDeleteDay?: (dayId: number) => Promise<void>
}

export default function ProgramStructureEditor({
  days,
  onUpdateDayLabel,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
  onAddDay,
  onDeleteDay,
}: ProgramStructureEditorProps) {
  const [pickerDayId, setPickerDayId] = useState<number | null>(null)
  const [addingDay, setAddingDay] = useState(false)

  return (
    <div className="space-y-4">
      {days.length === 0 && (
        <Card>
          <p className="text-ink-600">هنوز روزی برای این برنامه ثبت نشده است.</p>
        </Card>
      )}

      {days.map((day) => (
        <Card key={day.id}>
          <div className="flex items-start justify-between gap-2 mb-3">
            <h3 className="font-bold text-primary-900">روز {toPersianDigits(day.day_index)}</h3>
            {onDeleteDay && (
              <button
                type="button"
                onClick={() => onDeleteDay(day.id)}
                className="text-sm text-ink-600 hover:text-ink-900 min-h-[48px] px-2"
              >
                حذف روز
              </button>
            )}
          </div>

          <DayLabelInput day={day} onSave={onUpdateDayLabel} />

          <div className="space-y-2 mt-3">
            {day.items.length === 0 && <p className="text-sm text-ink-600">حرکتی برای این روز ثبت نشده است.</p>}
            {day.items.map((item, idx) => (
              <ItemRow key={item.id} item={item} index={idx} onUpdate={onUpdateItem} onDelete={onDeleteItem} />
            ))}
          </div>

          {pickerDayId === day.id ? (
            <ExercisePicker
              onClose={() => setPickerDayId(null)}
              onPick={(exercise) => {
                onAddItem(day.id, exercise)
                setPickerDayId(null)
              }}
            />
          ) : (
            <Button type="button" variant="secondary" className="w-full mt-3" onClick={() => setPickerDayId(day.id)}>
              افزودن حرکت
            </Button>
          )}
        </Card>
      ))}

      {onAddDay && (
        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={addingDay}
          onClick={() => { setAddingDay(true); onAddDay().finally(() => setAddingDay(false)) }}
        >
          {addingDay ? 'در حال افزودن...' : 'افزودن روز جدید'}
        </Button>
      )}
    </div>
  )
}
