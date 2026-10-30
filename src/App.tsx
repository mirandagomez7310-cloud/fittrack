import { useEffect, useRef } from 'react'
import { Link, NavLink, Outlet, useLocation, useRouteError } from 'react-router'
import { navItems } from './nav.ts'
import { Page } from './ui/Page.tsx'

export function App() {
  const { pathname } = useLocation()
  const previousPath = useRef(pathname)

  // Al navegar, el lector de pantalla anuncia la nueva página. Comparar la ruta (y no "primer render") aguanta el doble efecto de StrictMode.
  useEffect(() => {
    if (previousPath.current === pathname) return
    previousPath.current = pathname
    document.getElementById('page-title')?.focus()
  }, [pathname])

  return (
    <div className="shell">
      <a className="skip-link" href="#main">
        Saltar al contenido
      </a>
      <main id="main" className="main" tabIndex={-1}>
        <Outlet />
      </main>
      <nav className="tabbar" aria-label="Principal">
        <ul>
          {navItems.map(({ to, label }) => (
            <li key={to}>
              <NavLink to={to} end={to === '/'}>
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}

export function NotFound() {
  return (
    <Page title="Página no encontrada">
      <p>
        <Link to="/">Volver a Entrenar</Link>
      </p>
    </Page>
  )
}

export function RootError() {
  const error = useRouteError()
  return (
    <main className="main">
      <h1>Algo ha fallado</h1>
      <p>{error instanceof Error ? error.message : 'Error desconocido.'}</p>
      <p>Tus datos guardados no se han perdido.</p>
      <p>
        <a href="/">Recargar FitTrack</a>
      </p>
    </main>
  )
}
