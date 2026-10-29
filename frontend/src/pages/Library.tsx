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
  const [form, setForm] = useState({ name: '', category: '', video_url: '' })

  useEffect(() => {
    api.get('/library/categories/').then(res => setCategories(res.data.results || res.data))
    api.get('/library/exercises/').then(res => setExercises(res.data.results || res.data))
  }, [])

  const createExercise = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post('/library/exercises/', form)
      setShowNewEx(false)
      setForm({ name: '', category: '', video_url: '' })
      const res = await api.get('/library/exercises/')
      setExercises(res.data.results || res.data)
    } catch {
      alert('خطا')
    }
  }

  const filtered = selectedCat ? exercises.filter((e: any) => e.category === selectedCat) : exercises

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">کتابخانه حرکات</h2>
        <Button onClick={() => setShowNewEx(true)}>افزودن حرکت جدید</Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedCat(null)}
          className={`px-4 py-2 rounded-xl min-h-[44px] ${selectedCat === null ? 'bg-primary-600 text-white' : 'bg-white border border-gray-300'}`}
        >
          همه
        </button>
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setSelectedCat(cat.id)}
            className={`px-4 py-2 rounded-xl min-h-[44px] ${selectedCat === cat.id ? 'bg-primary-600 text-white' : 'bg-white border border-gray-300'}`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.map(ex => (
          <Card key={ex.id}>
            <p className="font-medium text-gray-900">{ex.name}</p>
            <p className="text-sm text-gray-500">{ex.category_name}</p>
          </Card>
        ))}
      </div>

      {showNewEx && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50">
          <Card className="w-full sm:max-w-md m-4">
            <h3 className="font-semibold mb-4 text-gray-900">افزودن حرکت جدید</h3>
            <form onSubmit={createExercise} className="space-y-3">
              <Input label="نام حرکت" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} required />
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-xl min-h-[44px]"
                value={form.category}
                onChange={(e) => setForm({...form, category: e.target.value})}
                required
              >
                <option value="">انتخاب دسته‌بندی</option>
                {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
              </select>
              <Input label="لینک ویدیو (اختیاری)" value={form.video_url} onChange={(e) => setForm({...form, video_url: e.target.value})} />
              <div className="flex gap-2">
                <Button type="submit" className="flex-1">ذخیره</Button>
                <Button type="button" variant="secondary" onClick={() => setShowNewEx(false)} className="flex-1">انصراف</Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  )
}
