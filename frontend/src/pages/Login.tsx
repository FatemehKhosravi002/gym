import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Button from '../components/Button'
import Input from '../components/Input'
import PasswordInput from '../components/PasswordInput'
import { AlertIcon } from '../components/icons'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const message = sessionStorage.getItem('login_message')
    if (message) {
      setError(message)
      sessionStorage.removeItem('login_message')
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const me = await login(username.trim(), password)
      if (me?.must_change_password) {
        navigate('/change-password')
        return
      }
      navigate('/athletes')
    } catch (err: any) {
      const data = err.response?.data
      setError(
        data?.detail ||
          (data?.username?.[0] ?? data?.password?.[0]) ||
          'نام کاربری یا رمز عبور اشتباه است',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2" aria-label="Physique">
            <img src="/brand/Logo.svg" alt="" className="h-9 w-auto md:h-11" />
            <span className="text-lg font-bold text-primary-900">Physique</span>
          </Link>
          <Link to="/register" className="text-sm font-semibold text-primary-700 hover:text-primary-800">
            ثبت‌نام مربی
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-start justify-center px-4 py-8 sm:items-center">
        <div className="w-full max-w-md rounded-card border border-border bg-surface p-6 shadow-soft sm:p-8">
          <h1 className="text-2xl font-bold text-primary-900">ورود به حساب</h1>
          <p className="mt-1 mb-6 text-sm text-ink-600">نام کاربری و رمز عبور خود را وارد کنید.</p>

          {error && (
            <div role="alert" className="mb-4 flex items-start gap-2 rounded-field border border-error-200 bg-error-50 p-3 text-sm text-error-700">
              <AlertIcon className="mt-0.5 h-5 w-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <Input
              label="نام کاربری"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
              autoFocus
            />
            <PasswordInput
              label="رمز عبور"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
            <Button type="submit" size="lg" fullWidth loading={loading}>
              {loading ? 'در حال ورود...' : 'ورود'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-ink-600">
            حساب ندارید؟{' '}
            <Link to="/register" className="font-semibold text-primary-700 hover:text-primary-800">ثبت‌نام کنید</Link>
          </p>
          <p className="mt-2 text-center">
            <Link to="/" className="text-sm text-ink-500 hover:text-ink-700">بازگشت به صفحه اصلی</Link>
          </p>
        </div>
      </main>
    </div>
  )
}
