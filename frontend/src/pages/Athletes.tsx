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
        <h2 className="text-xl font-bold text-gray-900">ورزشکاران</h2>
        <Button onClick={() => setShowNew(true)}>ورزشکار جدید</Button>
      </div>

      <Input
        placeholder="جستجو بر اساس نام، نام خانوادگی یا کد..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {loading && <p className="text-sm text-gray-500">در حال جستجو...</p>}

      <div className="space-y-2">
        {results.map(a => (
          <Link key={a.id} to={`/athletes/${a.id}`}>
            <Card className="hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{a.first_name} {a.last_name}</p>
                  <p className="text-sm text-gray-500">کد: {a.unique_code}</p>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {showNew && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50">
          <Card className="w-full sm:max-w-md m-4 max-h-[90vh] overflow-y-auto">
            <h3 className="font-semibold mb-4 text-gray-900">افزودن ورزشکار جدید</h3>
            <form onSubmit={createAthlete} className="space-y-3">
              <Input label="نام" value={form.first_name} onChange={(e) => setForm({...form, first_name: e.target.value})} required />
              <Input label="نام خانوادگی" value={form.last_name} onChange={(e) => setForm({...form, last_name: e.target.value})} required />
              <Input label="تلفن (اختیاری)" value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})} />
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-xl min-h-[80px]"
                placeholder="یادداشت‌ها (اختیاری)"
                value={form.notes}
                onChange={(e) => setForm({...form, notes: e.target.value})}
              />
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
