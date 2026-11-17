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
