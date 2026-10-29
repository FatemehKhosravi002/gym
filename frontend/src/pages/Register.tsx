import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../utils/api'

import Button from '../components/Button'
import Input from '../components/Input'
import PasswordInput from '../components/PasswordInput'
import Card from '../components/Card'

export default function Register() {
  const [form, setForm] = useState({ first_name: '', last_name: '', username: '', phone: '', password: '', confirm_password: '', website: '' })
  const [errors, setErrors] = useState<any>({})
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [noApproval, setNoApproval] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrors({})
    try {
      const res = await api.post('/users/register/', form)
      if (res.data.requires_approval || res.data.detail?.includes('تأیید')) {
        setSuccess(true)
      } else if (res.data.access) {
        localStorage.setItem('access_token', res.data.access)
        localStorage.setItem('refresh_token', res.data.refresh)
        setNoApproval(true)
        setTimeout(() => window.location.href = '/athletes', 1000)
      } else {
        setSuccess(true)
      }
    } catch (err: any) {
      if (err.response?.data) {
        setErrors(err.response.data)
      } else {
        setErrors({ general: 'خطا در ثبت‌نام' })
      }
    } finally {
      setLoading(false)
    }
  }

  if (noApproval) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center px-4" dir="rtl">
        <Card className="w-full max-w-md text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">خوش آمدید!</h2>
          <p className="text-gray-600 mb-6">ثبت‌نام با موفقیت انجام شد</p>
          <p className="text-sm text-gray-500">در حال ورود...</p>
        </Card>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center px-4" dir="rtl">
        <Card className="w-full max-w-md text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">ثبت‌نام با موفقیت انجام شد</h2>
          <p className="text-gray-600 mb-6">حساب شما ثبت شد و پس از تأیید ادمین سیستم فعال می‌شود.</p>
          <Button onClick={() => navigate('/login')} className="w-full">بازگشت به صفحه ورود</Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center px-4 py-8" dir="rtl">
      <div className="w-full max-w-2xl">
        <Card className="shadow-xl border-0">
          <div className="text-center mb-6">
            <Link to="/" className="inline-flex items-center gap-2 mb-4">
              <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold">GB</span>
              </div>
              <span className="text-lg font-bold text-gray-900">Gym Program Builder</span>
            </Link>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">ثبت‌نام مربی</h2>
            <p className="text-gray-600">اطلاعات خود را وارد کنید</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="grid sm:grid-cols-2 gap-4">
              <Input label="نام" value={form.first_name} onChange={(e) => setForm({...form, first_name: e.target.value})} required />
              <Input label="نام خانوادگی" value={form.last_name} onChange={(e) => setForm({...form, last_name: e.target.value})} required />
            </div>
            {errors.first_name && <p className="text-sm text-red-600 -mt-2">{errors.first_name}</p>}
            {errors.last_name && <p className="text-sm text-red-600 -mt-2">{errors.last_name}</p>}
            
            <Input label="نام کاربری" value={form.username} onChange={(e) => setForm({...form, username: e.target.value})} required autoComplete="username" />
            {errors.username && <p className="text-sm text-red-600">{errors.username}</p>}
            
            <Input label="شماره تلفن (اختیاری)" value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})} />
            
            <PasswordInput label="رمز عبور" value={form.password} onChange={(e) => setForm({...form, password: e.target.value})} required autoComplete="new-password" />
            {errors.password && <p className="text-sm text-red-600">{errors.password}</p>}
            <p className="text-xs text-gray-500 -mt-2">حداقل ۸ کاراکتر، شامل حروف و اعداد</p>
            
            <PasswordInput label="تکرار رمز عبور" value={form.confirm_password} onChange={(e) => setForm({...form, confirm_password: e.target.value})} required />
            {errors.confirm_password && <p className="text-sm text-red-600">{errors.confirm_password}</p>}
            
            <input type="text" name="website" value={form.website} onChange={(e) => setForm({...form, website: e.target.value})} style={{display:'none'}} tabIndex={-1} autoComplete="off" />
            
            {errors.general && <p className="text-sm text-red-600">{errors.general}</p>}
            {errors.detail && <p className="text-sm text-red-600">{errors.detail}</p>}
            
            <Button type="submit" className="w-full" disabled={loading} size="lg">
              {loading ? 'در حال ثبت‌نام...' : 'ثبت‌نام'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Link to="/login" className="text-sm text-primary-600 hover:text-primary-700 font-medium">قبلاً ثبت‌نام کرده‌اید؟ ورود</Link>
          </div>
        </Card>
      </div>
    </div>
  )
}
