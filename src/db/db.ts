import { Dexie, type EntityTable } from 'dexie'
import { newId } from '../domain/ids.ts'
import type { BodyWeight, Exercise, Routine, SetEntry, Workout } from '../domain/model.ts'

export const db = new Dexie('fittrack') as Dexie & {
  exercises: EntityTable<Exercise, 'id'>
  workouts: EntityTable<Workout, 'id'>
  sets: EntityTable<SetEntry, 'id'>
  routines: EntityTable<Routine, 'id'>
  bodyWeights: EntityTable<BodyWeight, 'date'>
  /** Ajustes de la app en este dispositivo; no forman parte de la copia. */
  meta: EntityTable<{ key: string; value: string }, 'key'>
}

// Esquemas publicados: no editar; los cambios van en una nueva version() con migración.
db.version(1).stores({
  exercises: 'id',
  workouts: 'id, startedAt',
  sets: 'id, workoutId, exerciseId, [exerciseId+createdAt]',
})
db.version(2).stores({
  routines: 'id',
  meta: 'key',
})
db.version(3).stores({
  bodyWeights: 'date',
})

const seed: Pick<Exercise, 'name' | 'muscle' | 'kind'>[] = [
  { name: 'Press de banca', muscle: 'Pecho', kind: 'weighted' },
  { name: 'Press inclinado con mancuernas', muscle: 'Pecho', kind: 'weighted' },
  { name: 'Fondos', muscle: 'Tríceps', kind: 'bodyweight' },
  { name: 'Dominadas', muscle: 'Espalda', kind: 'bodyweight' },
  { name: 'Remo con barra', muscle: 'Espalda', kind: 'weighted' },
  { name: 'Jalón al pecho', muscle: 'Espalda', kind: 'weighted' },
  { name: 'Sentadilla', muscle: 'Piernas', kind: 'weighted' },
  { name: 'Peso muerto', muscle: 'Piernas', kind: 'weighted' },
  { name: 'Prensa de piernas', muscle: 'Piernas', kind: 'weighted' },
  { name: 'Hip thrust', muscle: 'Glúteos', kind: 'weighted' },
  { name: 'Press militar', muscle: 'Hombros', kind: 'weighted' },
  { name: 'Elevaciones laterales', muscle: 'Hombros', kind: 'weighted' },
  { name: 'Curl con barra', muscle: 'Bíceps', kind: 'weighted' },
  { name: 'Extensión de tríceps en polea', muscle: 'Tríceps', kind: 'weighted' },
  { name: 'Elevaciones de piernas', muscle: 'Core', kind: 'bodyweight' },
]

db.on('populate', (tx) => {
  const createdAt = new Date().toISOString()
  return tx.table('exercises').bulkAdd(seed.map((e) => ({ ...e, id: newId(), createdAt })))
})
