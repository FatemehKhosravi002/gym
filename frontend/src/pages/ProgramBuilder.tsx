import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../utils/api'
import Button from '../components/Button'
import Card from '../components/Card'
import Input from '../components/Input'
import { toPersianDigits } from '../utils/persianDigits'
import { toJalaliMonth } from '../utils/jalali'

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

  useEffect(() => {
    api.get('/library/categories/').then(res => setCategories(res.data.results || res.data))
    api.get('/library/exercises/').then(res => setExercises(res.data.results || res.data))
  }, [])

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
    // check same day
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
    } catch {
      // if fails, still allow
    }
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
    if (day && program) {
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
    return matchCat && matchSearch && e.is_active
  })

  if (step === 1) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-md space-y-6">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 text-center">این برنامه چند روزه است؟</h2>
          <div className="grid grid-cols-4 gap-3">
            {[1,2,3,4,5,6,7].map(n => (
              <button
                key={n}
                onClick={() => setSelectedDays(n)}
                className={`h-16 sm:h-20 rounded-2xl text-xl sm:text-2xl font-bold min-h-[56px] border-2 transition-all focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                  selectedDays === n 
                    ? 'bg-primary-600 text-white border-primary-600 shadow-md' 
                    : 'bg-white text-gray-900 border-gray-300 hover:border-primary-400 hover:bg-primary-50'
                }`}
                aria-pressed={selectedDays === n}
              >
                {toPersianDigits(n)}
              </button>
            ))}
          </div>
          <Button onClick={startProgram} disabled={!selectedDays} className="w-full" size="lg">
            ادامه
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="pb-32">
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold text-gray-900">روز {toPersianDigits(currentDay)} از {toPersianDigits(daysPerWeek)}</h2>
        </div>
        <div className="flex gap-1">
          {Array.from({length: daysPerWeek}).map((_, i) => (
            <div key={i} className={`flex-1 h-2 rounded-full ${i+1 <= currentDay ? 'bg-primary-600' : 'bg-gray-200'}`} />
          ))}
        </div>
      </div>

      <Card className="mb-4">
        <Input label="برچسب روز (اختیاری)" placeholder="مثال: سینه + پشت بازو" value={dayLabel} onChange={(e) => setDayLabel(e.target.value)} />
      </Card>

      <Card className="mb-4">
        <p className="font-medium mb-3 text-gray-900">انتخاب دسته‌بندی</p>
        <div className="flex flex-wrap gap-2 mb-3">
          <button onClick={() => setSelectedCat(null)} className={`px-3 py-2 rounded-xl min-h-[44px] text-sm ${selectedCat === null ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-900'}`}>همه</button>
          {categories.map(cat => (
            <button key={cat.id} onClick={() => setSelectedCat(cat.id)} className={`px-3 py-2 rounded-xl min-h-[44px] text-sm ${selectedCat === cat.id ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-900'}`}>{cat.name}</button>
          ))}
        </div>
        <Input placeholder="جستجوی حرکت..." value={searchEx} onChange={(e) => setSearchEx(e.target.value)} />
        <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
          {filteredEx.slice(0, 20).map(ex => (
            <button
              key={ex.id}
              onClick={() => addExercise(ex)}
              className="w-full text-right p-3 bg-gray-50 rounded-xl hover:bg-gray-100 min-h-[44px] text-gray-900 border border-gray-200"
            >
              {ex.name}
            </button>
          ))}
        </div>
      </Card>

      {currentItems.length > 0 && (
        <Card className="mb-4">
          <p className="font-medium mb-3 text-gray-900">حرکات این روز</p>
          <div className="space-y-2">
            {currentItems.map((item, idx) => (
              <div key={item.tempId || idx} className="flex items-center gap-2 p-2 bg-gray-50 rounded-xl border border-gray-200">
                <span className="text-sm text-gray-700 w-6">{toPersianDigits(idx + 1)}</span>
                <span className="flex-1 text-sm text-gray-900">{item.exercise_detail?.name}</span>
                <input className="w-12 px-2 py-1 border border-gray-300 rounded text-center text-sm text-gray-900 bg-white" value={item.sets} onChange={(e) => { const newItems=[...currentItems]; newItems[idx].sets=e.target.value; setCurrentItems(newItems); }} />
                <span className="text-gray-900">×</span>
                <input className="w-16 px-2 py-1 border border-gray-300 rounded text-center text-sm text-gray-900 bg-white" value={item.reps} onChange={(e) => { const newItems=[...currentItems]; newItems[idx].reps=e.target.value; setCurrentItems(newItems); }} />
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
        <div className="max-w-7xl mx-auto flex gap-2">
          {currentDay > 1 && <Button variant="secondary" onClick={() => { setCurrentDay(currentDay-1); setCurrentItems([]); }} className="flex-1">روز قبل</Button>}
          <Button onClick={saveAndNext} disabled={currentItems.length === 0} className="flex-1">
            {currentDay < daysPerWeek ? 'ذخیره و رفتن به روز بعد' : 'پایان و ساخت برنامه'}
          </Button>
        </div>
      </div>

      {duplicateAlert && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50" role="dialog" aria-modal="true">
          <Card className="w-full sm:max-w-md m-4">
            {duplicateAlert.sameDay ? (
              <>
                <p className="text-gray-900 mb-4">این حرکت در روز {toPersianDigits(duplicateAlert.day)} همین برنامه هم هست</p>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => setDuplicateAlert(null)} className="flex-1">انصراف</Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-gray-900 mb-4">این حرکت قبلاً در برنامهٔ {toPersianDigits(duplicateAlert.info.sequence_number || duplicateAlert.info.program_number)} ({duplicateAlert.info.label || toJalaliMonth(duplicateAlert.info.date)}) بوده است</p>
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
