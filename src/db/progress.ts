import { Dexie } from 'dexie'
import type { BodyWeight } from '../domain/model.ts'
import { db } from './db.ts'
import { allExercises } from './exercises.ts'

/** Ejercicios con alguna serie, y el último entrenado (para preseleccionarlo). */
export async function trainedExercises() {
  const [ids, exercises, lastWorkout] = await Promise.all([
    db.sets.orderBy('exerciseId').uniqueKeys(),
    allExercises(),
    db.workouts.orderBy('startedAt').last(),
  ])
  const trained = new Set(ids.map(String))
  const latest = lastWorkout?.exerciseIds.findLast((id) => trained.has(id))
  return { exercises: exercises.filter((e) => trained.has(e.id)), latest }
}

/** Series de un ejercicio y la fecha de inicio de cada sesión en la que aparece. */
export async function exerciseHistory(exerciseId: string) {
  const sets = await db.sets
    .where('[exerciseId+createdAt]')
    .between([exerciseId, Dexie.minKey], [exerciseId, Dexie.maxKey])
    .toArray()
  const workouts = await db.workouts.bulkGet([...new Set(sets.map((s) => s.workoutId))])
  const dates = new Map(workouts.flatMap((w) => (w ? [[w.id, w.startedAt] as const] : [])))
  return { sets, dates }
}

export const bodyWeights = () => db.bodyWeights.orderBy('date').toArray()
export const saveBodyWeight = (entry: BodyWeight) => db.bodyWeights.put(entry)
export const deleteBodyWeight = (date: string) => db.bodyWeights.delete(date)

/** Deshacer: no pisa un registro guardado ese mismo día después del borrado. Devuelve si restauró. */
export function restoreBodyWeight(entry: BodyWeight) {
  return db.transaction('rw', db.bodyWeights, async () => {
    if (await db.bodyWeights.get(entry.date)) return false
    await db.bodyWeights.add(entry)
    return true
  })
}
