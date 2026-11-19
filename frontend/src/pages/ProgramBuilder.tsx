import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../utils/api'
import { apiErrorMessage } from '../utils/apiError'
import Button from '../components/Button'
import Card from '../components/Card'
import Input from '../components/Input'
import Badge from '../components/Badge'
import JalaliDatePicker from '../components/JalaliDatePicker'
import { AthleteNoteBanner } from '../components/AthleteNote'
import BuilderExercisePicker, { type PickedExercise } from '../components/BuilderExercisePicker'
import DayItemsEditor from '../components/DayItemsEditor'
import ExerciseSetsSheet, { DEFAULT_ITEM_VALUES, type ItemValues } from '../components/ExerciseSetsSheet'
import ExerciseRepeatPanel from '../components/ExerciseRepeatPanel'
import ProgramPreviewSheet from '../components/ProgramPreviewSheet'
import ConfirmDialog from '../components/ConfirmDialog'
import RepeatBadge from '../components/RepeatBadge'
import Modal from '../components/Modal'
import { SkeletonCard } from '../components/Skeleton'
import { useToast } from '../components/Toast'
import { CheckIcon } from '../components/icons'
import { toPersianDigits } from '../utils/persianDigits'
import { toJalaliMonth } from '../utils/jalali'
import {
  clearDraft,
  createDraft,
  daysContaining,
  draftDaysPayload,
  draftFromProgram,
  newItemKey,
  readDraft,
  writeDraft,
  type BuilderStep,
  type DraftDay,
  type DraftItem,
  type ProgramDraft,
} from '../utils/programDraft'
import { downloadProgramPdf, programPdfFilename } from '../utils/programPdf'
import { fetchExerciseHistory } from '../utils/exerciseHistoryApi'
import { jalaliDateLabel, type ExerciseHistory, type ExerciseHistoryRow } from '../utils/exerciseHistory'

const todayIso = () => new Date().toISOString().slice(0, 10)

