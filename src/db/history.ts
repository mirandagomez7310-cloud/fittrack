import type { SetEntry, Workout } from '../domain/model.ts'
import { db } from './db.ts'

/** Estado completo de una sesión terminada antes de un borrado: lo que necesita "Deshacer". */
export type WorkoutSnapshot = { workout: Workout; sets: SetEntry[] }

async function snapshot(workoutId: string): Promise<WorkoutSnapshot> {
  const workout = await db.workouts.get(workoutId)
  if (!workout?.endedAt) throw new Error('Solo se editan entrenamientos terminados')
  return { workout, sets: await db.sets.where('workoutId').equals(workoutId).toArray() }
}

export function deleteWorkout(workoutId: string) {
  return db.transaction('rw', db.workouts, db.sets, async () => {
    const snap = await snapshot(workoutId)
    await db.sets.where('workoutId').equals(workoutId).delete()
    await db.workouts.delete(workoutId)
    return snap
  })
}

/**
 * Borra una serie de una sesión terminada. Mantiene la regla de las sesiones cerradas (solo
 * referencian ejercicios con series); si era la última serie, la sesión entera desaparece.
 */
export function deleteHistorySet(set: SetEntry) {
  return db.transaction('rw', db.workouts, db.sets, async () => {
    const snap = await snapshot(set.workoutId)
    await db.sets.delete(set.id)
    const used = new Set(snap.sets.filter((s) => s.id !== set.id).map((s) => s.exerciseId))
    if (used.size === 0) {
      await db.workouts.delete(set.workoutId)
      return { snapshot: snap, workoutDeleted: true }
    }
    await db.workouts
      .where('id')
      .equals(set.workoutId)
      .modify((w) => {
        w.exerciseIds = w.exerciseIds.filter((id) => used.has(id))
        if (w.plan) w.plan = w.plan.filter((i) => used.has(i.exerciseId))
      })
    return { snapshot: snap, workoutDeleted: false }
  })
}

/** Deshacer: vuelve al estado guardado, sin los ejercicios borrados del catálogo entretanto. */
export function restoreWorkout({ workout, sets }: WorkoutSnapshot) {
  return db.transaction('rw', db.workouts, db.sets, db.exercises, async () => {
    const existing = new Set((await db.exercises.toCollection().primaryKeys()).map(String))
    const keptSets = sets.filter((s) => existing.has(s.exerciseId))
    if (keptSets.length === 0) return false
    await db.sets.where('workoutId').equals(workout.id).delete()
    await db.workouts.put({
      ...workout,
      exerciseIds: workout.exerciseIds.filter((id) => existing.has(id)),
      ...(workout.plan && { plan: workout.plan.filter((i) => existing.has(i.exerciseId)) }),
    })
    await db.sets.bulkPut(keptSets)
    return true
  })
}
