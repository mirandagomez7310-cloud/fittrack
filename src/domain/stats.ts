import type { ExerciseKind, SetEntry } from './model.ts'

type SetValues = Pick<SetEntry, 'reps' | 'weightKg'>

/** En peso corporal solo cuenta el lastre. */
export const setVolume = (s: SetValues) => s.reps * s.weightKg

export const totalVolume = (sets: SetValues[]) => sets.reduce((sum, s) => sum + setVolume(s), 0)

/** "1 serie", "3 series". */
export const count = (n: number, singular: string, plural: string) => `${n} ${n === 1 ? singular : plural}`

const number = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 })
/** Número con coma decimal (es-ES). */
export const formatNumber = (n: number) => number.format(n)
export const formatKg = formatNumber
/** "72,5 kg". */
export const kgLabel = (n: number) => `${formatNumber(n)} kg`

const dateTime = new Intl.DateTimeFormat('es-ES', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})
export const formatDateTime = (iso: string) => dateTime.format(new Date(iso))

const shortDate = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' })
const longDate = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
export const formatShortDate = (d: Date) => shortDate.format(d)
export const formatDate = (d: Date) => longDate.format(d)

/** Nunca negativa: el reloj del dispositivo puede retroceder durante la sesión. */
export const durationMinutes = (start: string, end: string) =>
  Math.max(0, Math.round((Date.parse(end) - Date.parse(start)) / 60_000))

export function formatSet(s: SetValues, kind: ExerciseKind) {
  if (kind === 'bodyweight') {
    return s.weightKg > 0 ? `${s.reps} × +${formatKg(s.weightKg)} kg` : `${s.reps} reps`
  }
  return `${s.reps} × ${formatKg(s.weightKg)} kg`
}
