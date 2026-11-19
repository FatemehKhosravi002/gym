/** Pure helpers for rendering a programme (detail page, public page, review). */

export interface ProgramItemView {
  id: string
  exerciseId: number
  name: string
  category: string
  sets: string
  reps: string
  restSeconds: number | null
  note: string
  videoUrl: string
  gifUrl: string
}

export interface ProgramItemGroup {
  key: string
  group: number | null
  letter: string | null
  items: ProgramItemView[]
}

export function toProgramItemView(raw: any): ProgramItemView {
  const detail = raw?.exercise_detail || {}
  const gif = detail.gif_file || ''
  const video = detail.video_url || detail.video_file || ''
  return {
    id: String(raw?.id ?? `${raw?.exercise}-${raw?.order}`),
    exerciseId: Number(raw?.exercise ?? 0),
    name: detail.name || raw?.exercise_name_snapshot || 'حرکت',
    category: detail.category_name || '',
    sets: String(raw?.sets ?? ''),
    reps: String(raw?.reps ?? ''),
    restSeconds: raw?.rest_seconds ?? null,
    note: raw?.note || '',
    videoUrl: video,
    gifUrl: gif,
  }
}

/** Same grouping, but reading ``superset_group`` straight from API rows. */
export function groupApiItems(rawItems: any[]): ProgramItemGroup[] {
  const groups: ProgramItemGroup[] = []
  let letterIndex = -1
  for (const raw of rawItems || []) {
    const group = raw?.superset_group ?? null
    const view = toProgramItemView(raw)
    const previous = groups[groups.length - 1]
    if (group !== null && previous && previous.group === group) {
      previous.items.push(view)
    } else {
      groups.push({ key: view.id, group, letter: null, items: [view] })
    }
  }
  for (const block of groups) {
    if (block.group !== null) {
      letterIndex += 1
      block.letter = String.fromCharCode(65 + (letterIndex % 26))
    }
  }
  return groups
}

export function itemTag(block: ProgramItemGroup, index: number): string {
  return block.letter ? `${block.letter}${index + 1}` : ''
}

export function restLabel(seconds: number | null | undefined): string {
  if (!seconds) return ''
  return `${seconds} ثانیه`
}
