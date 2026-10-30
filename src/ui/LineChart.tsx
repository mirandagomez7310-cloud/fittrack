import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { maxOf, minOf } from '../domain/progress.ts'
import { formatDate, formatNumber, formatShortDate } from '../domain/stats.ts'
import { nearestIndex, niceTicks } from './scale.ts'

export type ChartPoint = { date: Date; value: number }

type Props = {
  /** Qué se mide; da nombre a la gráfica y a la columna de la tabla. */
  name: string
  points: ChartPoint[]
  format: (value: number) => string
}

const HEIGHT = 200
const PAD = { top: 16, right: 64, bottom: 28, left: 40 }

/** Una serie temporal. Interacción: puntero o flechas ← →. Alternativa accesible: tabla de datos. */
export function LineChart({ name, points, format }: Props) {
  const wrap = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  const [active, setActive] = useState<number | null>(null)
  const liveId = useId()

  useEffect(() => {
    const el = wrap.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => setWidth(entry?.contentRect.width ?? 0))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const values = points.map((p) => p.value)
  const ticks = niceTicks(minOf(values), maxOf(values))
  const lo = ticks[0]!
  const hi = ticks.at(-1)!
  const times = points.map((p) => p.date.getTime())
  const t0 = times[0]!
  const span = times.at(-1)! - t0
  const innerW = Math.max(0, width - PAD.left - PAD.right)
  const innerH = HEIGHT - PAD.top - PAD.bottom

  const x = (t: number) => PAD.left + (span === 0 ? innerW / 2 : ((t - t0) / span) * innerW)
  const y = (v: number) => PAD.top + (1 - (v - lo) / (hi - lo)) * innerH
  const xs = times.map(x)
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${xs[i]},${y(p.value)}`).join('')
  const last = points.length - 1
  const current = active === null ? null : points[active]

  function onPointerMove(e: PointerEvent<SVGSVGElement>) {
    setActive(nearestIndex(xs, e.clientX - e.currentTarget.getBoundingClientRect().left))
  }

  function onKeyDown(e: KeyboardEvent<SVGSVGElement>) {
    const moves: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, Home: -Infinity, End: Infinity }
    const delta = moves[e.key]
    if (delta === undefined) return
    e.preventDefault()
    setActive((i) => Math.min(last, Math.max(0, (i ?? last) + delta)))
  }

  const summary = `${name}: ${points.length} ${points.length === 1 ? 'registro' : 'registros'}, de ${format(points[0]!.value)} (${formatDate(points[0]!.date)}) a ${format(points[last]!.value)} (${formatDate(points[last]!.date)}).`

  return (
    <figure className="chart">
      <div ref={wrap} className="chart-plot">
        {width > 0 && (
          <svg
            width={width}
            height={HEIGHT}
            role="img"
            tabIndex={0}
            aria-label={`${summary} Usa las flechas para recorrer los valores.`}
            aria-describedby={liveId}
            onPointerMove={onPointerMove}
            onPointerLeave={() => setActive(null)}
            onKeyDown={onKeyDown}
            onBlur={() => setActive(null)}
          >
            {ticks.map((t) => (
              <g key={t}>
                <line className="chart-grid" x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} />
                <text className="chart-axis" x={PAD.left - 8} y={y(t)} textAnchor="end" dominantBaseline="middle">
                  {formatNumber(t)}
                </text>
              </g>
            ))}
            <text className="chart-axis" x={xs[0]} y={HEIGHT - 6} textAnchor={span === 0 ? 'middle' : 'start'}>
              {formatShortDate(points[0]!.date)}
            </text>
            {span > 0 && (
              <text className="chart-axis" x={xs[last]} y={HEIGHT - 6} textAnchor="end">
                {formatShortDate(points[last]!.date)}
              </text>
            )}

            {current && <line className="chart-crosshair" x1={xs[active!]} x2={xs[active!]} y1={PAD.top} y2={PAD.top + innerH} />}
            <path className="chart-line" d={path} />
            {points.map((p, i) => (
              <circle
                key={i}
                className="chart-dot"
                cx={xs[i]}
                cy={y(p.value)}
                r={i === active ? 6 : 4}
              />
            ))}
            {/* Etiqueta directa solo en el último valor. */}
            <text className="chart-label" x={xs[last]! + 10} y={y(points[last]!.value)} dominantBaseline="middle">
              {format(points[last]!.value)}
            </text>
          </svg>
        )}
        {current && (
          <div
            className="chart-tooltip"
            style={{ left: Math.min(Math.max(xs[active!]!, 70), width - 70), top: y(current.value) - 12 }}
            aria-hidden="true"
          >
            <span className="muted">{formatDate(current.date)}</span>
            <strong>{format(current.value)}</strong>
          </div>
        )}
        <p id={liveId} className="visually-hidden" aria-live="polite">
          {current ? `${formatDate(current.date)}: ${format(current.value)}` : ''}
        </p>
      </div>

      <details className="chart-table">
        <summary>Ver datos</summary>
        <table>
          <caption className="visually-hidden">{name}</caption>
          <thead>
            <tr>
              <th scope="col">Fecha</th>
              <th scope="col">{name}</th>
            </tr>
          </thead>
          <tbody>
            {points.toReversed().map((p) => (
              <tr key={p.date.getTime()}>
                <td>{formatDate(p.date)}</td>
                <td>{format(p.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  )
}
