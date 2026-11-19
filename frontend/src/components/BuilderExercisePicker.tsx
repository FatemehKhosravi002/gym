import { useEffect, useState } from 'react'
import api from '../utils/api'
import { apiErrorMessage } from '../utils/apiError'
import Chip from './Chip'
import Input from './Input'
import Button from './Button'
import { PlusIcon, SearchIcon } from './icons'

export interface PickedExercise {
  id: number
  name: string
  category: number | null
  categoryName?: string
}

interface Props {
  onPick: (exercise: PickedExercise) => void
  /** Disables tapping while a history check is running. */
  busy?: boolean
}

interface Category {
  id: number
  name: string
}

/** Body-part chips + search, plus inline creation of a brand-new exercise. */
export default function BuilderExercisePicker({ onPick, busy = false }: Props) {
  const [categories, setCategories] = useState<Category[]>([])
  const [exercises, setExercises] = useState<PickedExercise[]>([])
  const [category, setCategory] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState<number | null>(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newCategory, setNewCategory] = useState<number | ''>('')
  const [newError, setNewError] = useState('')
  const [savingNew, setSavingNew] = useState(false)
  const [similarNames, setSimilarNames] = useState<string[]>([])

  useEffect(() => {
    api
      .get('/library/categories/')
      .then((res) => setCategories((res.data.results || res.data).filter((c: any) => c.is_active !== false)))
      .catch(() => setCategories([]))
  }, [])

  useEffect(() => {
    let cancelled = false
    const timer = setTimeout(async () => {
      setLoading(true)
      setError('')
      try {
        const params: Record<string, string | number> = { page: 1 }
        if (search.trim()) params.search = search.trim()
        if (category) params.category = category
        const res = await api.get('/library/exercises/', { params })
        if (cancelled) return
        const rows = (res.data.results || res.data).map((row: any) => ({
          id: row.id,
          name: row.name,
          category: row.category ?? null,
          categoryName: row.category_name,
        }))
        setExercises(rows)
        setPage(res.data.next ? 2 : null)
      } catch (err) {
        if (cancelled) return
        setError(apiErrorMessage(err, 'دریافت حرکات انجام نشد'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, 250)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [search, category])

  const loadMore = async () => {
    if (!page) return
    setLoading(true)
    try {
      const params: Record<string, string | number> = { page }
      if (search.trim()) params.search = search.trim()
      if (category) params.category = category
      const res = await api.get('/library/exercises/', { params })
      const rows = (res.data.results || res.data).map((row: any) => ({
        id: row.id,
        name: row.name,
        category: row.category ?? null,
        categoryName: row.category_name,
      }))
      setExercises((current) => [...current, ...rows])
      setPage(res.data.next ? page + 1 : null)
    } catch (err) {
      setError(apiErrorMessage(err, 'دریافت حرکات انجام نشد'))
    } finally {
      setLoading(false)
    }
  }

  const createExercise = async (force = false) => {
    const name = newName.trim()
    if (!name) {
      setNewError('نام حرکت را وارد کنید.')
      return
    }
    if (!newCategory) {
      setNewError('دسته‌بندی حرکت را انتخاب کنید.')
      return
    }
    if (!force) {
      try {
        const check = await api.get('/library/exercises/check-duplicate/', { params: { name } })
        const matches: string[] = check.data.exists ? [check.data.name] : check.data.similar || []
        if (matches.length > 0) {
          setSimilarNames(matches)
          setNewError('')
          return
        }
      } catch {
        // a failed warning check must never block creating the exercise
      }
    }
    setSimilarNames([])
    setSavingNew(true)
    setNewError('')
    try {
      const res = await api.post('/library/exercises/', { name, category: newCategory })
      const created: PickedExercise = {
        id: res.data.id,
        name: res.data.name,
        category: res.data.category ?? (newCategory as number),
        categoryName: categories.find((c) => c.id === newCategory)?.name,
      }
      setExercises((current) => [created, ...current])
      setCreating(false)
      setNewName('')
      setNewCategory('')
      // Select right away: the parent opens the sets/reps sheet.
      onPick(created)
    } catch (err) {
      setNewError(apiErrorMessage(err, 'افزودن حرکت جدید انجام نشد'))
    } finally {
      setSavingNew(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2" role="group" aria-label="دسته‌بندی اندام">
        <Chip active={category === null} onClick={() => setCategory(null)}>همه</Chip>
        {categories.map((item) => (
          <Chip key={item.id} active={category === item.id} onClick={() => setCategory(item.id)}>
            {item.name}
          </Chip>
        ))}
      </div>

      <div className="relative">
        <SearchIcon className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-400" />
        <Input
          className="pr-10"
          placeholder="جستجوی حرکت…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          aria-label="جستجوی حرکت"
        />
      </div>

      {error && <p className="text-sm text-error-700">{error}</p>}

      <ul className="max-h-[42vh] space-y-1.5 overflow-y-auto">
        {exercises.map((exercise) => (
          <li key={exercise.id}>
            <button
              type="button"
              disabled={busy}
              onClick={() => onPick(exercise)}
              className="flex min-h-[52px] w-full items-center justify-between gap-2 rounded-field border border-border bg-surface-2 px-3 text-right text-sm font-semibold text-ink-900 transition-colors duration-fast hover:border-primary-300 disabled:opacity-60"
            >
              <span className="truncate">{exercise.name}</span>
              {category === null && exercise.categoryName && (
                <span className="shrink-0 text-xs font-medium text-ink-500">{exercise.categoryName}</span>
              )}
            </button>
          </li>
        ))}
        {!loading && exercises.length === 0 && (
          <li className="py-3 text-center text-sm text-ink-500">حرکتی پیدا نشد؛ می‌توانید همین‌جا اضافه کنید.</li>
        )}
      </ul>

      {page && (
        <Button variant="ghost" size="sm" fullWidth onClick={loadMore} loading={loading}>
          نمایش حرکات بیشتر
        </Button>
      )}

      {creating ? (
        <div className="space-y-2 rounded-field border border-primary-200 bg-primary-50 p-3">
          <p className="text-sm font-bold text-primary-900">افزودن حرکت جدید</p>
          <Input
            label="نام حرکت"
            placeholder="مثال: پرس سینه هالتر"
            value={newName}
            onChange={(event) => { setNewName(event.target.value); setSimilarNames([]) }}
          />
          <div>
            <label htmlFor="new-exercise-category" className="mb-1.5 block text-sm font-semibold text-ink-700">
              دسته‌بندی
            </label>
            <select
              id="new-exercise-category"
              className="field"
              value={newCategory}
              onChange={(event) => setNewCategory(event.target.value ? Number(event.target.value) : '')}
            >
              <option value="">انتخاب کنید…</option>
              {categories.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          </div>
          {similarNames.length > 0 && (
            <div className="rounded-field border border-warning-200 bg-warning-50 p-2 text-sm text-warning-700">
              <p className="font-bold">نام مشابه پیدا شد:</p>
              <ul className="mt-1 list-inside list-disc">
                {similarNames.map((name) => <li key={name}>{name}</li>)}
              </ul>
              <Button size="sm" className="mt-2" onClick={() => createExercise(true)} loading={savingNew}>
                با این وجود ثبت کن
              </Button>
            </div>
          )}
          {newError && <p className="text-sm text-error-700">{newError}</p>}
          <div className="flex gap-2">
            <Button size="sm" onClick={() => createExercise()} loading={savingNew}>افزودن و انتخاب</Button>
            <Button size="sm" variant="ghost" onClick={() => { setCreating(false); setNewError(''); setSimilarNames([]) }}>انصراف</Button>
          </div>
        </div>
      ) : (
        <Button variant="tertiary" size="sm" fullWidth icon={<PlusIcon className="h-4 w-4" />} onClick={() => setCreating(true)}>
          افزودن حرکت جدید
        </Button>
      )}
    </div>
  )
}
