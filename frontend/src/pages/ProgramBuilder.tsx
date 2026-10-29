import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../utils/api'
import Button from '../components/Button'
import Card from '../components/Card'
import Input from '../components/Input'

export default function ProgramBuilder() {
  const { athleteId } = useParams()
  const navigate = useNavigate()
  const [step, setStep] = useState(1) // 1: days count, 2: builder wizard
  const [daysPerWeek, setDaysPerWeek] = useState(3)
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
    try {
      const today = new Date().toISOString().split('T')[0]
      const res = await api.post('/programs/', {
        athlete: athleteId,
        title: `برنامه ${new Date().toLocaleDateString('fa-IR')}`,
        start_date: today,
        days_per_week: daysPerWeek,
        status: 'draft'
      })
      setProgram(res.data)
      // Create days
      const dayList = []
      for (let i = 1; i <= daysPerWeek; i++) {
        const dres = await api.post('/program-days/', { program: res.data.id, day_index: i, label: '' }).catch(async () => {
          // try to create via program
          return null
        })
        dayList.push({ id: dres?.data?.id, day_index: i, items: [] })
      }
      setDays(dayList)
      setStep(2)
      setCurrentDay(1)
    } catch (e) {
      alert('خطا در ایجاد برنامه')
    }
  }

  const addExercise = async (ex: any) => {
    // Check duplicates
    try {
      const check = await api.get(`/programs/duplicate_check/?athlete_id=${athleteId}&exercise_id=${ex.id}`)
      if (check.data.used) {
        setDuplicateAlert({ exercise: ex, info: check.data })
        return
      }
    } catch {}
    const newItem = { exercise: ex.id, exercise_detail: ex, sets: '3', reps: '10', order: currentItems.length, tempId: Date.now() }
    setCurrentItems([...currentItems, newItem])
  }

  const confirmAddDuplicate = () => {
    if (duplicateAlert) {
      const ex = duplicateAlert.exercise
      const newItem = { exercise: ex.id, exercise_detail: ex, sets: '3', reps: '10', order: currentItems.length, tempId: Date.now() }
      setCurrentItems([...currentItems, newItem])
      setDuplicateAlert(null)
    }
  }

  const saveAndNext = async () => {
    if (currentItems.length === 0) return
    // Save current day items to backend if we have day id
    const day = days.find(d => d.day_index === currentDay)
    if (day && program) {
      // Try to save items
      for (let i = 0; i < currentItems.length; i++) {
        const it = currentItems[i]
        try {
          await api.post('/program-items/', {
            program_day: day.id || day.tempId,
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
      // Last day - go to review
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
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-gray-900 text-center">این برنامه چند روزه است؟</h2>
        <div className="grid grid-cols-4 gap-3 max-w-sm mx-auto">
          {[1,2,3,4,5,6,7].map(n => (
            <button
              key={n}
              onClick={() => { setDaysPerWeek(n); startProgram(); }}
              className="h-16 rounded-2xl bg-primary-600 text-white text-xl font-bold hover:bg-primary-700 min-h-[64px]"
            >
              {n}
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="pb-32">
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold text-gray-900">روز {currentDay} از {daysPerWeek}</h2>
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
          <button onClick={() => setSelectedCat(null)} className={`px-3 py-2 rounded-xl min-h-[44px] text-sm ${selectedCat === null ? 'bg-primary-600 text-white' : 'bg-gray-100'}`}>همه</button>
          {categories.map(cat => (
            <button key={cat.id} onClick={() => setSelectedCat(cat.id)} className={`px-3 py-2 rounded-xl min-h-[44px] text-sm ${selectedCat === cat.id ? 'bg-primary-600 text-white' : 'bg-gray-100'}`}>{cat.name}</button>
          ))}
        </div>
        <Input placeholder="جستجوی حرکت..." value={searchEx} onChange={(e) => setSearchEx(e.target.value)} />
        <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
          {filteredEx.slice(0, 20).map(ex => (
            <button
              key={ex.id}
              onClick={() => addExercise(ex)}
              className="w-full text-right p-3 bg-gray-50 rounded-xl hover:bg-gray-100 min-h-[44px] text-gray-900"
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
              <div key={item.tempId || idx} className="flex items-center gap-2 p-2 bg-gray-50 rounded-xl">
                <span className="text-sm text-gray-500 w-6">{idx + 1}</span>
                <span className="flex-1 text-sm text-gray-900">{item.exercise_detail?.name}</span>
                <input
                  className="w-12 px-2 py-1 border rounded text-center text-sm"
                  value={item.sets}
                  onChange={(e) => {
                    const newItems = [...currentItems]
                    newItems[idx].sets = e.target.value
                    setCurrentItems(newItems)
                  }}
                />
                <span>×</span>
                <input
                  className="w-16 px-2 py-1 border rounded text-center text-sm"
                  value={item.reps}
                  onChange={(e) => {
                    const newItems = [...currentItems]
                    newItems[idx].reps = e.target.value
                    setCurrentItems(newItems)
                  }}
                />
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
        <div className="max-w-7xl mx-auto flex gap-2">
          {currentDay > 1 && (
            <Button variant="secondary" onClick={() => { setCurrentDay(currentDay-1); setCurrentItems([]); }} className="flex-1">روز قبل</Button>
          )}
          <Button onClick={saveAndNext} disabled={currentItems.length === 0} className="flex-1">
            {currentDay < daysPerWeek ? 'ذخیره و رفتن به روز بعد' : 'پایان و ساخت برنامه'}
          </Button>
        </div>
      </div>

      {duplicateAlert && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50">
          <Card className="w-full sm:max-w-md m-4">
            <p className="text-gray-900 mb-4">این حرکت قبلاً در برنامهٔ {duplicateAlert.info.program_number} ({duplicateAlert.info.program_title}) بوده است.</p>
            <div className="flex gap-2">
              <Button onClick={confirmAddDuplicate} className="flex-1">اضافه کن</Button>
              <Button variant="secondary" onClick={() => setDuplicateAlert(null)} className="flex-1">انصراف</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
