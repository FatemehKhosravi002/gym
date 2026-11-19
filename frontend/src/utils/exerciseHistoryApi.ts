import api from './api'
import {
  EMPTY_HISTORY,
  HISTORY_TIMEOUT_MS,
  type ExerciseHistory,
  type ExerciseHistoryRow,
  type FrequentExercise,
} from './exerciseHistory'

/**
 * Repeat-history API calls. A short timeout keeps the builder snappy: when the
 * check is slow the coach continues normally and only sees a small notice.
 */

function normalizeRow(row: any): ExerciseHistoryRow {
  return {
    id: Number(row?.id) || 0,
    sequence_number: Number(row?.sequence_number) || 0,
    date: String(row?.date || ''),
    date_jalali: String(row?.date_jalali || ''),
    day_index: Number(row?.day_index) || 1,
    sets: String(row?.sets ?? ''),
    reps: String(row?.reps ?? ''),
  }
}

export function normalizeHistory(data: any): ExerciseHistory {
  const programs = Array.isArray(data?.programs) ? data.programs.map(normalizeRow) : []
  return {
    count: Number(data?.count ?? programs.length) || 0,
    last: data?.last ? normalizeRow(data.last) : programs[0] || null,
    programs,
  }
}

export async function fetchExerciseHistory(
  athleteId: number | string,
  exerciseId: number | string,
  excludeProgram?: number | string | null,
  timeoutMs: number = HISTORY_TIMEOUT_MS,
): Promise<ExerciseHistory> {
  const params: Record<string, string | number> = { exercise_id: exerciseId }
  if (excludeProgram) params.exclude_program = excludeProgram
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await api.get(`/athletes/${athleteId}/exercise_history/`, {
      params,
      signal: controller.signal,
    })
    return normalizeHistory(res.data)
  } finally {
    clearTimeout(timer)
  }
}

export async function fetchFrequentExercises(athleteId: number | string): Promise<FrequentExercise[]> {
  const res = await api.get(`/athletes/${athleteId}/frequent_exercises/`)
  const rows = Array.isArray(res.data?.exercises) ? res.data.exercises : []
  return rows.map((row: any) => ({
    exercise_id: Number(row?.exercise_id) || 0,
    name: String(row?.name || ''),
    count: Number(row?.count) || 0,
    last_sequence_number: row?.last_sequence_number ?? null,
    last_date: String(row?.last_date || ''),
    last_date_jalali: String(row?.last_date_jalali || ''),
  }))
}

export { EMPTY_HISTORY }
