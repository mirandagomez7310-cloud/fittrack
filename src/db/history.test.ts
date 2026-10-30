import 'fake-indexeddb/auto'
import { beforeEach, expect, test } from 'vitest'
import { exportData } from './backup.ts'
import { db } from './db.ts'
import { deleteExercise } from './exercises.ts'
import { deleteHistorySet, deleteWorkout, restoreWorkout } from './history.ts'
import { parseBackup } from '../domain/backup.ts'

const at = '2026-10-01T10:00:00.000Z'

beforeEach(async () => {
  await db.delete()
  await db.open()
  await db.exercises.clear()
  await db.exercises.bulkAdd([
    { id: 'a', name: 'A', muscle: 'Pecho', kind: 'weighted', createdAt: at },
    { id: 'b', name: 'B', muscle: 'Espalda', kind: 'weighted', createdAt: at },
  ])
  await db.workouts.add({
    id: 'w',
    startedAt: at,
    endedAt: at,
    exerciseIds: ['a', 'b'],
    routineName: 'R',
    plan: [
      { exerciseId: 'a', sets: 3, reps: 8 },
      { exerciseId: 'b', sets: 3, reps: 8 },
    ],
  })
  await db.sets.bulkAdd([
    { id: 'a1', workoutId: 'w', exerciseId: 'a', reps: 8, weightKg: 60, createdAt: at },
    { id: 'a2', workoutId: 'w', exerciseId: 'a', reps: 8, weightKg: 60, createdAt: at },
    { id: 'b1', workoutId: 'w', exerciseId: 'b', reps: 8, weightKg: 50, createdAt: at },
  ])
})

const set = async (id: string) => (await db.sets.get(id))!

test('borrar una serie que no es la última de su ejercicio no toca la sesión', async () => {
  const r = await deleteHistorySet(await set('a1'))
  expect(r.workoutDeleted).toBe(false)
  expect((await db.workouts.get('w'))?.exerciseIds).toEqual(['a', 'b'])
})

test('borrar la última serie de un ejercicio lo saca de la sesión y del plan; deshacer lo devuelve', async () => {
  const r = await deleteHistorySet(await set('b1'))
  const w = (await db.workouts.get('w'))!
  expect(w.exerciseIds).toEqual(['a'])
  expect(w.plan?.map((i) => i.exerciseId)).toEqual(['a'])
  // La copia sigue siendo válida (y B ya se puede borrar del catálogo sin dejar referencias).
  expect(parseBackup(JSON.stringify(await exportData())).ok).toBe(true)

  expect(await restoreWorkout(r.snapshot)).toBe(true)
  expect((await db.workouts.get('w'))?.exerciseIds).toEqual(['a', 'b'])
  expect(await db.sets.count()).toBe(3)
})

test('borrar la última serie de la sesión la elimina entera', async () => {
  await deleteHistorySet(await set('b1'))
  await deleteHistorySet(await set('a1'))
  const r = await deleteHistorySet(await set('a2'))
  expect(r.workoutDeleted).toBe(true)
  expect(await db.workouts.get('w')).toBeUndefined()
})

test('borrar y restaurar una sesión entera', async () => {
  const snap = await deleteWorkout('w')
  expect(await db.workouts.count()).toBe(0)
  expect(await db.sets.count()).toBe(0)
  await restoreWorkout(snap)
  expect(await db.sets.count()).toBe(3)
})

test('restaurar omite ejercicios borrados del catálogo entretanto', async () => {
  const snap = await deleteWorkout('w')
  await deleteExercise('b')
  expect(await restoreWorkout(snap)).toBe(true)
  expect((await db.workouts.get('w'))?.exerciseIds).toEqual(['a'])
  expect((await db.sets.toArray()).map((s) => s.id).sort()).toEqual(['a1', 'a2'])
  expect(parseBackup(JSON.stringify(await exportData())).ok).toBe(true)
})

test('no se edita una sesión en curso', async () => {
  await db.workouts.add({ id: 'open', startedAt: at, exerciseIds: [] })
  await expect(deleteWorkout('open')).rejects.toThrow('terminados')
})
