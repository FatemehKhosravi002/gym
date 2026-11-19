import api from './api'

export function programShareUrl(token: string): string {
  return `${window.location.origin}/public/program/${token}`
}

/**
 * One-tap share: Web Share API when available, clipboard otherwise.
 * Marks the programme as shared so editing can ask «لینک قبلاً ارسال شده».
 */
export async function shareProgramLink(programId: number | string, token: string, title = 'برنامه تمرینی'): Promise<'shared' | 'copied' | 'cancelled'> {
  const url = programShareUrl(token)
  api.post(`/programs/${programId}/share/`).catch(() => undefined)
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({ title, url })
      return 'shared'
    } catch (err) {
      if ((err as { name?: string })?.name === 'AbortError') return 'cancelled'
    }
  }
  await navigator.clipboard.writeText(url)
  return 'copied'
}
