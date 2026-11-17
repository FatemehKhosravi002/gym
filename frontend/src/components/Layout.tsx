import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Modal from './Modal'
import Button from './Button'
import Avatar from './Avatar'
import { NavIcon, type NavIconName, LogoutIcon, KeyIcon, ShieldIcon } from './icons'

type Tab = { path: string; label: string; icon: NavIconName; primary?: boolean }

const tabs: Tab[] = [
  { path: '/athletes', label: 'ورزشکاران', icon: 'athletes' },
  { path: '/programs/new', label: 'برنامه جدید', icon: 'newProgram', primary: true },
  { path: '/library', label: 'کتابخانه', icon: 'library' },
  { path: '/templates', label: 'قالب‌ها', icon: 'templates' },
]

function isActive(pathname: string, path: string) {
  if (path === '/athletes') return pathname === '/athletes' || pathname.startsWith('/athletes/')
  if (path === '/programs/new') return pathname === '/programs/new' || pathname.startsWith('/programs/builder/')
  if (path === '/templates') return pathname.startsWith('/templates')
  if (path === '/library') return pathname.startsWith('/library')
  return pathname === path
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation()
  const { user, logout } = useAuth()
  const [profileOpen, setProfileOpen] = useState(false)

  const isAdmin = Boolean(user?.is_superuser || user?.role === 'admin')
  const displayName = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.username || ''
  const adminLinks = isAdmin
    ? [
        { path: '/pending-coaches', label: 'تأیید مربی‌ها' },
        { path: '/system-admin', label: 'پنل ادمین سیستم' },
      ]
    : []

  const avatar = <Avatar firstName={user?.first_name} lastName={user?.last_name} size="sm" className="ring-2 ring-white/30" />

  const navItem = (tab: Tab) => {
    const active = isActive(pathname, tab.path)
    return (
      <Link
        key={tab.path}
        to={tab.path}
        aria-current={active ? 'page' : undefined}
        className={`flex min-h-[48px] items-center gap-3 rounded-field px-4 text-sm font-semibold transition-colors duration-base ${
          active ? 'bg-primary-50 text-primary-900' : 'text-ink-700 hover:bg-surface-2 hover:text-ink-900'
        }`}
      >
        <NavIcon name={tab.icon} className={`h-5 w-5 ${active ? 'text-primary-700' : 'text-ink-500'}`} />
        <span className="flex-1">{tab.label}</span>
        {active && <span className="h-2 w-2 rounded-full bg-accent-500" aria-hidden="true" />}
      </Link>
    )
  }

  return (
    <div className="min-h-screen bg-canvas">
      {/* Deep-green top bar with the white logo: 36px phones, 44px desktop. */}
      <header className="sticky top-0 z-40 bg-primary-900 text-white shadow-soft">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-3 sm:px-5 md:h-16">
          <Link to="/athletes" className="flex min-h-[48px] items-center gap-2" aria-label="Physique — ورزشکاران">
            <img src="/brand/logo.svg" alt="" className="h-9 w-auto md:h-11" />
            <span className="hidden text-lg font-bold sm:inline">Physique</span>
          </Link>
          <div className="flex items-center gap-1.5">
            <span className="hidden max-w-[12rem] truncate text-sm text-primary-100 sm:block">{displayName}</span>
            <button
              type="button"
              onClick={() => setProfileOpen(true)}
              aria-label="باز کردن پروفایل"
              className="flex h-12 w-12 items-center justify-center rounded-full transition-colors duration-fast hover:bg-white/10"
            >
              {avatar}
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-6xl">
        {/* Desktop sidebar (right side in RTL). */}
        <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-64 shrink-0 flex-col border-s border-border bg-surface px-3 py-5 md:flex">
          <nav className="flex flex-col gap-1" aria-label="منوی اصلی">
            {tabs.map(navItem)}
            {adminLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                aria-current={pathname === link.path ? 'page' : undefined}
                className={`flex min-h-[48px] items-center gap-3 rounded-field px-4 text-sm font-semibold transition-colors duration-base ${
                  pathname === link.path ? 'bg-primary-50 text-primary-900' : 'text-ink-700 hover:bg-surface-2'
                }`}
              >
                <ShieldIcon className="h-5 w-5 text-ink-500" />
                <span className="flex-1">{link.label}</span>
              </Link>
            ))}
          </nav>
          <div className="mt-auto space-y-1 border-t border-border pt-3">
            <Link to="/change-password" className="flex min-h-[48px] items-center gap-3 rounded-field px-4 text-sm font-semibold text-ink-700 hover:bg-surface-2">
              <KeyIcon className="h-5 w-5 text-ink-500" />
              تغییر رمز عبور
            </Link>
            <button type="button" onClick={logout} className="flex min-h-[48px] w-full items-center gap-3 rounded-field px-4 text-sm font-semibold text-error-700 hover:bg-error-50">
              <LogoutIcon className="h-5 w-5" />
              خروج
            </button>
          </div>
        </aside>

        <main className="min-w-0 flex-1 px-3 pb-[calc(var(--tabbar-height)+1.25rem)] pt-4 sm:px-5 md:pb-10 md:pt-6">
          <div className="mx-auto w-full max-w-3xl">{children}</div>
        </main>
      </div>

      {/* Bottom tab bar on phones: 64px, safe-area aware. */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 backdrop-blur md:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        aria-label="ناوبری پایین"
      >
        <ul className="mx-auto flex h-[var(--tabbar-height)] max-w-lg items-stretch justify-between px-1">
          {tabs.map((tab) => {
            const active = isActive(pathname, tab.path)
            if (tab.primary) {
              return (
                <li key={tab.path} className="flex flex-1 items-center justify-center">
                  <Link to={tab.path} aria-current={active ? 'page' : undefined} className="flex h-14 w-14 -translate-y-3 items-center justify-center rounded-full bg-primary-700 text-white shadow-glow transition-transform duration-fast active:scale-95">
                    <NavIcon name={tab.icon} />
                    <span className="sr-only">{tab.label}</span>
                  </Link>
                </li>
              )
            }
            return (
              <li key={tab.path} className="flex-1">
                <Link
                  to={tab.path}
                  aria-current={active ? 'page' : undefined}
                  className={`flex h-full flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition-colors duration-fast ${active ? 'text-primary-800' : 'text-ink-500'}`}
                >
                  <NavIcon name={tab.icon} className="h-5 w-5" />
                  {tab.label}
                </Link>
              </li>
            )
          })}
          <li className="flex-1">
            <button type="button" onClick={() => setProfileOpen(true)} className="flex h-full w-full flex-col items-center justify-center gap-0.5 text-[11px] font-semibold text-ink-500">
              <NavIcon name="profile" className="h-5 w-5" />
              پروفایل
            </button>
          </li>
        </ul>
      </nav>

      <Modal open={profileOpen} onClose={() => setProfileOpen(false)} title="پروفایل" description={displayName || undefined}>
        <div className="flex items-center gap-3 pb-4">
          <Avatar firstName={user?.first_name} lastName={user?.last_name} size="lg" />
          <div className="min-w-0">
            <p className="truncate font-bold text-primary-900">{displayName || 'مربی'}</p>
            <p className="truncate text-sm text-ink-600">{user?.username}</p>
          </div>
        </div>
        <div className="space-y-1">
          <Link to="/change-password" onClick={() => setProfileOpen(false)} className="flex min-h-[48px] items-center gap-3 rounded-field px-3 text-sm font-semibold text-ink-700 hover:bg-surface-2">
            <KeyIcon className="h-5 w-5 text-ink-500" />
            تغییر رمز عبور
          </Link>
          {adminLinks.map((link) => (
            <Link key={link.path} to={link.path} onClick={() => setProfileOpen(false)} className="flex min-h-[48px] items-center gap-3 rounded-field px-3 text-sm font-semibold text-ink-700 hover:bg-surface-2">
              <ShieldIcon className="h-5 w-5 text-ink-500" />
              {link.label}
            </Link>
          ))}
        </div>
        <div className="pt-4">
          <Button variant="outline" fullWidth onClick={logout} icon={<LogoutIcon className="h-5 w-5" />}>
            خروج از حساب
          </Button>
        </div>
      </Modal>
    </div>
  )
}
