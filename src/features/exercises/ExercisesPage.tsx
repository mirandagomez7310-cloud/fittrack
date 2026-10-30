import { useId, useRef, useState, type FormEvent } from 'react'
import { z } from 'zod'
import { allExercises, createExercise, deleteExercise, usedExerciseIds } from '../../db/exercises.ts'
import { useLiveQuery } from '../../db/useLiveQuery.ts'
import { exerciseInput, exerciseKinds, muscleGroups } from '../../domain/model.ts'
import { Icon } from '../../ui/Icon.tsx'
import { Page } from '../../ui/Page.tsx'

export function ExercisesPage() {
  const exercises = useLiveQuery(allExercises, [])
  const used = useLiveQuery(usedExerciseIds, [])
  const [status, setStatus] = useState('')

  async function remove(id: string, name: string) {
    try {
      await deleteExercise(id)
      setStatus(`${name} eliminado.`)
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'No se pudo eliminar.')
    }
  }

  return (
    <Page title="Ejercicios">
      <ExerciseForm onCreated={(name) => setStatus(`${name} creado.`)} />
      <div role="status" className="status">
        {status}
      </div>

      {exercises && used && (
        <ul className="exercise-list" aria-label="Catálogo">
          {exercises.map((e) => (
            <li key={e.id}>
              <span>
                <span className="exercise-name">{e.name}</span>
                <span className="muted">
                  {e.muscle} · {exerciseKinds[e.kind]}
                </span>
              </span>
              {!used.has(e.id) && (
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={`Eliminar ${e.name}`}
                  onClick={() => void remove(e.id, e.name)}
                >
                  <Icon name="trash" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </Page>
  )
}

type Errors = Partial<Record<'name' | 'muscle' | 'kind', string>>

function ExerciseForm({ onCreated }: { onCreated: (name: string) => void }) {
  const [errors, setErrors] = useState<Errors>({})
  const nameRef = useRef<HTMLInputElement>(null)
  const id = useId()

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const parsed = exerciseInput.safeParse(Object.fromEntries(new FormData(form)))
    if (!parsed.success) {
      const f = z.flattenError(parsed.error).fieldErrors
      setErrors({ name: f.name?.[0], muscle: f.muscle?.[0], kind: f.kind?.[0] })
      nameRef.current?.focus()
      return
    }
    try {
      await createExercise(parsed.data)
      form.reset()
      setErrors({})
      onCreated(parsed.data.name)
    } catch (err) {
      setErrors({ name: err instanceof Error ? err.message : 'No se pudo guardar' })
      nameRef.current?.focus()
    }
  }

  return (
    <form className="exercise-form" onSubmit={(e) => void submit(e)} noValidate aria-label="Nuevo ejercicio">
      <div className="field">
        <label htmlFor={`${id}-name`}>Nombre</label>
        <input
          ref={nameRef}
          id={`${id}-name`}
          name="name"
          autoComplete="off"
          maxLength={60}
          aria-invalid={errors.name ? true : undefined}
          aria-describedby={errors.name ? `${id}-name-error` : undefined}
        />
        {errors.name && (
          <p id={`${id}-name-error`} className="field-error">
            {errors.name}
          </p>
        )}
      </div>

      <div className="field">
        <label htmlFor={`${id}-muscle`}>Grupo muscular</label>
        <select id={`${id}-muscle`} name="muscle" defaultValue={muscleGroups[0]}>
          {muscleGroups.map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
      </div>

      <fieldset className="field">
        <legend>Tipo</legend>
        <div className="segmented">
          {Object.entries(exerciseKinds).map(([value, label]) => (
            <label key={value}>
              <input type="radio" name="kind" value={value} defaultChecked={value === 'weighted'} />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <button type="submit" className="btn btn-primary btn-block">
        Crear ejercicio
      </button>
    </form>
  )
}
