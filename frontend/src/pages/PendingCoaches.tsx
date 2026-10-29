import { useState, useEffect } from 'react'
import api from '../utils/api'
import Button from '../components/Button'
import Card from '../components/Card'

export default function PendingCoaches() {
  const [coaches, setCoaches] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tempPass, setTempPass] = useState<{show: boolean, pass: string}>({show: false, pass: ''})

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    try {
      const res = await api.get('/users/pending-coaches/')
      setCoaches(res.data)
    } catch {
      setCoaches([])
    } finally {
      setLoading(false)
    }
  }

  const approve = async (id: number) => {
    await api.post('/users/pending-coaches/', { user_id: id, action: 'approve' })
    load()
  }

  const reject = async (id: number) => {
    if (confirm('آیا از رد این مربی اطمینان دارید؟')) {
      await api.post('/users/pending-coaches/', { user_id: id, action: 'reject' })
      load()
    }
  }

  const resetPass = async (id: number) => {
    if (confirm('آیا می‌خواهید رمز موقت برای این مربی تولید کنید؟')) {
      const res = await api.post('/users/reset-coach-password/', { user_id: id })
      setTempPass({show: true, pass: res.data.temp_password})
    }
  }

  const copyPass = () => {
    navigator.clipboard.writeText(tempPass.pass)
    alert('رمز موقت کپی شد')
  }

  if (loading) return <p>در حال بارگذاری...</p>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">تأیید مربی‌ها</h2>
        <span className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-sm">{coaches.length} در انتظار</span>
      </div>

      {coaches.length === 0 && (
        <Card className="text-center py-8">
          <p className="text-gray-600">مربی در انتظار تأییدی وجود ندارد</p>
        </Card>
      )}

      <div className="space-y-2">
        {coaches.map(c => (
          <Card key={c.id}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="font-medium text-gray-900">{c.first_name} {c.last_name}</p>
                <p className="text-sm text-gray-500">نام کاربری: {c.username} {c.phone && `| تلفن: ${c.phone}`}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => approve(c.id)} size="sm">تأیید</Button>
                <Button variant="secondary" onClick={() => resetPass(c.id)} size="sm">بازنشانی رمز</Button>
                <Button variant="tertiary" onClick={() => reject(c.id)} size="sm" className="text-red-600">رد</Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {tempPass.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
          <Card className="w-full max-w-md">
            <h3 className="font-bold text-gray-900 mb-4">رمز موقت تولید شد</h3>
            <p className="text-sm text-red-600 mb-3">این رمز فقط یک‌بار نمایش داده می‌شود. حتماً آن را کپی کنید.</p>
            <div className="bg-gray-100 p-3 rounded-xl font-mono text-center text-lg mb-4 select-all">
              {tempPass.pass}
            </div>
            <div className="flex gap-2">
              <Button onClick={copyPass} className="flex-1">کپی رمز</Button>
              <Button variant="secondary" onClick={() => setTempPass({show: false, pass: ''})} className="flex-1">بستن</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
