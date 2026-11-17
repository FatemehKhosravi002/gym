import { useId } from 'react'

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  hint?: string
  error?: string
  options: { value: string | number; label: string }[]
  placeholder?: string
}

export default function Select({ label, hint, error, options, placeholder, className = '', id, ...props }: SelectProps) {
  const autoId = useId()
  const selectId = id || autoId

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={selectId} className="block text-sm font-semibold text-ink-700 mb-1.5">
          {label}
        </label>
      )}
      <select
        id={selectId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${selectId}-error` : hint ? `${selectId}-hint` : undefined}
        className={`field appearance-none bg-surface pe-10 ${error ? 'field-invalid' : ''} ${className}`}
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2364756A' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'left 1rem center',
        }}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {error ? (
        <p id={`${selectId}-error`} className="mt-1.5 text-sm text-error-700">{error}</p>
      ) : hint ? (
        <p id={`${selectId}-hint`} className="mt-1.5 text-sm text-ink-500">{hint}</p>
      ) : null}
    </div>
  )
}
