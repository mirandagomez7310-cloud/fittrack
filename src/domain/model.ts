import { z } from 'zod'
import { todayISO } from './dates.ts'

// Sin JIT: Zod probaría `new Function` y la CSP (script-src 'self', sin 'unsafe-eval') lo bloquea.
z.config({ jitless: true })

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

export type RoutineItem = { exerciseId: string; sets: number; reps: number }

export type Routine = {
  id: string
  name: string
  items: RoutineItem[]
  createdAt: string
}

export type Workout = {
  id: string
  startedAt: string
  endedAt?: string
  /** Orden en que se añadieron los ejercicios a la sesión. */
  exerciseIds: string[]
  /** Copia de la rutina al empezar: editarla o borrarla después no cambia el historial. */
  routineName?: string
  plan?: RoutineItem[]
}

/** Un registro por día (fecha local YYYY-MM-DD); registrar de nuevo ese día lo reemplaza. */
export type BodyWeight = { date: string; weightKg: number }

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

/** Regla única para ordenar y comparar nombres: sin distinguir mayúsculas ni tildes. */
export const nameCollator = new Intl.Collator('es', { sensitivity: 'base' })

export const nameField =z.string().trim().min(1, 'Escribe un nombre').max(60, 'Máximo 60 caracteres')

export const exerciseInput = z.object({
  name: nameField,
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

export const bodyWeightInput = z.object({
  // La comparación de cadenas YYYY-MM-DD es cronológica. Se evalúa al validar, no al cargar el módulo.
  date: z.iso.date('Elige una fecha').refine((d) => d <= todayISO(), 'No puede ser una fecha futura'),
  weightKg: z
    .string()
    .transform(parseDecimal)
    .pipe(z.number('Introduce un número').min(20, 'Mínimo 20 kg').max(400, 'Máximo 400 kg'))
    .transform((n) => Math.round(n * 10) / 10),
})
