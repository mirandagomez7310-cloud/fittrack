import type { RouteObject } from 'react-router'
import { App, NotFound, RootError } from './App.tsx'
import { ExercisesPage } from './features/exercises/ExercisesPage.tsx'
import { WorkoutPage } from './features/workout/WorkoutPage.tsx'
import { Page } from './ui/Page.tsx'

// shortcut: Rutinas, Historial y Progreso son páginas vacías hasta las fases 3–4.
const soon = (title: string) => (
  <Page title={title}>
    <p className="muted">Próximamente.</p>
  </Page>
)

export const routes: RouteObject[] = [
  {
    path: '/',
    Component: App,
    ErrorBoundary: RootError,
    children: [
      { index: true, Component: WorkoutPage },
      { path: 'ejercicios', Component: ExercisesPage },
      { path: 'rutinas', element: soon('Rutinas') },
      { path: 'historial', element: soon('Historial') },
      { path: 'progreso', element: soon('Progreso') },
      { path: '*', Component: NotFound },
    ],
  },
]
