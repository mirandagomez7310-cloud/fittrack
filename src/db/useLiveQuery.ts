// Las deps las declara quien llama, como en useEffect; la regla no puede verificarlas aquí.
/* oxlint-disable react-hooks/exhaustive-deps */
import { liveQuery } from 'dexie'
import { useEffect, useState } from 'react'

/**
 * Resultado de una consulta Dexie que se actualiza al cambiar los datos. `undefined` mientras carga.
 * `keepPrevious`: al cambiar las deps, sigue mostrando el resultado anterior hasta que llega el nuevo
 * (para paginar sin parpadeo; no usar si las deps cambian de entidad).
 */
export function useLiveQuery<T>(
  query: () => Promise<T>,
  deps: readonly unknown[],
  { keepPrevious = false } = {},
): T | undefined {
  const [result, setResult] = useState<{ value: T } | undefined>()

  useEffect(() => {
    // Por defecto se vacía para no mostrar datos de otra entidad mientras llega la nueva consulta.
    if (!keepPrevious) setResult(undefined)
    const sub = liveQuery(query).subscribe({
      next: (value) => setResult({ value }),
      // Relanza en render para que lo capture el ErrorBoundary de la ruta.
      error: (err: unknown) =>
        setResult(() => {
          throw err
        }),
    })
    return () => sub.unsubscribe()
  }, deps)

  return result?.value
}