export default function ProgramBuilder() {
  const { athleteId, id: editId } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const editMode = Boolean(editId)

  const [athlete, setAthlete] = useState<any>(null)
  const [draft, setDraft] = useState<ProgramDraft | null>(null)
  const [boot, setBoot] = useState<'loading' | 'ready' | 'error'>('loading')
  const [loadError, setLoadError] = useState('')
  const [starting, setStarting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [downloading, setDownloading] = useState(false)

  const [daysChoice, setDaysChoice] = useState(3)
  const [title, setTitle] = useState('')
  const [startDate, setStartDate] = useState(todayIso())

  const [step, setStep] = useState<BuilderStep>('days')
  const [currentDay, setCurrentDay] = useState(1)

  const [checking, setChecking] = useState(false)
  const [repeat, setRepeat] = useState<{ exercise: PickedExercise; history: ExerciseHistory; warningDays: number[] } | null>(null)
  const [editor, setEditor] = useState<{ mode: 'add' | 'edit'; exercise: PickedExercise | null; item?: DraftItem } | null>(null)
  const [replacing, setReplacing] = useState<DraftItem | null>(null)
  const [keptKeys, setKeptKeys] = useState<string[]>([])
  const [preview, setPreview] = useState<{ id: number | null; row: ExerciseHistoryRow | null }>({ id: null, row: null })
  const [notice, setNotice] = useState('')
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const [sharedAt, setSharedAt] = useState<string | null>(null)
  const [confirmShared, setConfirmShared] = useState<null | 'final'>(null)

  const activeAthleteId = draft?.athleteId || athleteId

  const checkingRef = useRef(false)
  const syncChain = useRef<Promise<void>>(Promise.resolve())
  const lastDeleted = useRef<{ dayIndex: number; index: number; item: DraftItem } | null>(null)

  useEffect(() => {
    let cancelled = false
    setBoot('loading')
    if (editId) {
      api
        .get(`/programs/${editId}/`)
        .then((res) => {
          if (cancelled) return
          const next = draftFromProgram(res.data)
          setAthlete(res.data.athlete_detail || null)
          setDraft(next)
          setStep('day')
          setCurrentDay(next.currentDay)
          setTitle(next.title)
          setStartDate(next.startDate)
          setDaysChoice(next.daysPerWeek)
          setSharedAt(res.data.shared_at || null)
          setBoot('ready')
        })
        .catch((err) => {
          if (cancelled) return
          setLoadError(apiErrorMessage(err, 'دریافت برنامه برای ویرایش انجام نشد'))
          setBoot('error')
        })
      return () => {
        cancelled = true
      }
    }
    api
      .get(`/athletes/${athleteId}/`)
      .then((res) => {
        if (cancelled) return
        setAthlete(res.data)
        const stored = readDraft(athleteId!)
        if (stored) {
          setDraft(stored)
          setStep(stored.step)
          setCurrentDay(stored.currentDay)
          setTitle(stored.title)
          setStartDate(stored.startDate)
          setDaysChoice(stored.daysPerWeek)
        } else {
          setTitle(`برنامه ${toJalaliMonth(todayIso())}`)
        }
        setBoot('ready')
      })
      .catch((err) => {
        if (cancelled) return
        setLoadError(apiErrorMessage(err, 'دریافت پرونده ورزشکار انجام نشد'))
        setBoot('error')
      })
    return () => {
      cancelled = true
    }
  }, [athleteId, editId])

  const persist = useCallback((next: ProgramDraft) => {
    writeDraft(next)
  }, [])

  const patchDraft = useCallback(
    (patch: Partial<ProgramDraft>) => {
      setDraft((current) => {
        if (!current) return current
        const next = { ...current, ...patch }
        persist(next)
        return next
      })
    },
    [persist],
  )


  const patchDay = useCallback(
    (dayIndex: number, updater: (day: DraftDay) => DraftDay) => {
      setDraft((current) => {
        if (!current) return current
        const next = { ...current, days: current.days.map((day) => (day.dayIndex === dayIndex ? updater(day) : day)) }
        persist(next)
        return next
      })
    },
    [persist],
  )

  const draftRef = useRef<ProgramDraft | null>(null)
  useEffect(() => {
    draftRef.current = draft
  }, [draft])

  const activeDay = draft?.days.find((day) => day.dayIndex === currentDay) || null

  const startProgram = async () => {
    if (!athleteId) return
    setStarting(true)
    const programTitle = title.trim() || `برنامه ${toJalaliMonth(startDate || todayIso())}`
    try {
      const res = await api.post('/programs/', {
        athlete: athleteId,
        title: programTitle,
        start_date: startDate || todayIso(),
        days_per_week: daysChoice,
        status: 'draft',
      })
      const programId = res.data.id as number
      const days: DraftDay[] = []
      for (let index = 1; index <= daysChoice; index += 1) {
        try {
          const dayRes = await api.post('/program-days/', { program: programId, day_index: index, label: '' })
          days.push({ serverId: dayRes.data.id, dayIndex: index, label: '', items: [], removedServerIds: [] })
        } catch {
          days.push({ dayIndex: index, label: '', items: [], removedServerIds: [] })
        }
      }
      const next: ProgramDraft = {
        ...createDraft(athleteId, daysChoice, programTitle, startDate || todayIso()),
        programId,
        days,
      }
      setDraft(next)
      persist(next)
      setStep('day')
      setCurrentDay(1)
    } catch (err) {
      toast.error(apiErrorMessage(err, 'ساخت برنامه انجام نشد'))
    } finally {
      setStarting(false)
    }
  }

  /** Push one day (label + items) to the server and remember the returned ids. */
  const syncDay = (dayIndex: number): Promise<void> => {
    // Edit mode saves everything through one transactional PATCH instead.
    if (editMode) return Promise.resolve()
    // Serialise saves so «ذخیره» can never race the autosave and lose a day.
    const run = syncChain.current.then(() => runSyncDay(dayIndex))
    syncChain.current = run.catch(() => undefined)
    return run
  }

  const runSyncDay = async (dayIndex: number) => {
    const current = draftRef.current
    if (!current?.programId) return
    const day = current.days.find((entry) => entry.dayIndex === dayIndex)
    if (!day) return
    try {
      let dayId = day.serverId
      if (!dayId) {
        const dayRes = await api.post('/program-days/', { program: current.programId, day_index: day.dayIndex, label: day.label })
        dayId = dayRes.data.id
      } else {
        await api.patch(`/program-days/${dayId}/`, { label: day.label })
      }
      for (const removedId of day.removedServerIds) {
        await api.delete(`/program-items/${removedId}/`).catch(() => undefined)
      }
      const saved: DraftItem[] = []
      for (let index = 0; index < day.items.length; index += 1) {
        const item = day.items[index]
        const payload = {
          program_day: dayId,
          exercise: item.exerciseId,
          order: index,
          sets: item.sets,
          reps: item.reps,
          rest_seconds: item.rest ? Number(item.rest) : null,
          note: item.note,
          superset_group: item.supersetGroup,
        }
        if (item.serverId) {
          await api.patch(`/program-items/${item.serverId}/`, payload)
          saved.push(item)
        } else {
          const itemRes = await api.post('/program-items/', payload)
          saved.push({ ...item, serverId: itemRes.data.id })
        }
      }
      patchDay(day.dayIndex, (latest) => ({
        ...latest,
        serverId: dayId || latest.serverId,
        items: latest.items.map((item) => saved.find((entry) => entry.key === item.key) || item),
        removedServerIds: latest.removedServerIds.filter((id) => !day.removedServerIds.includes(id)),
      }))
    } catch {
      setNotice('ذخیره خودکار این روز کامل نشد؛ با زدن «ذخیره» دوباره تلاش می‌شود.')
    }
  }


  const exerciseIdsKey = useMemo(
    () =>
      draft
        ? Array.from(new Set(draft.days.flatMap((day) => day.items.map((item) => item.exerciseId))))
            .sort((a, b) => a - b)
            .join(',')
        : '',
    [draft],
  )

  useEffect(() => {
    if (!draft?.programId || !exerciseIdsKey || !activeAthleteId) {
      setCounts({})
      return
    }
    let cancelled = false
    api
      .get(`/athletes/${activeAthleteId}/repeat_counts/`, {
        params: { exercise_ids: exerciseIdsKey, exclude_program: draft.programId },
      })
      .then((res) => {
        if (!cancelled) setCounts(res.data.counts || {})
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [activeAthleteId, draft?.programId, exerciseIdsKey])

  const pickExercise = async (exercise: PickedExercise) => {
    if (checkingRef.current) return
    const current = draftRef.current
    if (!current) return
    const warningDays = daysContaining(current, exercise.id, currentDay)
    const sameDay = current.days
      .find((day) => day.dayIndex === currentDay)
      ?.items.some((item) => item.exerciseId === exercise.id)
    if (sameDay) {
      toast.show({ message: `«${exercise.name}» در همین روز هم هست.`, tone: 'neutral' })
    }
    checkingRef.current = true
    setChecking(true)
    setNotice('')
    try {
      const history = await fetchExerciseHistory(activeAthleteId!, exercise.id, current.programId)
      if (history.count > 0 || warningDays.length > 0) {
        setRepeat({ exercise, history, warningDays })
      } else {
        setEditor({ mode: 'add', exercise })
      }
    } catch {
      setNotice('بررسی سابقه انجام نشد؛ می‌توانید حرکت را بدون بررسی اضافه کنید.')
      setEditor({ mode: 'add', exercise })
    } finally {
      setChecking(false)
      checkingRef.current = false
    }
  }

  const saveItemValues = (values: ItemValues) => {
    if (!editor?.exercise) return
    const dayIndex = currentDay
    if (editor.mode === 'edit' && editor.item) {
      const key = editor.item.key
      patchDay(dayIndex, (day) => ({
        ...day,
        items: day.items.map((item) => (item.key === key ? { ...item, ...values } : item)),
      }))
    } else {
      const item: DraftItem = {
        key: newItemKey(),
        exerciseId: editor.exercise.id,
        exerciseName: editor.exercise.name,
        sets: values.sets,
        reps: values.reps,
        rest: values.rest,
        note: values.note,
        supersetGroup: null,
      }
      patchDay(dayIndex, (day) => ({ ...day, items: [...day.items, item] }))
      toast.success(`«${editor.exercise.name}» اضافه شد`)
    }
    setEditor(null)
  }

  const restoreDeleted = () => {
    const deleted = lastDeleted.current
    if (!deleted) return
    patchDay(deleted.dayIndex, (day) => {
      if (day.items.some((item) => item.key === deleted.item.key)) return day
      const items = [...day.items]
      items.splice(Math.min(deleted.index, items.length), 0, deleted.item)
      return {
        ...day,
        items,
        removedServerIds: deleted.item.serverId
          ? day.removedServerIds.filter((id) => id !== deleted.item.serverId)
          : day.removedServerIds,
      }
    })
    lastDeleted.current = null
  }

  const deleteItem = (item: DraftItem) => {
    const days = draftRef.current?.days || []
    const day =
      days.find((entry) => entry.items.some((row) => row.key === item.key)) ||
      days.find((entry) => entry.dayIndex === currentDay)
    if (!day) return
    lastDeleted.current = { dayIndex: day.dayIndex, index: day.items.findIndex((entry) => entry.key === item.key), item }
    patchDay(day.dayIndex, (currentDayData) => ({
      ...currentDayData,
      items: currentDayData.items.filter((entry) => entry.key !== item.key),
      removedServerIds: item.serverId
        ? [...currentDayData.removedServerIds, item.serverId]
        : currentDayData.removedServerIds,
    }))
    toast.show({ message: `«${item.exerciseName}» حذف شد`, actionLabel: 'بازگرداندن', onAction: restoreDeleted })
  }

  const goToDay = (dayIndex: number) => {
    syncDay(currentDay).then(() => undefined)
    setCurrentDay(dayIndex)
    setStep('day')
    patchDraft({ step: 'day', currentDay: dayIndex })
  }

  const nextDay = () => {
    if (!draft) return
    syncDay(currentDay).then(() => undefined)
    if (currentDay < draft.daysPerWeek) {
      const target = currentDay + 1
      setCurrentDay(target)
      patchDraft({ currentDay: target, step: 'day' })
    } else {
      setStep('review')
      patchDraft({ step: 'review' })
    }
  }

  const previousDay = () => {
    if (currentDay <= 1) return
    syncDay(currentDay).then(() => undefined)
    const target = currentDay - 1
    setCurrentDay(target)
    patchDraft({ currentDay: target })
  }

  const editDayFromReview = (dayIndex: number) => {
    setCurrentDay(dayIndex)
    setStep('day')
    patchDraft({ step: 'day', currentDay: dayIndex })
  }

  const autosaveSignature = draft
    ? JSON.stringify(
        draft.days.map((day) => [
          day.label,
          day.items.map((item) => [item.exerciseId, item.sets, item.reps, item.rest, item.note, item.supersetGroup]),
        ]),
      )
    : ''

  useEffect(() => {
    if (!draftRef.current?.programId) return
    const timer = setTimeout(() => {
      if (editMode) {
        const current = draftRef.current
        if (!current) return
        api
          .patch(`/programs/${current.programId}/`, {
            title: current.title.trim() || `برنامه ${toPersianDigits(current.daysPerWeek)} روزه`,
            start_date: current.startDate,
            days_per_week: current.daysPerWeek,
            days: draftDaysPayload(current),
          })
          .catch(() => setNotice('ذخیره خودکار کامل نشد؛ با زدن «ذخیره» دوباره تلاش می‌شود.'))
      } else {
        syncDay(draftRef.current?.currentDay || 1)
      }
    }, 1400)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autosaveSignature])

  const persistProgram = async (finalize: boolean): Promise<any | null> => {
    const current = draftRef.current
    if (!current?.programId) return null
    setSaving(true)
    try {
      if (!editMode) {
        for (const day of current.days) {
          await syncDay(day.dayIndex)
        }
      }
      const res = await api.patch(`/programs/${current.programId}/`, {
        title: current.title.trim() || `برنامه ${toPersianDigits(current.daysPerWeek)} روزه`,
        start_date: current.startDate,
        days_per_week: current.daysPerWeek,
        status: finalize ? 'final' : 'draft',
        ...(editMode ? { days: draftDaysPayload(current) } : {}),
      })
      if (res.data?.shared_at !== undefined) setSharedAt(res.data.shared_at)
      return res.data
    } catch (err) {
      toast.error(apiErrorMessage(err, 'ذخیره برنامه انجام نشد'))
      return null
    } finally {
      setSaving(false)
    }
  }

  const saveAndFinish = async (force = false) => {
    if (!force && editMode && sharedAt) {
      setConfirmShared('final')
      return
    }
    const data = await persistProgram(true)
    if (!data) return
    clearDraft(activeAthleteId!)
    toast.success(editMode ? 'تغییرات برنامه ذخیره شد' : 'برنامه ذخیره شد')
    navigate(`/programs/${data.id}`)
  }

  const downloadPdf = async () => {
    const data = await persistProgram(true)
    if (!data) return
    setDownloading(true)
    try {
      await downloadProgramPdf(data.id, {
        filename: programPdfFilename(data.id, data.sequence_number),
      })
      toast.success('فایل PDF دانلود شد')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'دانلود PDF انجام نشد')
    } finally {
      setDownloading(false)
    }
  }

  const copyShareLink = async () => {
    const data = await persistProgram(true)
    if (!data?.share_token) return
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/public/program/${data.share_token}`)
      toast.success('لینک اشتراک کپی شد')
    } catch {
      toast.error('کپی لینک انجام نشد')
    }
  }

  const discardDraft = () => {
    clearDraft(athleteId!)
    setDraft(null)
    setStep('days')
    setCurrentDay(1)
    setCounts({})
    setTitle(`برنامه ${toJalaliMonth(todayIso())}`)
    setStartDate(todayIso())
    setDaysChoice(3)
    setConfirmDiscard(false)
    setRepeat(null)
    setEditor(null)
  }

  const replaceExercise = (picked: PickedExercise) => {
    if (!replacing || !draft) return
    const dayIndex = draft.days.find((day) => day.items.some((item) => item.key === replacing.key))?.dayIndex
    if (dayIndex === undefined) {
      setReplacing(null)
      return
    }
    patchDay(dayIndex, (day) => ({
      ...day,
      items: day.items.map((item) =>
        item.key === replacing.key
          ? { ...item, exerciseId: picked.id, exerciseName: picked.name, exerciseIsActive: true }
          : item,
      ),
    }))
    setReplacing(null)
    toast.success(`«${replacing.exerciseName}» با «${picked.name}» جایگزین شد`)
  }

  const renderBadge = (item: DraftItem) => {
    const count = Number(counts[String(item.exerciseId)] || 0)
    if (count <= 0) return null
    return (
      <RepeatBadge
        athleteId={activeAthleteId!}
        exerciseId={item.exerciseId}
        exerciseName={item.exerciseName}
        count={count}
        label={`در ${toPersianDigits(count)} برنامه بوده`}
      />
    )
  }

  if (boot === 'loading') return <SkeletonCard rows={4} />
  if (boot === 'error') {
    return (
      <Card>
        <p className="text-sm text-error-700">{loadError}</p>
        <div className="pt-3">
          <Button variant="outline" onClick={() => navigate('/athletes')}>بازگشت به ورزشکاران</Button>
        </div>
      </Card>
    )
  }

  const noteBanner = athlete ? (
    <AthleteNoteBanner athleteId={activeAthleteId!} notes={athlete.notes} noteTags={athlete.note_tags} />
  ) : null

  const firstStep = (
    <div className="space-y-4">
      <Card>
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-bold text-ink-900">{athlete?.first_name} {athlete?.last_name}</p>
            <p className="text-sm text-ink-600">کد: {toPersianDigits(athlete?.unique_code || '')}</p>
          </div>
          <Badge tone="accent">برنامه جدید</Badge>
        </div>
        <div className="mt-3 space-y-3">
          <Input
            label="عنوان برنامه"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="مثال: برنامه آبان"
          />
          <JalaliDatePicker label="تاریخ شروع" value={startDate} onChange={setStartDate} />
        </div>
      </Card>

      <Card>
        <h2 className="mb-3 text-center text-lg font-bold text-primary-900">این برنامه چند روزه است؟</h2>
        <div className="grid grid-cols-4 gap-3">
          {[1, 2, 3, 4, 5, 6, 7].map((number) => {
            const selected = daysChoice === number
            return (
              <button
                key={number}
                type="button"
                onClick={() => setDaysChoice(number)}
                aria-pressed={selected}
                className={`flex min-h-[64px] items-center justify-center rounded-card border-2 text-2xl font-bold transition-colors duration-base ${
                  selected
                    ? 'border-primary-700 bg-primary-700 text-white'
                    : 'border-border bg-surface text-ink-900 hover:border-primary-400'
                }`}
              >
                {toPersianDigits(number)}
              </button>
            )
          })}
        </div>
        <p className="mt-3 text-center text-sm text-ink-600">
          عنوان پیشنهادی: {toJalaliMonth(startDate || todayIso())}
        </p>
      </Card>

      <Button size="lg" fullWidth onClick={startProgram} loading={starting}>
        شروع ساخت برنامه
      </Button>
    </div>
  )

  const dayChips = draft ? (
    <div className="flex flex-wrap gap-2" role="group" aria-label="روزهای برنامه">
      {draft.days.map((day) => {
        const done = day.items.length > 0
        const active = day.dayIndex === currentDay
        return (
          <button
            key={day.dayIndex}
            type="button"
            onClick={() => goToDay(day.dayIndex)}
            aria-pressed={active}
            className={`flex min-h-[44px] min-w-[44px] items-center justify-center gap-1 rounded-pill border px-3 text-sm font-bold transition-colors duration-fast ${
              active
                ? 'border-primary-700 bg-primary-700 text-white'
                : done
                  ? 'border-primary-200 bg-primary-50 text-primary-900'
                  : 'border-border-strong bg-surface text-ink-600'
            }`}
          >
            {done && !active && <CheckIcon className="h-4 w-4" />}
            {toPersianDigits(day.dayIndex)}
          </button>
        )
      })}
    </div>
  ) : null

  const dayScreen = draft && activeDay ? (
    <div className="space-y-4">
      <Card>
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-primary-900">
            روز {toPersianDigits(currentDay)} از {toPersianDigits(draft.daysPerWeek)}
          </h2>
          <span className="truncate text-sm text-ink-600">{draft.title}</span>
        </div>
        <div className="flex gap-1" aria-hidden="true">
          {draft.days.map((day) => (
            <div
              key={day.dayIndex}
              className={`h-2 flex-1 rounded-full ${day.items.length > 0 ? 'bg-primary-600' : 'bg-surface-3'}`}
            />
          ))}
        </div>
        <div className="mt-3">{dayChips}</div>
      </Card>

      <Card>
        <Input
          label={`برچسب روز ${toPersianDigits(currentDay)} (اختیاری)`}
          placeholder="مثال: سینه + پشت بازو"
          value={activeDay.label}
          onChange={(event) => patchDay(currentDay, (day) => ({ ...day, label: event.target.value }))}
        />
      </Card>

      <Card>
        <h3 className="mb-3 text-base font-bold text-primary-900">انتخاب حرکت</h3>
        <BuilderExercisePicker onPick={pickExercise} busy={checking} />
        {checking && <p className="mt-2 text-xs text-ink-500">در حال بررسی سابقه این حرکت…</p>}
      </Card>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-bold text-primary-900">حرکات روز {toPersianDigits(currentDay)}</h3>
          <span className="text-sm text-ink-600">{toPersianDigits(activeDay.items.length)} حرکت</span>
        </div>
        <DayItemsEditor
          items={activeDay.items}
          onChange={(items) => patchDay(currentDay, (day) => ({ ...day, items }))}
          onEdit={(item) =>
            setEditor({
              mode: 'edit',
              item,
              exercise: { id: item.exerciseId, name: item.exerciseName, category: null },
            })
          }
          onDelete={deleteItem}
          onReplace={setReplacing}
          renderBadge={renderBadge}
        />
        {replacing && (
          <div className="mt-3 rounded-field border border-warning-200 bg-warning-50 p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-sm font-bold text-warning-700">جایگزینی «{replacing.exerciseName}»</p>
              <Button size="sm" variant="ghost" onClick={() => setReplacing(null)}>بستن</Button>
            </div>
            <BuilderExercisePicker onPick={replaceExercise} />
          </div>
        )}
      </Card>

      <div className="fixed inset-x-0 bottom-[calc(var(--tabbar-height)+0.5rem)] z-30 px-4 md:static md:px-0">
        <div className="mx-auto flex max-w-md gap-2 rounded-pill border border-border bg-surface p-2 shadow-lifted">
          <Button variant="outline" fullWidth onClick={previousDay} disabled={currentDay === 1}>
            روز قبل
          </Button>
          <Button fullWidth onClick={nextDay}>
            {currentDay < draft.daysPerWeek ? 'روز بعد' : 'بررسی و ذخیره'}
          </Button>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setConfirmDiscard(true)}
        className="mx-auto block min-h-[44px] px-3 text-xs font-semibold text-ink-500 hover:text-error-700"
      >
        حذف پیش‌نویس و شروع دوباره
      </button>
    </div>
  ) : null

  const totalItems = draft ? draft.days.reduce((sum, day) => sum + day.items.length, 0) : 0

  const reviewScreen = draft ? (
    <div className="space-y-4">
      <Card>
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-primary-900">مرور برنامه</h2>
            <p className="mt-1 text-sm text-ink-600">
              {draft.title} • شروع {jalaliDateLabel(draft.startDate)}
            </p>
            <p className="mt-0.5 text-sm text-ink-600">
              {toPersianDigits(draft.daysPerWeek)} روز • {toPersianDigits(totalItems)} حرکت
            </p>
          </div>
          <Badge tone="accent">پیش‌نویس</Badge>
        </div>
      </Card>

      {draft.days.map((day) => (
        <Card key={day.dayIndex}>
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="font-bold text-primary-900">
              روز {toPersianDigits(day.dayIndex)}
              {day.label ? <span className="mr-1 text-sm font-medium text-ink-600">— {day.label}</span> : null}
            </h3>
            <Button size="sm" variant="outline" onClick={() => editDayFromReview(day.dayIndex)}>ویرایش</Button>
          </div>
          {day.items.length === 0 ? (
            <p className="text-sm text-ink-500">حرکتی ثبت نشده است.</p>
          ) : (
            <ul className="space-y-1.5">
              {day.items.map((item, index) => (
                <li key={item.key} className="flex items-center justify-between gap-2 rounded-field bg-surface-2 p-2">
                  <span className="min-w-0 truncate text-sm text-ink-900">
                    {toPersianDigits(index + 1)}. {item.exerciseName}
                    {item.supersetGroup !== null ? (
                      <span className="mr-1 rounded-pill bg-accent-100 px-1.5 text-xs font-bold text-accent-800">سوپرست</span>
                    ) : null}
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="rounded-pill bg-primary-100 px-2 py-0.5 text-xs font-bold text-primary-900">
                      {toPersianDigits(item.sets)} × {toPersianDigits(item.reps)}
                    </span>
                    {renderBadge(item)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      ))}

      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" onClick={() => persistProgram(false)} loading={saving}>ذخیره پیش‌نویس</Button>
        <Button onClick={() => saveAndFinish()} loading={saving}>ذخیره نهایی</Button>
        <Button variant="tertiary" onClick={downloadPdf} loading={downloading}>دانلود PDF</Button>
        <Button variant="tertiary" onClick={copyShareLink}>کپی لینک اشتراک</Button>
      </div>
      <Button variant="ghost" fullWidth onClick={() => editDayFromReview(draft.currentDay || 1)}>
        بازگشت به ویرایش روزها
      </Button>
    </div>
  ) : null

  const repeatReview = draft && editMode
    ? draft.days.flatMap((day) =>
        day.items
          .filter((item) => !keptKeys.includes(item.key) && Number(counts[String(item.exerciseId)] || 0) > 0)
          .map((item) => ({ dayIndex: day.dayIndex, item })),
      )
    : []

  return (
    <div className="space-y-4 pb-28">
      {noteBanner && <div className="sticky top-0 z-20 -mx-4 bg-canvas px-4 py-2">{noteBanner}</div>}

      {notice && (
        <div className="flex items-start gap-2 rounded-field border border-warning-200 bg-warning-50 p-3 text-sm text-warning-700">
          <span className="flex-1">{notice}</span>
          <button type="button" onClick={() => setNotice('')} aria-label="بستن پیام" className="h-8 w-8 shrink-0 rounded-full">✕</button>
        </div>
      )}

      {repeatReview.length > 0 && (
        <Card className="border-accent-200 bg-accent-50">
          <h2 className="text-base font-bold text-primary-900">این ورزشکار این حرکات را قبلاً انجام داده</h2>
          <p className="mt-1 text-sm text-ink-600">هر حرکت را نگه دارید یا همین‌جا حذف کنید؛ روی برچسب بزنید تا سابقه و تقویم باز شود.</p>
          <ul className="mt-3 space-y-2">
            {repeatReview.map(({ dayIndex, item }) => (
              <li key={item.key} className="flex flex-wrap items-center gap-2 rounded-field border border-border bg-surface p-2">
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink-900">
                  روز {toPersianDigits(dayIndex)} — {item.exerciseName}
                </span>
                {renderBadge(item)}
                {item.exerciseIsActive === false && (
                  <Button size="sm" variant="tertiary" onClick={() => setReplacing(item)}>جایگزینی</Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    deleteItem(item)
                    setKeptKeys((keys) => keys.filter((key) => key !== item.key))
                  }}
                >
                  حذف
                </Button>
                <Button size="sm" variant="outline" onClick={() => setKeptKeys((keys) => [...keys, item.key])}>
                  نگه دار
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {!draft ? firstStep : step === 'review' ? reviewScreen : dayScreen}

      <Modal
        open={Boolean(repeat)}
        onClose={() => setRepeat(null)}
        title={repeat ? `سابقه «${repeat.exercise.name}»` : undefined}
        variant="sheet"
      >
        {repeat && (
          <ExerciseRepeatPanel
            exerciseName={repeat.exercise.name}
            history={repeat.history}
            warningDays={repeat.warningDays}
            onCancel={() => setRepeat(null)}
            onAdd={() => {
              const picked = repeat.exercise
              setRepeat(null)
              setEditor({ mode: 'add', exercise: picked })
            }}
            onOpenProgram={(programId) =>
              setPreview({ id: programId, row: repeat.history.programs.find((row) => row.id === programId) || null })
            }
          />
        )}
      </Modal>

      <ExerciseSetsSheet
        open={Boolean(editor)}
        exerciseName={editor?.exercise?.name || ''}
        mode={editor?.mode || 'add'}
        initial={
          editor?.item
            ? { sets: editor.item.sets, reps: editor.item.reps, rest: editor.item.rest, note: editor.item.note }
            : DEFAULT_ITEM_VALUES
        }
        onSave={saveItemValues}
        onClose={() => setEditor(null)}
      />

      <ProgramPreviewSheet
        open={preview.id !== null}
        programId={preview.id}
        row={preview.row}
        onClose={() => setPreview({ id: null, row: null })}
      />

      <ConfirmDialog
        open={confirmShared !== null}
        title="این برنامه لینک اشتراک فعال دارد"
        description="لینک قبلی را برای ورزشکار ارسال کرده‌اید. تغییرات روی همان لینک دیده می‌شود. ادامه می‌دهید؟"
        confirmLabel="ذخیره و به‌روزرسانی لینک"
        tone="primary"
        onConfirm={() => {
          setConfirmShared(null)
          saveAndFinish(true)
        }}
        onCancel={() => setConfirmShared(null)}
      />

      <ConfirmDialog
        open={confirmDiscard}
        title="حذف پیش‌نویس؟"
        description="همه روزها و حرکاتی که در این پیش‌نویس ساخته‌اید حذف می‌شود."
        confirmLabel="حذف و شروع دوباره"
        onConfirm={discardDraft}
        onCancel={() => setConfirmDiscard(false)}
      />
    </div>
  )
}
