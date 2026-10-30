import { nameCollator, type Routine, type RoutineItem } from '../domain/model.ts'
import { newId } from '../domain/ids.ts'
import { db } from './db.ts'

export const allRoutines = async () =>
  (await db.routines.toArray()).sort((a, b) => nameCollator.compare(a.name, b.name))

export const getRoutine = async (id: string) => (await db.routines.get(id)) ?? null

export async function createRoutine(name: string) {
  const id = newId()
  await db.routines.add({ id, name, items: [], createdAt: new Date().toISOString() })
  return id
}

export const deleteRoutine = (id: string) => db.routines.delete(id)
/** Deshacer: omite los ejercicios borrados del catálogo mientras la rutina no existía (ya no los protegía). */
export function restoreRoutine(routine: Routine) {
  return db.transaction('rw', db.routines, db.exercises, async () => {
    const existing = new Set((await db.exercises.toCollection().primaryKeys()).map(String))
    await db.routines.put({ ...routine, items: routine.items.filter((i) => existing.has(i.exerciseId)) })
  })
}

function modify(id: string, change: (r: Routine) => void) {
  return db.routines.where('id').equals(id).modify(change)
}

export const renameRoutine = (id: string, name: string) => modify(id, (r) => void (r.name = name))

export const addRoutineItem = (id: string, exerciseId: string) =>
  modify(id, (r) => {
    if (!r.items.some((i) => i.exerciseId === exerciseId)) r.items.push({ exerciseId, sets: 3, reps: 10 })
  })

export const updateRoutineItem = (id: string, exerciseId: string, change: Partial<Pick<RoutineItem, 'sets' | 'reps'>>) =>
  modify(id, (r) => {
    r.items = r.items.map((i) => (i.exerciseId === exerciseId ? { ...i, ...change } : i))
  })

export const removeRoutineItem = (id: string, exerciseId: string) =>
  modify(id, (r) => {
    r.items = r.items.filter((i) => i.exerciseId !== exerciseId)
  })

/** Mueve un ejercicio una posición arriba (-1) o abajo (+1). */
export const moveRoutineItem = (id: string, exerciseId: string, delta: -1 | 1) =>
  modify(id, (r) => {
    const from = r.items.findIndex((i) => i.exerciseId === exerciseId)
    const to = from + delta
    if (from < 0 || to < 0 || to >= r.items.length) return
    const items = [...r.items]
    ;[items[from], items[to]] = [items[to]!, items[from]!]
    r.items = items
  })
