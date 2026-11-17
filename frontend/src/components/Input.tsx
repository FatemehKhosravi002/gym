import React, { useId } from 'react'

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string
  hint?: string
  error?: string
  size?: 'md' | 'lg'
}

export default function Input({ label, hint, error, className = '', id, size = 'md', ...props }: InputProps) {
  const autoId = useId()
  const inputId = id || autoId
  const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-semibold text-ink-700 mb-1.5">
          {label}
        </label>
      )}
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`field ${size === 'lg' ? 'min-h-[56px] text-lg' : ''} ${error ? 'field-invalid' : ''} ${className}`}
        {...props}
      />
      {error ? (
        <p id={`${inputId}-error`} className="mt-1.5 text-sm text-error-700">{error}</p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="mt-1.5 text-sm text-ink-500">{hint}</p>
      ) : null}
    </div>
  )
}

