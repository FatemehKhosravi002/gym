import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../utils/api'
import Button from '../components/Button'
import Card from '../components/Card'
import Input from '../components/Input'
import { toPersianDigits } from '../utils/persianDigits'
import { toJalaliMonth } from '../utils/jalali'
import JalaliDatePicker from '../components/JalaliDatePicker'

export default function ProgramBuilder() {
  const { athleteId } = useParams()
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [daysPerWeek, setDaysPerWeek] = useState(3)
  const [selectedDays, setSelectedDays] = useState<number | null>(null)
  const [currentDay, setCurrentDay] = useState(1)
  const [program, setProgram] = useState<any>(null)
  const [days, setDays] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [exercises, setExercises] = useState<any[]>([])
  const [selectedCat, setSelectedCat] = useState<number | null>(null)
  const [searchEx, setSearchEx] = useState('')
  const [currentItems, setCurrentItems] = useState<any[]>([])
  const [dayLabel, setDayLabel] = useState('')
  const [duplicateAlert, setDuplicateAlert] = useState<any>(null)
  const [athleteInfo, setAthleteInfo] = useState<any>(null)
  const [showMeasure, setShowMeasure] = useState(false)
  const [measureForm, setMeasureForm] = useState({ weight_kg: '', height_cm: '', date: new Date().toISOString().split('T')[0] })

  useEffect(() => {
    loadCats()
    loadExs()
    if (athleteId) {
      api.get(`/athletes/${athleteId}/`).then(res => setAthleteInfo(res.data))
      api.get(`/athletes/${athleteId}/measurements/`).then(res => {
        if (res.data && res.data.length > 0) {
          setAthleteInfo((prev: any) => ({...(prev||{}), last_measurement: res.data[0]}))
        }
      }).catch(()=>{})
    }
  }, [athleteId])

  const loadCats = async () => {
    const res = await api.get('/library/categories/')
    setCategories((res.data.results || res.data).filter((c:any)=>c.is_active!==false))
  }
  const loadExs = async () => {
    const res = await api.get('/library/exercises/')
    setExercises(res.data.results || res.data)
  }

  const saveMeasurement = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post(`/athletes/${athleteId}/measurements/`, { athlete: athleteId, ...measureForm })
      const res = await api.get(`/athletes/${athleteId}/measurements/`)
      if (res.data && res.data.length > 0) {
        setAthleteInfo((prev: any) => ({...(prev||{}), last_measurement: res.data[0]}))
      }
      setShowMeasure(false)
      setMeasureForm({ weight_kg: '', height_cm: '', date: new Date().toISOString().split('T')[0] })
    } catch (err: any) {
      alert(err.response?.data?.date?.[0] || 'خطا در ثبت اندازه‌گیری')
    }
  }

  const startProgram = async () => {
    if (!selectedDays) return
    setDaysPerWeek(selectedDays)
    try {
      const today = new Date().toISOString().split('T')[0]
      const res = await api.post('/programs/', {
        athlete: athleteId,
        title: `برنامه ${toJalaliMonth(today)}`,
        start_date: today,
        days_per_week: selectedDays,
        status: 'draft'
      })
      setProgram(res.data)
      const dayList = []
      for (let i = 1; i <= selectedDays; i++) {
        try {
          const dres = await api.post('/program-days/', { program: res.data.id, day_index: i, label: '' })
          dayList.push({ id: dres?.data?.id, day_index: i, items: [] })
        } catch {
          dayList.push({ day_index: i, items: [] })
        }
      }
      setDays(dayList)
      setStep(2)
      setCurrentDay(1)
    } catch (e) {
      alert('خطا در ایجاد برنامه')
    }
  }

  const addExercise = async (ex: any) => {
    if (currentItems.find((it: any) => it.exercise === ex.id)) {
      setDuplicateAlert({ sameDay: true, day: currentDay })
      return
    }
    try {
      const check = await api.get(`/programs/duplicate_check/?athlete_id=${athleteId}&exercise_id=${ex.id}${program ? `&exclude_program=${program.id}` : ''}`)
      const data = check.data
      if (data.duplicate || data.used) {
        setDuplicateAlert({ exercise: ex, info: data })
        return
      }
    } catch {}
    const newItem = { exercise: ex.id, exercise_detail: ex, sets: '3', reps: '10', order: currentItems.length, tempId: Date.now() }
    setCurrentItems([...currentItems, newItem])
  }

  const confirmAddDuplicate = () => {
    if (duplicateAlert?.sameDay) {
      setDuplicateAlert(null)
      return
    }
    if (duplicateAlert?.exercise) {
      const ex = duplicateAlert.exercise
      const newItem = { exercise: ex.id, exercise_detail: ex, sets: '3', reps: '10', order: currentItems.length, tempId: Date.now() }
      setCurrentItems([...currentItems, newItem])
      setDuplicateAlert(null)
    }
  }

  const saveAndNext = async () => {
    if (currentItems.length === 0) return
    const day = days.find(d => d.day_index === currentDay)
    if (day && program && day.id) {
      for (let i = 0; i < currentItems.length; i++) {
        const it = currentItems[i]
        try {
          await api.post('/program-items/', {
            program_day: day.id,
            exercise: it.exercise,
            order: i,
            sets: it.sets,
            reps: it.reps,
            superset_group: it.superset_group || null
          })
        } catch {}
      }
    }
    if (currentDay < daysPerWeek) {
      setCurrentDay(currentDay + 1)
      setCurrentItems([])
      setDayLabel('')
      setSelectedCat(null)
      setSearchEx('')
    } else {
      alert('برنامه با موفقیت ذخیره شد')
      navigate(`/athletes/${athleteId}`)
    }
  }

  const filteredEx = exercises.filter((e: any) => {
    const matchCat = selectedCat ? e.category === selectedCat : true
    const matchSearch = searchEx ? e.name.toLowerCase().includes(searchEx.toLowerCase()) : true
    return matchCat && matchSearch && e.is_active !== false
  })

  if (step === 1) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-md space-y-6">
          <h2 className="text-xl sm:text-2xl font-bold text-primary-900 text-center">این برنامه چند روزه است؟</h2>
          <div className="grid grid-cols-4 gap-3">
            {[1,2,3,4,5,6,7].map(n => (
              <button
                key={n}
                onClick={() => setSelectedDays(n)}
                className={`h-16 sm:h-20 rounded-2xl text-xl sm:text-2xl font-bold min-h-[56px] border-2 transition-all focus:outline-none focus:ring-2 focus:ring-primary-600 ${
                  selectedDays === n 
                    ? 'bg-primary-700 text-white border-primary-700' 
                    : 'bg-surface-2 text-ink-900 border-border'
                }`}
              >
                {toPersianDigits(n)}
              </button>
            ))}
          </div>
          <Button onClick={startProgram} disabled={!selectedDays} className="w-full" size="lg">ادامه</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="pb-32">
      {athleteInfo && (
        <Card className="mb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-ink-900">{athleteInfo.first_name} {athleteInfo.last_name}</p>
              <p className="text-sm text-ink-600">کد: {toPersianDigits(athleteInfo.unique_code)}</p>
              {athleteInfo.last_measurement ? (
                <p className="text-sm text-ink-600 mt-1">وزن: {toPersianDigits(athleteInfo.last_measurement.weight_kg)} کیلوگرم {athleteInfo.last_measurement.height_cm && `| قد: ${toPersianDigits(athleteInfo.last_measurement.height_cm)} سانتی‌متر`}</p>
              ) : (
                <p className="text-sm text-ink-500 mt-1">قد و وزن ثبت نشده</p>
              )}
            </div>
            <Button size="sm" onClick={() => setShowMeasure(true)}>ثبت وزن/قد</Button>
          </div>
        </Card>
      )}

      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold text-primary-900">روز {toPersianDigits(currentDay)} از {toPersianDigits(daysPerWeek)}</h2>
        </div>
        <div className="flex gap-1">
          {Array.from({length: daysPerWeek}).map((_, i) => (
            <div key={i} className={`flex-1 h-2 rounded-full ${i+1 <= currentDay ? 'bg-primary-500' : 'bg-surface-2'}`} />
          ))}
        </div>
      </div>

      <Card className="mb-4">
        <Input label="برچسب روز (اختیاری)" placeholder="مثال: سینه + پشت بازو" value={dayLabel} onChange={(e) => setDayLabel(e.target.value)} />
      </Card>

      <Card className="mb-4">
        <p className="font-medium mb-3 text-ink-900">انتخاب حرکت</p>
        <div className="flex flex-wrap gap-2 mb-3">
          <button onClick={() => setSelectedCat(null)} className={`px-3 py-2 rounded-xl min-h-[44px] text-sm ${selectedCat === null ? 'bg-primary-500 text-ink-900' : 'bg-surface-2 text-ink-900 border border-border'}`}>همه</button>
          {categories.map(cat => (
            <button key={cat.id} onClick={() => setSelectedCat(cat.id)} className={`px-3 py-2 rounded-xl min-h-[44px] text-sm ${selectedCat === cat.id ? 'bg-primary-500 text-ink-900' : 'bg-surface-2 text-ink-900 border border-border'}`}>{cat.name}</button>
          ))}
        </div>
        <Input placeholder="جستجوی حرکت..." value={searchEx} onChange={(e) => setSearchEx(e.target.value)} />
        <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
          {filteredEx.slice(0, 30).map(ex => (
            <button
              key={ex.id}
              onClick={() => addExercise(ex)}
              className="w-full text-right p-3 bg-surface-2 rounded-xl hover:bg-surface-3 min-h-[44px] text-ink-900 border border-border"
            >
              {ex.name}
            </button>
          ))}
        </div>
      </Card>

      {currentItems.length > 0 && (
        <Card className="mb-4">
          <p className="font-medium mb-3 text-ink-900">حرکات این روز</p>
          <div className="space-y-2">
            {currentItems.map((item, idx) => (
              <div key={item.tempId || idx} className="flex items-center gap-2 p-2 bg-surface-2 rounded-xl border border-border">
                <span className="text-sm text-ink-600 w-6">{toPersianDigits(idx + 1)}</span>
                <span className="flex-1 text-sm text-ink-900">{item.exercise_detail?.name}</span>
                <input className="w-12 px-2 py-1 border border-border rounded text-center text-sm text-ink-900 bg-surface-2" value={item.sets} onChange={(e) => { const newItems=[...currentItems]; newItems[idx].sets=e.target.value; setCurrentItems(newItems); }} />
                <span className="text-ink-900">×</span>
                <input className="w-16 px-2 py-1 border border-border rounded text-center text-sm text-ink-900 bg-surface-2" value={item.reps} onChange={(e) => { const newItems=[...currentItems]; newItems[idx].reps=e.target.value; setCurrentItems(newItems); }} />
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="fixed bottom-0 left-0 right-0 bg-surface border-t border-border p-4">
        <div className="max-w-7xl mx-auto flex gap-2">
          {currentDay > 1 && <Button variant="secondary" onClick={() => { setCurrentDay(currentDay-1); setCurrentItems([]); }} className="flex-1">روز قبل</Button>}
          <Button onClick={saveAndNext} disabled={currentItems.length === 0} className="flex-1">
            {currentDay < daysPerWeek ? 'ذخیره و رفتن به روز بعد' : 'پایان و ساخت برنامه'}
          </Button>
        </div>
      </div>

      {showMeasure && (
        <div className="fixed inset-0 bg-ink-900/40 flex items-end sm:items-center justify-center z-50">
          <Card className="w-full sm:max-w-md m-4">
            <h3 className="font-semibold mb-4 text-primary-900">ثبت وزن و قد</h3>
            <form onSubmit={saveMeasurement} className="space-y-3">
              <Input label="وزن (کیلوگرم)" value={measureForm.weight_kg} onChange={(e) => setMeasureForm({...measureForm, weight_kg: e.target.value})} required />
              <Input label="قد (سانتی‌متر)" value={measureForm.height_cm} onChange={(e) => setMeasureForm({...measureForm, height_cm: e.target.value})} />
<JalaliDatePicker label="تاریخ" value={measureForm.date} onChange={(v) => setMeasureForm({...measureForm, date: v})} />
              <div className="flex gap-2">
                <Button type="submit" className="flex-1">ذخیره</Button>
                <Button type="button" variant="secondary" onClick={() => setShowMeasure(false)} className="flex-1">انصراف</Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {duplicateAlert && (
        <div className="fixed inset-0 bg-ink-900/40 flex items-end sm:items-center justify-center z-50" role="dialog" aria-modal="true">
          <Card className="w-full sm:max-w-md m-4">
            {duplicateAlert.sameDay ? (
              <>
                <p className="text-ink-900 mb-4">این حرکت در روز {toPersianDigits(duplicateAlert.day)} همین برنامه هم هست</p>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => setDuplicateAlert(null)} className="flex-1">انصراف</Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-ink-900 mb-4">این حرکت قبلاً در برنامهٔ {toPersianDigits(duplicateAlert.info.sequence_number || duplicateAlert.info.program_number)} ({duplicateAlert.info.label || toJalaliMonth(duplicateAlert.info.date)}) بوده است</p>
                <div className="flex gap-2">
                  <Button onClick={confirmAddDuplicate} className="flex-1">اضافه کن</Button>
                  <Button variant="secondary" onClick={() => setDuplicateAlert(null)} className="flex-1">انصراف</Button>
                </div>
              </>
            )}
          </Card>
        </div>
      )}
    </div>
  )
}
