import { z } from 'zod'

export const muscleGroups = [
  'Pecho',
  'Espalda',
  'Piernas',
  'Glúteos',
  'Hombros',
  'Bíceps',
  'Tríceps',
  'Core',
  'Cuerpo completo',
] as const

export const exerciseKinds = { weighted: 'Con carga', bodyweight: 'Peso corporal' } as const
export type ExerciseKind = keyof typeof exerciseKinds

export type Exercise = {
  id: string
  name: string
  muscle: (typeof muscleGroups)[number]
  kind: ExerciseKind
  createdAt: string
}

export type Workout = {
  id: string
  startedAt: string
  endedAt?: string
  /** Orden en que se añadieron los ejercicios a la sesión. */
  exerciseIds: string[]
}

/** weightKg: carga en kg; en ejercicios de peso corporal es el lastre (0 si no hay). */
export type SetEntry = {
  id: string
  workoutId: string
  exerciseId: string
  reps: number
  weightKg: number
  createdAt: string
}

/** Acepta coma decimal ("62,5"). Vacío cuenta como 0. */
export function parseDecimal(value: string): number {
  const s = value.trim()
  return s === '' ? 0 : Number(s.replace(',', '.'))
}

export const toDecimalInput = (n: number) => String(n).replace('.', ',')

export const exerciseInput = z.object({
  name: z.string().trim().min(1, 'Escribe un nombre').max(60, 'Máximo 60 caracteres'),
  muscle: z.enum(muscleGroups, 'Elige un grupo muscular'),
  kind: z.enum(['weighted', 'bodyweight'], 'Elige un tipo'),
})
export type ExerciseInput = z.infer<typeof exerciseInput>

export const setInput = z.object({
  reps: z
    .string()
    .transform(Number)
    .pipe(z.number('Introduce un número').int('Sin decimales').min(1, 'Mínimo 1').max(999, 'Máximo 999')),
  weightKg: z
    .string()
    .transform(parseDecimal)
    .pipe(z.number('Introduce un número').min(0, 'No puede ser negativo').max(1000, 'Máximo 1000 kg'))
    .transform((n) => Math.round(n * 100) / 100),
})
export type SetInput = z.output<typeof setInput>
