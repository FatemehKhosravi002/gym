import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import api from '../utils/api'
import Button from '../components/Button'
import Card from '../components/Card'
import Input from '../components/Input'
import Modal from '../components/Modal'
import { useToast } from '../components/Toast'
import ProgramStructureEditor, { type EditorDay, type EditorItem } from '../components/ProgramStructureEditor'
import { apiErrorMessage } from '../utils/apiError'
import { AlertIcon } from '../components/icons'
import { toJalali } from '../utils/jalali'
import { toPersianDigits } from '../utils/persianDigits'

type Notice = { kind: 'ok' | 'error'; text: string } | null

function mapTemplateDays(rawDays: any[]): EditorDay[] {
  return (rawDays || []).map((day: any) => ({
    id: day.id,
    day_index: day.day_index,
    label: day.label || '',
    items: (day.items || []).map((item: any) => ({
      id: item.id,
      exercise: item.exercise,
      name: item.exercise_name || 'حرکت',
      sets: item.sets,
      reps: item.reps,
      rest_seconds: item.rest_seconds,
      note: item.note || '',
    })),
  }))
}

function daysSummary(template: any): string {
  const days = template.days || []
  const items = days.reduce((sum: number, d: any) => sum + (d.items?.length || 0), 0)
  return `${toPersianDigits(days.length)} روز • ${toPersianDigits(items)} حرکت`
}

