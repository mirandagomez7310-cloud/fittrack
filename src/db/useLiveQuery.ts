// Las deps las declara quien llama, como en useEffect; la regla no puede verificarlas aquí.
/* oxlint-disable react-hooks/exhaustive-deps */
import { liveQuery } from 'dexie'
import { useEffect, useState } from 'react'

/** Resultado de una consulta Dexie que se actualiza al cambiar los datos. `undefined` mientras carga. */
export function useLiveQuery<T>(query: () => Promise<T>, deps: readonly unknown[]): T | undefined {
  const [result, setResult] = useState<{ value: T } | undefined>()

  useEffect(() => {
    // Sin esto, al cambiar las deps se seguiría viendo el resultado de la consulta anterior.
    setResult(undefined)
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
