import { expect, test, type Page } from '@playwright/test'

async function finishedWorkout(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: 'Empezar entrenamiento' }).click()
  for (const [search, name, kg] of [
    ['banca', 'Press de banca', '60'],
    ['sentad', 'Sentadilla', '100'],
  ] as const) {
    await page.getByRole('button', { name: 'Añadir ejercicio' }).click()
    await page.getByLabel('Buscar ejercicio').fill(search)
    await page.getByRole('button', { name: new RegExp(`^${name}`) }).click()
    const block = page.getByRole('region', { name })
    await block.getByRole('textbox', { name: 'Kg', exact: true }).fill(kg)
    await block.getByRole('button', { name: 'Añadir serie' }).click()
    await expect(block.locator('.set-value')).toHaveCount(1)
  }
  await page.getByRole('button', { name: 'Terminar entrenamiento' }).click()
  await page.goto('/historial')
  await page.getByRole('list', { name: 'Entrenamientos' }).getByRole('link').click()
}

const exerciseHeadings = (page: Page) => page.locator('section.exercise h2')

test('borrar una serie del historial y deshacer', async ({ page }) => {
  await finishedWorkout(page)
  await expect(exerciseHeadings(page)).toHaveText(['Press de banca', 'Sentadilla'])

  await page.getByRole('button', { name: 'Eliminar serie 1 de Sentadilla' }).click()
  // Era su única serie: el ejercicio sale de la sesión.
  await expect(exerciseHeadings(page)).toHaveText(['Press de banca'])
  await page.getByRole('button', { name: 'Deshacer' }).click()
  await expect(exerciseHeadings(page)).toHaveText(['Press de banca', 'Sentadilla'])
})

test('eliminar el entrenamiento entero y deshacer desde el historial', async ({ page }) => {
  await finishedWorkout(page)
  await page.getByRole('button', { name: 'Eliminar entrenamiento' }).click()
  await expect(page).toHaveURL(/\/historial$/)
  await expect(page.getByText('Aún no hay entrenamientos terminados.')).toBeVisible()

  await page.getByRole('button', { name: 'Deshacer' }).click()
  const entry = page.getByRole('list', { name: 'Entrenamientos' }).getByRole('link')
  // Reps por defecto 10: 10 × 60 + 10 × 100.
  await expect(entry).toContainText('2 series · 1600 kg')
})
