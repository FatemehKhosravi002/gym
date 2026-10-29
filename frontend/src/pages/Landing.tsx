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
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50" dir="rtl">
      <header className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">GB</span>
            </div>
            <span className="text-xl font-bold text-gray-900">Gym Program Builder</span>
          </div>
          <Link to="/login">
            <Button variant="primary" size="md">ورود مربی</Button>
          </Link>
        </div>
      </header>

      <main>
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-16 sm:pt-16 sm:pb-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
                برنامه بدنسازی را سریع‌تر بسازید
              </h1>
              <p className="text-lg sm:text-xl text-gray-600 leading-relaxed">
                ابزاری ساده برای مربیان ایرانی تا در چند دقیقه برنامه ماهانه ورزشکار را آماده، بررسی تکرار حرکات، PDF بگیرند و لینک اشتراک‌گذاری کنند
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link to="/login" className="w-full sm:w-auto">
                  <Button variant="primary" size="lg" className="w-full sm:w-auto">ورود مربی</Button>
                </Link>
              </div>
            </div>
            <div className="relative">
              <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 p-4 max-w-sm mx-auto transform hover:scale-105 transition-transform duration-300">
                <div className="bg-gradient-to-br from-primary-50 to-blue-50 rounded-2xl p-6 space-y-4">
                  <div className="text-center">
                    <div className="text-sm text-gray-600 mb-1">برنامه شماره ۵</div>
                    <div className="font-bold text-gray-900">علی رضایی - مهر ۱۴۰۴</div>
                  </div>
                  <div className="space-y-2">
                    <div className="bg-white rounded-xl p-3 shadow-sm">
                      <div className="font-medium text-gray-900 text-sm mb-1">روز ۱ - سینه + پشت بازو</div>
                      <div className="text-xs text-gray-600">پرس سینه هالتر • ۳ × ۱۰</div>
                    </div>
                    <div className="bg-white rounded-xl p-3 shadow-sm">
                      <div className="text-xs text-gray-600">پرس بالا سینه دمبل • ۳ × ۱۲</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white py-16 sm:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl sm:text-4xl font-bold text-center text-gray-900 mb-12">ویژگی‌های کلیدی</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <Card className="text-center hover:shadow-lg transition-shadow duration-300">
                <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">ساخت سریع برنامه ماهانه</h3>
                <p className="text-gray-600">با ویزارد یک‌روز‌به‌یک‌روز، در چند دقیقه برنامه کامل آماده کنید</p>
              </Card>
              <Card className="text-center hover:shadow-lg transition-shadow duration-300">
                <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">هشدار تکرار حرکات</h3>
                <p className="text-gray-600">هشدار خودکار در صورت تکرار حرکت در برنامه‌های قبلی ورزشکار</p>
              </Card>
              <Card className="text-center hover:shadow-lg transition-shadow duration-300">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">PDF و لینک قابل اشتراک</h3>
                <p className="text-gray-600">خروجی PDF آماده چاپ و لینک عمومی با ویدیو/GIF کنار هر حرکت</p>
              </Card>
            </div>
          </div>
        </section>

        <section className="py-16 sm:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl sm:text-4xl font-bold text-center text-gray-900 mb-12">چگونه کار می‌کند</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center space-y-4">
                <div className="w-12 h-12 bg-primary-600 text-white rounded-full flex items-center justify-center mx-auto text-xl font-bold">۱</div>
                <h3 className="text-xl font-bold text-gray-900">انتخاب ورزشکار</h3>
                <p className="text-gray-600">جستجو یا افزودن ورزشکار جدید با کد منحصر به فرد</p>
              </div>
              <div className="text-center space-y-4">
                <div className="w-12 h-12 bg-primary-600 text-white rounded-full flex items-center justify-center mx-auto text-xl font-bold">۲</div>
                <h3 className="text-xl font-bold text-gray-900">ساخت برنامه</h3>
                <p className="text-gray-600">انتخاب تعداد روز، افزودن حرکات با دسته‌بندی و ست/تکرار</p>
              </div>
              <div className="text-center space-y-4">
                <div className="w-12 h-12 bg-primary-600 text-white rounded-full flex items-center justify-center mx-auto text-xl font-bold">۳</div>
                <h3 className="text-xl font-bold text-gray-900">اشتراک‌گذاری</h3>
                <p className="text-gray-600">ذخیره، دانلود PDF یا ارسال لینک برای ورزشکار</p>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-primary-600 py-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
            <h2 className="text-3xl sm:text-4xl font-bold text-white">آماده شروع هستید؟</h2>
            <p className="text-xl text-primary-100">همین حالا وارد شوید و اولین برنامه را بسازید</p>
            <Link to="/login">
              <Button variant="secondary" size="lg" className="bg-white text-primary-600 hover:bg-gray-50">ورود مربی</Button>
            </Link>
          </div>
        </section>
      </main>

      <footer className="bg-white border-t border-gray-200 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-gray-600">
          <p>© ۱۴۰۴ Gym Program Builder. تمامی حقوق محفوظ است.</p>
        </div>
      </footer>
    </div>
  )
}
