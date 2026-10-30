/** Fecha local de hoy en formato YYYY-MM-DD. */
export function todayISO(now = new Date()) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

/** "2026-10-30" como medianoche local (new Date("2026-10-30") sería UTC y podría caer el día anterior). */
export function localDate(isoDate: string) {
  const [y, m, d] = isoDate.split('-').map(Number)
  return new Date(y!, m! - 1, d!)
}
