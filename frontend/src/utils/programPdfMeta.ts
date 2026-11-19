/** Pure PDF helpers (no axios/window) so node tests can import them directly. */

export const PDF_ERROR_FALLBACK = 'دانلود PDF انجام نشد؛ دوباره تلاش کنید.'

export function programPdfPath(programId: number | string, publicToken?: string): string {
  if (publicToken) return `/programs/public/${publicToken}/pdf/`
  return `/programs/${programId}/pdf/`
}

export function programPdfFilename(programId: number | string, sequenceNumber?: number): string {
  const suffix = sequenceNumber ? `-${sequenceNumber}` : ''
  return `physique-program${suffix}-${programId}.pdf`
}
