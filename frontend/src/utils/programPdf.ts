import api from './api'
import { PDF_ERROR_FALLBACK, programPdfFilename, programPdfPath } from './programPdfMeta'

export { PDF_ERROR_FALLBACK, programPdfFilename, programPdfPath }

async function blobErrorMessage(data: unknown, fallback: string): Promise<string> {
  if (data instanceof Blob) {
    try {
      const text = await data.text()
      const parsed = JSON.parse(text)
      if (parsed && typeof parsed.detail === 'string') return parsed.detail
    } catch {
      return fallback
    }
  }
  return fallback
}

/**
 * Download the programme PDF through the authenticated axios instance so the
 * JWT header is honoured and JSON errors stay readable.
 */
export async function downloadProgramPdf(
  programId: number | string,
  options: { filename?: string; publicToken?: string } = {},
): Promise<string> {
  const filename = options.filename || programPdfFilename(programId)
  try {
    const res = await api.get(programPdfPath(programId, options.publicToken), { responseType: 'blob' })
    const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', filename)
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.setTimeout(() => window.URL.revokeObjectURL(url), 1000)
    return filename
  } catch (err) {
    const data = (err as { response?: { data?: unknown } })?.response?.data
    throw new Error(await blobErrorMessage(data, PDF_ERROR_FALLBACK))
  }
}
