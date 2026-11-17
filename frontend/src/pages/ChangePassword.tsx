import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../utils/api'
import { getFieldErrors } from '../utils/apiError'
import Button from '../components/Button'
import PasswordInput from '../components/PasswordInput'
import Card from '../components/Card'
import { CheckIcon, AlertIcon } from '../components/icons'

export default function ChangePassword() {
  const [form, setForm] = useState({ current_password: '', new_password: '', confirm_password: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [general, setGeneral] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrors({})
    setGeneral('')
    try {
      await api.post('/users/change-password/', form)
      setSuccess(true)
      setTimeout(() => navigate('/athletes'), 1500)
    } catch (err) {
      const fieldErrors = getFieldErrors(err)
      setErrors(fieldErrors)
      if (!Object.keys(fieldErrors).length) setGeneral('تغییر رمز عبور انجام نشد. دوباره تلاش کنید.')
    } finally {
      setLoading(false)
    }
  }


  if (success) {
    return (
      <div className="mx-auto max-w-md py-10">
        <Card className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-100 text-primary-700">
            <CheckIcon className="h-8 w-8" />
          </div>
          <h1 className="mb-2 text-xl font-bold text-primary-900">رمز عبور تغییر کرد</h1>
          <p className="text-sm text-ink-600">در حال انتقال به فهرست ورزشکاران…</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-md space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-primary-900">تغییر رمز عبور</h1>
        <p className="mt-1 text-sm text-ink-600">برای امنیت حساب، رمز فعلی را وارد کنید.</p>
      </div>

      {general && (
        <div role="alert" className="flex items-start gap-2 rounded-field border border-error-200 bg-error-50 p-3 text-sm text-error-700">
          <AlertIcon className="mt-0.5 h-5 w-5 shrink-0" />
          <span>{general}</span>
        </div>
      )}

      <Card>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <PasswordInput
            label="رمز عبور فعلی"
            value={form.current_password}
            onChange={(e) => setForm({ ...form, current_password: e.target.value })}
            error={errors.current_password}
            autoComplete="current-password"
            required
          />
          <PasswordInput
            label="رمز عبور جدید"
            value={form.new_password}
            onChange={(e) => setForm({ ...form, new_password: e.target.value })}
            error={errors.new_password}
            hint="حداقل ۸ کاراکتر و شامل حروف و اعداد."
            autoComplete="new-password"
            required
          />
          <PasswordInput
            label="تکرار رمز عبور جدید"
            value={form.confirm_password}
            onChange={(e) => setForm({ ...form, confirm_password: e.target.value })}
            error={errors.confirm_password}
            autoComplete="new-password"
            required
          />
          <Button type="submit" size="lg" fullWidth loading={loading}>
            {loading ? 'در حال تغییر...' : 'تغییر رمز عبور'}
          </Button>
        </form>
      </Card>
    </div>
  )
}

