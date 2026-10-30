import { z } from 'zod'
import { muscleGroups, nameCollator, nameField } from './model.ts'

/** Tamaño máximo del archivo de copia; muy por encima de años de uso real. */
export const MAX_BACKUP_BYTES = 20 * 1024 * 1024

// Los ids acaban en URLs (/historial/:id): solo caracteres seguros, como los UUID que genera la app.
const id = z.string().regex(/^[A-Za-z0-9_-]{1,64}$/, 'Identificador no válido')
const date = z.iso.datetime()
const int = (max: number) => z.number().int().min(1).max(max)
const item = z.object({ exerciseId: id, sets: int(20), reps: int(999) })
// Límites de listas: nunca por debajo de lo que la propia app puede escribir (una rutina o sesión
// puede tener como mucho todo el catálogo), o una copia exportada no se podría restaurar.
const MAX_EXERCISES = 5_000

// z.object descarta claves desconocidas: no entra nada que la app no conozca.
export const backupSchema = z
  .object({
    app: z.literal('fittrack', 'No es una copia de FitTrack'),
    // v1 (fase 3) no tenía peso corporal; se sigue aceptando.
    version: z.literal([1, 2], 'Versión de copia no compatible'),
    exportedAt: date,
    exercises: z
      .array(
        z.object({
          id,
          name: nameField,
          muscle: z.enum(muscleGroups),
          kind: z.enum(['weighted', 'bodyweight']),
          createdAt: date,
        }),
      )
      .max(MAX_EXERCISES),
    routines: z
      .array(z.object({ id, name: nameField, items: z.array(item).max(MAX_EXERCISES), createdAt: date }))
      .max(5_000),
    workouts: z
      .array(
        z.object({
          id,
          startedAt: date,
          endedAt: date.optional(),
          exerciseIds: z.array(id).max(MAX_EXERCISES),
          routineName: nameField.optional(),
          plan: z.array(item).max(MAX_EXERCISES).optional(),
        }),
      )
      .max(100_000),
    sets: z
      .array(
        z.object({
          id,
          workoutId: id,
          exerciseId: id,
          reps: int(999),
          weightKg: z.number().min(0).max(1000),
          createdAt: date,
        }),
      )
      .max(1_000_000),
    bodyWeights: z
      .array(z.object({ date: z.iso.date(), weightKg: z.number().min(20).max(400) }))
      .max(100_000)
      .default([]),
  })
  .superRefine((b, ctx) => {
    const fail = (message: string) => ctx.addIssue({ code: 'custom', message })

    for (const table of ['exercises', 'routines', 'workouts', 'sets'] as const) {
      const ids = b[table].map((r) => r.id)
      if (new Set(ids).size !== ids.length) fail(`Hay ids repetidos en ${table}`)
    }
    if (new Set(b.bodyWeights.map((w) => w.date)).size !== b.bodyWeights.length) {
      fail('Hay más de un peso corporal el mismo día')
    }

    const names = b.exercises.map((e) => e.name).sort(nameCollator.compare)
    if (names.some((n, i) => i > 0 && nameCollator.compare(n, names[i - 1]!) === 0)) {
      fail('Hay ejercicios con el mismo nombre')
    }

    const exercises = new Set(b.exercises.map((e) => e.id))
    const workouts = new Set(b.workouts.map((w) => w.id))
    const exerciseRefs = [
      ...b.routines.flatMap((r) => r.items.map((i) => i.exerciseId)),
      ...b.workouts.flatMap((w) => [...w.exerciseIds, ...(w.plan ?? []).map((i) => i.exerciseId)]),
      ...b.sets.map((s) => s.exerciseId),
    ]
    if (exerciseRefs.some((ref) => !exercises.has(ref))) fail('Hay referencias a ejercicios que no existen')
    if (b.sets.some((s) => !workouts.has(s.workoutId))) fail('Hay series de entrenamientos que no existen')
    if (b.workouts.filter((w) => !w.endedAt).length > 1) fail('Hay más de un entrenamiento abierto')

    const hasRepeats = (ids: string[]) => new Set(ids).size !== ids.length
    if (
      b.routines.some((r) => hasRepeats(r.items.map((i) => i.exerciseId))) ||
      b.workouts.some((w) => hasRepeats(w.exerciseIds) || hasRepeats((w.plan ?? []).map((i) => i.exerciseId)))
    ) {
      fail('Hay ejercicios repetidos dentro de una rutina o entrenamiento')
    }

    // Una serie solo se ve (y solo debe contar) si su ejercicio está en la sesión.
    const workoutExercises = new Map(b.workouts.map((w) => [w.id, new Set(w.exerciseIds)]))
    if (b.sets.some((s) => !workoutExercises.get(s.workoutId)?.has(s.exerciseId))) {
      fail('Hay series de ejercicios que no figuran en su entrenamiento')
    }
  })

export type Backup = z.output<typeof backupSchema>

/** Lee y valida un archivo de copia. Devuelve los datos o una lista de problemas legibles. */
export function parseBackup(text: string): { ok: true; data: Backup } | { ok: false; errors: string[] } {
  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    return { ok: false, errors: ['El archivo no es JSON válido'] }
  }
  const r = backupSchema.safeParse(json)
  if (r.success) return { ok: true, data: r.data }
  const errors = r.error.issues.slice(0, 5).map((i) => (i.path.length ? `${i.path.join('.')}: ${i.message}` : i.message))
  return { ok: false, errors }
}
