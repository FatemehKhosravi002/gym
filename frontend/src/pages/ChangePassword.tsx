import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../utils/api'
import Button from '../components/Button'
import PasswordInput from '../components/PasswordInput'
import Card from '../components/Card'

export default function ChangePassword() {
  const [form, setForm] = useState({ current_password: '', new_password: '', confirm_password: '' })
  const [error, setError] = useState<any>({})
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError({})
    try {
      await api.post('/users/change-password/', form)
      setSuccess(true)
      setTimeout(() => navigate('/athletes'), 1500)
    } catch (err: any) {
      if (err.response?.data) {
        setError(err.response.data)
      } else {
        setError({ general: 'خطا در تغییر رمز عبور' })
      }
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4" dir="rtl">
        <Card className="w-full max-w-md text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">رمز عبور تغییر یافت</h2>
          <p className="text-gray-600">در حال انتقال...</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4" dir="rtl">
      <Card className="w-full max-w-md">
        <h1 className="text-xl font-bold text-gray-900 mb-6">تغییر رمز عبور</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <PasswordInput
            label="رمز عبور فعلی"
            value={form.current_password}
            onChange={(e) => setForm({...form, current_password: e.target.value})}
            required
          />
          {error.current_password && <p className="text-sm text-red-600">{error.current_password}</p>}
          <PasswordInput
            label="رمز عبور جدید"
            value={form.new_password}
            onChange={(e) => setForm({...form, new_password: e.target.value})}
            required
          />
          {error.new_password && <p className="text-sm text-red-600">{error.new_password}</p>}
          <PasswordInput
            label="تکرار رمز عبور جدید"
            value={form.confirm_password}
            onChange={(e) => setForm({...form, confirm_password: e.target.value})}
            required
          />
          {error.confirm_password && <p className="text-sm text-red-600">{error.confirm_password}</p>}
          {error.general && <p className="text-sm text-red-600">{error.general}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'در حال تغییر...' : 'تغییر رمز عبور'}
          </Button>
        </form>
      </Card>
    </div>
  )
}
