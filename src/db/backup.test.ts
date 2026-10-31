import 'fake-indexeddb/auto'
import { beforeEach, expect, test } from 'vitest'
import { parseBackup, type Backup } from '../domain/backup.ts'
import { exportData, importData } from './backup.ts'
import { db } from './db.ts'
import { allExercises, deleteExercise, usedExerciseIds } from './exercises.ts'
import {
  addRoutineItem,
  createRoutine,
  deleteRoutine,
  getRoutine,
  moveRoutineItem,
  restoreRoutine,
} from './routines.ts'
import {
  addSet,
  finishWorkout,
  finishedWorkouts,
  getActiveWorkout,
  startWorkout,
} from './workouts.ts'

beforeEach(async () => {
  await db.delete()
  await db.open()
})

async function seedSession() {
  const [a, b, c] = await allExercises()
  const routineId = await createRoutine('Torso')
  await addRoutineItem(routineId, a!.id)
  await addRoutineItem(routineId, b!.id)
  await addRoutineItem(routineId, c!.id)
  await moveRoutineItem(routineId, c!.id, -1)
  const routine = (await getRoutine(routineId))!
  await startWorkout(routine)
  const w = (await getActiveWorkout())!
  await addSet(w.id, a!.id, { reps: 8, weightKg: 60 })
  await finishWorkout(w.id)
  return { a: a!, b: b!, c: c!, routine, workoutId: w.id }
}

test('rutina: orden, snapshot al empezar y protección de sus ejercicios', async () => {
  const { a, b, c, routine, workoutId } = await seedSession()
  expect(routine.items.map((i) => i.exerciseId)).toEqual([a.id, c.id, b.id])

  const w = (await db.workouts.get(workoutId))!
  expect(w.routineName).toBe('Torso')
  // Al terminar solo quedan los ejercicios con series, también en el plan.
  expect(w.exerciseIds).toEqual([a.id])
  expect(w.plan?.map((i) => i.exerciseId)).toEqual([a.id])

  expect((await usedExerciseIds()).has(c.id)).toBe(true)
})

test('deshacer el borrado de una rutina omite ejercicios borrados entretanto', async () => {
  const { b, c, routine } = await seedSession()
  await deleteRoutine(routine.id)
  await deleteExercise(c.id)
  await restoreRoutine(routine)
  expect((await getRoutine(routine.id))?.items.map((i) => i.exerciseId)).not.toContain(c.id)
  expect((await getRoutine(routine.id))?.items.map((i) => i.exerciseId)).toContain(b.id)
  // Y la copia sigue siendo importable.
  expect(parseBackup(JSON.stringify(await exportData())).ok).toBe(true)
})

test('historial paginado con resumen', async () => {
  await seedSession()
  const { page, hasMore } = await finishedWorkouts(20)
  expect(hasMore).toBe(false)
  expect(page).toHaveLength(1)
  expect(page[0]).toMatchObject({ setCount: 1, volume: 480 })
})

test('exportar → importar reproduce los datos', async () => {
  await seedSession()
  const backup = await exportData()
  const parsed = parseBackup(JSON.stringify(backup))
  expect(parsed.ok).toBe(true)

  await db.delete()
  await db.open()
  if (parsed.ok) await importData(parsed.data)
  expect(await db.sets.count()).toBe(backup.sets.length)
  expect(await db.exercises.count()).toBe(backup.exercises.length)
  expect((await db.routines.toArray())[0]?.name).toBe('Torso')
})

test('importar reemplaza: no mezcla con lo que había', async () => {
  await seedSession()
  const backup = await exportData()
  await db.sets.add({ id: 'extra', workoutId: backup.workouts[0]!.id, exerciseId: backup.exercises[0]!.id, reps: 1, weightKg: 1, createdAt: backup.exportedAt })
  await importData(backup)
  expect(await db.sets.get('extra')).toBeUndefined()
})

async function validBackup(): Promise<Backup> {
  await seedSession()
  return exportData()
}

