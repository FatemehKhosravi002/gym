import { useState } from 'react'

interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
}

export default function PasswordInput({ label, className = '', ...props }: PasswordInputProps) {
  const [show, setShow] = useState(false)
  
  return (
    <div className="w-full">
      {label && <label className="block text-sm font-medium text-[#e5e7eb] mb-1.5">{label}</label>}
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          className={`w-full px-3 py-2.5 pl-12 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent min-h-[48px] transition-shadow ${className}`}
          {...props}
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          className="absolute left-2 top-1/2 -translate-y-1/2 px-3 py-1.5 text-sm text-[#d1d5db] hover:text-white min-h-[40px] rounded-lg hover:bg-[#1B1F1D] transition-colors"
          aria-label={show ? 'پنهان کردن رمز عبور' : 'نمایش رمز عبور'}
        >
          {show ? 'پنهان' : 'نمایش'}
        </button>
      </div>
    </div>
  )
}
