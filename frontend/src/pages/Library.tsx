import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import api from '../utils/api'
import { apiErrorMessage, getFieldErrors } from '../utils/apiError'
import Button from '../components/Button'
import Card from '../components/Card'
import Input from '../components/Input'
import Modal from '../components/Modal'
import { useToast } from '../components/Toast'
import { toPersianDigits } from '../utils/persianDigits'
import { moveIndex } from '../utils/programDraft'

interface Category {
  id: number
  name: string
  order: number
  is_active: boolean
  exercise_count: number
}

interface Exercise {
  id: number
  name: string
  category: number
  category_name: string
  category_is_active: boolean
  description: string
  video_url: string
  gif_file: string | null
  is_active: boolean
  usage_count: number
}

type CategorySheet = { mode: 'create' } | null

type ExerciseSheet =
  | { mode: 'create'; categoryId?: number }
  | { mode: 'edit'; exercise: Exercise }
  | null

interface ExerciseForm {
  name: string
  category: string
  description: string
  video_url: string
  gif: File | null
  clear_gif: boolean
}

const emptyForm = (categoryId?: number): ExerciseForm => ({
  name: '',
  category: categoryId ? String(categoryId) : '',
  description: '',
  video_url: '',
  gif: null,
  clear_gif: false,
})

function CategoryCard({
  category,
  active,
  onSelect,
  onMenu,
  onRename,
}: {
  category: Category
  active: boolean
  onSelect: () => void
  onMenu: () => void
  /** Inline rename; resolves to an error message (or null on success). */
  onRename: (name: string) => Promise<string | null>
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: category.id })
  const [editing, setEditing] = useState(false)
  const [draftName, setDraftName] = useState(category.name)
  const [error, setError] = useState('')

  const commit = async () => {
    const message = await onRename(draftName)
    if (message) {
      setError(message)
      return
    }
    setError('')
    setEditing(false)
  }

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`card-surface flex items-center gap-2 p-3 ${isDragging ? 'shadow-lifted' : ''} ${
        active ? 'border-primary-600 ring-1 ring-primary-600' : ''
      }`}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label={`جابه‌جایی دسته ${category.name}`}
        className="flex h-11 w-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-field text-ink-400 hover:bg-surface-2 active:cursor-grabbing"
      >
        <span aria-hidden="true" className="text-lg leading-none">⠿</span>
      </button>
      {editing ? (
        <div className="min-w-0 flex-1">
          <Input
            aria-label={`نام جدید برای ${category.name}`}
            value={draftName}
            onChange={(event) => { setDraftName(event.target.value); setError('') }}
            error={error}
            maxLength={50}
            autoFocus
          />
          <div className="mt-1 flex gap-1">
            <Button size="sm" onClick={commit}>ذخیره</Button>
            <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setDraftName(category.name); setError('') }}>
              انصراف
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={onSelect}
          onDoubleClick={() => setEditing(true)}
          className="min-h-[44px] min-w-0 flex-1 text-right"
        >
          <p className={`truncate text-sm font-bold ${category.is_active ? 'text-ink-900' : 'text-ink-500'}`}>
            {category.name}
            {!category.is_active && <span className="mr-2 text-xs font-semibold">(غیرفعال)</span>}
          </p>
          <p className="mt-0.5 text-xs text-ink-600">{toPersianDigits(category.exercise_count)} حرکت</p>
        </button>
      )}
      {!editing && (
        <button
          type="button"
          onClick={() => setEditing(true)}
          aria-label={`تغییر نام ${category.name}`}
          className="h-11 w-9 shrink-0 rounded-full text-ink-500 hover:bg-surface-2 hover:text-ink-900"
        >
          ✎
        </button>
      )}
      <button
        type="button"
        onClick={onMenu}
        aria-label={`کارهای بیشتر برای ${category.name}`}
        aria-haspopup="menu"
        className="h-11 w-11 shrink-0 rounded-full text-lg font-bold text-ink-600 hover:bg-surface-2 hover:text-ink-900"
      >
        ⋯
      </button>
    </li>
  )
}