test.each<[string, (b: Backup) => unknown]>([
  ['otra app', (b) => ({ ...b, app: 'otra' })],
  ['versión futura', (b) => ({ ...b, version: 3 })],
  ['dos pesos el mismo día', (b) => ({ ...b, bodyWeights: [{ date: '2026-10-01', weightKg: 70 }, { date: '2026-10-01', weightKg: 71 }] })],
  ['peso corporal absurdo', (b) => ({ ...b, bodyWeights: [{ date: '2026-10-01', weightKg: 5 }] })],
  ['serie con ejercicio inexistente', (b) => ({ ...b, sets: [{ ...b.sets[0]!, exerciseId: 'nope' }] })],
  ['serie de sesión inexistente', (b) => ({ ...b, sets: [{ ...b.sets[0]!, workoutId: 'nope' }] })],
  ['ids repetidos', (b) => ({ ...b, exercises: [...b.exercises, b.exercises[0]!] })],
  ['nombres repetidos sin tildes', (b) => ({ ...b, exercises: [...b.exercises, { ...b.exercises[0]!, id: 'x', name: b.exercises[0]!.name.toUpperCase() }] })],
  ['carga fuera de rango', (b) => ({ ...b, sets: [{ ...b.sets[0]!, weightKg: 5000 }] })],
  ['fecha inválida', (b) => ({ ...b, exportedAt: 'ayer' })],
  ['nombre enorme', (b) => ({ ...b, routines: [{ ...b.routines[0]!, name: 'x'.repeat(500) }] })],
  ['id con caracteres de ruta', (b) => ({ ...b, workouts: [{ ...b.workouts[0]!, id: '../ejercicios' }], sets: [] })],
  ['ejercicio repetido en una rutina', (b) => ({ ...b, routines: [{ ...b.routines[0]!, items: [b.routines[0]!.items[0]!, b.routines[0]!.items[0]!] }] })],
  // No vale b.exercises.at(-1): van ordenados por id aleatorio y a veces es uno de la sesión.
  ['serie de un ejercicio ajeno a su sesión', (b) => {
    const w = b.workouts[0]!
    const ownIds = [...w.exerciseIds, ...(w.plan ?? []).map((i) => i.exerciseId)]
    const foreign = b.exercises.find((e) => !ownIds.includes(e.id))!
    return { ...b, sets: [{ ...b.sets[0]!, exerciseId: foreign.id }] }
  }],
  ['ejercicio repetido en el plan', (b) => ({ ...b, workouts: [{ ...b.workouts[0]!, plan: [b.workouts[0]!.plan![0]!, b.workouts[0]!.plan![0]!] }] })],
  ['dos sesiones abiertas', (b) => ({ ...b, workouts: [{ ...b.workouts[0]!, endedAt: undefined }, { ...b.workouts[0]!, id: 'w2', endedAt: undefined }] })],
])('rechaza copia con %s', async (_, mutate) => {
  const b = await validBackup()
  const r = parseBackup(JSON.stringify(mutate(b)))
  expect(r.ok).toBe(false)
})

test('acepta copias v1 (sin peso corporal) y las importa', async () => {
  const { bodyWeights: _, ...v1 } = { ...(await validBackup()), version: 1 }
  const r = parseBackup(JSON.stringify(v1))
  expect(r.ok && r.data.bodyWeights).toEqual([])
  if (r.ok) await importData(r.data)
  expect(await db.bodyWeights.count()).toBe(0)
})

test('deshacer un peso borrado no pisa el guardado después ese día', async () => {
  const { deleteBodyWeight, restoreBodyWeight, saveBodyWeight } = await import('./progress.ts')
  const old = { date: '2026-10-01', weightKg: 72.1 }
  await saveBodyWeight(old)
  await deleteBodyWeight(old.date)
  await saveBodyWeight({ date: '2026-10-01', weightKg: 73 })
  expect(await restoreBodyWeight(old)).toBe(false)
  expect((await db.bodyWeights.get('2026-10-01'))?.weightKg).toBe(73)
})

test('el peso corporal viaja en la copia', async () => {
  await db.bodyWeights.put({ date: '2026-10-30', weightKg: 72.4 })
  const r = parseBackup(JSON.stringify(await exportData()))
  expect(r.ok && r.data.bodyWeights).toEqual([{ date: '2026-10-30', weightKg: 72.4 }])
})

test('descarta claves desconocidas y rechaza no-JSON', async () => {
  const b = await validBackup()
  const r = parseBackup(JSON.stringify({ ...b, __proto__x: 1, exercises: b.exercises.map((e) => ({ ...e, evil: '<script>' })) }))
  expect(r.ok && 'evil' in r.data.exercises[0]!).toBe(false)
  expect(parseBackup('{no json')).toEqual({ ok: false, errors: ['El archivo no es JSON válido'] })
})
