import { expect, test, type Page } from '@playwright/test'

async function addExercise(page: Page, search: string, name: string) {
  await page.getByRole('button', { name: 'Añadir ejercicio' }).click()
  await page.getByLabel('Buscar ejercicio').fill(search)
  await page.getByRole('button', { name: new RegExp(`^${name}`) }).click()
  return page.getByRole('region', { name })
}

const field = (block: ReturnType<Page['getByRole']>, name: string) =>
  block.getByRole('textbox', { name, exact: true })

async function logSet(block: ReturnType<Page['getByRole']>, reps: string, kg?: string) {
  await field(block, 'Reps').fill(reps)
  if (kg !== undefined) await field(block, 'Kg').fill(kg)
  await block.getByRole('button', { name: 'Añadir serie' }).click()
}

test('registra una sesión de 3 ejercicios, sobrevive a recargar y se guarda', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Empezar entrenamiento' }).click()

  const bench = await addExercise(page, 'banca', 'Press de banca')
  await logSet(bench, '10', '60')
  await expect(bench.getByRole('listitem')).toHaveText(['1 10 × 60 kg'], { useInnerText: true })
  // La siguiente serie hereda la anterior; los botones ajustan la carga.
  await bench.getByRole('button', { name: 'Subir kg' }).click()
  await field(bench, 'Reps').fill('8')
  await bench.getByRole('button', { name: 'Añadir serie' }).click()

  const squat = await addExercise(page, 'sentad', 'Sentadilla')
  await logSet(squat, '5', '100')

  const pullups = await addExercise(page, 'domin', 'Dominadas')
  await logSet(pullups, '8')
  await expect(pullups.locator('.set-value')).toHaveText(['8 reps'])

  await page.reload()
  await expect(page.getByRole('region', { name: 'Press de banca' }).locator('.set-value')).toHaveText([
    '10 × 60 kg',
    '8 × 62,5 kg',
  ])
  await expect(page.getByRole('region', { name: 'Dominadas' }).locator('.set-value')).toHaveText(['8 reps'])

  // Borrar y deshacer.
  await page.getByRole('region', { name: 'Sentadilla' }).getByRole('button', { name: 'Eliminar serie 1' }).click()
  await expect(page.getByRole('region', { name: 'Sentadilla' }).locator('.set-value')).toHaveCount(0)
  await page.getByRole('button', { name: 'Deshacer' }).click()
  await expect(page.getByRole('region', { name: 'Sentadilla' }).locator('.set-value')).toHaveText(['5 × 100 kg'])

  await page.getByRole('button', { name: 'Terminar entrenamiento' }).click()
  await expect(page.getByRole('status')).toHaveText('Entrenamiento guardado: 4 series, 1600 kg de volumen.')
  await expect(page.getByRole('button', { name: 'Empezar entrenamiento' })).toBeVisible()
})

test('valida la serie y no guarda datos inválidos', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Empezar entrenamiento' }).click()
  const bench = await addExercise(page, 'banca', 'Press de banca')
  await logSet(bench, '0', 'abc')
  await expect(field(bench, 'Reps')).toHaveAttribute('aria-invalid', 'true')
  await expect(bench.getByText('Mínimo 1')).toBeVisible()
  await expect(bench.getByText('Introduce un número')).toBeVisible()
  await expect(bench.locator('.set-value')).toHaveCount(0)
})

test('crea ejercicios sin duplicados', async ({ page }) => {
  await page.goto('/ejercicios')
  const form = page.getByRole('form', { name: 'Nuevo ejercicio' })
  await form.getByLabel('Nombre').fill('Face pull')
  await form.getByLabel('Grupo muscular').selectOption('Hombros')
  await form.getByRole('button', { name: 'Crear ejercicio' }).click()
  await expect(page.getByRole('status')).toHaveText('Face pull creado.')
  await expect(page.getByRole('list', { name: 'Catálogo' })).toContainText('Face pull')

  await form.getByLabel('Nombre').fill('face PULL')
  await form.getByRole('button', { name: 'Crear ejercicio' }).click()
  await expect(form.getByText('Ya existe un ejercicio con ese nombre')).toBeVisible()
  await expect(form.getByLabel('Nombre')).toBeFocused()
})
