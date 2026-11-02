export function toPersianDigits(str: string | number): string {
  const s = String(str)
  return s.replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[parseInt(d)])
}
