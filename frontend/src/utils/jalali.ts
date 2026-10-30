import * as jalaali from 'jalaali-js'

export function toJalali(dateStr: string | Date): string {
  try {
    const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr
    const j = jalaali.toJalaali(d.getFullYear(), d.getMonth() + 1, d.getDate())
    const months = ['', 'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند']
    const dj = j.jd.toString().replace(/\d/g, (x: string) => '۰۱۲۳۴۵۶۷۸۹'[parseInt(x)])
    const jy = j.jy.toString().replace(/\d/g, (x: string) => '۰۱۲۳۴۵۶۷۸۹'[parseInt(x)])
    return `${dj} ${months[j.jm]} ${jy}`
  } catch {
    return String(dateStr)
  }
}

export function toJalaliMonth(dateStr: string | Date): string {
  try {
    const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr
    const j = jalaali.toJalaali(d.getFullYear(), d.getMonth() + 1, d.getDate())
    const months = ['', 'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند']
    const jy = j.jy.toString().replace(/\d/g, (x: string) => '۰۱۲۳۴۵۶۷۸۹'[parseInt(x)])
    return `${months[j.jm]} ${jy}`
  } catch {
    return String(dateStr)
  }
}
