import { useId, useState, type FormEvent } from 'react'
import { z } from 'zod'
import { bodyWeights, deleteBodyWeight, restoreBodyWeight, saveBodyWeight } from '../../db/progress.ts'
import { useLiveQuery } from '../../db/useLiveQuery.ts'
import { localDate, todayISO } from '../../domain/dates.ts'
import { errorMessage } from '../../domain/errors.ts'
import { bodyWeightInput, toDecimalInput, type BodyWeight } from '../../domain/model.ts'
import { formatDate, kgLabel as kg } from '../../domain/stats.ts'
import { Icon } from '../../ui/Icon.tsx'
import { LineChart } from '../../ui/LineChart.tsx'

const RECENT = 5
const message = errorMessage

export function BodyWeightSection() {
  const entries = useLiveQuery(bodyWeights, [])
  const [errors, setErrors] = useState<{ date?: string; weightKg?: string }>({})
  const [status, setStatus] = useState('')
  const [deleted, setDeleted] = useState<BodyWeight | null>(null)
  const id = useId()

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const parsed = bodyWeightInput.safeParse(Object.fromEntries(new FormData(e.currentTarget)))
    if (!parsed.success) {
      const f = z.flattenError(parsed.error).fieldErrors
      setErrors({ date: f.date?.[0], weightKg: f.weightKg?.[0] })
      return
    }
    setErrors({})
    try {
      await saveBodyWeight(parsed.data)
      setDeleted(null) // un deshacer posterior ya no tendría sentido
      setStatus(`Guardado: ${kg(parsed.data.weightKg)} el ${formatDate(localDate(parsed.data.date))}.`)
    } catch (err) {
      setStatus(`No se pudo guardar: ${message(err)}.`)
    }
  }

  async function remove(entry: BodyWeight) {
    try {
      await deleteBodyWeight(entry.date)
      setDeleted(entry)
    } catch (err) {
      setStatus(`No se pudo eliminar: ${message(err)}.`)
    }
  }

  if (!entries) return null
  const latest = entries.at(-1)

  return (
    <section aria-labelledby={`${id}-title`} className="progress-section">
      <h2 id={`${id}-title`}>Peso corporal</h2>

      <form className="weight-form" onSubmit={(e) => void submit(e)} noValidate aria-label="Registrar peso corporal">
        <div className="field">
          <label htmlFor={`${id}-date`}>Fecha</label>
          <input
            id={`${id}-date`}
            name="date"
            type="date"
            defaultValue={todayISO()}
            max={todayISO()}
            aria-invalid={errors.date ? true : undefined}
            aria-describedby={errors.date ? `${id}-date-error` : undefined}
          />
          {errors.date && (
            <p id={`${id}-date-error`} className="field-error">
              {errors.date}
            </p>
          )}
        </div>
        <div className="field">
          <label htmlFor={`${id}-kg`}>Kg</label>
          <input
            // Se monta cuando ya hay datos (ver `if (!entries)`): arranca con el último peso y no se reinicia al borrar.
            id={`${id}-kg`}
            name="weightKg"
            inputMode="decimal"
            autoComplete="off"
            defaultValue={latest ? toDecimalInput(latest.weightKg) : ''}
            aria-invalid={errors.weightKg ? true : undefined}
            aria-describedby={errors.weightKg ? `${id}-kg-error` : undefined}
          />
          {errors.weightKg && (
            <p id={`${id}-kg-error`} className="field-error">
              {errors.weightKg}
            </p>
          )}
        </div>
        <button type="submit" className="btn btn-primary">
          Guardar
        </button>
      </form>
      <div role="status" className="status">
        {status}
      </div>

      {entries.length === 0 && <p className="muted">Aún no has registrado tu peso.</p>}
      {entries.length > 0 && (
        <>
          <LineChart
            name="Peso corporal"
            points={entries.map((w) => ({ date: localDate(w.date), value: w.weightKg }))}
            format={kg}
          />
          <h3 className="subhead">Últimos registros</h3>
          <ul className="exercise-list" aria-label="Últimos registros de peso">
            {entries
              .slice(-RECENT)
              .reverse()
              .map((w) => (
                <li key={w.date}>
                  <span>
                    <span className="exercise-name">{kg(w.weightKg)}</span>
                    <span className="muted">{formatDate(localDate(w.date))}</span>
                  </span>
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label={`Eliminar ${formatDate(localDate(w.date))}`}
                    onClick={() => void remove(w)}
                  >
                    <Icon name="trash" />
                  </button>
                </li>
              ))}
          </ul>
        </>
      )}

      {deleted && (
        <div className="undo-bar" role="status">
          <span>Registro eliminado</span>
          <button
            type="button"
            className="btn-link"
            onClick={() =>
              void restoreBodyWeight(deleted)
                .then((restored) => {
                  setDeleted(null)
                  if (!restored) setStatus('Ya hay un peso guardado ese día; no se ha restaurado el anterior.')
                })
                .catch((err: unknown) => setStatus(`No se pudo restaurar: ${message(err)}.`))
            }
          >
            Deshacer
          </button>
        </div>
      )}
    </section>
  )
}
