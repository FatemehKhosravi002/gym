import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../utils/api'
import { apiErrorMessage } from '../utils/apiError'
import Button from './Button'
import Chip from './Chip'
import { AlertIcon } from './icons'
import { useToast } from './Toast'

export const PRESET_TAGS = ['آسیب زانو', 'آسیب کمر', 'آسیب شانه', 'ممنوعیت حرکت خاص', 'فشار خون']

interface BannerProps {
  athleteId: number | string
  /** Skip fetching when the parent already has the data. */
  notes?: string
  noteTags?: string[]
}

/** Warning banner: shown everywhere the coach builds a program for a student with a note. */
export function AthleteNoteBanner({ athleteId, notes, noteTags }: BannerProps) {
  const [note, setNote] = useState(notes || '')
  const [tags, setTags] = useState<string[]>(noteTags || [])

  useEffect(() => {
    if (notes !== undefined) {
      setNote(notes)
      setTags(noteTags || [])
      return
    }
    let cancelled = false
    api.get(`/athletes/${athleteId}/`)
      .then((res) => {
        if (cancelled) return
        setNote(res.data.notes || '')
        setTags(res.data.note_tags || [])
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [athleteId, notes, noteTags])

  if (!note.trim() && tags.length === 0) return null

  return (
    <div className="rounded-card border border-warning-200 bg-warning-50 p-4" role="note">
      <div className="flex items-start gap-2">
        <AlertIcon className="mt-0.5 h-5 w-5 shrink-0 text-warning-700" />
        <div className="min-w-0 space-y-1.5">
          <p className="text-sm font-bold text-warning-700">توجه: محدودیت این ورزشکار</p>
          {note.trim() && <p className="text-sm leading-6 text-ink-800">{note}</p>}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <span key={tag} className="rounded-pill bg-warning-100 px-2.5 py-1 text-xs font-semibold text-warning-700">
                  {tag}
                </span>
              ))}
            </div>
          )}
          <Link to={`/athletes/${athleteId}`} className="inline-block pt-1 text-sm font-semibold text-primary-700 underline underline-offset-4">
            مشاهده پرونده ورزشکار
          </Link>
        </div>
      </div>
    </div>
  )
}

interface CardProps {
  athleteId: number | string
  notes: string
  noteTags: string[]
  onSaved: (data: { notes: string; note_tags: string[] }) => void
}

/** Editable coach note card on the student page (injuries and limitations). */
export function AthleteNoteCard({ athleteId, notes, noteTags, onSaved }: CardProps) {
  const toast = useToast()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(notes)
  const [tags, setTags] = useState<string[]>(noteTags || [])
  const [customTag, setCustomTag] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setDraft(notes)
    setTags(noteTags || [])
  }, [notes, noteTags])

  const toggleTag = (tag: string) =>
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]))

  const addCustomTag = () => {
    const tag = customTag.trim()
    if (!tag || tags.includes(tag)) {
      setCustomTag('')
      return
    }
    setTags((prev) => [...prev, tag])
    setCustomTag('')
  }

  const save = async () => {
    setSaving(true)
    try {
      const res = await api.patch(`/athletes/${athleteId}/`, { notes: draft, note_tags: tags })
      onSaved({ notes: res.data.notes, note_tags: res.data.note_tags })
      setEditing(false)
      toast.success('یادداشت ذخیره شد')
    } catch (err) {
      toast.error(apiErrorMessage(err, 'ذخیره یادداشت انجام نشد'))
    } finally {
      setSaving(false)
    }
  }

  const hasNote = Boolean(notes.trim()) || (noteTags || []).length > 0

  return (
    <section className={`rounded-card border p-4 sm:p-5 ${hasNote ? 'border-warning-200 bg-warning-50' : 'border-border bg-surface'}`}>
      <div className="flex items-start justify-between gap-3">
        <h2 className="flex items-center gap-2 text-base font-bold text-primary-900">
          <AlertIcon className={`h-5 w-5 ${hasNote ? 'text-warning-700' : 'text-ink-500'}`} />
          یادداشت مربی (آسیب‌ها و محدودیت‌ها)
        </h2>
        {!editing && (
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
            {hasNote ? 'ویرایش' : 'افزودن'}
          </Button>
        )}
      </div>

      {!editing && (
        <div className="mt-2 space-y-2">
          {notes.trim() ? (
            <p className="text-sm leading-6 text-ink-800">{notes}</p>
          ) : (
            <p className="text-sm text-ink-600">یادداشتی ثبت نشده. اگر ورزشکار آسیب یا محدودیت دارد، اینجا بنویسید تا در ساخت برنامه هشدار ببینید.</p>
          )}
          {(noteTags || []).length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {noteTags.map((tag) => (
                <span key={tag} className="rounded-pill bg-warning-100 px-2.5 py-1 text-xs font-semibold text-warning-700">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {editing && (
        <div className="mt-3 space-y-3">
          <div>
            <label htmlFor="coach-note" className="mb-1.5 block text-sm font-semibold text-ink-700">
              متن یادداشت
            </label>
            <textarea
              id="coach-note"
              className="field min-h-[96px]"
              placeholder="مثال: زانوی راست عمل شده؛ از اسکوات عمیق پرهیز شود."
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-semibold text-ink-700">برچسب‌های سریع</p>
            <div className="flex flex-wrap gap-2">
              {Array.from(new Set([...PRESET_TAGS, ...tags])).map((tag) => (
                <Chip key={tag} active={tags.includes(tag)} onClick={() => toggleTag(tag)}>
                  {tag}
                </Chip>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                className="field"
                placeholder="برچسب دلخواه…"
                value={customTag}
                onChange={(e) => setCustomTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addCustomTag()
                  }
                }}
                aria-label="برچسب دلخواه"
              />
              <Button type="button" variant="outline" onClick={addCustomTag}>افزودن</Button>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={save} loading={saving}>ذخیره یادداشت</Button>
            <Button variant="ghost" onClick={() => setEditing(false)}>انصراف</Button>
          </div>
        </div>
      )}
    </section>
  )
}
