import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Button from '../components/Button'
import Card from '../components/Card'

export default function InstallGuide() {
  const [isIOS, setIsIOS] = useState(false)
  const [isSafari, setIsSafari] = useState(false)

  useEffect(() => {
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
    setIsIOS(iOS)
    const safari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
    setIsSafari(safari)
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4" dir="rtl">
      <div className="max-w-md mx-auto space-y-6">
        <div className="text-center">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-12 h-12 bg-primary-600 rounded-2xl flex items-center justify-center">
              <span className="text-white font-bold text-xl">GB</span>
            </div>
            <span className="text-xl font-bold text-gray-900">Gym Program Builder</span>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">نصب اپ روی گوشی</h1>
          <p className="text-gray-600">برای دسترسی سریع‌تر اپ را روی صفحه اصلی نصب کنید</p>
        </div>

        {isIOS ? (
          isSafari ? (
            <Card className="space-y-4">
              <h2 className="font-bold text-gray-900">آموزش نصب روی iOS Safari</h2>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0 text-primary-600 font-bold">۱</div>
                  <div>
                    <p className="font-medium text-gray-900 mb-1">دکمه اشتراک‌گذاری</p>
                    <p className="text-sm text-gray-600">در نوار پایین یا بالا روی آیکون اشتراک‌گذاری (⬆️) ضربه بزنید</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0 text-primary-600 font-bold">۲</div>
                  <div>
                    <p className="font-medium text-gray-900 mb-1">افزودن به صفحه اصلی</p>
                    <p className="text-sm text-gray-600">در منوی باز شده، «افزودن به صفحه اصلی» را انتخاب کنید</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0 text-primary-600 font-bold">۳</div>
                  <div>
                    <p className="font-medium text-gray-900 mb-1">تایید نصب</p>
                    <p className="text-sm text-gray-600">روی «افزودن» در بالا سمت راست ضربه بزنید</p>
                  </div>
                </div>
              </div>
            </Card>
          ) : (
            <Card className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-amber-800 font-medium mb-2">توجه</p>
                <p className="text-amber-700 text-sm">
                  برای نصب اپ در iOS، لطفاً این لینک را در مرورگر <strong>Safari</strong> باز کنید
                </p>
              </div>
            </Card>
          )
        ) : (
          <Card className="space-y-4">
            <h2 className="font-bold text-gray-900">آموزش نصب روی Android</h2>
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0 text-primary-600 font-bold">۱</div>
                <div>
                  <p className="font-medium text-gray-900 mb-1">منوی مرورگر</p>
                  <p className="text-sm text-gray-600">روی سه نقطه (⋮) در گوشه بالا راست ضربه بزنید</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0 text-primary-600 font-bold">۲</div>
                <div>
                  <p className="font-medium text-gray-900 mb-1">نصب اپ</p>
                  <p className="text-sm text-gray-600">گزینه «نصب اپ» یا «افزودن به صفحه اصلی» را انتخاب کنید</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0 text-primary-600 font-bold">۳</div>
                <div>
                  <p className="font-medium text-gray-900 mb-1">تایید</p>
                  <p className="text-sm text-gray-600">روی «نصب» ضربه بزنید</p>
                </div>
              </div>
            </div>
          </Card>
        )}

        <div className="text-center">
          <Link to="/">
            <Button variant="secondary">بازگشت به صفحه اصلی</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
