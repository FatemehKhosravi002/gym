import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../utils/api'
import { apiErrorMessage } from '../utils/apiError'
import Avatar from '../components/Avatar'
import Button from '../components/Button'
import Card from '../components/Card'
import EmptyState from '../components/EmptyState'
import Input from '../components/Input'
import Modal from '../components/Modal'
import { SkeletonList } from '../components/Skeleton'
import { useToast } from '../components/Toast'
import { toJalali } from '../utils/jalali'
import { toPersianDigits } from '../utils/persianDigits'

interface TrashedStudent {
  id: number
  first_name: string
  last_name: string
  unique_code: string
  deleted_at?: string | null
  programs_count?: number | null
}

export default function AthletesTrash() {
  const toast = useToast()
  const [rows, setRows] = useState<TrashedStudent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [target, setTarget] = useState<TrashedStudent | null>(null)
  const [typedCode, setTypedCode] = useState('')
  const [busyId, setBusyId] = useState<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/athletes/trash/')
      setRows(res.data.results || res.data)
      setError('')
    } catch (err) {
      setError(apiErrorMessage(err, 'دریافت سطل زباله انجام نشد'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const restore = async (student: TrashedStudent) => {
    setBusyId(student.id)
    try {
      await api.post(`/athletes/${student.id}/restore/`)
      setRows((prev) => prev.filter((r) => r.id !== student.id))
      toast.success('ورزشکار بازگردانده شد')
    } catch (err) {
      toast.error(apiErrorMessage(err, 'بازگردانی انجام نشد'))
    } finally {
      setBusyId(null)
    }
  }

  const purge = async () => {
    if (!target) return
    setBusyId(target.id)
    try {
      await api.post(`/athletes/${target.id}/purge/`, { confirm_code: normalizeDigits(typedCode).replace(/\s/g, '') })
      setRows((prev) => prev.filter((r) => r.id !== target.id))
      toast.success('ورزشکار برای همیشه حذف شد')
      setTarget(null)
      setTypedCode('')
    } catch (err) {
      toast.error(apiErrorMessage(err, 'حذف دائمی انجام نشد'))
    } finally {
      setBusyId(null)
    }
  }

  const typedMatches = Boolean(target) && normalizeDigits(typedCode).replace(/\s/g, '') === target!.unique_code

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-primary-900 sm:text-2xl">سطل زباله ورزشکاران</h1>
          <p className="text-sm text-ink-600">
            ورزشکاران حذف‌شده تا وقتی برای همیشه حذف نشوند قابل بازگردانی هستند.
          </p>
        </div>
        <Link to="/athletes" className="min-h-[48px] flex items-center text-sm font-semibold text-ink-700 hover:text-primary-700">
          بازگشت به فهرست
        </Link>
      </div>

      {loading && <SkeletonList count={3} />}

      {!loading && error && (
        <Card>
          <p className="text-sm text-error-700">{error}</p>
          <Button variant="outline" className="mt-3" onClick={load}>تلاش دوباره</Button>
        </Card>
      )}

      {!loading && !error && rows.length === 0 && (
        <EmptyState
          title="سطل زباله خالی است"
          description="ورزشکاری که حذف می‌کنید موقتاً اینجا نگه داشته می‌شود و می‌توانید بازگردانید."
          action={<Link to="/athletes"><Button variant="outline">بازگشت به ورزشکاران</Button></Link>}
        />
      )}

      {rows.length > 0 && (
        <ul className="space-y-3">
          {rows.map((student) => (
            <li key={student.id}>
              <Card className="flex items-center gap-3">
                <Avatar firstName={student.first_name} lastName={student.last_name} size="lg" />
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="truncate text-base font-bold text-ink-900">
                    {student.first_name} {student.last_name}
                  </p>
                  <p className="text-sm text-ink-600">کد ورزشکار: {toPersianDigits(student.unique_code)}</p>
                  {student.deleted_at && (
                    <p className="text-xs text-ink-500">حذف‌شده در {toJalali(student.deleted_at)}</p>
                  )}
                  {student.programs_count ? (
                    <p className="text-xs font-semibold text-warning-700">
                      {toPersianDigits(student.programs_count)} برنامه دارد؛ برای حذف دائمی ابتدا برنامه‌ها را حذف کنید.
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 flex-col gap-2">
                  <Button size="sm" variant="outline" loading={busyId === student.id}
                    onClick={() => restore(student)}>
                    بازگردانی
                  </Button>
                  <Button size="sm" variant="ghost" className="text-error-700"
                    disabled={Boolean(student.programs_count)}
                    onClick={() => { setTarget(student); setTypedCode('') }}>
                    حذف دائمی
                  </Button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={Boolean(target)}
        onClose={() => { setTarget(null); setTypedCode('') }}
        title="حذف دائمی ورزشکار"
        description="این کار قابل بازگشت نیست. تمام اندازه‌گیری‌ها و پرونده ورزشکار از بین می‌رود."
        variant="dialog"
      >
        <div className="space-y-3">
          {target && (
            <>
              <div className="rounded-field bg-warning-50 p-3 text-sm text-ink-800">
                برای تأیید، کد ورزشکار <span className="font-bold">{toPersianDigits(target.unique_code)}</span> را
                دقیقاً وارد کنید. اگر این ورزشکار برنامه دارد، حذف دائمی انجام نمی‌شود.
              </div>
              <Input
                label="کد ورزشکار"
                value={typedCode}
                onChange={(e) => setTypedCode(e.target.value)}
                inputMode="numeric"
                autoComplete="off"
                placeholder={toPersianDigits(target.unique_code)}
                error={typedCode && !typedMatches ? 'کد مطابقت ندارد.' : undefined}
                autoFocus
              />
              <div className="flex gap-3">
                <Button variant="outline" fullWidth onClick={() => { setTarget(null); setTypedCode('') }}>
                  انصراف
                </Button>
                <Button variant="danger" fullWidth disabled={!typedMatches} loading={busyId === target.id}
                  onClick={purge}>
                  حذف برای همیشه
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  )
}

/** Accept Persian/Arabic digits typed on a phone keyboard. */
function normalizeDigits(value: string): string {
  return value
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
}
