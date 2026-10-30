import { useId, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { allExercises } from '../../db/exercises.ts'
import {
  addRoutineItem,
  deleteRoutine,
  getRoutine,
  moveRoutineItem,
  removeRoutineItem,
  renameRoutine,
  updateRoutineItem,
} from '../../db/routines.ts'
import { useLiveQuery } from '../../db/useLiveQuery.ts'
import { nameField, type Routine } from '../../domain/model.ts'
import { ExercisePicker } from '../../ui/ExercisePicker.tsx'
import { Icon } from '../../ui/Icon.tsx'
import { Page } from '../../ui/Page.tsx'

/** 1..max, más el valor actual si viene de una copia importada con otro rango. */
const options = (max: number, current: number) =>
  [...new Set([...Array.from({ length: max }, (_, i) => i + 1), current])].sort((a, b) => a - b)

export function RoutineEditor() {
  const { id = '' } = useParams()
  const routine = useLiveQuery(() => getRoutine(id), [id])
  const exercises = useLiveQuery(allExercises, [])
  const navigate = useNavigate()
  const [status, setStatus] = useState('')

  const run = (write: Promise<unknown>) =>
    write.catch((err: unknown) =>
      setStatus(`No se pudo guardar: ${err instanceof Error ? err.message : 'error desconocido'}.`),
    )

  if (routine === undefined || !exercises) return <Page title="Rutina">{null}</Page>
  if (routine === null) {
    return (
      <Page title="Rutina no encontrada">
        <p>
          <Link to="/rutinas">Volver a Rutinas</Link>
        </p>
      </Page>
    )
  }

  const byId = new Map(exercises.map((e) => [e.id, e]))
  const inRoutine = new Set(routine.items.map((i) => i.exerciseId))

  return (
    <Page title={routine.name}>
      <p>
        <Link to="/rutinas">Volver a Rutinas</Link>
      </p>

      <RenameForm key={routine.id} routine={routine} onRename={(name) => run(renameRoutine(routine.id, name))} />

      {routine.items.length === 0 && <p className="muted">Añade los ejercicios de esta rutina.</p>}
      <ol className="routine-items">
        {routine.items.map((item, i) => {
          const name = byId.get(item.exerciseId)?.name ?? 'Ejercicio'
          return (
            <li key={item.exerciseId}>
              <fieldset>
                <legend className="item-title">{name}</legend>
                <div className="routine-item-row">
                  <label>
                    Series
                    <select
                      value={item.sets}
                      onChange={(e) => void run(updateRoutineItem(routine.id, item.exerciseId, { sets: Number(e.target.value) }))}
                    >
                      {options(10, item.sets).map((n) => (
                        <option key={n}>{n}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Reps
                    <select
                      value={item.reps}
                      onChange={(e) => void run(updateRoutineItem(routine.id, item.exerciseId, { reps: Number(e.target.value) }))}
                    >
                      {options(30, item.reps).map((n) => (
                        <option key={n}>{n}</option>
                      ))}
                    </select>
                  </label>
                  <div className="row-actions">
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label={`Subir ${name}`}
                      disabled={i === 0}
                      onClick={() => void run(moveRoutineItem(routine.id, item.exerciseId, -1))}
                    >
                      <Icon name="up" />
                    </button>
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label={`Bajar ${name}`}
                      disabled={i === routine.items.length - 1}
                      onClick={() => void run(moveRoutineItem(routine.id, item.exerciseId, 1))}
                    >
                      <Icon name="down" />
                    </button>
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label={`Quitar ${name}`}
                      onClick={() => void run(removeRoutineItem(routine.id, item.exerciseId))}
                    >
                      <Icon name="trash" />
                    </button>
                  </div>
                </div>
              </fieldset>
            </li>
          )
        })}
      </ol>

      <ExercisePicker
        exercises={exercises.filter((e) => !inRoutine.has(e.id))}
        onPick={(exerciseId) => void run(addRoutineItem(routine.id, exerciseId))}
      />

      <button
        type="button"
        className="btn btn-danger btn-block"
        onClick={() => void run(deleteRoutine(routine.id).then(() => navigate('/rutinas', { state: { deleted: routine } })))}
      >
        Eliminar rutina
      </button>

      <div role="status" className="status">
        {status}
      </div>
    </Page>
  )
}

function RenameForm({ routine, onRename }: { routine: Routine; onRename: (name: string) => Promise<unknown> }) {
  const [error, setError] = useState('')
  const id = useId()

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const parsed = nameField.safeParse(new FormData(e.currentTarget).get('name'))
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Nombre no válido')
      return
    }
    setError('')
    void onRename(parsed.data)
  }

  return (
    <form className="inline-form" onSubmit={submit} noValidate aria-label="Renombrar rutina">
      <div className="field">
        <label htmlFor={`${id}-name`}>Nombre</label>
        <input
          id={`${id}-name`}
          name="name"
          defaultValue={routine.name}
          autoComplete="off"
          maxLength={60}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
        />
        {error && (
          <p id={`${id}-error`} className="field-error">
            {error}
          </p>
        )}
      </div>
      <button type="submit" className="btn btn-secondary">
        Guardar
      </button>
    </form>
  )
}
