import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Button from '../components/Button'
import Input from '../components/Input'
import PasswordInput from '../components/PasswordInput'
import Card from '../components/Card'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
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
      const res = await login(username, password)
      if (res?.must_change_password) {
        navigate('/change-password')
        return
      }
      if (rememberMe) {
        localStorage.setItem('remember_me', 'true')
      }
      navigate('/athletes')
    } catch (err: any) {
      if (err.response?.status === 401) {
        const msg = err.response?.data?.detail || 'نام کاربری یا رمز عبور اشتباه است'
        setError(msg)
      } else if (err.code === 'ERR_NETWORK') {
        setError('خطا در اتصال به سرور. لطفاً دوباره تلاش کنید')
      } else {
        setError(err.response?.data?.detail || 'خطای غیرمنتظره‌ای رخ داد')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center px-4" dir="rtl">
      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 items-center">
        <div className="hidden lg:flex flex-col justify-center space-y-6 p-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary-600 rounded-2xl flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-xl">GB</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Gym Program Builder</h1>
          </div>
          <div className="space-y-4">
            <h2 className="text-4xl font-bold text-gray-900 leading-tight">
              برنامه بدنسازی را<br />سریع و حرفه‌ای بسازید
            </h2>
            <p className="text-lg text-gray-600 leading-relaxed">
              ابزاری مدرن برای مربیان ایرانی جهت مدیریت ورزشکاران، ساخت برنامه‌های ماهانه و اشتراک‌گذاری با لینک و PDF
            </p>
          </div>
        </div>

        <div className="w-full max-w-md mx-auto">
          <Card className="shadow-xl border-0">
            <div className="text-center mb-8">
              <Link to="/" className="inline-flex items-center gap-2 mb-4 lg:hidden">
                <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center">
                  <span className="text-white font-bold">GB</span>
                </div>
                <span className="text-lg font-bold text-gray-900">Gym Program Builder</span>
              </Link>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">ورود به حساب کاربری</h2>
              <p className="text-gray-600">برای دسترسی به پنل مربی وارد شوید</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              <Input
                label="نام کاربری"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
                autoFocus
                inputMode="text"
                placeholder="نام کاربری خود را وارد کنید"
              />
              <PasswordInput
                label="رمز عبور"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="رمز عبور خود را وارد کنید"
              />
              
              <div className="flex items-center">
                <label className="flex items-center gap-2 cursor-pointer min-h-[44px]">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700">مرا به خاطر بسپار</span>
                </label>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <Button type="submit" className="w-full" disabled={loading} size="lg">
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    در حال ورود...
                  </span>
                ) : 'ورود'}
              </Button>
            </form>

            <div className="mt-6 text-center space-y-2">
              <Link to="/register" className="block text-sm text-primary-600 hover:text-primary-700 font-medium">ثبت‌نام مربی جدید</Link>
              <Link to="/" className="block text-sm text-gray-600 hover:text-gray-900">بازگشت به صفحه اصلی</Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
