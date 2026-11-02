import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Navigate } from 'react-router-dom'
import Button from '../components/Button'
import Card from '../components/Card'

export default function Landing() {
  const { token } = useAuth()
  
  if (token) {
    return <Navigate to="/athletes" replace />
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A]" dir="rtl">
      <header className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/icons.svg" alt="Physique" className="h-8" />
            <span className="text-xl font-bold text-white">Physique</span>
          </div>
          <Link to="/login">
            <Button variant="primary" size="md">ورود مربی</Button>
          </Link>
        </div>
      </header>

      <main>
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16 sm:pt-12 sm:pb-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6 animate-fade-in">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-tight">
                برنامه بدنسازی را<br />
                <span className="text-[#B6F500]">حرفه‌ای بسازید</span>
              </h1>
              <p className="text-lg sm:text-xl text-[#9AA3A0] leading-relaxed">
                Physique ابزاری مدرن برای مربیان ایرانی جهت ساخت سریع برنامه‌های بدنسازی، مدیریت ورزشکاران و اشتراک‌گذاری با PDF و لینک
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link to="/login" className="w-full sm:w-auto">
                  <Button variant="primary" size="lg" className="w-full sm:w-auto">ورود مربی</Button>
                </Link>
              </div>
            </div>
            <div className="relative">
              <div className="absolute -inset-10 bg-[#B6F500]/10 blur-[100px] rounded-full"></div>
              <div className="relative rounded-[32px] overflow-hidden shadow-[0_0_80px_-20px_rgba(182,245,0,0.4)]">
                <img src="/IMG_1645.jpeg" alt="Physique" className="w-full h-[400px] sm:h-[500px] object-cover" loading="lazy" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-transparent to-transparent"></div>
              </div>
            </div>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-white text-center mb-12">ویژگی‌های کلیدی</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <div className="w-12 h-12 bg-[#B6F500]/10 rounded-full flex items-center justify-center mb-4">
                <div className="w-2 h-2 bg-[#B6F500] rounded-full"></div>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">ساخت سریع برنامه</h3>
              <p className="text-[#9AA3A0]">ویزارد یک‌روز‌به‌یک‌روز برای ساخت برنامه در چند دقیقه</p>
            </Card>
            <Card>
              <div className="w-12 h-12 bg-[#B6F500]/10 rounded-full flex items-center justify-center mb-4">
                <div className="w-2 h-2 bg-[#B6F500] rounded-full"></div>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">هشدار تکرار حرکات</h3>
              <p className="text-[#9AA3A0]">بررسی خودکار تکرار حرکات در برنامه‌های قبلی</p>
            </Card>
            <Card>
              <div className="w-12 h-12 bg-[#B6F500]/10 rounded-full flex items-center justify-center mb-4">
                <div className="w-2 h-2 bg-[#B6F500] rounded-full"></div>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">PDF و لینک اشتراک</h3>
              <p className="text-[#9AA3A0]">خروجی آماده چاپ با ویدیو کنار هر حرکت</p>
            </Card>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <img src="/icons.svg" alt="Physique" className="h-6" />
            <span className="font-bold text-white">Physique</span>
          </div>
          <p className="text-[#9AA3A0] text-sm">«قدرت از انضباط شروع می‌شود»</p>
        </div>
      </footer>
    </div>
  )
}
