import { useState } from 'react'
import { Link } from 'react-router'
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
    </Page>
  )
}
