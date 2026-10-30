import 'fake-indexeddb/auto'
import { Dexie } from 'dexie'
import { expect, test } from 'vitest'
import { db } from './db.ts'
import { deleteExercise, usedExerciseIds } from './exercises.ts'
import { addRoutineItem, createRoutine } from './routines.ts'

test('v1 → v2 conserva los datos y habilita rutinas', async () => {
  await db.delete()
  db.close()

  // Base de datos tal como la dejaba la fase 2 (solo versión 1).
  const v1 = new Dexie('fittrack')
  v1.version(1).stores({
    exercises: 'id',
    workouts: 'id, startedAt',
    sets: 'id, workoutId, exerciseId, [exerciseId+createdAt]',
  })
  const createdAt = '2026-10-01T10:00:00.000Z'
  await v1.table('exercises').bulkAdd([
    { id: 'a', name: 'Sentadilla', muscle: 'Piernas', kind: 'weighted', createdAt },
    { id: 'b', name: 'Remo', muscle: 'Espalda', kind: 'weighted', createdAt },
  ])
  await v1.table('workouts').add({ id: 'w', startedAt: createdAt, endedAt: createdAt, exerciseIds: ['a'] })
  await v1.table('sets').add({ id: 's', workoutId: 'w', exerciseId: 'a', reps: 5, weightKg: 100, createdAt })
  v1.close()

  await db.open()
  expect(db.verno).toBe(2)
  // No se vuelve a sembrar el catálogo al actualizar.
  expect(await db.exercises.count()).toBe(2)
  expect(await db.sets.get('s')).toMatchObject({ reps: 5, weightKg: 100 })

  const routineId = await createRoutine('Espalda')
  await addRoutineItem(routineId, 'b')
  expect(await usedExerciseIds()).toEqual(new Set(['a', 'b']))
  await expect(deleteExercise('b')).rejects.toThrow()
})
