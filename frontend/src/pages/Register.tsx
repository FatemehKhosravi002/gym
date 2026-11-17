import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../utils/api'
import { getFieldErrors, firstError } from '../utils/apiError'
import Button from '../components/Button'
import Input from '../components/Input'
import PasswordInput from '../components/PasswordInput'
import Card from '../components/Card'
import { CheckIcon, AlertIcon } from '../components/icons'

type FormState = {
  first_name: string
  last_name: string
  username: string
  phone: string
  password: string
  confirm_password: string
  website: string
}

const emptyForm: FormState = {
  first_name: '',
  last_name: '',
  username: '',
  phone: '',
  password: '',
  confirm_password: '',
  website: '',
}

export default function Register() {
  const [form, setForm] = useState<FormState>(emptyForm)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [general, setGeneral] = useState('')
  const [loading, setLoading] = useState(false)
  const [needsApproval, setNeedsApproval] = useState(false)
  const navigate = useNavigate()

  const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [key]: e.target.value }))
    setErrors((prev) => {
      if (!prev[key]) return prev
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setGeneral('')
    setErrors({})
    setLoading(true)
    try {
      const res = await api.post('/users/register/', form)
      if (res.data.requires_approval) {
        setNeedsApproval(true)
        return
      }
      if (res.data.access) {
        localStorage.setItem('access_token', res.data.access)
        localStorage.setItem('refresh_token', res.data.refresh)
        window.location.href = '/athletes'
        return
      }
      navigate('/login')
    } catch (err) {
      const fieldErrors = getFieldErrors(err)
      setErrors(fieldErrors)
      setGeneral(firstError(fieldErrors) || 'ثبت‌نام انجام نشد. دوباره تلاش کنید.')
    } finally {
      setLoading(false)
    }
  }


  if (needsApproval) {
    return (
      <AuthShell>
        <Card className="w-full max-w-md text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-100 text-primary-700">
            <CheckIcon className="h-8 w-8" />
          </div>
          <h1 className="mb-2 text-xl font-bold text-primary-900">ثبت‌نام انجام شد</h1>
          <p className="mb-6 text-sm leading-relaxed text-ink-600">
            حساب شما ساخته شد و پس از تأیید ادمین سیستم فعال می‌شود. می‌توانید بعداً وارد شوید.
          </p>
          <Button fullWidth onClick={() => navigate('/login')}>
            بازگشت به صفحه ورود
          </Button>
        </Card>
      </AuthShell>
    )
  }


  return (
    <AuthShell>
      <div className="w-full max-w-lg rounded-card border border-border bg-surface p-6 shadow-soft sm:p-8">
        <h1 className="text-2xl font-bold text-primary-900">ثبت‌نام مربی</h1>
        <p className="mt-1 mb-6 text-sm text-ink-600">
          اطلاعات خود را وارد کنید؛ حساب شما بلافاصله فعال می‌شود.
        </p>

        {general && (
          <div role="alert" className="mb-4 flex items-start gap-2 rounded-field border border-error-200 bg-error-50 p-3 text-sm text-error-700">
            <AlertIcon className="mt-0.5 h-5 w-5 shrink-0" />
            <span>{general}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="نام"
              value={form.first_name}
              onChange={set('first_name')}
              error={errors.first_name}
              autoComplete="given-name"
              required
            />
            <Input
              label="نام خانوادگی"
              value={form.last_name}
              onChange={set('last_name')}
              error={errors.last_name}
              autoComplete="family-name"
              required
            />
          </div>

          <Input
            label="نام کاربری"
            value={form.username}
            onChange={set('username')}
            error={errors.username}
            autoComplete="username"
            required
          />

          <Input
            label="شماره تلفن (اختیاری)"
            value={form.phone}
            onChange={set('phone')}
            error={errors.phone}
            inputMode="tel"
            autoComplete="tel"
          />

          <PasswordInput
            label="رمز عبور"
            value={form.password}
            onChange={set('password')}
            error={errors.password}
            hint="حداقل ۸ کاراکتر و شامل حروف و اعداد."
            autoComplete="new-password"
            required
          />

          <PasswordInput
            label="تکرار رمز عبور"
            value={form.confirm_password}
            onChange={set('confirm_password')}
            error={errors.confirm_password}
            autoComplete="new-password"
            required
          />

          {/* Honeypot: hidden from users and screen readers, bots fill it. */}
          <input
            type="text"
            name="website"
            value={form.website}
            onChange={set('website')}
            className="hidden"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
          />

          <Button type="submit" size="lg" fullWidth loading={loading}>
            {loading ? 'در حال ثبت‌نام...' : 'ساخت حساب'}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-ink-600">
          قبلاً ثبت‌نام کرده‌اید؟{' '}
          <Link to="/login" className="font-semibold text-primary-700 hover:text-primary-800">
            وارد شوید
          </Link>
        </p>
      </div>
    </AuthShell>
  )
}

function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2" aria-label="Physique">
            <img src="/brand/Logo.svg" alt="" className="h-9 w-auto md:h-11" />
            <span className="text-lg font-bold text-primary-900">Physique</span>
          </Link>
          <Link to="/login" className="text-sm font-semibold text-primary-700 hover:text-primary-800">
            ورود
          </Link>
        </div>
      </header>
      <main className="flex flex-1 items-start justify-center px-4 py-8 sm:items-center">{children}</main>
    </div>
  )
}

