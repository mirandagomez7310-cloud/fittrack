import type { RouteObject } from 'react-router'
import { App, NotFound, RootError } from './App.tsx'
import { ExercisesPage } from './features/exercises/ExercisesPage.tsx'
import { HistoryPage } from './features/history/HistoryPage.tsx'
import { WorkoutDetail } from './features/history/WorkoutDetail.tsx'
import { RoutineEditor } from './features/routines/RoutineEditor.tsx'
import { RoutinesPage } from './features/routines/RoutinesPage.tsx'
import { WorkoutPage } from './features/workout/WorkoutPage.tsx'
import { Page } from './ui/Page.tsx'

export const routes: RouteObject[] = [
  {
    path: '/',
    Component: App,
    ErrorBoundary: RootError,
    children: [
      { index: true, Component: WorkoutPage },
      { path: 'ejercicios', Component: ExercisesPage },
      { path: 'rutinas', Component: RoutinesPage },
      { path: 'rutinas/:id', Component: RoutineEditor },
      { path: 'historial', Component: HistoryPage },
      { path: 'historial/:id', Component: WorkoutDetail },
      {
        // shortcut: página vacía hasta la fase 4.
        path: 'progreso',
        element: (
          <Page title="Progreso">
            <p className="muted">Próximamente.</p>
          </Page>
        ),
      },
      { path: '*', Component: NotFound },
    ],
  },
]
