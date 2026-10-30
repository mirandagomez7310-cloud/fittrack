import { useId, useState, type FormEvent } from 'react'
import { z } from 'zod'
import { useLiveQuery } from '../../db/useLiveQuery.ts'
import { addSet, lastSetFor } from '../../db/workouts.ts'
import {
  parseDecimal,
  setInput,
  toDecimalInput,
  type Exercise,
  type SetEntry,
  type SetInput,
} from '../../domain/model.ts'
import { formatSet } from '../../domain/stats.ts'
import { Icon } from '../../ui/Icon.tsx'

type Props = {
  workoutId: string
  exercise: Exercise
  sets: SetEntry[]
  onDelete: (set: SetEntry) => void
  onRemove: () => void
}

export function ExerciseBlock({ workoutId, exercise, sets, onDelete, onRemove }: Props) {
  const last = useLiveQuery(() => lastSetFor(exercise.id), [exercise.id])
  const headingId = useId()

  return (
    <section className="exercise" aria-labelledby={headingId}>
      <div className="exercise-head">
        <h2 id={headingId}>{exercise.name}</h2>
        {sets.length === 0 && (
          <button type="button" className="btn-link" onClick={onRemove}>
            Quitar
          </button>
        )}
      </div>

      {sets.length > 0 && (
        <ol className="sets">
          {sets.map((s, i) => (
            <li key={s.id}>
              <span className="set-n">{i + 1}</span>
              <span className="set-value">{formatSet(s, exercise.kind)}</span>
              <button
                type="button"
                className="icon-btn"
                aria-label={`Eliminar serie ${i + 1}`}
                onClick={() => onDelete(s)}
              >
                <Icon name="trash" />
              </button>
            </li>
          ))}
        </ol>
      )}

      {/* Se monta cuando se conoce la última serie, para rellenar con ella. */}
      {last !== undefined && (
        <SetForm
          weightLabel={exercise.kind === 'bodyweight' ? 'Lastre kg' : 'Kg'}
          defaults={last ?? { reps: 10, weightKg: 0 }}
          onAdd={(input) => addSet(workoutId, exercise.id, input)}
        />
      )}
    </section>
  )
}

type Errors = { reps?: string; weightKg?: string; form?: string }

function SetForm({
  weightLabel,
  defaults,
  onAdd,
}: {
  weightLabel: string
  defaults: { reps: number; weightKg: number }
  onAdd: (input: SetInput) => Promise<unknown>
}) {
  const [reps, setReps] = useState(String(defaults.reps))
  const [kg, setKg] = useState(toDecimalInput(defaults.weightKg))
  const [errors, setErrors] = useState<Errors>({})

  async function submit(e: FormEvent) {
    e.preventDefault()
    const parsed = setInput.safeParse({ reps, weightKg: kg })
    if (!parsed.success) {
      const f = z.flattenError(parsed.error).fieldErrors
      setErrors({ reps: f.reps?.[0], weightKg: f.weightKg?.[0] })
      return
    }
    try {
      await onAdd(parsed.data)
      setErrors({})
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : 'No se pudo guardar la serie' })
    }
  }

  return (
    <form className="set-form" onSubmit={(e) => void submit(e)} noValidate>
      <Stepper label="Reps" value={reps} onChange={setReps} step={1} min={1} error={errors.reps} />
      <Stepper label={weightLabel} value={kg} onChange={setKg} step={2.5} min={0} error={errors.weightKg} decimal />
      <button type="submit" className="btn btn-primary set-submit">
        <Icon name="plus" />
        Añadir serie
      </button>
      {errors.form && <p className="field-error set-submit">{errors.form}</p>}
    </form>
  )
}

function Stepper({
  label,
  value,
  onChange,
  step,
  min,
  error,
  decimal = false,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  step: number
  min: number
  error?: string
  decimal?: boolean
}) {
  const id = useId()
  const errorId = `${id}-error`
  const name = label.toLowerCase()

  function bump(delta: number) {
    const n = parseDecimal(value)
    const next = Math.round(((Number.isNaN(n) ? 0 : n) + delta) * 100) / 100
    onChange(toDecimalInput(Math.max(min, next)))
  }

  return (
    <div className="stepper">
      <label htmlFor={id}>{label}</label>
      <div className="stepper-row">
        <button type="button" className="icon-btn" aria-label={`Bajar ${name}`} onClick={() => bump(-step)}>
          <Icon name="minus" />
        </button>
        <input
          id={id}
          inputMode={decimal ? 'decimal' : 'numeric'}
          autoComplete="off"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={(e) => e.target.select()}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
        />
        <button type="button" className="icon-btn" aria-label={`Subir ${name}`} onClick={() => bump(step)}>
          <Icon name="plus" />
        </button>
      </div>
      {error && (
        <p id={errorId} className="field-error">
          {error}
        </p>
      )}
    </div>
  )
}
