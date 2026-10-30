import type { ExerciseInput } from '../domain/model.ts'
import { db } from './db.ts'
import { getActiveWorkout } from './workouts.ts'

const collator = new Intl.Collator('es', { sensitivity: 'base' })

// El índice ordena por código binario (mayúsculas antes, tildes al final); se ordena en memoria.
export const allExercises = async () => (await db.exercises.toArray()).sort((a, b) => collator.compare(a.name, b.name))

/** Ejercicios con series registradas o en la sesión en curso: no se pueden borrar. */
export async function usedExerciseIds(): Promise<Set<string>> {
  const [withSets, active] = await Promise.all([db.sets.orderBy('exerciseId').uniqueKeys(), getActiveWorkout()])
  return new Set([...withSets.map(String), ...(active?.exerciseIds ?? [])])
}

export function createExercise(input: ExerciseInput) {
  return db.transaction('rw', db.exercises, async () => {
    // Misma regla que el orden y el buscador: sin distinguir mayúsculas ni tildes.
    const duplicate = await db.exercises.filter((e) => collator.compare(e.name, input.name) === 0).count()
    if (duplicate) throw new Error('Ya existe un ejercicio con ese nombre')
    await db.exercises.add({ ...input, id: crypto.randomUUID(), createdAt: new Date().toISOString() })
  })
}

export function deleteExercise(id: string) {
  return db.transaction('rw', db.exercises, db.sets, db.workouts, async () => {
    if ((await usedExerciseIds()).has(id)) throw new Error('Tiene series registradas; no se puede borrar')
    await db.exercises.delete(id)
  })
}
