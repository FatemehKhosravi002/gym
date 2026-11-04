import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../utils/api'
import Card from '../components/Card'
import Button from '../components/Button'
import Input from '../components/Input'

export default function Athletes() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [form, setForm] = useState({ first_name: '', last_name: '', phone: '', notes: '' })
  const [templates, setTemplates] = useState<any[]>([])

  const search = async (q: string) => {
    if (!q.trim()) {
      setResults([])
      return
    }
    setLoading(true)
    try {
      const res = await api.get(`/athletes/search_combined/?q=${encodeURIComponent(q)}`)
      setResults(res.data)
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const t = setTimeout(() => search(query), 300)
    return () => clearTimeout(t)
    api.get('/program-templates/').then(res => setTemplates(res.data.results || res.data)).catch(()=>{})
  }, [query])

  const createAthlete = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await api.post('/athletes/', form)
      setShowNew(false)
      setForm({ first_name: '', last_name: '', phone: '', notes: '' })
      window.location.href = `/athletes/${res.data.id}`
    } catch {
      alert('خطا در ایجاد ورزشکار')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">ورزشکاران</h2>
        <Button onClick={() => setShowNew(true)}>ورزشکار جدید</Button>
      </div>

      <Input
        placeholder="جستجو بر اساس نام، نام خانوادگی یا کد..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {loading && <p className="text-sm text-[#9CA3AF]">در حال جستجو...</p>}

      <div className="space-y-2">
        {results.map(a => (
          <Link key={a.id} to={`/athletes/${a.id}`}>
            <Card className="hover:border-[#B6F500]/50 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-white">{a.first_name} {a.last_name}</p>
                  <p className="text-sm text-[#d1d5db]">کد: {a.unique_code}</p>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {templates.length > 0 && (
        <Card>
          <h3 className="font-bold text-white mb-3">قالب‌های آماده</h3>
          <div className="space-y-2">
            {templates.map(t => (
              <div key={t.id} className="p-3 bg-[#1B1F1D] rounded-xl border border-white/10">
                <p className="font-medium text-white">{t.name}</p>
                <p className="text-sm text-[#9CA3AF]">{t.days_per_week} روز | {t.days?.length || 0} روز برنامه</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {showNew && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-end sm:items-center justify-center z-50">
          <Card className="w-full sm:max-w-md m-4 max-h-[90vh] overflow-y-auto">
            <h3 className="font-semibold mb-4 text-white">افزودن ورزشکار جدید</h3>
            <form onSubmit={createAthlete} className="space-y-3">
              <Input label="نام" value={form.first_name} onChange={(e) => setForm({...form, first_name: e.target.value})} required />
              <Input label="نام خانوادگی" value={form.last_name} onChange={(e) => setForm({...form, last_name: e.target.value})} required />
              <Input label="تلفن (اختیاری)" value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})} />
              <textarea className="w-full px-3 py-2 border border-white/10 rounded-xl min-h-[80px] bg-[#1B1F1D] text-white" placeholder="یادداشت‌ها (اختیاری)" value={form.notes} onChange={(e) => setForm({...form, notes: e.target.value})} />
              <div className="flex gap-2">
                <Button type="submit" className="flex-1">ذخیره</Button>
                <Button type="button" variant="secondary" onClick={() => setShowNew(false)} className="flex-1">انصراف</Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  )
}
