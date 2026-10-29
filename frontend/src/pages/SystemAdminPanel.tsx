import { useState, useEffect } from 'react'
import api from '../utils/api'
import Card from '../components/Card'
import Button from '../components/Button'
import Input from '../components/Input'

export default function SystemAdminPanel() {
  const [tab, setTab] = useState('overview')
  const [overview, setOverview] = useState<any>({})
  const [settings, setSettings] = useState({ registration_requires_approval: false })
  const [coaches, setCoaches] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [tempPass, setTempPass] = useState<{show: boolean, pass: string}>({show: false, pass: ''})
  const [viewCoach, setViewCoach] = useState<any>(null)

  useEffect(() => {
    loadOverview()
    loadSettings()
    loadCoaches()
  }, [])

  const loadOverview = async () => {
    try {
      const res = await api.get('/admin/overview/')
      setOverview(res.data)
    } catch {}
  }

  const loadSettings = async () => {
    try {
      const res = await api.get('/admin/settings/')
      setSettings(res.data)
    } catch {}
  }

  const loadCoaches = async () => {
    try {
      const res = await api.get(`/admin/coaches/?search=${encodeURIComponent(search)}&filter=${filter}`)
      setCoaches(res.data)
    } catch {}
  }

  useEffect(() => {
    const t = setTimeout(loadCoaches, 300)
    return () => clearTimeout(t)
  }, [search, filter])

  const toggleSetting = async () => {
    const newVal = !settings.registration_requires_approval
    await api.post('/admin/settings/', { registration_requires_approval: newVal })
    setSettings({ registration_requires_approval: newVal })
    alert('تنظیمات با موفقیت ذخیره شد')
  }

  const doAction = async (id: number, action: string) => {
    if (action === 'reset_password') {
      if (!confirm('آیا می‌خواهید رمز موقت تولید کنید؟')) return
      const res = await api.post(`/admin/coaches/${id}/action/`, { action })
      setTempPass({show: true, pass: res.data.temp_password})
    } else if (action === 'deactivate') {
      if (!confirm('آیا می‌خواهید این مربی را غیرفعال کنید؟')) return
      await api.post(`/admin/coaches/${id}/action/`, { action })
    } else {
      await api.post(`/admin/coaches/${id}/action/`, { action })
    }
    loadCoaches()
    loadOverview()
  }

  const viewCoachData = async (id: number) => {
    try {
      const res = await api.get(`/admin/coaches/${id}/view/`)
      setViewCoach(res.data)
    } catch {}
  }

  const copyPass = () => {
    navigator.clipboard.writeText(tempPass.pass)
    alert('رمز موقت کپی شد')
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-900">پنل ادمین سیستم</h2>
      
      <div className="flex gap-2 overflow-x-auto">
        {[{k:'overview',l:'نمای کلی'},{k:'settings',l:'تنظیمات'},{k:'coaches',l:'مربی‌ها'}].map(t => (
          <button key={t.k} onClick={() => setTab(t.k)} className={`px-4 py-2 rounded-xl min-h-[44px] whitespace-nowrap ${tab === t.k ? 'bg-primary-600 text-white' : 'bg-white border'}`}>{t.l}</button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card className="text-center"><p className="text-2xl font-bold text-primary-600">{overview.coaches_count || 0}</p><p className="text-sm text-gray-600">مربی‌ها</p></Card>
          <Card className="text-center"><p className="text-2xl font-bold text-primary-600">{overview.athletes_count || 0}</p><p className="text-sm text-gray-600">ورزشکاران</p></Card>
          <Card className="text-center"><p className="text-2xl font-bold text-primary-600">{overview.programs_count || 0}</p><p className="text-sm text-gray-600">برنامه‌ها</p></Card>
          <Card className="text-center"><p className="text-2xl font-bold text-primary-600">{overview.programs_this_month || 0}</p><p className="text-sm text-gray-600">برنامه این ماه</p></Card>
          <Card className="text-center"><p className="text-2xl font-bold text-primary-600">{overview.new_coaches_7_days || 0}</p><p className="text-sm text-gray-600">مربی جدید ۷ روز</p></Card>
        </div>
      )}

      {tab === 'settings' && (
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">ثبت‌نام مربی‌ها نیاز به تأیید ادمین سیستم دارد</p>
              <p className="text-sm text-gray-600 mt-1">در صورت فعال بودن، مربی‌های جدید پس از ثبت‌نام تا تأیید نمی‌توانند وارد شوند</p>
            </div>
            <button onClick={toggleSetting} className={`w-12 h-6 rounded-full transition-colors ${settings.registration_requires_approval ? 'bg-primary-600' : 'bg-gray-300'}`}>
              <div className={`w-5 h-5 bg-white rounded-full transition-transform ${settings.registration_requires_approval ? '-translate-x-6' : '-translate-x-1'}`} />
            </button>
          </div>
        </Card>
      )}

      {tab === 'coaches' && (
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <Input placeholder="جستجو بر اساس نام یا نام کاربری..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <select value={filter} onChange={(e) => setFilter(e.target.value)} className="px-3 py-2 border rounded-xl min-h-[44px]">
              <option value="all">همه</option>
              <option value="active">فعال</option>
              <option value="inactive">غیرفعال</option>
              <option value="pending">در انتظار تأیید</option>
            </select>
          </div>
          <div className="space-y-2">
            {coaches.map(c => (
              <Card key={c.id}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{c.first_name} {c.last_name} (@{c.username})</p>
                    <p className="text-sm text-gray-500">{c.phone || '-'} | ورزشکاران: {c.athletes_count} | برنامه‌ها: {c.programs_count}</p>
                    <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs ${c.is_approved && c.is_active ? 'bg-green-100 text-green-800' : c.is_approved ? 'bg-gray-100 text-gray-800' : 'bg-amber-100 text-amber-800'}`}>
                      {c.is_approved && c.is_active ? 'فعال' : !c.is_active ? 'غیرفعال' : 'در انتظار تأیید'}
                    </span>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {!c.is_approved && <Button size="sm" onClick={() => doAction(c.id, 'approve')}>تأیید</Button>}
                    {c.is_active ? <Button variant="secondary" size="sm" onClick={() => doAction(c.id, 'deactivate')}>غیرفعال‌کردن</Button> : <Button variant="secondary" size="sm" onClick={() => doAction(c.id, 'activate')}>فعال‌کردن</Button>}
                    <Button variant="secondary" size="sm" onClick={() => doAction(c.id, 'reset_password')}>بازنشانی رمز</Button>
                    <Button variant="tertiary" size="sm" onClick={() => viewCoachData(c.id)}>مشاهدهٔ ورزشکاران و برنامه‌های این مربی</Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {tempPass.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
          <Card className="w-full max-w-md">
            <h3 className="font-bold text-gray-900 mb-4">رمز موقت تولید شد</h3>
            <p className="text-sm text-red-600 mb-3">این رمز فقط یک‌بار نمایش داده می‌شود</p>
            <div className="bg-gray-100 p-3 rounded-xl font-mono text-center text-lg mb-4 select-all">{tempPass.pass}</div>
            <div className="flex gap-2">
              <Button onClick={copyPass} className="flex-1">کپی رمز</Button>
              <Button variant="secondary" onClick={() => setTempPass({show: false, pass: ''})} className="flex-1">بستن</Button>
            </div>
          </Card>
        </div>
      )}

      {viewCoach && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50">
          <Card className="w-full sm:max-w-2xl m-4 max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold mb-4">ورزشکاران و برنامه‌های مربی</h3>
            <p className="font-medium mb-2">ورزشکاران</p>
            <div className="space-y-1 mb-4">
              {viewCoach.athletes?.map((a:any) => <p key={a.id} className="text-sm">{a.first_name} {a.last_name} ({a.unique_code})</p>)}
            </div>
            <p className="font-medium mb-2">برنامه‌ها</p>
            <div className="space-y-1 mb-4">
              {viewCoach.programs?.map((p:any) => <p key={p.id} className="text-sm">برنامه {p.sequence_number} - {p.title}</p>)}
            </div>
            <Button variant="secondary" onClick={() => setViewCoach(null)} className="w-full">بستن</Button>
          </Card>
        </div>
      )}
    </div>
  )
}
