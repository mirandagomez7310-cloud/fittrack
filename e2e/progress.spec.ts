import { expect, test, type Page } from '@playwright/test'

const at = (day: number) => new Date(Date.UTC(2026, 8, day, 18)).toISOString()

/** Datos sintéticos: 3 sesiones de banca (60 → 70 kg) y dominadas, cargadas con la importación de la app. */
async function seed(page: Page) {
  const exercises = [
    { id: 'bench', name: 'Press de banca', muscle: 'Pecho', kind: 'weighted', createdAt: at(1) },
    { id: 'pull', name: 'Dominadas', muscle: 'Espalda', kind: 'bodyweight', createdAt: at(1) },
  ]
  const workouts = [1, 8, 15].map((day, i) => ({
    id: `w${i}`,
    startedAt: at(day),
    endedAt: at(day),
    exerciseIds: ['pull', 'bench'],
  }))
  const sets = workouts.flatMap((w, i) => [
    { id: `${w.id}a`, workoutId: w.id, exerciseId: 'bench', reps: 10, weightKg: 60 + i * 5, createdAt: w.startedAt },
    { id: `${w.id}b`, workoutId: w.id, exerciseId: 'bench', reps: 5, weightKg: 65 + i * 5, createdAt: w.startedAt },
    { id: `${w.id}c`, workoutId: w.id, exerciseId: 'pull', reps: 6 + i, weightKg: 0, createdAt: w.startedAt },
  ])
  const backup = { app: 'fittrack', version: 2, exportedAt: at(20), exercises, routines: [], workouts, sets, bodyWeights: [] }

  await page.goto('/historial')
  await page.locator('input[type=file]').setInputFiles({
    name: 'seed.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(backup)),
  })
  await page.getByRole('button', { name: 'Reemplazar mis datos' }).click()
  await expect(page.getByText('Copia importada')).toBeVisible()
  await page.goto('/progreso')
}

test('sin datos muestra cómo empezar', async ({ page }) => {
  await page.goto('/progreso')
  await expect(page.getByText('Registra entrenamientos para ver tu progreso.')).toBeVisible()
  await expect(page.getByText('Aún no has registrado tu peso.')).toBeVisible()
})

test('marcas personales, cambio de métrica, tabla y teclado', async ({ page }) => {
  await seed(page)
  const exercise = page.getByRole('combobox', { name: 'Ejercicio' })
  await exercise.selectOption({ label: 'Press de banca' })

  // Sesión 3: 70 × 10 → 93,3; 75 × 5 → 87,5. Carga máx 75. Volumen 700 + 375 = 1075.
  const records = page.locator('.records')
  await expect(records).toContainText('1RM estimado93,3 kg')
  await expect(records).toContainText('Carga máxima75 kg')
  await expect(records).toContainText('Volumen1075 kg')

  const chart = page.getByRole('img', { name: /^1RM estimado · Press de banca: 3 registros, de 80 kg .* a 93,3 kg/ })
  await expect(chart).toBeVisible()

  await page.getByRole('radio', { name: 'Carga máxima' }).check()
  await page.getByText('Ver datos').first().click()
  await expect(page.locator('.chart-table tbody td:last-child').first()).toHaveText('75 kg')
  await expect(page.locator('.chart-table tbody tr')).toHaveCount(3)

  const maxLoadChart = page.getByRole('img', { name: /^Carga máxima · Press de banca/ })
  await maxLoadChart.focus()
  await page.keyboard.press('Home')
  await expect(page.locator('.chart [aria-live=polite]').first()).toHaveText('1 sept 2026: 65 kg')
  await page.keyboard.press('ArrowRight')
  await expect(page.locator('.chart [aria-live=polite]').first()).toHaveText('8 sept 2026: 70 kg')

  // Peso corporal: solo reps máximas, sin selector de métrica.
  await exercise.selectOption({ label: 'Dominadas' })
  await expect(page.getByRole('radio')).toHaveCount(0)
  await expect(records).toContainText('Reps máximas8 reps')
})

test('peso corporal: valida, reemplaza el mismo día y deshace el borrado', async ({ page }) => {
  await page.goto('/progreso')
  const form = page.getByRole('form', { name: 'Registrar peso corporal' })
  const kg = form.getByRole('textbox', { name: 'Kg' })

  await kg.fill('5')
  await form.getByRole('button', { name: 'Guardar' }).click()
  await expect(form.getByText('Mínimo 20 kg')).toBeVisible()

  await form.getByLabel('Fecha').fill('2026-10-01')
  await kg.fill('72,4')
  await form.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByText('Guardado: 72,4 kg el 1 oct 2026.')).toBeVisible()

  await form.getByLabel('Fecha').fill('2026-10-01')
  await kg.fill('72,1')
  await form.getByRole('button', { name: 'Guardar' }).click()
  const recent = page.getByRole('list', { name: 'Últimos registros de peso' })
  await expect(recent.getByRole('listitem')).toHaveCount(1)
  await expect(recent).toContainText('72,1 kg')

  await recent.getByRole('button', { name: 'Eliminar 1 oct 2026' }).click()
  await expect(page.getByText('Aún no has registrado tu peso.')).toBeVisible()
  await page.getByRole('button', { name: 'Deshacer' }).click()
  await expect(recent).toContainText('72,1 kg')
})
