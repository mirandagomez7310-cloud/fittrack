import type { ExerciseKind, SetEntry } from './model.ts'
import { totalVolume } from './stats.ts'

/** 1RM estimado (Epley). Con 1 repetición es la propia carga. */
export const epley = (weightKg: number, reps: number) => (reps === 1 ? weightKg : weightKg * (1 + reps / 30))

export const metrics = {
  e1rm: { label: '1RM estimado', unit: 'kg' },
  maxLoad: { label: 'Carga máxima', unit: 'kg' },
  volume: { label: 'Volumen', unit: 'kg' },
  maxReps: { label: 'Reps máximas', unit: 'reps' },
} as const
export type Metric = keyof typeof metrics

/** En peso corporal la carga es solo el lastre: se sigue la progresión en repeticiones. */
export const metricsFor = (kind: ExerciseKind): Metric[] =>
  kind === 'weighted' ? ['e1rm', 'maxLoad', 'volume'] : ['maxReps']

const round1 = (n: number) => Math.round(n * 10) / 10

/** Máximo sin spread: Math.max(...arr) revienta la pila con listas muy largas. */
export const maxOf = (values: number[]) => values.reduce((a, b) => (b > a ? b : a), -Infinity)
export const minOf = (values: number[]) => values.reduce((a, b) => (b < a ? b : a), Infinity)

function sessionValue(sets: SetEntry[], metric: Metric) {
  switch (metric) {
    case 'e1rm':
      return round1(maxOf(sets.map((s) => epley(s.weightKg, s.reps))))
    case 'maxLoad':
      return maxOf(sets.map((s) => s.weightKg))
    case 'volume':
      return round1(totalVolume(sets))
    case 'maxReps':
      return maxOf(sets.map((s) => s.reps))
  }
}

export type Point = { date: string; value: number }

/** Un punto por sesión, en orden cronológico. `dates`: inicio de cada sesión por id. */
export function exerciseSeries(sets: SetEntry[], dates: Map<string, string>, metric: Metric): Point[] {
  const bySession = new Map<string, SetEntry[]>()
  for (const s of sets) {
    const own = bySession.get(s.workoutId)
    if (own) own.push(s)
    else bySession.set(s.workoutId, [s])
  }
  return [...bySession]
    .flatMap(([workoutId, own]) => {
      const date = dates.get(workoutId)
      return date ? [{ date, value: sessionValue(own, metric) }] : []
    })
    .sort((a, b) => a.date.localeCompare(b.date))
}

/** Mejor valor y la primera sesión en que se alcanzó. */
export function personalRecord(series: Point[]): Point | null {
  return series.reduce<Point | null>((best, p) => (!best || p.value > best.value ? p : best), null)
}
