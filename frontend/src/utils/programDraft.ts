/** Draft model + pure helpers for the programme builder (localStorage persistence). */

export const DRAFT_VERSION = 1

export interface DraftItem {
  key: string
  serverId?: number
  exerciseId: number
  exerciseName: string
  sets: string
  reps: string
  rest: string
  note: string
  supersetGroup: number | null
  /** False when the library exercise is disabled (offer «جایگزینی»). */
  exerciseIsActive?: boolean
}

export interface DraftDay {
  serverId?: number
  dayIndex: number
  label: string
  items: DraftItem[]
  removedServerIds: number[]
}

export type BuilderStep = 'days' | 'day' | 'review'

export interface ProgramDraft {
  version: number
  athleteId: string
  programId: number | null
  daysPerWeek: number
  title: string
  startDate: string
  step: BuilderStep
  currentDay: number
  days: DraftDay[]
  createdAt: string
}

export const draftKey = (athleteId: number | string) => `physique.programDraft.${athleteId}`

export function newItemKey(): string {
  return `it-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

export function createDraft(athleteId: number | string, daysPerWeek: number, title: string, startDate: string): ProgramDraft {
  return {
    version: DRAFT_VERSION,
    athleteId: String(athleteId),
    programId: null,
    daysPerWeek,
    title,
    startDate,
    step: 'day',
    currentDay: 1,
    days: Array.from({ length: daysPerWeek }, (_, index) => ({
      dayIndex: index + 1,
      label: '',
      items: [],
      removedServerIds: [],
    })),
    createdAt: new Date().toISOString(),
  }
}

/** Render an existing programme as a wizard draft (edit mode). */
export function draftFromProgram(program: any): ProgramDraft {
  const rawDays = [...(program?.days || [])].sort((a, b) => a.day_index - b.day_index)
  return {
    version: DRAFT_VERSION,
    athleteId: String(program.athlete),
    programId: Number(program.id),
    daysPerWeek: Number(program.days_per_week || rawDays.length || 1),
    title: program.title || '',
    startDate: program.start_date || '',
    step: 'day',
    currentDay: rawDays[0]?.day_index || 1,
    days: rawDays.map((day: any) => ({
      serverId: day.id,
      dayIndex: day.day_index,
      label: day.label || '',
      items: [...(day.items || [])]
        .sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0))
        .map((item: any) => ({
          key: `srv-${item.id}`,
          serverId: item.id,
          exerciseId: item.exercise,
          exerciseName: item.exercise_detail?.name || item.exercise_name_snapshot || 'حرکت',
          sets: String(item.sets ?? ''),
          reps: String(item.reps ?? ''),
          rest: item.rest_seconds ? String(item.rest_seconds) : '',
          note: item.note || '',
          supersetGroup: item.superset_group ?? null,
          exerciseIsActive: item.exercise_detail?.is_active !== false,
        })),
      removedServerIds: [],
    })),
    createdAt: new Date().toISOString(),
  }
}

/** Draft payload for the single-transaction PATCH used in edit mode. */
export function draftDaysPayload(draft: ProgramDraft) {
  return draft.days.map((day) => ({
    ...(day.serverId ? { id: day.serverId } : {}),
    day_index: day.dayIndex,
    label: day.label,
    items: day.items.map((item, index) => ({
      ...(item.serverId ? { id: item.serverId } : {}),
      exercise: item.exerciseId,
      order: index,
      sets: item.sets,
      reps: item.reps,
      rest_seconds: item.rest ? Number(item.rest) : null,
      note: item.note,
      superset_group: item.supersetGroup,
    })),
  }))
}

/** Read + validate the stored draft; anything malformed is ignored. */
export function readDraft(athleteId: number | string): ProgramDraft | null {
  try {
    const raw = window.localStorage.getItem(draftKey(athleteId))
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || parsed.version !== DRAFT_VERSION) return null
    if (!Array.isArray(parsed.days) || parsed.days.length === 0) return null
    return parsed as ProgramDraft
  } catch {
    return null
  }
}

export function writeDraft(draft: ProgramDraft): void {
  try {
    window.localStorage.setItem(draftKey(draft.athleteId), JSON.stringify(draft))
  } catch {
    // Storage full or disabled — the builder keeps working in memory.
  }
}

export function clearDraft(athleteId: number | string): void {
  try {
    window.localStorage.removeItem(draftKey(athleteId))
  } catch {
    // ignore
  }
}

export function draftHasContent(draft: ProgramDraft): boolean {
  return draft.days.some((day) => day.items.length > 0)
}

/** Day numbers (1-based) that already contain the exercise. */
export function daysContaining(draft: ProgramDraft, exerciseId: number, exceptDay?: number): number[] {
  return draft.days
    .filter((day) => day.dayIndex !== exceptDay && day.items.some((item) => item.exerciseId === exerciseId))
    .map((day) => day.dayIndex)
}

export interface ItemBlock {
  key: string
  group: number | null
  items: DraftItem[]
}

/** Superset members must be consecutive; groups with one member are dissolved. */
export function normalizeGroups(items: DraftItem[]): DraftItem[] {
  const cleaned: DraftItem[] = []
  let index = 0
  while (index < items.length) {
    const group = items[index].supersetGroup
    if (group === null || group === undefined) {
      cleaned.push({ ...items[index], supersetGroup: null })
      index += 1
      continue
    }
    let end = index
    while (end + 1 < items.length && items[end + 1].supersetGroup === group) end += 1
    const members = items.slice(index, end + 1)
    const keep = members.length >= 2 ? group : null
    cleaned.push(...members.map((item) => ({ ...item, supersetGroup: keep })))
    index = end + 1
  }

  let counter = 0
  let previous: number | null = null
  return cleaned.map((item) => {
    if (item.supersetGroup === null) {
      previous = null
      return item
    }
    if (item.supersetGroup !== previous) {
      counter += 1
      previous = item.supersetGroup
    }
    return { ...item, supersetGroup: counter }
  })
}

export function groupBlocks(items: DraftItem[]): ItemBlock[] {
  const blocks: ItemBlock[] = []
  for (const item of items) {
    const last = blocks[blocks.length - 1]
    if (item.supersetGroup !== null && last && last.group === item.supersetGroup) {
      last.items.push(item)
    } else {
      blocks.push({ key: item.key, group: item.supersetGroup, items: [item] })
    }
  }
  return blocks
}

export function flattenBlocks(blocks: ItemBlock[]): DraftItem[] {
  return blocks.flatMap((block) => block.items)
}

export function nextGroupNumber(items: DraftItem[]): number {
  return items.reduce((max, item) => Math.max(max, item.supersetGroup ?? 0), 0) + 1
}

/** Group the selected items into a superset (caller keeps them consecutive). */
export function groupSelection(items: DraftItem[], keys: string[]): DraftItem[] {
  if (keys.length < 2) return items
  const group = nextGroupNumber(items)
  return normalizeGroups(items.map((item) => (keys.includes(item.key) ? { ...item, supersetGroup: group } : item)))
}

export function ungroupSuperset(items: DraftItem[], group: number): DraftItem[] {
  return normalizeGroups(items.map((item) => (item.supersetGroup === group ? { ...item, supersetGroup: null } : item)))
}

export function moveIndex<T>(list: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return list
  const next = [...list]
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved)
  return next
}

/** A1/A2 labels per block, in day order (A, B, C …), `null` for standalone items. */
export function supersetLabels(blocks: ItemBlock[]): string[][] {
  let groupIndex = 0
  return blocks.map((block) => {
    if (block.group === null) return []
    const letter = String.fromCharCode(65 + (groupIndex % 26))
    groupIndex += 1
    return block.items.map((_, index) => `${letter}${index + 1}`)
  })
}
