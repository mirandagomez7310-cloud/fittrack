import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { restoreWorkout, type WorkoutSnapshot } from '../../db/history.ts'
import { useLiveQuery } from '../../db/useLiveQuery.ts'
import { finishedWorkouts } from '../../db/workouts.ts'
import { count, formatDateTime, formatKg } from '../../domain/stats.ts'
import { Page } from '../../ui/Page.tsx'
import { BackupSection } from './BackupSection.tsx'

const PAGE = 20

export function HistoryPage() {
  const [limit, setLimit] = useState(PAGE)
  // Al pedir más, se sigue mostrando la página anterior hasta que llega la nueva (no se pierde el foco).
  const data = useLiveQuery(() => finishedWorkouts(limit), [limit], { keepPrevious: true })
  // El detalle navega aquí con la sesión borrada para ofrecer deshacer.
  const deleted = (useLocation().state as { deleted?: WorkoutSnapshot } | null)?.deleted
  const navigate = useNavigate()
  const [status, setStatus] = useState('')

  function undo(snapshot: WorkoutSnapshot) {
    restoreWorkout(snapshot)
      .then((restored) => {
        navigate('.', { replace: true, state: null })
        if (!restored) setStatus('No se pudo restaurar: sus ejercicios ya no existen.')
      })
      .catch((err: unknown) =>
        setStatus(`No se pudo restaurar: ${err instanceof Error ? err.message : 'error desconocido'}.`),
      )
  }

  return (
    <Page title="Historial">
      {data && data.page.length === 0 && <p className="muted">Aún no hay entrenamientos terminados.</p>}
      {data && data.page.length > 0 && (
        <ol className="link-list" aria-label="Entrenamientos">
          {data.page.map((w) => (
            <li key={w.id}>
              <Link to={`/historial/${w.id}`}>
                <span className="item-title">{formatDateTime(w.startedAt)}</span>
                <span className="muted">
                  {w.routineName ?? 'Libre'} · {count(w.setCount, 'serie', 'series')} · {formatKg(w.volume)} kg
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
      {data?.hasMore && (
        <button type="button" className="btn btn-secondary btn-block more" onClick={() => setLimit((n) => n + PAGE)}>
          Ver más
        </button>
      )}

      <BackupSection />

      <div role="status" className="status">
        {status}
      </div>
      {deleted && (
        <div className="undo-bar" role="status">
          <span>Entrenamiento eliminado</span>
          <button type="button" className="btn-link" onClick={() => undo(deleted)}>
            Deshacer
          </button>
        </div>
      )}
    </Page>
  )
}
