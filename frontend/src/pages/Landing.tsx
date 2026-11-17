import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Button from '../components/Button'
import Card from '../components/Card'
import { CheckIcon } from '../components/icons'

const features = [
  { title: 'ساخت برنامه در چند دقیقه', body: 'روز به روز پیش بروید؛ سیستم حرکات را دسته‌بندی‌شده نشان می‌دهد.' },
  { title: 'هشدار تکرار حرکات', body: 'اگر حرکتی در برنامه‌های قبلی ورزشکار بوده، قبل از افزودن اطلاع می‌دهید.' },
  { title: 'PDF و لینک اشتراک', body: 'برنامه را چاپ کنید یا لینک اختصاصی برای ورزشکار بسازید.' },
]

/** Friendly hero illustration — inline SVG, no external asset. */
function HeroArt() {
  return (
    <svg viewBox="0 0 320 260" className="h-auto w-full max-w-sm" role="img" aria-label="تصویر برنامه تمرینی">
      <ellipse cx="160" cy="232" rx="118" ry="16" fill="#E7EFE3" />
      <rect x="58" y="30" width="204" height="176" rx="26" fill="#FFFFFF" stroke="#DCFCE7" strokeWidth="3" />
      <rect x="78" y="52" width="86" height="12" rx="6" fill="#14532D" />
      <rect x="78" y="76" width="146" height="10" rx="5" fill="#E7EFE3" />
      <rect x="78" y="104" width="164" height="34" rx="12" fill="#F0FDF4" />
      <circle cx="98" cy="121" r="9" fill="#16A34A" />
      <rect x="116" y="116" width="94" height="10" rx="5" fill="#BBF7D0" />
      <rect x="78" y="146" width="164" height="34" rx="12" fill="#FFF7ED" />
      <circle cx="98" cy="163" r="9" fill="#F97316" />
      <rect x="116" y="158" width="72" height="10" rx="5" fill="#FED7AA" />
      <circle cx="246" cy="196" r="30" fill="#16A34A" />
      <path d="M232 196l9 9 18-19" fill="none" stroke="#FFFFFF" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function Landing() {
  const { token } = useAuth()
  if (token) return <Navigate to="/athletes" replace />

  return (
    <div className="min-h-screen bg-canvas">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2" aria-label="Physique">
            <img src="/brand/Logo.svg" alt="" className="h-9 w-auto md:h-11" />
            <span className="text-lg font-bold text-primary-900">Physique</span>
          </Link>
          <Link to="/login">
            <Button size="sm" variant="outline">ورود مربی</Button>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4">
        <section className="grid items-center gap-8 py-10 md:grid-cols-2 md:py-16">
          <div className="space-y-5 text-center md:text-right">
            <span className="inline-flex items-center gap-2 rounded-pill bg-accent-50 px-3 py-1 text-sm font-semibold text-accent-700">
              برنامه‌ساز بدنسازی برای مربیان
            </span>
            <h1 className="text-3xl font-black leading-tight text-primary-900 sm:text-4xl">
              برنامه تمرینی حرفه‌ای،
              <br />
              <span className="text-primary-600">در چند دقیقه</span>
            </h1>
            <p className="text-base text-ink-600 sm:text-lg">
              Physique به مربیان ایرانی کمک می‌کند برنامه ورزشکاران را سریع بسازند، تکرار حرکات را کنترل کنند و برنامه را با PDF یا لینک تحویل دهند.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center md:justify-start">
              <Link to="/register" className="sm:w-auto">
                <Button size="lg" fullWidth>شروع کنید</Button>
              </Link>
              <Link to="/login" className="sm:w-auto">
                <Button size="lg" variant="outline" fullWidth>ورود به حساب</Button>
              </Link>
            </div>
          </div>
          <div className="flex justify-center">
            <HeroArt />
          </div>
        </section>

        <section className="pb-14">
          <h2 className="mb-6 text-center text-xl font-bold text-primary-900 sm:text-2xl">چه چیزی در اختیار دارید؟</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {features.map((f) => (
              <Card key={f.title}>
                <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-primary-50 text-primary-700">
                  <CheckIcon className="h-6 w-6" />
                </span>
                <h3 className="mb-1 text-base font-bold text-primary-900">{f.title}</h3>
                <p className="text-sm leading-relaxed text-ink-600">{f.body}</p>
              </Card>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-surface py-6">
        <div className="mx-auto max-w-5xl px-4 text-center text-sm text-ink-500">
          Physique — «قدرت از انضباط شروع می‌شود»
        </div>
      </footer>
    </div>
  )
}
