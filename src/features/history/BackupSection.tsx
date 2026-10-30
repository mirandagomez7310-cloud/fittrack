import { useId, useState, type ChangeEvent } from 'react'
import { exportData, importData, lastExportAt, markExported } from '../../db/backup.ts'
import { useLiveQuery } from '../../db/useLiveQuery.ts'
import { getActiveWorkout } from '../../db/workouts.ts'
import { errorMessage } from '../../domain/errors.ts'
import { backupSchema, MAX_BACKUP_BYTES, parseBackup, type Backup } from '../../domain/backup.ts'
import { count, formatDateTime } from '../../domain/stats.ts'

const STALE_MS = 7 * 86_400_000
const message = errorMessage

async function exportState() {
  const at = await lastExportAt()
  return { at, stale: at === null || Date.now() - Date.parse(at) > STALE_MS }
}

export function BackupSection() {
  const lastExport = useLiveQuery(exportState, [])
  const active = useLiveQuery(getActiveWorkout, [])
  const [status, setStatus] = useState('')
  const [errors, setErrors] = useState<string[]>([])
  const [pending, setPending] = useState<Backup | null>(null)
  const titleId = useId()
  const errorsId = useId()


  async function download() {
    try {
      const data = await exportData()
      const url = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: 'application/json' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `fittrack-${data.exportedAt.slice(0, 10)}.json`
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 1_000)
      // shortcut: se marca al generar el archivo; el navegador no informa de si se guardó o se canceló.
      await markExported(data.exportedAt)
      // La copia debe poder restaurarse: si no pasaría la importación, avisar ya y no el día que haga falta.
      const check = backupSchema.safeParse(data)
      setStatus(
        check.success
          ? 'Copia exportada.'
          : `Copia exportada, pero no se podrá importar: ${check.error.issues[0]?.message ?? 'datos no válidos'}.`,
      )
    } catch (err) {
      setStatus(`No se pudo exportar: ${message(err)}.`)
    }
  }

  async function choose(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // permite volver a elegir el mismo archivo
    setStatus('')
    setPending(null)
    setErrors([])
    if (!file) return
    if (file.size > MAX_BACKUP_BYTES) {
      setErrors(['El archivo es demasiado grande para ser una copia de FitTrack'])
      return
    }
    const result = parseBackup(await file.text())
    setErrors(result.ok ? [] : result.errors)
    if (result.ok) setPending(result.data)
  }

  async function confirmImport() {
    if (!pending) return
    try {
      await importData(pending)
      setPending(null)
      setStatus('Copia importada. Tus datos se han reemplazado.')
    } catch (err) {
      setStatus(`No se pudo importar; tus datos no han cambiado: ${message(err)}.`)
    }
  }

  return (
    <section className="backup" aria-labelledby={titleId}>
      <h2 id={titleId}>Copia de seguridad</h2>
      <p className={lastExport?.stale ? 'warn' : 'muted'}>
        Tus datos solo están en este navegador.{' '}
        {lastExport &&
          (lastExport.at === null ? 'Aún no has hecho ninguna copia.' : `Última copia: ${formatDateTime(lastExport.at)}.`)}
      </p>

      <div className="button-row">
        <button type="button" className="btn btn-secondary" onClick={() => void download()}>
          Exportar copia
        </button>
        <label className="btn btn-secondary file-btn">
          Importar copia
          <input
            type="file"
            accept="application/json,.json"
            className="visually-hidden"
            aria-describedby={errors.length ? errorsId : undefined}
            onChange={(e) => void choose(e)}
          />
        </label>
      </div>

      {errors.length > 0 && (
        <div id={errorsId} role="alert" className="field-error">
          <p>No se puede importar este archivo:</p>
          <ul>
            {errors.map((err) => (
              <li key={err}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {pending && (
        <div className="confirm-panel" role="group" aria-label="Confirmar importación">
          <p>
            Copia del {formatDateTime(pending.exportedAt)}: {count(pending.exercises.length, 'ejercicio', 'ejercicios')},{' '}
            {count(pending.routines.length, 'rutina', 'rutinas')},{' '}
            {count(pending.workouts.length, 'entrenamiento', 'entrenamientos')} y{' '}
            {count(pending.sets.length, 'serie', 'series')}.
          </p>
          <p>
            <strong>Reemplazará todos tus datos actuales y no se puede deshacer.</strong> Exporta antes una copia si
            quieres conservarlos.
          </p>
          {active && (
            <p>
              <strong>Tienes un entrenamiento en curso: se perderá con sus series.</strong>
            </p>
          )}
          <div className="button-row">
            <button type="button" className="btn btn-danger" onClick={() => void confirmImport()}>
              Reemplazar mis datos
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setPending(null)}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div role="status" className="status">
        {status}
      </div>
    </section>
  )
}