export default function Library() {
  const toast = useToast()
  const [categories, setCategories] = useState<Category[]>([])
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [showDisabled, setShowDisabled] = useState(false)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [loadError, setLoadError] = useState('')

  const [categorySheet, setCategorySheet] = useState<CategorySheet>(null)
  const [categoryName, setCategoryName] = useState('')
  const [categoryError, setCategoryError] = useState('')
  const [savingCategory, setSavingCategory] = useState(false)
  const [menuCategory, setMenuCategory] = useState<Category | null>(null)
  const [deleteCategory, setDeleteCategory] = useState<Category | null>(null)
  const [deleteBlocked, setDeleteBlocked] = useState<{ count: number } | null>(null)
  const [moveTarget, setMoveTarget] = useState('')
  const [working, setWorking] = useState(false)

  const [exerciseSheet, setExerciseSheet] = useState<ExerciseSheet>(null)
  const [form, setForm] = useState<ExerciseForm>(emptyForm())
  const [formError, setFormError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [similar, setSimilar] = useState<string[]>([])
  const [savingExercise, setSavingExercise] = useState(false)
  const [deleteExercise, setDeleteExercise] = useState<Exercise | null>(null)
  const [exerciseBlocked, setExerciseBlocked] = useState<{ count: number; templates?: boolean } | null>(null)

  const load = useCallback(async () => {
    setLoadError('')
    try {
      const [catRes, exRes] = await Promise.all([
        api.get('/library/categories/', { params: { include_inactive: 1 } }),
        api.get('/library/exercises/', {
          params: {
            include_inactive: showDisabled ? 1 : 0,
            ...(search.trim() ? { search: search.trim() } : {}),
          },
        }),
      ])
      setCategories(catRes.data.results || catRes.data)
      setExercises(exRes.data.results || exRes.data)
      setStatus('ready')
    } catch (err) {
      setLoadError(apiErrorMessage(err, 'دریافت کتابخانه انجام نشد'))
      setStatus('error')
    }
  }, [showDisabled, search])

  useEffect(() => {
    const timer = setTimeout(() => {
      setStatus('loading')
      load()
    }, 250)
    return () => clearTimeout(timer)
  }, [load])

  const activeCategories = useMemo(() => categories.filter((c) => c.is_active), [categories])
  const visibleExercises = useMemo(
    () => exercises.filter((ex) => (selectedCategory === null ? true : ex.category === selectedCategory)),
    [exercises, selectedCategory],
  )

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )


  const openCreateCategory = () => {
    setCategoryName('')
    setCategoryError('')
    setCategorySheet({ mode: 'create' })
  }

  const renameCategoryInline = async (category: Category, name: string): Promise<string | null> => {
    const trimmed = name.trim()
    if (!trimmed) return 'نام دسته‌بندی الزامی است'
    if (trimmed.length > 50) return 'نام دسته‌بندی نباید بیشتر از ۵۰ کاراکتر باشد'
    if (trimmed === category.name) return null
    try {
      await api.patch(`/library/categories/${category.id}/`, { name: trimmed })
      await load()
      toast.show({
        message: 'نام دسته‌بندی تغییر کرد',
        actionLabel: 'واگرد',
        onAction: async () => {
          await api.patch(`/library/categories/${category.id}/`, { name: category.name }).catch(() => undefined)
          load()
        },
      })
      return null
    } catch (err) {
      return apiErrorMessage(err, 'تغییر نام انجام نشد')
    }
  }

  const saveCategory = async () => {
    const name = categoryName.trim()
    if (!name) {
      setCategoryError('نام دسته‌بندی الزامی است')
      return
    }
    if (name.length > 50) {
      setCategoryError('نام دسته‌بندی نباید بیشتر از ۵۰ کاراکتر باشد')
      return
    }
    setSavingCategory(true)
    setCategoryError('')
    try {
      const res = await api.post('/library/categories/', { name })
      setCategorySheet(null)
      await load()
      const created = res.data as Category
      toast.show({
        message: 'دسته‌بندی اضافه شد',
        actionLabel: 'واگرد',
        onAction: async () => {
          await api.delete(`/library/categories/${created.id}/`).catch(() => undefined)
          load()
        },
      })
    } catch (err) {
      setCategoryError(apiErrorMessage(err, 'ذخیره دسته‌بندی انجام نشد'))
    } finally {
      setSavingCategory(false)
    }
  }

  const toggleCategory = async (category: Category) => {
    setMenuCategory(null)
    const activating = !category.is_active
    try {
      await api.post(`/library/categories/${category.id}/${activating ? 'activate' : 'deactivate'}/`)
      await load()
      toast.show({
        message: activating ? `دسته «${category.name}» فعال شد` : `دسته «${category.name}» غیرفعال شد`,
        actionLabel: 'واگرد',
        onAction: async () => {
          await api.post(`/library/categories/${category.id}/${activating ? 'deactivate' : 'activate'}/`).catch(() => undefined)
          load()
        },
      })
    } catch (err) {
      toast.error(apiErrorMessage(err, 'تغییر وضعیت دسته انجام نشد'))
    }
  }

  const requestDeleteCategory = (category: Category) => {
    setMenuCategory(null)
    setDeleteBlocked(null)
    setMoveTarget('')
    setDeleteCategory(category)
  }

  const confirmDeleteCategory = async () => {
    if (!deleteCategory) return
    setWorking(true)
    try {
      await api.delete(`/library/categories/${deleteCategory.id}/`)
      const removed = deleteCategory
      setDeleteCategory(null)
      setSelectedCategory((current) => (current === removed.id ? null : current))
      await load()
      toast.show({
        message: `دسته «${removed.name}» حذف شد`,
        actionLabel: 'واگرد',
        onAction: async () => {
          await api.post('/library/categories/', { name: removed.name }).catch(() => undefined)
          load()
        },
      })
    } catch (err: any) {
      if (err?.response?.status === 409) {
        setDeleteBlocked({ count: Number(err.response.data.exercise_count || 0) })
      } else {
        toast.error(apiErrorMessage(err, 'حذف دسته انجام نشد'))
      }
    } finally {
      setWorking(false)
    }
  }

  const moveExercisesAndDelete = async () => {
    if (!deleteCategory || !moveTarget) return
    setWorking(true)
    try {
      await api.post(`/library/categories/${deleteCategory.id}/delete_and_move/`, { move_to: Number(moveTarget) })
      setDeleteCategory(null)
      setDeleteBlocked(null)
      setSelectedCategory(null)
      await load()
      toast.success('حرکات منتقل و دسته‌بندی حذف شد')
    } catch (err) {
      toast.error(apiErrorMessage(err, 'انتقال حرکات انجام نشد'))
    } finally {
      setWorking(false)
    }
  }

  const disableCategoryInstead = async () => {
    if (!deleteCategory) return
    await toggleCategory(deleteCategory)
    setDeleteCategory(null)
    setDeleteBlocked(null)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    if (selectedCategory !== null) return
    const from = categories.findIndex((c) => c.id === event.active.id)
    const to = categories.findIndex((c) => c.id === event.over?.id)
    if (from < 0 || to < 0 || from === to) return
    const next = moveIndex(categories, from, to)
    setCategories(next)
    try {
      await api.post('/library/categories/reorder-all/', { order: next.map((c) => c.id) })
    } catch (err) {
      toast.error(apiErrorMessage(err, 'ذخیره ترتیب دسته‌ها انجام نشد'))
      load()
    }
  }


  const openCreateExercise = () => {
    setForm(emptyForm(selectedCategory ?? undefined))
    setFormError('')
    setFieldErrors({})
    setSimilar([])
    setExerciseSheet({ mode: 'create', categoryId: selectedCategory ?? undefined })
  }

  const openEditExercise = (exercise: Exercise) => {
    setForm({
      name: exercise.name,
      category: String(exercise.category),
      description: exercise.description || '',
      video_url: exercise.video_url || '',
      gif: null,
      clear_gif: false,
    })
    setFormError('')
    setFieldErrors({})
    setSimilar([])
    setExerciseSheet({ mode: 'edit', exercise })
  }

  const checkSimilar = async (name: string) => {
    if (!name.trim()) {
      setSimilar([])
      return
    }
    try {
      const res = await api.get('/library/exercises/check-duplicate/', { params: { name: name.trim() } })
      if (res.data.exists) setSimilar([res.data.name])
      else setSimilar(res.data.similar || [])
    } catch {
      setSimilar([])
    }
  }

  const saveExercise = async () => {
    if (!form.category) {
      setFormError('دسته‌بندی حرکت را انتخاب کنید')
      return
    }
    setSavingExercise(true)
    setFormError('')
    setFieldErrors({})
    try {
      const payload = new FormData()
      payload.append('name', form.name.trim())
      payload.append('category', form.category)
      payload.append('description', form.description)
      payload.append('video_url', form.video_url.trim())
      if (form.gif) payload.append('gif_file', form.gif)
      if (form.clear_gif) payload.append('gif_file', '')

      if (exerciseSheet?.mode === 'edit') {
        await api.patch(`/library/exercises/${exerciseSheet.exercise.id}/`, payload, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      } else {
        await api.post('/library/exercises/', payload, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      }
      setExerciseSheet(null)
      await load()
      toast.success(exerciseSheet?.mode === 'edit' ? 'حرکت ویرایش شد' : 'حرکت اضافه شد')
    } catch (err) {
      setFieldErrors(getFieldErrors(err))
      setFormError(apiErrorMessage(err, 'ذخیره حرکت انجام نشد'))
    } finally {
      setSavingExercise(false)
    }
  }

  const toggleExercise = async (exercise: Exercise) => {
    const activating = !exercise.is_active
    try {
      await api.post(`/library/exercises/${exercise.id}/${activating ? 'activate' : 'deactivate'}/`)
      await load()
      toast.show({
        message: activating ? `«${exercise.name}» فعال شد` : `«${exercise.name}» غیرفعال شد`,
        actionLabel: 'واگرد',
        onAction: async () => {
          await api.post(`/library/exercises/${exercise.id}/${activating ? 'deactivate' : 'activate'}/`).catch(() => undefined)
          load()
        },
      })
    } catch (err) {
      toast.error(apiErrorMessage(err, 'تغییر وضعیت حرکت انجام نشد'))
    }
  }

  const moveExercise = async (exercise: Exercise, categoryId: number) => {
    if (categoryId === exercise.category) return
    try {
      await api.post(`/library/exercises/${exercise.id}/move/`, { category: categoryId })
      await load()
      toast.show({
        message: `«${exercise.name}» منتقل شد`,
        actionLabel: 'واگرد',
        onAction: async () => {
          await api.post(`/library/exercises/${exercise.id}/move/`, { category: exercise.category }).catch(() => undefined)
          load()
        },
      })
    } catch (err) {
      toast.error(apiErrorMessage(err, 'انتقال حرکت انجام نشد'))
    }
  }

  const confirmDeleteExercise = async () => {
    if (!deleteExercise) return
    setWorking(true)
    try {
      await api.delete(`/library/exercises/${deleteExercise.id}/`)
      const removed = deleteExercise
      setDeleteExercise(null)
      await load()
      toast.show({
        message: `«${removed.name}» حذف شد`,
        actionLabel: 'واگرد',
        onAction: async () => {
          await api.post('/library/exercises/', {
            name: removed.name,
            category: removed.category,
            description: removed.description,
            video_url: removed.video_url,
          }).catch(() => undefined)
          load()
        },
      })
    } catch (err: any) {
      if (err?.response?.status === 409) {
        setExerciseBlocked({
          count: Number(err.response.data.usage_count || 0),
          templates: Boolean(err.response.data.used_in_templates),
        })
      } else {
        toast.error(apiErrorMessage(err, 'حذف حرکت انجام نشد'))
      }
    } finally {
      setWorking(false)
    }
  }

  const disableExerciseInstead = async () => {
    if (!deleteExercise) return
    await toggleExercise(deleteExercise)
    setDeleteExercise(null)
    setExerciseBlocked(null)
  }


  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-primary-900 sm:text-2xl">کتابخانه حرکات</h1>
          <p className="text-sm text-ink-600">دسته‌ها و حرکات مشترک بین همه مربی‌ها؛ غیرفعال‌کردن چیزی را از برنامه‌های قبلی حذف نمی‌کند.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={openCreateCategory}>دسته جدید</Button>
          <Button size="sm" onClick={openCreateExercise}>حرکت جدید</Button>
        </div>
      </div>

      {status === 'error' && (
        <Card>
          <p className="text-sm text-error-700">{loadError}</p>
          <div className="pt-3"><Button size="sm" variant="outline" onClick={load}>تلاش دوباره</Button></div>
        </Card>
      )}

      <section aria-labelledby="library-categories">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 id="library-categories" className="text-base font-bold text-primary-900">دسته‌بندی‌ها</h2>
          <span className="text-xs text-ink-500">
            {selectedCategory === null ? 'برای جابه‌جایی، دستگیره ⠿ را بکشید' : 'نمایش حرکات یک دسته'}
          </span>
        </div>
        <div className="mb-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSelectedCategory(null)}
            aria-pressed={selectedCategory === null}
            className={`min-h-[44px] rounded-pill border px-4 text-sm font-semibold ${
              selectedCategory === null ? 'border-primary-700 bg-primary-700 text-white' : 'border-border-strong bg-surface text-ink-700'
            }`}
          >
            همه حرکات
          </button>
        </div>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={categories.map((c) => c.id)} strategy={verticalListSortingStrategy}>
            <ul className="grid gap-2 sm:grid-cols-2">
              {categories.map((category) => (
                <CategoryCard
                  key={category.id}
                  category={category}
                  active={selectedCategory === category.id}
                  onSelect={() => setSelectedCategory(category.id)}
                  onMenu={() => setMenuCategory(category)}
                  onRename={(name) => renameCategoryInline(category, name)}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
        {status === 'ready' && categories.length === 0 && (
          <p className="mt-2 rounded-field border border-dashed border-border-strong p-4 text-center text-sm text-ink-500">
            هنوز دسته‌بندی‌ای نساخته‌اید. با «دسته جدید» شروع کنید.
          </p>
        )}
      </section>


      <section aria-labelledby="library-exercises" className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="library-exercises" className="text-base font-bold text-primary-900">
            حرکات {selectedCategory !== null ? `«${categories.find((c) => c.id === selectedCategory)?.name || ''}»` : ''}
          </h2>
          <label className="flex min-h-[44px] items-center gap-2 text-sm font-semibold text-ink-700">
            <input
              type="checkbox"
              className="h-5 w-5 accent-primary-700"
              checked={showDisabled}
              onChange={(event) => setShowDisabled(event.target.checked)}
            />
            نمایش حرکات غیرفعال
          </label>
        </div>

        <Input
          placeholder="جستجوی حرکت…"
          aria-label="جستجوی حرکت"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />

        {status === 'loading' && <p className="py-3 text-center text-sm text-ink-600">در حال بارگذاری…</p>}
        {status === 'ready' && visibleExercises.length === 0 && (
          <p className="rounded-field border border-dashed border-border-strong p-4 text-center text-sm text-ink-500">
            حرکتی پیدا نشد.
          </p>
        )}

        <ul className="divide-y divide-border overflow-hidden rounded-card border border-border bg-surface">
          {visibleExercises.map((exercise) => (
            <li key={exercise.id} className="flex items-start gap-2 p-3">
              {exercise.gif_file && (
                <img
                  src={exercise.gif_file}
                  alt=""
                  className="h-14 w-14 shrink-0 rounded-field border border-border object-cover"
                />
              )}
              <div className="min-w-0 flex-1">
                <p className={`truncate text-sm font-bold ${exercise.is_active ? 'text-ink-900' : 'text-ink-500'}`}>
                  {exercise.name}
                  {!exercise.is_active && <span className="mr-2 text-xs font-semibold">(غیرفعال)</span>}
                </p>
                <p className="mt-0.5 text-xs text-ink-600">
                  {exercise.category_name}
                  {exercise.usage_count > 0
                    ? ` • در ${toPersianDigits(exercise.usage_count)} برنامه`
                    : ' • استفاده‌نشده'}
                </p>
                {exercise.video_url && (
                  <a href={exercise.video_url} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs font-semibold text-primary-700 underline">
                    ویدیو
                  </a>
                )}
              </div>
              <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
                <select
                  aria-label={`انتقال ${exercise.name} به دسته دیگر`}
                  className="field min-h-[40px] w-auto px-2 text-xs"
                  value={exercise.category}
                  onChange={(event) => moveExercise(exercise, Number(event.target.value))}
                >
                  {activeCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
                <Button size="sm" variant="ghost" onClick={() => openEditExercise(exercise)}>ویرایش</Button>
                <Button size="sm" variant="ghost" onClick={() => toggleExercise(exercise)}>
                  {exercise.is_active ? 'غیرفعال' : 'فعال'}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => { setExerciseBlocked(null); setDeleteExercise(exercise) }}
                >
                  حذف
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </section>


      <Modal open={menuCategory !== null} onClose={() => setMenuCategory(null)} title={menuCategory?.name} variant="sheet">
        {menuCategory && (
          <div className="space-y-1">
            <Button variant="ghost" fullWidth onClick={() => toggleCategory(menuCategory)}>
              {menuCategory.is_active ? 'غیرفعال کردن (پنهان از ساخت برنامه)' : 'فعال کردن'}
            </Button>
            <Button variant="ghost" fullWidth onClick={() => requestDeleteCategory(menuCategory)}>حذف دسته‌بندی</Button>
          </div>
        )}
      </Modal>

      <Modal
        open={categorySheet !== null}
        onClose={() => setCategorySheet(null)}
        title="دسته جدید"
        variant="sheet"
        footer={
          <div className="flex gap-2">
            <Button variant="outline" fullWidth onClick={() => setCategorySheet(null)}>انصراف</Button>
            <Button fullWidth onClick={saveCategory} loading={savingCategory}>ذخیره</Button>
          </div>
        }
      >
        <Input
          label="نام دسته‌بندی"
          value={categoryName}
          onChange={(event) => setCategoryName(event.target.value)}
          error={categoryError}
          maxLength={50}
          autoFocus
        />
      </Modal>

      <Modal
        open={deleteCategory !== null}
        onClose={() => { setDeleteCategory(null); setDeleteBlocked(null) }}
        title={deleteBlocked ? `این دسته ${toPersianDigits(deleteBlocked.count)} حرکت دارد` : 'حذف دسته‌بندی'}
        description={
          deleteBlocked
            ? 'حذف دسته‌ای که حرکت دارد ممکن نیست. حرکاتش را به دسته دیگری منتقل کنید یا دسته را غیرفعال کنید.'
            : 'این دسته خالی است و حذف می‌شود. برنامه‌های قبلی دست نمی‌خورند.'
        }
        variant="sheet"
      >
        {deleteBlocked ? (
          <div className="space-y-3">
            <div>
              <label htmlFor="move-target" className="mb-1.5 block text-sm font-semibold text-ink-700">
                انتقال حرکات به
              </label>
              <select
                id="move-target"
                className="field"
                value={moveTarget}
                onChange={(event) => setMoveTarget(event.target.value)}
              >
                <option value="">انتخاب دسته…</option>
                {categories.filter((c) => c.id !== deleteCategory?.id).map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <Button fullWidth onClick={moveExercisesAndDelete} loading={working} disabled={!moveTarget}>
              انتقال حرکات و حذف دسته
            </Button>
            <Button variant="outline" fullWidth onClick={disableCategoryInstead}>
              به‌جای حذف، غیرفعال کن
            </Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" fullWidth onClick={() => setDeleteCategory(null)}>انصراف</Button>
            <Button variant="danger" fullWidth onClick={confirmDeleteCategory} loading={working}>
              حذف
            </Button>
          </div>
        )}
      </Modal>


      <Modal
        open={exerciseSheet !== null}
        onClose={() => setExerciseSheet(null)}
        title={exerciseSheet?.mode === 'edit' ? 'ویرایش حرکت' : 'حرکت جدید'}
        variant="sheet"
        footer={
          <div className="flex gap-2">
            <Button variant="outline" fullWidth onClick={() => setExerciseSheet(null)}>انصراف</Button>
            <Button fullWidth onClick={saveExercise} loading={savingExercise}>ذخیره</Button>
          </div>
        }
      >
        <div className="space-y-3">
          <Input
            label="نام حرکت"
            value={form.name}
            error={fieldErrors.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            onBlur={(event) => checkSimilar(event.target.value)}
            autoFocus
          />
          {similar.length > 0 && (
            <div className="rounded-field border border-warning-200 bg-warning-50 p-3 text-sm text-warning-700">
              <p className="font-bold">نام مشابه پیدا شد:</p>
              <ul className="mt-1 list-inside list-disc">
                {similar.map((name) => <li key={name}>{name}</li>)}
              </ul>
              <p className="mt-1 text-xs">اگر حرکت جدیدی است، همان‌طور ذخیره کنید.</p>
            </div>
          )}
          <div>
            <label htmlFor="exercise-category" className="mb-1.5 block text-sm font-semibold text-ink-700">
              دسته‌بندی
            </label>
            <select
              id="exercise-category"
              className="field"
              value={form.category}
              onChange={(event) => setForm({ ...form, category: event.target.value })}
            >
              <option value="">انتخاب کنید…</option>
              {activeCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
            {fieldErrors.category && <p className="mt-1.5 text-sm text-error-700">{fieldErrors.category}</p>}
          </div>
          <Input
            label="لینک ویدیو (اختیاری)"
            dir="ltr"
            placeholder="https://…"
            value={form.video_url}
            error={fieldErrors.video_url}
            onChange={(event) => setForm({ ...form, video_url: event.target.value })}
          />
          <div>
            <label htmlFor="exercise-gif" className="mb-1.5 block text-sm font-semibold text-ink-700">
              فایل GIF یا تصویر حرکت (اختیاری)
            </label>
            <input
              id="exercise-gif"
              type="file"
              accept="image/*"
              className="field"
              onChange={(event) => setForm({ ...form, gif: event.target.files?.[0] || null, clear_gif: false })}
            />
            {exerciseSheet?.mode === 'edit' && exerciseSheet.exercise.gif_file && !form.gif && (
              <label className="mt-1.5 flex items-center gap-2 text-xs text-ink-600">
                <input
                  type="checkbox"
                  checked={form.clear_gif}
                  onChange={(event) => setForm({ ...form, clear_gif: event.target.checked })}
                />
                حذف GIF فعلی
              </label>
            )}
          </div>
          <div>
            <label htmlFor="exercise-description" className="mb-1.5 block text-sm font-semibold text-ink-700">
              توضیحات (اختیاری)
            </label>
            <textarea
              id="exercise-description"
              className="field min-h-[88px]"
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
            />
          </div>
          {formError && <p className="text-sm text-error-700">{formError}</p>}
        </div>
      </Modal>

      <Modal
        open={deleteExercise !== null}
        onClose={() => { setDeleteExercise(null); setExerciseBlocked(null) }}
        title={exerciseBlocked ? 'این حرکت در برنامه‌ها استفاده شده است' : 'حذف حرکت'}
        description={
          exerciseBlocked
            ? exerciseBlocked.templates
              ? `«${deleteExercise?.name}» در یک قالب برنامه استفاده شده و حذف کامل ممکن نیست؛ با غیرفعال‌کردن، در قالب‌ها می‌ماند ولی در ساخت برنامه جدید نمایش داده نمی‌شود.`
              : `«${deleteExercise?.name}» در ${toPersianDigits(exerciseBlocked.count)} برنامه به کار رفته و حذف کامل ممکن نیست؛ اگر غیرفعالش کنید، در برنامه‌های قبلی می‌ماند ولی در ساخت برنامه‌های جدید نمایش داده نمی‌شود.`
            : 'این حرکت در هیچ برنامه‌ای استفاده نشده و حذف می‌شود.'
        }
        variant="sheet"
      >
        <div className="space-y-2">
          {exerciseBlocked ? (
            <>
              <Button fullWidth onClick={disableExerciseInstead}>غیرفعال کردن حرکت</Button>
              <Button variant="outline" fullWidth onClick={() => { setDeleteExercise(null); setExerciseBlocked(null) }}>
                نگه‌داشتن حرکت
              </Button>
            </>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" fullWidth onClick={() => setDeleteExercise(null)}>انصراف</Button>
              <Button variant="danger" fullWidth onClick={confirmDeleteExercise} loading={working}>حذف</Button>
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
}

