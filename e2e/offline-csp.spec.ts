import { expect, test } from '@playwright/test'

test('tras la primera visita, la app abre y navega sin conexión', async ({ page, context }) => {
  await page.goto('/')
  await page.evaluate(() => navigator.serviceWorker.ready)
  // La primera visita no está controlada aún por el service worker; la siguiente sí.
  await page.reload()
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true)

  await context.setOffline(true)
  await page.reload()
  await expect(page.getByRole('heading', { level: 1, name: 'Entrenar' })).toBeVisible()
  await page.getByRole('button', { name: 'Empezar entrenamiento' }).click()
  await expect(page.getByRole('button', { name: 'Añadir ejercicio' })).toBeVisible()

  // Progreso se carga aparte: también debe estar guardado.
  await page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Progreso' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Progreso' })).toBeVisible()

  // Entrada directa a una ruta interna sin red.
  await page.goto('/historial')
  await expect(page.getByRole('heading', { level: 1, name: 'Historial' })).toBeVisible()
  await context.setOffline(false)
})

test('la CSP está activa y ningún flujo la incumple', async ({ page }) => {
  const violations: string[] = []
  await page.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', (e) => {
      ;(window as unknown as { __csp: string[] }).__csp ??= []
      ;(window as unknown as { __csp: string[] }).__csp.push(`${e.violatedDirective} ${e.blockedURI}`)
    })
  })
  const collect = async () =>
    violations.push(...(await page.evaluate(() => (window as unknown as { __csp?: string[] }).__csp ?? [])))

  await page.goto('/')
  await expect(page.locator('meta[http-equiv="Content-Security-Policy"]')).toHaveAttribute('content', /default-src 'self'/)

  // Recorre lo que usa estilos dinámicos, blobs y carga diferida.
  await page.getByRole('button', { name: 'Empezar entrenamiento' }).click()
  await page.getByRole('button', { name: 'Añadir ejercicio' }).click()
  await page.getByRole('button', { name: /^Press de banca/ }).click()
  const bench = page.getByRole('region', { name: 'Press de banca' })
  await bench.getByRole('textbox', { name: 'Kg', exact: true }).fill('60')
  await bench.getByRole('button', { name: 'Añadir serie' }).click()
  await page.getByRole('button', { name: 'Terminar entrenamiento' }).click()
  await collect()

  await page.goto('/progreso')
  const chart = page.locator('.chart svg').first()
  await chart.hover()
  await expect(page.locator('.chart-tooltip')).toBeVisible()
  await collect()

  await page.goto('/historial')
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exportar copia' }).click()
  await download
  await collect()

  expect(violations).toEqual([])
})
