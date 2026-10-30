import { Link, useParams } from 'react-router'
import { allExercises } from '../../db/exercises.ts'
import { useLiveQuery } from '../../db/useLiveQuery.ts'
import { getWorkout, workoutSets } from '../../db/workouts.ts'
import { count, durationMinutes, formatDateTime, formatKg, formatSet, totalVolume } from '../../domain/stats.ts'
import { Page } from '../../ui/Page.tsx'

async function load(id: string) {
  const workout = await getWorkout(id)
  if (!workout?.endedAt) return null
  const [sets, exercises] = await Promise.all([workoutSets(id), allExercises()])
  return { workout: { ...workout, endedAt: workout.endedAt }, sets, exercises }
}

export function WorkoutDetail() {
  const { id = '' } = useParams()
  const data = useLiveQuery(() => load(id), [id])
  const back = (
    <p>
      <Link to="/historial">Volver al historial</Link>
    </p>
  )

  if (data === undefined) return <Page title="Entrenamiento">{null}</Page>
  if (data === null) return <Page title="Entrenamiento no encontrado">{back}</Page>

  const { workout, sets, exercises } = data
  const byId = new Map(exercises.map((e) => [e.id, e]))

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
                  </li>
                ))}
            </ol>
          </section>
        )
      })}

      {back}
    </Page>
  )
}
