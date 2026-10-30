import { useEffect, useState } from 'react'

/**
 * "Deshacer" que cruza una navegación (p. ej. borrar en el detalle y volver a la lista).
 * Vive en memoria, no en history.state: así no reaparece con "Atrás" ni al recargar, y no
 * depende de una segunda navegación para limpiarse (que el router podría cancelar).
 */
let pending: { key: string; value: unknown } | null = null

export function setPendingUndo(key: string, value: unknown) {
  pending = { key, value }
}

/** Lo lee al montar y lo descarta después: solo lo ve la primera página que llega. */
export function usePendingUndo<T>(key: string) {
  // Lectura pura en el inicializador (StrictMode puede llamarlo dos veces); se descarta en el efecto.
  const [value, setValue] = useState<T | null>(() => (pending?.key === key ? (pending.value as T) : null))
  useEffect(() => {
    if (pending?.key === key) pending = null
  }, [key])
  return [value, setValue] as const
}
