/** Texto legible de un error desconocido, para mostrarlo en un mensaje de estado. */
export const errorMessage = (err: unknown) => (err instanceof Error ? err.message : 'error desconocido')
