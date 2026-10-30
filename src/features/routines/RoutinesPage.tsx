import { useId, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { allRoutines, createRoutine, restoreRoutine } from '../../db/routines.ts'
import { useLiveQuery } from '../../db/useLiveQuery.ts'
import { nameField, type Routine } from '../../domain/model.ts'
import { count } from '../../domain/stats.ts'
import { Page } from '../../ui/Page.tsx'

export function RoutinesPage() {
  const routines = useLiveQuery(allRoutines, [])
  const navigate = useNavigate()
  // El editor navega aquí con la rutina borrada para ofrecer deshacer.
  const deleted = (useLocation().state as { deleted?: Routine } | null)?.deleted
  const [error, setError] = useState('')
  const id = useId()

  async function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const parsed = nameField.safeParse(new FormData(e.currentTarget).get('name'))
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Nombre no válido')
      return
    }
    try {
      navigate(`/rutinas/${await createRoutine(parsed.data)}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la rutina')
    }
  }

  return (
    <Page title="Rutinas">
      <form className="inline-form" onSubmit={(e) => void create(e)} noValidate aria-label="Nueva rutina">
        <div className="field">
          <label htmlFor={`${id}-name`}>Nueva rutina</label>
          <input
            id={`${id}-name`}
            name="name"
            autoComplete="off"
            maxLength={60}
            placeholder="Torso, Pierna…"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${id}-error` : undefined}
          />
          {error && (
            <p id={`${id}-error`} className="field-error">
              {error}
            </p>
          )}
        </div>
        <button type="submit" className="btn btn-primary">
          Crear
        </button>
      </form>

      {routines && routines.length === 0 && <p className="muted">Aún no tienes rutinas.</p>}
      {routines && routines.length > 0 && (
        <ul className="link-list" aria-label="Tus rutinas">
          {routines.map((r) => (
            <li key={r.id}>
              <Link to={`/rutinas/${r.id}`}>
                <span className="item-title">{r.name}</span>
                <span className="muted">{count(r.items.length, 'ejercicio', 'ejercicios')}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {deleted && (
        <div className="undo-bar" role="status">
          <span>Rutina «{deleted.name}» eliminada</span>
          <button
            type="button"
            className="btn-link"
            onClick={() =>
              void restoreRoutine(deleted)
                .then(() => navigate('.', { replace: true, state: null }))
                .catch((err: unknown) => setError(err instanceof Error ? err.message : 'No se pudo restaurar'))
            }
          >
            Deshacer
          </button>
        </div>
      )}
    </Page>
  )
}
