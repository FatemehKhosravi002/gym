import React from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
}

export default function Input({ label, className = '', ...props }: InputProps) {
  return (
    <div className="w-full">
      {label && <label className="block text-sm text-[#9AA3A0] mb-2">{label}</label>}
      <input
        className={`w-full bg-[#1B1F1D] border border-white/10 rounded-[16px] px-4 py-3 text-white placeholder-[#9AA3A0] min-h-[48px] focus:outline-none focus:border-[#B6F500]/50 transition-colors ${className}`}
        {...props}
      />
    </div>
  )
}
