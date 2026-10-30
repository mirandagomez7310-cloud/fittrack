import { useState } from 'react'
import { allExercises } from '../../db/exercises.ts'
import { allRoutines } from '../../db/routines.ts'
import { useLiveQuery } from '../../db/useLiveQuery.ts'
import {
  addExerciseToWorkout,
  deleteSet,
  finishWorkout,
  getActiveWorkout,
  removeExerciseFromWorkout,
  restoreSet,
  startWorkout,
  workoutSets,
} from '../../db/workouts.ts'
import type { SetEntry, Workout } from '../../domain/model.ts'
import { count, formatKg, totalVolume } from '../../domain/stats.ts'
import { ExercisePicker } from '../../ui/ExercisePicker.tsx'
import { Page } from '../../ui/Page.tsx'
import { ExerciseBlock } from './ExerciseBlock.tsx'

const time = new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit' })

const failure = (err: unknown) => `No se pudo guardar: ${err instanceof Error ? err.message : 'error desconocido'}.`

export function WorkoutPage() {
  const active = useLiveQuery(getActiveWorkout, [])
  const routines = useLiveQuery(allRoutines, [])
  const [status, setStatus] = useState('')

  /** Las escrituras desde eventos no llegan al ErrorBoundary: el fallo se anuncia en el status. */
  const run = (write: Promise<unknown>) => write.catch((err: unknown) => setStatus(failure(err)))
  const ready = routines?.filter((r) => r.items.length > 0) ?? []

  return (
    <Page title="Entrenar">
      {active === null && routines && (
        <>
          {ready.length > 0 && (
            <ul className="start-list" aria-label="Empezar desde una rutina">
              {ready.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    className="btn btn-primary btn-block btn-split"
                    onClick={() => void run(startWorkout(r).then(() => setStatus('')))}
                  >
                    <span>{r.name}</span>
                    <span className="btn-meta">{count(r.items.length, 'ejercicio', 'ejercicios')}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            className={`btn btn-block ${ready.length ? 'btn-secondary' : 'btn-primary'}`}
            onClick={() => void run(startWorkout().then(() => setStatus('')))}
          >
            {ready.length ? 'Entrenamiento libre' : 'Empezar entrenamiento'}
          </button>
        </>
      )}
      {active && <ActiveWorkout workout={active} onStatus={setStatus} run={run} />}
      {/* Siempre montado para que los lectores de pantalla anuncien los cambios. */}
      <div role="status" className="status">
        {status}
      </div>
    </Page>
  )
}

type ActiveProps = {
  workout: Workout
  onStatus: (msg: string) => void
  run: (write: Promise<unknown>) => Promise<unknown>
}

function ActiveWorkout({ workout, onStatus, run }: ActiveProps) {
  const sets = useLiveQuery(() => workoutSets(workout.id), [workout.id])
  const exercises = useLiveQuery(allExercises, [])
  const [deleted, setDeleted] = useState<SetEntry | null>(null)

  if (!sets || !exercises) return null

  const byId = new Map(exercises.map((e) => [e.id, e]))

  const remove = (set: SetEntry) => run(deleteSet(set.id).then(() => setDeleted(set)))

  const summary = `${count(sets.length, 'serie', 'series')}, ${formatKg(totalVolume(sets))} kg de volumen`
  const finish = () =>
    run(
      finishWorkout(workout.id).then((saved) =>
        onStatus(saved ? `Entrenamiento guardado: ${summary}.` : 'Entrenamiento descartado: no tenía series.'),
      ),
    )

  return (
    <>
      <p className="muted">
        {workout.routineName ? `${workout.routineName} · ` : ''}Empezado a las {time.format(new Date(workout.startedAt))}
      </p>

      {workout.exerciseIds.map((id) => {
        const exercise = byId.get(id)
        return (
          exercise && (
            <ExerciseBlock
              key={id}
              workoutId={workout.id}
              exercise={exercise}
              target={workout.plan?.find((i) => i.exerciseId === id)}
              sets={sets.filter((s) => s.exerciseId === id)}
              onDelete={(set) => void remove(set)}
              onRemove={() => void run(removeExerciseFromWorkout(workout.id, id))}
            />
          )
        )
      })}

      <ExercisePicker
        exercises={exercises.filter((e) => !workout.exerciseIds.includes(e.id))}
        onPick={(id) => void run(addExerciseToWorkout(workout.id, id))}
      />

      <button type="button" className="btn btn-secondary btn-block finish" onClick={() => void finish()}>
        Terminar entrenamiento
      </button>

      {deleted && (
        <div className="undo-bar" role="status">
          <span>Serie eliminada</span>
          <button
            type="button"
            className="btn-link"
            onClick={() => void run(restoreSet(deleted).then(() => setDeleted(null)))}
          >
            Deshacer
          </button>
        </div>
      )}
    </>
  )
}
