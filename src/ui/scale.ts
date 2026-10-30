/** Marcas "redondas" (1, 2, 2.5, 5 × 10ⁿ) que cubren [min, max]. */
export function niceTicks(min: number, max: number, count = 4): number[] {
  if (min === max) {
    const pad = Math.abs(min) * 0.1 || 1
    min -= pad
    max += pad
  }
  const raw = (max - min) / count
  const magnitude = 10 ** Math.floor(Math.log10(raw))
  const step = ([1, 2, 2.5, 5, 10].find((s) => s * magnitude >= raw) ?? 10) * magnitude
  // La última marca siempre alcanza o supera max: si no, el dato más alto se saldría del área.
  const ticks: number[] = []
  for (let v = Math.floor(min / step) * step; ; v += step) {
    const tick = Math.round(v * 1e6) / 1e6
    ticks.push(tick)
    if (tick >= max) return ticks
  }
}

/** Índice del punto más cercano en x. `xs` ordenado ascendente. */
export function nearestIndex(xs: number[], x: number): number {
  let best = 0
  for (let i = 1; i < xs.length; i++) if (Math.abs(xs[i]! - x) < Math.abs(xs[best]! - x)) best = i
  return best
}
