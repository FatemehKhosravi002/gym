import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Button from '../components/Button'
import Input from '../components/Input'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
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
      navigate('/athletes')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'نام کاربری یا رمز عبور اشتباه است')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A]" dir="rtl">
      <div className="lg:grid lg:grid-cols-2 min-h-screen">
        <div className="relative h-48 lg:h-auto">
          <div className="absolute -inset-5 bg-[#B6F500]/10 blur-[80px]"></div>
          <img src="/IMG_1646.jpeg" alt="Physique" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t lg:bg-gradient-to-l from-[#0A0A0A] to-transparent"></div>
          <div className="absolute bottom-6 right-6 lg:hidden">
            <div className="flex items-center gap-2">
              <img src="/icons.svg" alt="Physique" className="h-8" />
              <span className="text-xl font-bold text-white">Physique</span>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center px-4 py-8">
          <div className="w-full max-w-md space-y-6">
            <div className="text-center space-y-2">
              <div className="hidden lg:flex items-center justify-center gap-2 mb-6">
                <img src="/icons.svg" alt="Physique" className="h-10" />
                <span className="text-2xl font-bold text-white">Physique</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">ورود به حساب کاربری</h1>
              <p className="text-[#9AA3A0]">برای دسترسی به پنل مربی وارد شوید</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input label="نام کاربری" value={username} onChange={(e) => setUsername(e.target.value)} required autoComplete="username" autoFocus />
              <div>
                <label className="block text-sm text-[#9AA3A0] mb-2">رمز عبور</label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="w-full bg-[#1B1F1D] border border-white/10 rounded-[16px] px-4 py-3 pl-12 text-white min-h-[48px] focus:outline-none focus:border-[#B6F500]/50"
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9AA3A0] text-sm min-h-[40px] px-2">
                    {showPass ? 'پنهان' : 'نمایش'}
                  </button>
                </div>
              </div>
              {error && <p className="text-sm text-[#FF4D4F]">{error}</p>}
              <Button type="submit" variant="primary" className="w-full" disabled={loading}>
                {loading ? 'در حال ورود...' : 'ورود'}
              </Button>
            </form>
            <div className="text-center space-y-2">
              <Link to="/register" className="block text-[#B6F500]">ثبت‌نام مربی جدید</Link>
              <Link to="/" className="block text-[#9AA3A0]">بازگشت به صفحه اصلی</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
