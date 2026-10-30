import 'fake-indexeddb/auto'
import { beforeEach, expect, test } from 'vitest'
import { db } from './db.ts'
import { allExercises, createExercise, deleteExercise, usedExerciseIds } from './exercises.ts'
import {
  addExerciseToWorkout,
  addSet,
  deleteSet,
  finishWorkout,
  getActiveWorkout,
  lastSetFor,
  removeExerciseFromWorkout,
  restoreSet,
  startWorkout,
  workoutSets,
} from './workouts.ts'

beforeEach(async () => {
  await db.delete()
  await db.open()
})

async function active() {
  const w = await getActiveWorkout()
  if (!w) throw new Error('sin sesión activa')
  return w
}

test('siembra el catálogo inicial', async () => {
  expect((await allExercises()).length).toBeGreaterThan(10)
})

test('startWorkout es idempotente mientras hay una sesión abierta', async () => {
  await startWorkout()
  await startWorkout()
  expect(await db.workouts.count()).toBe(1)
})

test('registro completo y última serie por ejercicio', async () => {
  const [bench] = await allExercises()
  await startWorkout()
  const w = await active()
  await addExerciseToWorkout(w.id, bench!.id)
  await addExerciseToWorkout(w.id, bench!.id)
  expect((await active()).exerciseIds).toEqual([bench!.id])

  await addSet(w.id, bench!.id, { reps: 10, weightKg: 60 })
  await new Promise((r) => setTimeout(r, 2))
  await addSet(w.id, bench!.id, { reps: 8, weightKg: 62.5 })
  expect((await workoutSets(w.id)).map((s) => s.reps)).toEqual([10, 8])
  expect((await lastSetFor(bench!.id))?.weightKg).toBe(62.5)

  expect(await finishWorkout(w.id)).toBe(true)
  expect(await getActiveWorkout()).toBeNull()
})

test('terminar una sesión sin series la descarta', async () => {
  await startWorkout()
  expect(await finishWorkout((await active()).id)).toBe(false)
  expect(await db.workouts.count()).toBe(0)
})

test('nombres de ejercicio únicos sin distinguir mayúsculas', async () => {
  await createExercise({ name: 'Face pull', muscle: 'Hombros', kind: 'weighted' })
  await expect(createExercise({ name: 'face PULL', muscle: 'Hombros', kind: 'weighted' })).rejects.toThrow(
    'Ya existe',
  )
})

test('duplicados tampoco distinguen tildes', async () => {
  await expect(createExercise({ name: 'Jalon al pecho', muscle: 'Espalda', kind: 'weighted' })).rejects.toThrow(
    'Ya existe',
  )
})

test('encuentra la sesión abierta aunque el reloj haya retrocedido', async () => {
  await db.workouts.add({ id: 'cerrada', startedAt: '2026-10-29T10:00:00Z', endedAt: '2026-10-29T11:00:00Z', exerciseIds: [] })
  await db.workouts.add({ id: 'abierta', startedAt: '2026-10-29T09:00:00Z', exerciseIds: [] })
  expect((await getActiveWorkout())?.id).toBe('abierta')
})

test('deshacer tras quitar el ejercicio lo devuelve a la sesión; no se quita con series', async () => {
  const [a] = await allExercises()
  await startWorkout()
  const w = await active()
  await addExerciseToWorkout(w.id, a!.id)
  await addSet(w.id, a!.id, { reps: 5, weightKg: 50 })
  await expect(removeExerciseFromWorkout(w.id, a!.id)).rejects.toThrow()

  const [set] = await workoutSets(w.id)
  await deleteSet(set!.id)
  await removeExerciseFromWorkout(w.id, a!.id)
  expect((await active()).exerciseIds).toEqual([])
  await restoreSet(set!)
  expect((await active()).exerciseIds).toEqual([a!.id])
})

test('al terminar, la sesión solo conserva ejercicios con series', async () => {
  const [a, b] = await allExercises()
  await startWorkout()
  const w = await active()
  await addExerciseToWorkout(w.id, a!.id)
  await addExerciseToWorkout(w.id, b!.id)
  await addSet(w.id, b!.id, { reps: 5, weightKg: 50 })
  await finishWorkout(w.id)
  expect((await db.workouts.get(w.id))?.exerciseIds).toEqual([b!.id])
})

test('no se borra un ejercicio con series ni uno en la sesión activa', async () => {
  const [a, b, c] = await allExercises()
  await startWorkout()
  const w = await active()
  await addExerciseToWorkout(w.id, a!.id)
  await addSet(w.id, b!.id, { reps: 5, weightKg: 100 })

  expect(await usedExerciseIds()).toEqual(new Set([a!.id, b!.id]))
  await expect(deleteExercise(a!.id)).rejects.toThrow()
  await expect(deleteExercise(b!.id)).rejects.toThrow()
  await deleteExercise(c!.id)
  expect(await db.exercises.get(c!.id)).toBeUndefined()
})