function TemplateList() {
  const navigate = useNavigate()
  const toast = useToast()
  const [templates, setTemplates] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState<Notice>(null)
  const [applyingTo, setApplyingTo] = useState<any>(null)
  const [menuFor, setMenuFor] = useState<any>(null)
  const [renaming, setRenaming] = useState<{ template: any; name: string } | null>(null)
  const [renameError, setRenameError] = useState('')
  const [deleting, setDeleting] = useState<any>(null)
  const [working, setWorking] = useState<'rename' | 'duplicate' | 'delete' | null>(null)

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.get('/program-templates/')
      setTemplates(res.data.results || res.data)
    } catch (e) {
      setError(apiErrorMessage(e, 'خطا در دریافت قالب‌ها'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => { load() }, 0)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const removeTemplate = async () => {
    if (!deleting) return
    const removed = deleting
    setWorking('delete')
    try {
      await api.delete(`/program-templates/${removed.id}/`)
      setDeleting(null)
      setTemplates(list => list.filter(t => t.id !== removed.id))
      toast.show({
        message: `قالب «${removed.name}» حذف شد`,
        actionLabel: 'واگرد',
        onAction: async () => {
          try {
            await api.post(`/program-templates/${removed.id}/restore/`)
            load()
          } catch {
            toast.error('بازگردانی قالب انجام نشد')
          }
        },
      })
    } catch (e) {
      setNotice({ kind: 'error', text: apiErrorMessage(e, 'قالب حذف نشد') })
    } finally {
      setWorking(null)
    }
  }

  const duplicateTemplate = async (template: any) => {
    setMenuFor(null)
    setWorking('duplicate')
    try {
      const res = await api.post(`/program-templates/${template.id}/duplicate/`)
      setTemplates(list => [res.data, ...list])
      toast.success(`«${res.data.name}» ساخته شد`)
    } catch (e) {
      setNotice({ kind: 'error', text: apiErrorMessage(e, 'کپی قالب انجام نشد') })
    } finally {
      setWorking(null)
    }
  }

  const renameTemplate = async () => {
    if (!renaming) return
    const name = renaming.name.trim()
    if (!name) {
      setRenameError('نام قالب الزامی است')
      return
    }
    setWorking('rename')
    setRenameError('')
    try {
      const res = await api.patch(`/program-templates/${renaming.template.id}/`, { name })
      setTemplates(list => list.map(t => (t.id === res.data.id ? { ...t, ...res.data } : t)))
      toast.success('نام قالب تغییر کرد')
      setRenaming(null)
    } catch (e) {
      setRenameError(apiErrorMessage(e, 'تغییر نام انجام نشد'))
    } finally {
      setWorking(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-bold text-primary-900">قالب‌های برنامه</h2>
          <p className="text-sm text-ink-600">یک برنامه را به‌عنوان قالب ذخیره کنید و برای ورزشکاران دیگر استفاده کنید.</p>
        </div>
        <Link to="/templates/new">
          <Button>قالب جدید</Button>
        </Link>
      </div>

      {notice && (
        <Card>
          <p className={notice.kind === 'error' ? 'text-ink-900 font-medium' : 'text-accent-700 font-medium'}>{notice.text}</p>
        </Card>
      )}

      {loading && <p className="text-ink-600">در حال بارگذاری...</p>}
      {!loading && error && <Card><p className="text-ink-900">{error}</p></Card>}
      {!loading && !error && templates.length === 0 && (
        <Card>
          <p className="text-ink-900 font-medium">هنوز قالبی نساخته‌اید.</p>
          <p className="text-sm text-ink-600 mt-1">با «قالب جدید» اولین قالب را بسازید.</p>
        </Card>
      )}

      <div className="space-y-2">
        {templates.map(template => (
          <Card key={template.id}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-bold text-ink-900">{template.name}</p>
                <p className="mt-1 text-sm text-ink-600">
                  {typeof template.days_count === 'number'
                    ? `${toPersianDigits(template.days_count)} روز • ${toPersianDigits(template.items_count || 0)} حرکت`
                    : daysSummary(template)}
                </p>
                <p className="text-xs text-ink-500">ساخته‌شده در {toJalali(template.created_at)}</p>
              </div>
              <button
                type="button"
                onClick={() => setMenuFor(template)}
                aria-label={`کارهای بیشتر برای ${template.name}`}
                aria-haspopup="menu"
                className="h-11 w-11 shrink-0 rounded-full text-lg font-bold text-ink-600 hover:bg-surface-2 hover:text-ink-900"
              >
                ⋯
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" onClick={() => setApplyingTo(template)}>استفاده برای ورزشکار</Button>
              <Link to={`/templates/${template.id}/edit`}>
                <Button variant="outline" size="sm">ویرایش</Button>
              </Link>
            </div>
          </Card>
        ))}
      </div>

      <Modal open={menuFor !== null} onClose={() => setMenuFor(null)} title={menuFor?.name} variant="sheet">
        {menuFor && (
          <div className="space-y-1">
            <Button
              variant="ghost"
              fullWidth
              loading={working === 'duplicate'}
              onClick={() => duplicateTemplate(menuFor)}
            >
              کپی قالب
            </Button>
            <Button
              variant="ghost"
              fullWidth
              onClick={() => {
                setRenameError('')
                setRenaming({ template: menuFor, name: menuFor.name })
                setMenuFor(null)
              }}
            >
              تغییر نام
            </Button>
            <Button
              variant="ghost"
              fullWidth
              onClick={() => { setDeleting(menuFor); setMenuFor(null) }}
            >
              حذف قالب
            </Button>
          </div>
        )}
      </Modal>

      <Modal
        open={renaming !== null}
        onClose={() => setRenaming(null)}
        title="تغییر نام قالب"
        variant="sheet"
        footer={
          <div className="flex gap-2">
            <Button variant="outline" fullWidth onClick={() => setRenaming(null)}>انصراف</Button>
            <Button fullWidth loading={working === 'rename'} onClick={renameTemplate}>ذخیره</Button>
          </div>
        }
      >
        <Input
          label="نام قالب"
          value={renaming?.name || ''}
          error={renameError}
          onChange={(event) => setRenaming(current => current ? { ...current, name: event.target.value } : current)}
          autoFocus
        />
      </Modal>

      <Modal
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title="حذف قالب؟"
        description="قالب حذف می‌شود ولی با «واگرد» در پیام پایین صفحه قابل بازگردانی است. برنامه‌های ساخته‌شده از آن دست نمی‌خورند."
        variant="dialog"
        footer={
          <div className="flex gap-2">
            <Button variant="outline" fullWidth onClick={() => setDeleting(null)}>انصراف</Button>
            <Button variant="danger" fullWidth loading={working === 'delete'} onClick={removeTemplate}>حذف</Button>
          </div>
        }
      />

      {applyingTo && (
        <ApplyTemplateModal
          template={applyingTo}
          onClose={() => setApplyingTo(null)}
          onApplied={(programId) => navigate(`/programs/${programId}/edit`)}
        />
      )}
    </div>
  )
}


function ApplyTemplateModal({ template, onClose, onApplied }: { template: any; onClose: () => void; onApplied: (programId: number) => void }) {
  const [query, setQuery] = useState('')
  const [athletes, setAthletes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [applying, setApplying] = useState(false)

  useEffect(() => {
    const timer = setTimeout(async () => {
      setLoading(true)
      setError('')
      try {
        const res = query.trim()
          ? await api.get('/athletes/search_combined/', { params: { q: query.trim() } })
          : await api.get('/athletes/')
        setAthletes(res.data.results || res.data)
      } catch (e) {
        setError(apiErrorMessage(e, 'خطا در دریافت ورزشکاران'))
      } finally {
        setLoading(false)
      }
    }, 250)
    return () => clearTimeout(timer)
  }, [query])

  const applyTo = async (athlete: any) => {
    setApplying(true)
    setError('')
    try {
      const res = await api.post(`/program-templates/${template.id}/apply-to-athlete/`, { athlete_id: athlete.id })
      onApplied(res.data.program_id)
    } catch (e) {
      setError(apiErrorMessage(e, 'قالب اعمال نشد'))
      setApplying(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-ink-900/40 flex items-end sm:items-center justify-center z-50">
      <Card className="w-full sm:max-w-md m-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-semibold text-primary-900">انتخاب ورزشکار</h3>
          <button type="button" onClick={onClose} className="text-sm text-ink-600 hover:text-ink-900 min-h-[48px] px-2">
            بستن
          </button>
        </div>
        <p className="text-sm text-ink-600 mb-3">
          از قالب «{template.name}» یک برنامه جدید ساخته می‌شود.
        </p>
        <Input placeholder="جستجوی نام یا کد ورزشکار..." value={query} onChange={(e) => setQuery(e.target.value)} />
        {loading && <p className="text-sm text-ink-600 mt-3">در حال بارگذاری...</p>}
        {!loading && error && <p className="text-sm text-ink-900 mt-3">{error}</p>}
        {!loading && !error && athletes.length === 0 && (
          <p className="text-sm text-ink-600 mt-3">ورزشکاری پیدا نشد.</p>
        )}
        <div className="space-y-2 mt-3">
          {athletes.map((athlete: any) => (
            <button
              key={athlete.id}
              type="button"
              disabled={applying}
              onClick={() => applyTo(athlete)}
              className="w-full text-right p-3 bg-surface-2 rounded-xl hover:bg-surface-3 min-h-[48px] text-ink-900 border border-border disabled:opacity-50"
            >
              <span className="font-medium">{athlete.first_name} {athlete.last_name}</span>
              <span className="text-sm text-ink-600"> • کد {toPersianDigits(athlete.unique_code)}</span>
              {athlete.has_note && (
                <span className="mt-1 flex items-center gap-1 text-xs font-semibold text-warning-700">
                  <AlertIcon className="h-3.5 w-3.5" />
                  یادداشت محدودیت
                  {(athlete.note_tags || []).length > 0 ? `: ${(athlete.note_tags || []).join('، ')}` : ''}
                </span>
              )}
            </button>
          ))}
        </div>
      </Card>
    </div>
  )
}

function TemplateEditor({ id }: { id: string }) {
  const navigate = useNavigate()
  const [template, setTemplate] = useState<any>(null)
  const [days, setDays] = useState<EditorDay[]>([])
  const [form, setForm] = useState({ name: '', description: '' })
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [loadError, setLoadError] = useState('')
  const [notice, setNotice] = useState<Notice>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get(`/program-templates/${id}/`)
        setTemplate(res.data)
        setDays(mapTemplateDays(res.data.days))
        setForm({ name: res.data.name || '', description: res.data.description || '' })
        setStatus('ready')
      } catch (e) {
        setLoadError(apiErrorMessage(e, 'قالب پیدا نشد'))
        setStatus('error')
      }
    }
    load()
  }, [id])

  const changed = !!template && (form.name !== template.name || form.description !== (template.description || ''))

  const saveHeader = async () => {
    if (!form.name.trim()) {
      setNotice({ kind: 'error', text: 'نام قالب را وارد کنید' })
      return
    }
    setSaving(true)
    try {
      const res = await api.patch(`/program-templates/${id}/`, { name: form.name.trim(), description: form.description })
      setTemplate((t: any) => ({ ...t, name: res.data.name, description: res.data.description }))
      setForm({ name: res.data.name, description: res.data.description || '' })
      setNotice({ kind: 'ok', text: 'تغییرات ذخیره شد' })
    } catch (e) {
      setNotice({ kind: 'error', text: apiErrorMessage(e, 'ذخیره نشد') })
    } finally {
      setSaving(false)
    }
  }

  const updateDayLabel = async (dayId: number, label: string) => {
    try {
      await api.patch(`/program-template-days/${dayId}/`, { label })
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
      const res = await api.post('/program-template-items/', { template_day: dayId, exercise: exercise.id, order: day.items.length })
      const created = res.data
      const item: EditorItem = {
        id: created.id,
        exercise: exercise.id,
        name: created.exercise_name || exercise.name,
        sets: created.sets,
        reps: created.reps,
        rest_seconds: created.rest_seconds,
        note: created.note || '',
      }
      setDays(list => list.map(d => (d.id === dayId ? { ...d, items: [...d.items, item] } : d)))
      setNotice({ kind: 'ok', text: `«${item.name}» اضافه شد` })
    } catch (e) {
      setNotice({ kind: 'error', text: apiErrorMessage(e, 'حرکت اضافه نشد') })
    }
  }

  const updateItem = async (itemId: number, patch: Partial<EditorItem>) => {
    try {
      await api.patch(`/program-template-items/${itemId}/`, patch)
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
      await api.delete(`/program-template-items/${itemId}/`)
      setDays(list => list.map(d => ({ ...d, items: d.items.filter(it => it.id !== itemId) })))
      setNotice({ kind: 'ok', text: 'حرکت حذف شد' })
    } catch (e) {
      setNotice({ kind: 'error', text: apiErrorMessage(e, 'حذف نشد') })
    }
  }

  const addDay = async () => {
    if (!template) return
    const nextIndex = days.reduce((max, d) => Math.max(max, d.day_index), 0) + 1
    if (nextIndex > 7) {
      setNotice({ kind: 'error', text: 'حداکثر ۷ روز مجاز است' })
      return
    }
    try {
      const res = await api.post('/program-template-days/', { template: template.id, day_index: nextIndex, label: '' })
      const count = days.length + 1
      await api.patch(`/program-templates/${template.id}/`, { days_per_week: count })
      setDays(list => [...list, { id: res.data.id, day_index: nextIndex, label: '', items: [] }])
      setTemplate((t: any) => ({ ...t, days_per_week: count }))
      setNotice({ kind: 'ok', text: `روز ${toPersianDigits(nextIndex)} اضافه شد` })
    } catch (e) {
      setNotice({ kind: 'error', text: apiErrorMessage(e, 'روز اضافه نشد') })
    }
  }

  const deleteDay = async (dayId: number) => {
    if (!template) return
    const day = days.find(d => d.id === dayId)
    if (!day) return
    if (!window.confirm(`روز ${toPersianDigits(day.day_index)} و همه حرکات آن حذف شود؟`)) return
    try {
      await api.delete(`/program-template-days/${dayId}/`)
      const count = Math.max(days.length - 1, 0)
      await api.patch(`/program-templates/${template.id}/`, { days_per_week: count })
      setDays(list => list.filter(d => d.id !== dayId))
      setTemplate((t: any) => ({ ...t, days_per_week: count }))
      setNotice({ kind: 'ok', text: 'روز حذف شد' })
    } catch (e) {
      setNotice({ kind: 'error', text: apiErrorMessage(e, 'روز حذف نشد') })
    }
  }

  if (status === 'loading') {
    return <p className="text-ink-600">در حال بارگذاری قالب...</p>
  }

  if (status === 'error' || !template) {
    return (
      <Card>
        <p className="text-ink-900">{loadError || 'قالب پیدا نشد'}</p>
        <Button variant="secondary" className="mt-3" onClick={() => navigate('/templates')}>بازگشت به قالب‌ها</Button>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-xl font-bold text-primary-900">ویرایش قالب</h2>
          <p className="text-sm text-ink-600">{toPersianDigits(days.length)} روز</p>
        </div>
        <Link to="/templates" className="min-h-[48px] flex items-center text-sm text-ink-900 hover:text-accent-700">
          بازگشت به قالب‌ها
        </Link>
      </div>

      {notice && (
        <Card>
          <p className={notice.kind === 'error' ? 'text-ink-900 font-medium' : 'text-accent-700 font-medium'}>{notice.text}</p>
        </Card>
      )}

      <Card>
        <div className="space-y-3">
          <Input label="نام قالب" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <div>
            <label className="block text-sm text-ink-600 mb-2" htmlFor="template-description">توضیح (اختیاری)</label>
            <textarea
              id="template-description"
              className="w-full min-h-[96px] bg-surface-2 border border-border rounded-[16px] px-4 py-3 text-ink-900 placeholder-text-secondary focus:outline-none focus:border-accent-500/50"
              placeholder="مثال: برنامه حجم، سطح متوسط"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
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

function TemplateCreate() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', description: '' })
  const [daysPerWeek, setDaysPerWeek] = useState(3)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) {
      setError('نام قالب را وارد کنید')
      return
    }
    setSaving(true)
    setError('')
    try {
      const res = await api.post('/program-templates/', {
        name: form.name.trim(),
        description: form.description,
        days_per_week: daysPerWeek,
      })
      const templateId = res.data.id
      for (let i = 1; i <= daysPerWeek; i++) {
        await api.post('/program-template-days/', { template: templateId, day_index: i, label: '' })
      }
      navigate(`/templates/${templateId}/edit`)
    } catch (err) {
      setError(apiErrorMessage(err, 'قالب ساخته نشد'))
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h2 className="text-xl font-bold text-primary-900">قالب جدید</h2>
        <Link to="/templates" className="min-h-[48px] flex items-center text-sm text-ink-900 hover:text-accent-700">
          بازگشت به قالب‌ها
        </Link>
      </div>

      {error && <Card><p className="text-ink-900 font-medium">{error}</p></Card>}

      <Card>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <p className="mb-2 text-sm font-semibold text-ink-700">شروع سریع (کمتر از یک دقیقه)</p>
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'مبتدی ۳ روزه', name: 'قالب مبتدی ۳ روزه', days: 3 },
                { label: 'حجم ۴ روزه', name: 'قالب حجم ۴ روزه', days: 4 },
                { label: 'کات ۵ روزه', name: 'قالب کات ۵ روزه', days: 5 },
              ].map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    setForm({ ...form, name: preset.name })
                    setDaysPerWeek(preset.days)
                  }}
                  className="min-h-[44px] rounded-pill border border-border-strong bg-surface px-3 text-sm font-semibold text-ink-700 hover:border-primary-600"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
          <Input label="نام قالب" placeholder="مثال: برنامه حجم ۳ روزه" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <div>
            <p className="text-sm text-ink-600 mb-2">تعداد روز در هفته</p>
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4, 5, 6, 7].map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setDaysPerWeek(n)}
                  className={`min-h-[48px] rounded-xl font-semibold border-2 ${daysPerWeek === n ? 'bg-accent-500 text-ink-900 border-accent-500' : 'bg-surface-2 text-ink-900 border-border'}`}
                >
                  {toPersianDigits(n)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm text-ink-600 mb-2" htmlFor="new-template-description">توضیح (اختیاری)</label>
            <textarea
              id="new-template-description"
              className="w-full min-h-[96px] bg-surface-2 border border-border rounded-[16px] px-4 py-3 text-ink-900 placeholder-text-secondary focus:outline-none focus:border-accent-500/50"
              placeholder="مثال: برنامه حجم، سطح متوسط"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <Button type="submit" disabled={saving} className="w-full">
            {saving ? 'در حال ساخت...' : 'ساخت قالب و افزودن حرکات'}
          </Button>
        </form>
      </Card>
    </div>
  )
}

export default function Templates() {
  const { id } = useParams()
  const { pathname } = useLocation()
  if (pathname === '/templates/new') return <TemplateCreate />
  if (id) return <TemplateEditor id={id} />
  return <TemplateList />
}
