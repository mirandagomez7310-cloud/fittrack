import { Dexie } from 'dexie'
import type { Routine, SetEntry, SetInput } from '../domain/model.ts'
import { totalVolume } from '../domain/stats.ts'
import { db } from './db.ts'

const now = () => new Date().toISOString()

// No se usa "la más reciente por startedAt": si el reloj del dispositivo retrocede, no la encontraría.
export async function getActiveWorkout() {
  return (await db.workouts.filter((w) => !w.endedAt).first()) ?? null
}

export function startWorkout(routine?: Routine) {
  return db.transaction('rw', db.workouts, async () => {
    // Un doble toque no crea dos sesiones.
    if (await getActiveWorkout()) return
    await db.workouts.add({
      id: crypto.randomUUID(),
      startedAt: now(),
      exerciseIds: routine?.items.map((i) => i.exerciseId) ?? [],
      ...(routine && { routineName: routine.name, plan: routine.items }),
    })
  })
}

export const getWorkout = async (id: string) => (await db.workouts.get(id)) ?? null

/** Sesiones terminadas, de la más reciente a la más antigua, con su resumen. */
export async function finishedWorkouts(limit: number) {
  const workouts = await db.workouts
    .orderBy('startedAt')
    .reverse()
    .filter((w) => Boolean(w.endedAt))
    .limit(limit + 1)
    .toArray()
  const shown = workouts.slice(0, limit)
  // Una sola consulta para todas las series de la página, agrupadas en memoria.
  const sets = await db.sets
    .where('workoutId')
    .anyOf(shown.map((w) => w.id))
    .toArray()
  const byWorkout = new Map<string, SetEntry[]>()
  for (const s of sets) {
    const own = byWorkout.get(s.workoutId)
    if (own) own.push(s)
    else byWorkout.set(s.workoutId, [s])
  }
  const page = shown.map((w) => {
    const own = byWorkout.get(w.id) ?? []
    return { ...w, setCount: own.length, volume: totalVolume(own) }
  })
  return { page, hasMore: workouts.length > limit }
}

export function addExerciseToWorkout(workoutId: string, exerciseId: string) {
  return db.workouts
    .where('id')
    .equals(workoutId)
    .modify((w) => {
      if (!w.exerciseIds.includes(exerciseId)) w.exerciseIds.push(exerciseId)
    })
}

export function removeExerciseFromWorkout(workoutId: string, exerciseId: string) {
  return db.transaction('rw', db.workouts, db.sets, async () => {
    const hasSets = await db.sets
      .where('workoutId')
      .equals(workoutId)
      .filter((s) => s.exerciseId === exerciseId)
      .count()
    if (hasSets) throw new Error('Tiene series en esta sesión; bórralas antes de quitarlo')
    await db.workouts
      .where('id')
      .equals(workoutId)
      .modify((w) => {
        w.exerciseIds = w.exerciseIds.filter((id) => id !== exerciseId)
      })
  })
}

export const workoutSets = (workoutId: string) => db.sets.where('workoutId').equals(workoutId).sortBy('createdAt')

/** Última serie registrada de un ejercicio en cualquier sesión. */
export async function lastSetFor(exerciseId: string) {
  const last = await db.sets
    .where('[exerciseId+createdAt]')
    .between([exerciseId, Dexie.minKey], [exerciseId, Dexie.maxKey])
    .last()
  return last ?? null
}

export function addSet(workoutId: string, exerciseId: string, input: SetInput) {
  return db.sets.add({ ...input, id: crypto.randomUUID(), workoutId, exerciseId, createdAt: now() })
}

export const deleteSet = (id: string) => db.sets.delete(id)
/** Deshacer: si el ejercicio se quitó de la sesión entretanto, vuelve a ella para que la serie no quede oculta. */
export function restoreSet(set: SetEntry) {
  return db.transaction('rw', db.workouts, db.sets, async () => {
    await db.sets.put(set)
    await addExerciseToWorkout(set.workoutId, set.exerciseId)
  })
}

/** Cierra la sesión. Si no tiene series, la descarta. Devuelve si se guardó. */
export function finishWorkout(workoutId: string) {
  return db.transaction('rw', db.workouts, db.sets, async () => {
    const sets = await db.sets.where('workoutId').equals(workoutId).toArray()
    if (sets.length === 0) {
      await db.workouts.delete(workoutId)
      return false
    }
    // Una sesión cerrada solo referencia ejercicios con series, para que borrarlos del catálogo sea seguro.
    const used = new Set(sets.map((s) => s.exerciseId))
    await db.workouts
      .where('id')
      .equals(workoutId)
      .modify((w) => {
        w.endedAt = now()
        w.exerciseIds = w.exerciseIds.filter((id) => used.has(id))
        if (w.plan) w.plan = w.plan.filter((i) => used.has(i.exerciseId))
      })
    return true
  })
}
