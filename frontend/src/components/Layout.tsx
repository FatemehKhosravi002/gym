import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const { user, logout } = useAuth()

  const nav = [
    { path: '/athletes', label: 'ورزشکاران' },
    { path: '/library', label: 'کتابخانه حرکات' },
    { path: '/templates', label: 'قالب‌های برنامه' },
  ]
  if (user?.is_superuser || user?.role === 'admin') {
    nav.push({ path: '/pending-coaches', label: 'تأیید مربی‌ها' })
    nav.push({ path: '/system-admin', label: 'پنل ادمین سیستم' })
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <header className="bg-[#141716] border-b border-white/10 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/athletes" className="text-lg font-bold text-white hover:text-[#B6F500]">Physique</Link>
          <div className="flex items-center gap-3">
            <span className="text-sm text-white">{user?.first_name || user?.username}</span>
            <Link to="/change-password" className="text-sm text-white hover:text-[#B6F500] min-h-[44px] flex items-center px-2">تغییر رمز عبور</Link>
            <button onClick={logout} className="text-sm text-white hover:text-[#B6F500] min-h-[44px] px-2">خروج</button>
          </div>
        </div>
      </header>
      <nav className="bg-[#141716] border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 flex gap-6 overflow-x-auto">
          {nav.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={`py-3 px-1 text-base font-medium border-b-2 min-h-[44px] flex items-center whitespace-nowrap ${
                location.pathname === item.path
                  ? 'border-[#B6F500] text-[#B6F500]'
                  : 'border-transparent text-white hover:text-[#B6F500]'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 py-6 pb-20 text-white">
        {children}
      </main>
    </div>
  )
}
