import { useId, useState } from 'react'

interface PasswordInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string
  error?: string
  hint?: string
}

export default function PasswordInput({ label, error, hint, className = '', id, ...props }: PasswordInputProps) {
  const [show, setShow] = useState(false)
  const autoId = useId()
  const inputId = id || autoId
  const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="mb-1.5 block text-sm font-semibold text-ink-700">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          id={inputId}
          type={show ? 'text' : 'password'}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`field pe-20 ${error ? 'field-invalid' : ''} ${className}`}
          {...props}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute start-auto end-1 top-1/2 min-h-[40px] -translate-y-1/2 rounded-field px-3 text-sm font-semibold text-ink-600 hover:bg-surface-2 hover:text-primary-900"
          aria-label={show ? 'پنهان کردن رمز عبور' : 'نمایش رمز عبور'}
        >
          {show ? 'پنهان' : 'نمایش'}
        </button>
      </div>
      {error ? (
        <p id={`${inputId}-error`} className="mt-1.5 text-sm text-error-700">{error}</p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="mt-1.5 text-sm text-ink-500">{hint}</p>
      ) : null}
    </div>
  )
}
