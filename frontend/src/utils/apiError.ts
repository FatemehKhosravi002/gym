type ApiErrorLike = {
  response?: { data?: unknown }
}

export function apiErrorMessage(err: unknown, fallback = 'خطا در ارتباط با سرور'): string {
  const data = (err as ApiErrorLike)?.response?.data
  if (!data) return fallback
  if (typeof data === 'string') return data
  if (typeof data !== 'object') return fallback
  const body = data as Record<string, unknown>
  if (typeof body.detail === 'string') return body.detail
  for (const value of Object.values(body)) {
    if (Array.isArray(value) && typeof value[0] === 'string') return value[0]
    if (typeof value === 'string') return value
  }
  return fallback
}

export function firstError(errors: Record<string, string>): string {
  return Object.values(errors)[0] || ''
}

/** DRF field errors -> { field: message }. Nested objects take their first message. */
export function getFieldErrors(err: unknown): Record<string, string> {
  const data = (err as ApiErrorLike)?.response?.data
  if (!data || typeof data !== 'object') return {}
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    if (Array.isArray(value) && typeof value[0] === 'string') {
      out[key] = value[0]
    } else if (typeof value === 'string') {
      out[key] = value
    } else if (value && typeof value === 'object') {
      const messages = Object.values(value as Record<string, unknown>).flat()
      const nested = messages.find((v) => typeof v === 'string')
      if (typeof nested === 'string') out[key] = nested
    }
  }
  return out
}
