import { useEffect, useState } from 'react'
import Modal from './Modal'
import Button from './Button'
import Input from './Input'
import { toPersianDigits } from '../utils/persianDigits'

export interface ItemValues {
  sets: string
  reps: string
  rest: string
  note: string
}

export const DEFAULT_ITEM_VALUES: ItemValues = { sets: '3', reps: '10', rest: '', note: '' }

interface Props {
  open: boolean
  exerciseName: string
  initial?: ItemValues
  mode?: 'add' | 'edit'
  onSave: (values: ItemValues) => void
  onClose: () => void
}

function clampInt(value: string, fallback: number, min: number, max: number): number {
  const parsed = Number.parseInt(value, 10)
  const number = Number.isNaN(parsed) ? fallback : parsed
  return Math.min(max, Math.max(min, number))
}

/** Big-touch steppers for sets and reps (reps also accepts free text like «8-12»). */
export default function ExerciseSetsSheet({
  open,
  exerciseName,
  initial = DEFAULT_ITEM_VALUES,
  mode = 'add',
  onSave,
  onClose,
}: Props) {
  const [values, setValues] = useState<ItemValues>(initial)

  useEffect(() => {
    if (open) setValues(initial)
  }, [open, initial.sets, initial.reps, initial.rest, initial.note])

  const setsNumber = clampInt(values.sets, 3, 1, 20)
  const repsIsNumber = /^\d+$/.test(values.reps.trim())

  const step = (field: 'sets' | 'reps', delta: number) => {
    setValues((current) => {
      if (field === 'sets') {
        return { ...current, sets: String(Math.min(20, Math.max(1, clampInt(current.sets, 3, 1, 20) + delta))) }
      }
      const numeric = /^\d+$/.test(current.reps.trim())
      if (!numeric && delta < 0) return current
      const base = numeric ? clampInt(current.reps, 10, 1, 100) : 10
      return { ...current, reps: String(Math.min(100, Math.max(1, base + delta))) }
    })
  }

  const stepperButton = 'flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-border-strong bg-surface text-xl font-bold text-primary-900 disabled:opacity-40'

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={exerciseName}
      description={mode === 'add' ? 'تعداد ست و تکرار را مشخص کنید.' : 'ست، تکرار، استراحت و یادداشت را ویرایش کنید.'}
      footer={
        <div className="flex gap-3">
          <Button variant="outline" fullWidth onClick={onClose}>انصراف</Button>
          <Button fullWidth onClick={() => onSave({ ...values, sets: String(setsNumber) })}>
            {mode === 'add' ? 'افزودن به روز' : 'ذخیره تغییرات'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="rounded-card border border-border bg-surface-2 p-3">
          <p className="mb-2 text-sm font-bold text-ink-800">ست</p>
          <div className="flex items-center justify-between gap-2">
            <button type="button" aria-label="کاهش ست" className={stepperButton} onClick={() => step('sets', -1)}>−</button>
            <span className="text-2xl font-bold tabular-nums text-primary-900" data-testid="sets-value">
              {toPersianDigits(setsNumber)}
            </span>
            <button type="button" aria-label="افزایش ست" className={stepperButton} onClick={() => step('sets', 1)}>+</button>
          </div>
        </div>

        <div className="rounded-card border border-border bg-surface-2 p-3">
          <p className="mb-2 text-sm font-bold text-ink-800">تکرار</p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="کاهش تکرار"
              className={stepperButton}
              disabled={!repsIsNumber}
              onClick={() => step('reps', -1)}
            >
              −
            </button>
            <input
              className="field text-center text-xl font-bold"
              inputMode="numeric"
              value={values.reps}
              onChange={(event) => setValues({ ...values, reps: event.target.value })}
              aria-label="تکرار"
            />
            <button type="button" aria-label="افزایش تکرار" className={stepperButton} onClick={() => step('reps', 1)}>+</button>
          </div>
          <p className="mt-1.5 text-xs text-ink-500">می‌توانید بازه بنویسید؛ مثال: 8-12</p>
        </div>

        <Input
          label="استراحت (ثانیه، اختیاری)"
          inputMode="numeric"
          placeholder="مثال: 60"
          value={values.rest}
          onChange={(event) => setValues({ ...values, rest: event.target.value.replace(/[^\d]/g, '') })}
        />

        <div>
          <label htmlFor="item-note" className="mb-1.5 block text-sm font-semibold text-ink-700">
            یادداشت (اختیاری)
          </label>
          <textarea
            id="item-note"
            className="field min-h-[80px]"
            placeholder="مثال: آخرین ست تا ناتوانی"
            value={values.note}
            onChange={(event) => setValues({ ...values, note: event.target.value })}
          />
        </div>
      </div>
    </Modal>
  )
}
