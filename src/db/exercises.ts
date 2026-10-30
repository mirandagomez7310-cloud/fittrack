import { nameCollator, type ExerciseInput } from '../domain/model.ts'
import { db } from './db.ts'
import { getActiveWorkout } from './workouts.ts'

// El índice ordena por código binario (mayúsculas antes, tildes al final); se ordena en memoria.
export const allExercises = async () =>
  (await db.exercises.toArray()).sort((a, b) => nameCollator.compare(a.name, b.name))

/** Ejercicios con series registradas, en la sesión en curso o en alguna rutina: no se pueden borrar. */
export async function usedExerciseIds(): Promise<Set<string>> {
  const [withSets, active, routines] = await Promise.all([
    db.sets.orderBy('exerciseId').uniqueKeys(),
    getActiveWorkout(),
    db.routines.toArray(),
  ])
  return new Set([
    ...withSets.map(String),
    ...(active?.exerciseIds ?? []),
    ...routines.flatMap((r) => r.items.map((i) => i.exerciseId)),
  ])
}

export function createExercise(input: ExerciseInput) {
  return db.transaction('rw', db.exercises, async () => {
    // Misma regla que el orden y el buscador: sin distinguir mayúsculas ni tildes.
    const duplicate = await db.exercises.filter((e) => nameCollator.compare(e.name, input.name) === 0).count()
    if (duplicate) throw new Error('Ya existe un ejercicio con ese nombre')
    await db.exercises.add({ ...input, id: crypto.randomUUID(), createdAt: new Date().toISOString() })
  })
}

export function deleteExercise(id: string) {
  return db.transaction('rw', db.exercises, db.sets, db.workouts, db.routines, async () => {
    if ((await usedExerciseIds()).has(id)) throw new Error('Está en uso (series, sesión o rutina); no se puede borrar')
    await db.exercises.delete(id)
  })
}
