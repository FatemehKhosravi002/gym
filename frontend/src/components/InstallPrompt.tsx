import { useState, useEffect } from 'react'
import Button from './Button'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showInstall, setShowInstall] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone
    setIsStandalone(standalone)
    
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
    setIsIOS(iOS)
    
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setShowInstall(true)
    }
    
    window.addEventListener('beforeinstallprompt', handler)
    
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setDeferredPrompt(null)
      setShowInstall(false)
    }
  }

  if (isStandalone || !showInstall) return null

  if (isIOS) {
    return (
      <div className="fixed bottom-4 left-4 right-4 bg-white rounded-2xl shadow-lg border border-gray-200 p-4 z-50" dir="rtl">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold">GB</span>
          </div>
          <div className="flex-1">
            <p className="font-medium text-gray-900 mb-1">نصب اپ روی گوشی</p>
            <p className="text-sm text-gray-600 mb-2">
              روی دکمه اشتراک‌گذاری <span className="inline-block">⬆️</span> ضربه بزنید و سپس «افزودن به صفحه اصلی» را انتخاب کنید
            </p>
            <button onClick={() => setShowInstall(false)} className="text-sm text-gray-500">بستن</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 bg-white rounded-2xl shadow-lg border border-gray-200 p-4 z-50" dir="rtl">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold">GB</span>
        </div>
        <div className="flex-1">
          <p className="font-medium text-gray-900">نصب اپ Gym Program Builder</p>
          <p className="text-sm text-gray-600">دسترسی سریع‌تر از صفحه اصلی</p>
        </div>
        <Button onClick={handleInstall} size="sm">نصب اپ</Button>
        <button onClick={() => setShowInstall(false)} className="text-gray-400 hover:text-gray-600 px-2">✕</button>
      </div>
    </div>
  )
}
