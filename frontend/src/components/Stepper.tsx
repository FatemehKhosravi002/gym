import { toPersianDigits } from '../utils/persianDigits'

interface StepperProps {
  steps: string[]
  current: number
  className?: string
}

/** Horizontal progress labelled in Persian digits; current step is announced. */
export default function Stepper({ steps, current, className = '' }: StepperProps) {
  const total = steps.length
  const safeCurrent = Math.min(Math.max(current, 1), total)
  const percent = Math.round((safeCurrent / total) * 100)

  return (
    <div className={className}>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-semibold text-primary-900">
          قدم {toPersianDigits(safeCurrent)} از {toPersianDigits(total)}
        </span>
        <span className="text-ink-600">{steps[safeCurrent - 1]}</span>
      </div>
      <div
        className="h-2 w-full overflow-hidden rounded-pill bg-surface-3"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-label={`پیشرفت: ${toPersianDigits(percent)} درصد`}
      >
        <div
          className="h-full rounded-pill bg-primary-600 transition-[width] duration-slow"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}
