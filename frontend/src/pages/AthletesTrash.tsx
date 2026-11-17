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
      await api.post(`/athletes/${target.id}/purge/`, { confirm_code: typedCode.trim() })
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
