import { useId, useRef, useState } from 'react'
import { Link } from 'react-router'
import type { Exercise } from '../domain/model.ts'
import { Icon } from './Icon.tsx'

const fold = (s: string) =>
  s
    .toLocaleLowerCase('es')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')

export function ExercisePicker({ exercises, onPick }: { exercises: Exercise[]; onPick: (id: string) => unknown }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const toggle = useRef<HTMLButtonElement>(null)
  const panelId = useId()
  const searchId = useId()

  const q = fold(query.trim())
  const matches = exercises.filter((e) => fold(e.name).includes(q))

  function pick(id: string) {
    onPick(id)
    setOpen(false)
    setQuery('')
    // El botón pulsado desaparece; devolvemos el foco al disparador.
    toggle.current?.focus()
  }

  return (
    <div className="picker">
      <button
        ref={toggle}
        type="button"
        className="btn btn-secondary btn-block"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen((o) => !o)}
      >
        <Icon name="plus" />
        Añadir ejercicio
      </button>

      {open && (
        <div id={panelId} className="picker-panel">
          <label htmlFor={searchId}>Buscar ejercicio</label>
          <input
            id={searchId}
            type="search"
            autoComplete="off"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {matches.length > 0 ? (
            <ul className="picker-list">
              {matches.map((e) => (
                <li key={e.id}>
                  <button type="button" className="picker-item" onClick={() => pick(e.id)}>
                    <span>{e.name}</span>
                    <span className="muted">{e.muscle}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">
              Sin resultados. <Link to="/ejercicios">Crear ejercicio</Link>
            </p>
          )}
        </div>
      )}
    </div>
  )
}
