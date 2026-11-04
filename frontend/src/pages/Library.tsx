import { useState, useEffect } from 'react'
import api from '../utils/api'
import Card from '../components/Card'
import Button from '../components/Button'
import Input from '../components/Input'

export default function Library() {
  const [categories, setCategories] = useState<any[]>([])
  const [exercises, setExercises] = useState<any[]>([])
  const [selectedCat, setSelectedCat] = useState<number | null>(null)
  const [showNewEx, setShowNewEx] = useState(false)
  const [form, setForm] = useState({ name: '', category: '', video_url: '', description: '' })
  const [newCatName, setNewCatName] = useState('')
  const [editingCat, setEditingCat] = useState<any>(null)
  const [menuCat, setMenuCat] = useState<any>(null)
  const [deleteCat, setDeleteCat] = useState<any>(null)
  const [moveTo, setMoveTo] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [toast, setToast] = useState('')
  const [errors, setErrors] = useState<any>({})
  const [showInactiveCats, setShowInactiveCats] = useState(false)

  useEffect(() => {
    loadData()
  }, [showInactive])

  const loadData = async () => {
    const cats = await api.get('/library/categories/')
    setCategories((cats.data.results || cats.data).filter((c: any) => showInactiveCats || c.is_active !== false))
    const exs = await api.get(`/library/exercises/?${showInactive ? 'include_inactive=1' : ''}`)
    setExercises(exs.data.results || exs.data)
  }

  const addCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post('/library/categories/', { name: newCatName })
      setNewCatName('')
      loadData()
      showToast('دسته‌بندی اضافه شد')
    } catch (err: any) {
      alert(err.response?.data?.name?.[0] || 'خطا')
    }
  }

  const renameCategory = async () => {
    try {
      await api.patch(`/library/categories/${editingCat.id}/`, { name: editingCat.name })
      setEditingCat(null)
      loadData()
      showToast('نام دسته‌بندی تغییر یافت')
    } catch (err: any) {
      alert(err.response?.data?.name?.[0] || 'خطا')
    }
  }

  const deactivateCategory = async (id: number) => {
    try {
      await api.post(`/library/categories/${id}/deactivate/`)
      setMenuCat(null)
      loadData()
      showToast('دسته‌بندی غیرفعال شد')
    } catch (err: any) {
      alert(err.response?.data?.detail || 'خطا')
    }
  }

  const activateCategory = async (id: number) => {
    try {
      await api.post(`/library/categories/${id}/activate/`)
      setMenuCat(null)
      loadData()
      showToast('دسته‌بندی فعال شد')
    } catch (err: any) {
      alert(err.response?.data?.detail || 'خطا')
    }
  }

  const deleteCategory = async () => {
    try {
      await api.delete(`/library/categories/${deleteCat.id}/`)
      setDeleteCat(null)
      loadData()
      showToast('دسته‌بندی حذف شد')
    } catch (err: any) {
      if (err.response?.status === 409) {
        setDeleteCat({ ...deleteCat, hasExercises: true, exercise_count: err.response.data.exercise_count })
      } else {
        alert(err.response?.data?.detail || 'خطا')
      }
    }
  }

  const moveAndDelete = async () => {
    try {
      await api.post(`/library/categories/${deleteCat.id}/delete_and_move/`, { move_to: moveTo })
      setDeleteCat(null)
      setMoveTo('')
      loadData()
      showToast('حرکات منتقل و دسته‌بندی حذف شد')
    } catch (err: any) {
      alert(err.response?.data?.detail || 'خطا')
    }
  }

  const createExercise = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})
    try {
      await api.post('/library/exercises/', form)
      setShowNewEx(false)
      setForm({ name: '', category: '', video_url: '', description: '' })
      loadData()
      showToast('حرکت اضافه شد')
    } catch (err: any) {
      setErrors(err.response?.data || {})
    }
  }

  const archiveExercise = async (id: number) => {
    try {
      await api.delete(`/library/exercises/${id}/`)
      loadData()
      showToast('حرکت غیرفعال شد')
    } catch {
      loadData()
    }
  }

  const restoreExercise = async (id: number) => {
    try {
      await api.post(`/library/exercises/${id}/restore/`)
      loadData()
      showToast('حرکت بازیابی شد')
    } catch (err: any) {
      alert(err.response?.data?.detail || 'خطا')
    }
  }

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2000)
  }

  const filtered = selectedCat ? exercises.filter((e: any) => e.category === selectedCat) : exercises

  useEffect(() => { loadData() }, [showInactiveCats])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">کتابخانه حرکات</h2>
        <Button onClick={() => setShowNewEx(true)}>افزودن حرکت جدید</Button>
      </div>

      <Card>
        <form onSubmit={addCategory} className="flex gap-2">
          <Input placeholder="نام دسته‌بندی جدید" value={newCatName} onChange={(e) => setNewCatName(e.target.value)} className="flex-1" />
          <Button type="submit">افزودن دسته‌بندی</Button>
        </form>
      </Card>

      <div className="flex items-center justify-between">
        <p className="text-sm text-[#e5e7eb]">دسته‌بندی‌ها</p>
        <label className="flex items-center gap-2 text-sm text-[#e5e7eb]">
          <input type="checkbox" checked={showInactiveCats} onChange={(e) => setShowInactiveCats(e.target.checked)} />
          نمایش غیرفعال‌ها
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={() => setSelectedCat(null)} className={`px-4 py-2 rounded-xl min-h-[44px] ${selectedCat === null ? 'bg-primary-600 text-white' : 'bg-white border border-white/10 text-white'}`}>همه</button>
        {categories.map(cat => (
          <div key={cat.id} className="flex items-center gap-1">
            <button onClick={() => setSelectedCat(cat.id)} className={`px-4 py-2 rounded-xl min-h-[44px] ${selectedCat === cat.id ? 'bg-primary-600 text-white' : 'bg-white border border-white/10 text-white'} ${cat.is_active === false ? 'opacity-60' : ''}`}>
              {cat.name} ({cat.exercise_count || 0})
            </button>
            <button onClick={() => setMenuCat(cat)} className="px-2 py-2 text-[#e5e7eb] min-h-[44px]">⋯</button>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-[#e5e7eb]">حرکات</p>
        <label className="flex items-center gap-2 text-sm text-[#e5e7eb]">
          <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
          نمایش غیرفعال‌ها
        </label>
      </div>

      <div className="space-y-2">
        {filtered.map(ex => (
          <Card key={ex.id} className={!ex.is_active ? 'opacity-60' : ''}>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-white">{ex.name}</p>
                <p className="text-sm text-[#d1d5db]">{ex.category_name} | استفاده: {ex.usage_count || 0}</p>
              </div>
              <div className="flex gap-2">
                {ex.is_active ? <Button variant="secondary" size="sm" onClick={() => archiveExercise(ex.id)}>حذف</Button> : <Button size="sm" onClick={() => restoreExercise(ex.id)}>بازیابی</Button>}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {menuCat && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50">
          <Card className="w-full sm:max-w-md m-4">
            <h3 className="font-semibold mb-4 text-white">{menuCat.name}</h3>
            <div className="space-y-2">
              <Button variant="secondary" className="w-full" onClick={() => { setEditingCat(menuCat); setMenuCat(null); }}>تغییر نام</Button>
              {menuCat.is_active !== false ? <Button variant="secondary" className="w-full" onClick={() => deactivateCategory(menuCat.id)}>غیرفعال کردن</Button> : <Button variant="secondary" className="w-full" onClick={() => activateCategory(menuCat.id)}>فعال کردن</Button>}
              <Button variant="secondary" className="w-full text-red-600" onClick={() => { setDeleteCat(menuCat); setMenuCat(null); }}>حذف</Button>
              <Button variant="tertiary" className="w-full" onClick={() => setMenuCat(null)}>انصراف</Button>
            </div>
          </Card>
        </div>
      )}

      {editingCat && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50">
          <Card className="w-full sm:max-w-md m-4">
            <h3 className="font-semibold mb-4 text-white">تغییر نام دسته‌بندی</h3>
            <Input value={editingCat.name} onChange={(e) => setEditingCat({...editingCat, name: e.target.value})} />
            <div className="flex gap-2 mt-4">
              <Button onClick={renameCategory} className="flex-1">ذخیره</Button>
              <Button variant="secondary" onClick={() => setEditingCat(null)} className="flex-1">انصراف</Button>
            </div>
          </Card>
        </div>
      )}

      {deleteCat && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50">
          <Card className="w-full sm:max-w-md m-4">
            {deleteCat.hasExercises ? (
              <>
                <h3 className="font-semibold mb-4 text-white">این دسته {deleteCat.exercise_count} حرکت دارد</h3>
                <p className="text-sm text-[#e5e7eb] mb-3">حرکات را به دسته دیگری منتقل کنید و سپس دسته حذف می‌شود</p>
                <select value={moveTo} onChange={(e) => setMoveTo(e.target.value)} className="w-full px-3 py-2 border border-white/10 rounded-xl mb-4 min-h-[44px] text-white bg-[#141716]">
                  <option value="">انتخاب دسته‌بندی مقصد</option>
                  {categories.filter(c => c.id !== deleteCat.id).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <div className="flex gap-2">
                  <Button onClick={moveAndDelete} disabled={!moveTo} className="flex-1">انتقال حرکات و حذف دسته</Button>
                  <Button variant="secondary" onClick={() => { setDeleteCat(null); setMoveTo(''); }} className="flex-1">انصراف</Button>
                </div>
              </>
            ) : (
              <>
                <h3 className="font-semibold mb-4 text-white">حذف دسته‌بندی</h3>
                <p className="text-[#e5e7eb] mb-4">آیا از حذف این دسته‌بندی اطمینان دارید؟</p>
                <div className="flex gap-2">
                  <Button onClick={deleteCategory} className="flex-1">حذف</Button>
                  <Button variant="secondary" onClick={() => setDeleteCat(null)} className="flex-1">انصراف</Button>
                </div>
              </>
            )}
          </Card>
        </div>
      )}

      {showNewEx && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50">
          <Card className="w-full sm:max-w-md m-4 max-h-[90vh] overflow-y-auto">
            <h3 className="font-semibold mb-4 text-white">افزودن حرکت جدید</h3>
            <form onSubmit={createExercise} className="space-y-3">
              <Input label="نام حرکت" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} required />
              {errors.name && <p className="text-sm text-red-600">{Array.isArray(errors.name) ? errors.name[0] : errors.name}</p>}
              <select className="w-full px-3 py-2 border border-white/10 rounded-xl min-h-[44px] text-white bg-[#141716]" value={form.category} onChange={(e) => setForm({...form, category: e.target.value})} required>
                <option value="">انتخاب دسته‌بندی</option>
                {categories.filter((c:any)=>c.is_active!==false).map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
              </select>
              {errors.category && <p className="text-sm text-red-600">{Array.isArray(errors.category) ? errors.category[0] : errors.category}</p>}
              <Input label="لینک ویدیو (اختیاری)" value={form.video_url} onChange={(e) => setForm({...form, video_url: e.target.value})} />
              <textarea className="w-full px-3 py-2 border border-white/10 rounded-xl min-h-[80px] text-white" placeholder="توضیحات (اختیاری)" value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} />
              <div className="flex gap-2">
                <Button type="submit" className="flex-1">ذخیره</Button>
                <Button type="button" variant="secondary" onClick={() => setShowNewEx(false)} className="flex-1">انصراف</Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-4 py-2 rounded-xl">{toast}</div>
      )}
    </div>
  )
}
