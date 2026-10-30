import { cleanup, render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, expect, test } from 'vitest'
import { routes } from './routes.tsx'

afterEach(cleanup)

function renderAt(path: string) {
  render(<RouterProvider router={createMemoryRouter(routes, { initialEntries: [path] })} />)
}

test('la navegación marca la página actual', () => {
  renderAt('/historial')
  expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Historial')
  const current = screen.getByRole('link', { current: 'page' })
  expect(current.textContent).toBe('Historial')
})

test('ruta desconocida muestra 404 con salida', () => {
  renderAt('/no-existe')
  expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Página no encontrada')
  expect(screen.getByRole('link', { name: 'Volver a Entrenar' })).toBeTruthy()
})
