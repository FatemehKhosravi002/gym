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
      {label && <label className="block text-sm font-medium text-[#e5e7eb] mb-1.5">{label}</label>}
      <button
        type="button"
        onClick={() => setShow(!show)}
        className="w-full px-3 py-2.5 border border-white/10 rounded-xl text-right min-h-[48px] bg-[#141716]"
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


export function getTodayJalaliString() {
  const d = new Date()
  const j = require('jalaali-js').toJalaali(d.getFullYear(), d.getMonth() + 1, d.getDate())
  const months = ['', 'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند']
  const dj = j.jd.toString().replace(/\d/g, (x: string) => '۰۱۲۳۴۵۶۷۸۹'[parseInt(x)])
  const jy = j.jy.toString().replace(/\d/g, (x: string) => '۰۱۲۳۴۵۶۷۸۹'[parseInt(x)])
  return `${dj} ${months[j.jm]} ${jy}`
}
