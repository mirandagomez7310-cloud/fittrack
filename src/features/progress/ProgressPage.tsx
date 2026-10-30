import { useId, useState } from 'react'
import { exerciseHistory, trainedExercises } from '../../db/progress.ts'
import { useLiveQuery } from '../../db/useLiveQuery.ts'
import type { Exercise } from '../../domain/model.ts'
import { exerciseSeries, metrics, metricsFor, personalRecord, type Metric } from '../../domain/progress.ts'
import { formatDate, formatNumber, kgLabel } from '../../domain/stats.ts'
import { LineChart } from '../../ui/LineChart.tsx'
import { Page } from '../../ui/Page.tsx'
import { BodyWeightSection } from './BodyWeightSection.tsx'

const formatMetric = (metric: Metric) => (v: number) =>
  metrics[metric].unit === 'kg' ? kgLabel(v) : `${formatNumber(v)} reps`

export function ProgressPage() {
  const trained = useLiveQuery(trainedExercises, [])
  const [chosen, setChosen] = useState<string | null>(null)
  const [metric, setMetric] = useState<Metric>('e1rm')
  const id = useId()

  const exercise =
    trained?.exercises.find((e) => e.id === chosen) ??
    trained?.exercises.find((e) => e.id === trained.latest) ??
    trained?.exercises[0]
  const available = exercise ? metricsFor(exercise.kind) : []
  const shown = available.includes(metric) ? metric : available[0]

  return (
    <Page title="Progreso">
      <section aria-labelledby={`${id}-ex`} className="progress-section">
        <h2 id={`${id}-ex`}>Ejercicios</h2>
        {trained && trained.exercises.length === 0 && (
          <p className="muted">Registra entrenamientos para ver tu progreso.</p>
        )}
        {exercise && shown && (
          <>
            <div className="field">
              <label htmlFor={`${id}-select`}>Ejercicio</label>
              <select id={`${id}-select`} value={exercise.id} onChange={(e) => setChosen(e.target.value)}>
                {trained!.exercises.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
            </div>
            {available.length > 1 && (
              <fieldset className="field">
                <legend>Métrica</legend>
                <div className="segmented">
                  {available.map((m) => (
                    <label key={m}>
                      <input
                        type="radio"
                        name={`${id}-metric`}
                        value={m}
                        checked={m === shown}
                        onChange={() => setMetric(m)}
                      />
                      <span>{metrics[m].label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            )}
            <ExerciseProgress key={exercise.id} exercise={exercise} metric={shown} />
          </>
        )}
      </section>

      <BodyWeightSection />
    </Page>
  )
}

function ExerciseProgress({ exercise, metric }: { exercise: Exercise; metric: Metric }) {
  const history = useLiveQuery(() => exerciseHistory(exercise.id), [exercise.id])
  if (!history) return null

  const series = (m: Metric) => exerciseSeries(history.sets, history.dates, m)
  const points = series(metric).map((p) => ({ date: new Date(p.date), value: p.value }))

  return (
    <>
      <h3 className="subhead">Marcas personales</h3>
      <dl className="records">
        {metricsFor(exercise.kind).map((m) => {
          const best = personalRecord(series(m))
          return (
            best && (
              <div key={m}>
                <dt>{metrics[m].label}</dt>
                <dd>
                  <span className="record-value">{formatMetric(m)(best.value)}</span>
                  <span className="muted">{formatDate(new Date(best.date))}</span>
                </dd>
              </div>
            )
          )
        })}
      </dl>

      {points.length > 0 && (
        <LineChart name={`${metrics[metric].label} · ${exercise.name}`} points={points} format={formatMetric(metric)} />
      )}
      {points.length === 1 && <p className="muted">Con más sesiones verás la tendencia.</p>}
    </>
  )
}
