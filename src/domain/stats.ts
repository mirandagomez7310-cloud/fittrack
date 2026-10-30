import type { ExerciseKind, SetEntry } from './model.ts'

type SetValues = Pick<SetEntry, 'reps' | 'weightKg'>

/** En peso corporal solo cuenta el lastre. */
export const setVolume = (s: SetValues) => s.reps * s.weightKg

export const totalVolume = (sets: SetValues[]) => sets.reduce((sum, s) => sum + setVolume(s), 0)

const kg = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 })
export const formatKg = (n: number) => kg.format(n)

export function formatSet(s: SetValues, kind: ExerciseKind) {
  if (kind === 'bodyweight') {
    return s.weightKg > 0 ? `${s.reps} × +${formatKg(s.weightKg)} kg` : `${s.reps} reps`
  }
  return `${s.reps} × ${formatKg(s.weightKg)} kg`
}
