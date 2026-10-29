import { useState } from 'react'

interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
}

export default function PasswordInput({ label, className = '', ...props }: PasswordInputProps) {
  const [show, setShow] = useState(false)
  
  return (
    <div className="w-full">
      {label && <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>}
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          className={`w-full px-3 py-2.5 pl-12 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent min-h-[48px] transition-shadow ${className}`}
          {...props}
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          className="absolute left-2 top-1/2 -translate-y-1/2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 min-h-[40px] rounded-lg hover:bg-gray-100 transition-colors"
          aria-label={show ? 'پنهان کردن رمز عبور' : 'نمایش رمز عبور'}
        >
          {show ? 'پنهان' : 'نمایش'}
        </button>
      </div>
    </div>
  )
}
