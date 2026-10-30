import type { Backup } from '../domain/backup.ts'
import { db } from './db.ts'

const LAST_EXPORT = 'lastExportAt'

export async function exportData(): Promise<Backup> {
  return db.transaction('r', db.exercises, db.routines, db.workouts, db.sets, async () => ({
    app: 'fittrack' as const,
    version: 1 as const,
    exportedAt: new Date().toISOString(),
    exercises: await db.exercises.toArray(),
    routines: await db.routines.toArray(),
    workouts: await db.workouts.toArray(),
    sets: await db.sets.toArray(),
  }))
}

export const markExported = (at: string) => db.meta.put({ key: LAST_EXPORT, value: at })
export const lastExportAt = async () => (await db.meta.get(LAST_EXPORT))?.value ?? null

/** Reemplaza todos los datos por los de la copia, ya validada. Atómico: si algo falla, no cambia nada. */
export function importData(backup: Backup) {
  const tables = [db.exercises, db.routines, db.workouts, db.sets]
  return db.transaction('rw', tables, async () => {
    await Promise.all(tables.map((t) => t.clear()))
    await db.exercises.bulkAdd(backup.exercises)
    await db.routines.bulkAdd(backup.routines)
    await db.workouts.bulkAdd(backup.workouts)
    await db.sets.bulkAdd(backup.sets)
  })
}
