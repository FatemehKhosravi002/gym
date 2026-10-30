import { useState } from 'react'
import * as jalaali from 'jalaali-js'

interface Props {
  value: string
  onChange: (val: string) => void
  label?: string
}

export default function JalaliDatePicker({ value, onChange, label }: Props) {
  const [show, setShow] = useState(false)
  const today = new Date()
  const j = jalaali.toJalaali(today.getFullYear(), today.getMonth() + 1, today.getDate())
  
  const setToday = () => {
    const g = jalaali.toGregorian(j.jy, j.jm, j.jd)
    const d = new Date(g.gy, g.gm - 1, g.gd)
    onChange(d.toISOString().split('T')[0])
    setShow(false)
  }

  return (
    <div className="w-full">
      {label && <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>}
      <button
        type="button"
        onClick={() => setShow(!show)}
        className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-right min-h-[48px] bg-white"
      >
        {value ? value : 'انتخاب تاریخ'}
      </button>
      {show && (
        <div className="mt-2 p-3 bg-white border rounded-xl shadow-lg">
          <button type="button" onClick={setToday} className="w-full py-2 bg-primary-600 text-white rounded-xl mb-2">امروز</button>
          <input type="date" value={value} onChange={(e) => { onChange(e.target.value); setShow(false) }} className="w-full p-2 border rounded-xl" />
        </div>
      )}
    </div>
  )
}
