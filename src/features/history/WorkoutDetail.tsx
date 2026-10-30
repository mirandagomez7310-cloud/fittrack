import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { allExercises } from '../../db/exercises.ts'
import { deleteHistorySet, deleteWorkout, restoreWorkout, type WorkoutSnapshot } from '../../db/history.ts'
import { useLiveQuery } from '../../db/useLiveQuery.ts'
import { getWorkout, workoutSets } from '../../db/workouts.ts'
import { errorMessage } from '../../domain/errors.ts'
import type { SetEntry } from '../../domain/model.ts'
import { count, durationMinutes, formatDateTime, formatKg, formatSet, totalVolume } from '../../domain/stats.ts'
import { Icon } from '../../ui/Icon.tsx'
import { setPendingUndo } from '../../ui/pendingUndo.ts'
import { Page } from '../../ui/Page.tsx'

async function load(id: string) {
  const workout = await getWorkout(id)
  if (!workout?.endedAt) return null
  const [sets, exercises] = await Promise.all([workoutSets(id), allExercises()])
  return { workout: { ...workout, endedAt: workout.endedAt }, sets, exercises }
}

export function WorkoutDetail() {
  const { id = '' } = useParams()
  // key: al pasar de /historial/A a /historial/B, el deshacer y los mensajes de A no deben seguir en B.
  return <Detail key={id} id={id} />
}

function Detail({ id }: { id: string }) {
  const data = useLiveQuery(() => load(id), [id])
  const navigate = useNavigate()
  const [undo, setUndo] = useState<WorkoutSnapshot | null>(null)
  const [status, setStatus] = useState('')
  const back = (
    <p>
      <Link to="/historial">Volver al historial</Link>
    </p>
  )

  if (data === undefined) return <Page title="Entrenamiento">{null}</Page>
  if (data === null) return <Page title="Entrenamiento no encontrado">{back}</Page>

  const { workout, sets, exercises } = data
  const byId = new Map(exercises.map((e) => [e.id, e]))

  // El historial ofrece deshacer cuando la sesión desaparece entera. replace: "Atrás" no debe
  // volver al detalle de una sesión que ya no existe.
  const leave = (snapshot: WorkoutSnapshot) => {
    setPendingUndo('workout', snapshot)
    navigate('/historial', { replace: true })
  }

  async function removeSet(set: SetEntry) {
    try {
      const { snapshot, workoutDeleted } = await deleteHistorySet(set)
      if (workoutDeleted) leave(snapshot)
      else setUndo(snapshot)
    } catch (err) {
      setStatus(`No se pudo eliminar: ${errorMessage(err)}.`)
    }
  }

  async function removeWorkout() {
    try {
      leave(await deleteWorkout(workout.id))
    } catch (err) {
      setStatus(`No se pudo eliminar: ${errorMessage(err)}.`)
    }
  }

  async function restore(snapshot: WorkoutSnapshot) {
    try {
      const restored = await restoreWorkout(snapshot)
      setUndo(null)
      if (!restored) setStatus('No se pudo restaurar: sus ejercicios ya no existen.')
    } catch (err) {
      setStatus(`No se pudo restaurar: ${errorMessage(err)}.`)
    }
  }

  return (
    <Page title={formatDateTime(workout.startedAt)}>
      <p className="muted">
        {workout.routineName ?? 'Libre'} · {durationMinutes(workout.startedAt, workout.endedAt)} min ·{' '}
        {count(sets.length, 'serie', 'series')} · {formatKg(totalVolume(sets))} kg
      </p>

      {workout.exerciseIds.map((exerciseId) => {
        const exercise = byId.get(exerciseId)
        if (!exercise) return null
        const headingId = `ex-${exerciseId}`
        return (
          <section key={exerciseId} className="exercise" aria-labelledby={headingId}>
            <h2 id={headingId}>{exercise.name}</h2>
            <ol className="sets">
              {sets
                .filter((s) => s.exerciseId === exerciseId)
                .map((s, i) => (
                  <li key={s.id}>
                    <span className="set-n">{i + 1}</span>
                    <span className="set-value">{formatSet(s, exercise.kind)}</span>
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label={`Eliminar serie ${i + 1} de ${exercise.name}`}
                      onClick={() => void removeSet(s)}
                    >
                      <Icon name="trash" />
                    </button>
                  </li>
                ))}
            </ol>
          </section>
        )
      })}

      <button type="button" className="btn btn-danger btn-block finish" onClick={() => void removeWorkout()}>
        Eliminar entrenamiento
      </button>
      {back}

      <div role="status" className="status">
        {status}
      </div>
      {undo && (
        <div className="undo-bar" role="status">
          <span>Serie eliminada</span>
          <button
            type="button"
            className="btn-link"
            onClick={() => void restore(undo)}
          >
            Deshacer
          </button>
        </div>
      )}
    </Page>
  )
}
