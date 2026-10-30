import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router'
import './styles/global.css'
import { routes } from './routes.tsx'

const router = createBrowserRouter(routes)

// Pide al navegador que no purgue IndexedDB por falta de espacio. Sin soporte o si lo deniega, se sigue igual.
void navigator.storage?.persist?.()

// Solo en build: en dev el service worker serviría archivos viejos e interferiría con la recarga en caliente.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  navigator.serviceWorker
    .register('/sw.js')
    .catch((err: unknown) => console.error('No se pudo activar el modo sin conexión', err))
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
