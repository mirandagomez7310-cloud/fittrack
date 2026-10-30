import { useEffect, type ReactNode } from 'react'

export function Page({ title, children }: { title: string; children: ReactNode }) {
  useEffect(() => {
    document.title = `${title} · FitTrack`
  }, [title])

  return (
    <section aria-labelledby="page-title">
      {/* tabIndex: recibe el foco al cambiar de ruta (ver App). */}
      <h1 id="page-title" tabIndex={-1}>
        {title}
      </h1>
      {children}
    </section>
  )
}
