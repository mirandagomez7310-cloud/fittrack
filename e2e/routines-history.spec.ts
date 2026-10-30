import { expect, test, type Page } from '@playwright/test'

async function pick(page: Page, search: string, name: string) {
  await page.getByRole('button', { name: 'Añadir ejercicio' }).click()
  await page.getByLabel('Buscar ejercicio').fill(search)
  await page.getByRole('button', { name: new RegExp(`^${name}`) }).click()
}

async function createRoutine(page: Page) {
  await page.goto('/rutinas')
  await page.getByRole('textbox', { name: 'Nueva rutina' }).fill('Torso')
  await page.getByRole('button', { name: 'Crear' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Torso' })).toBeVisible()
  await pick(page, 'banca', 'Press de banca')
  await pick(page, 'remo', 'Remo con barra')
  await page.getByRole('group', { name: 'Press de banca' }).getByLabel('Reps').selectOption('8')
  await page.getByRole('button', { name: 'Subir Remo con barra' }).click()
  await expect(page.getByRole('group')).toHaveText([/^Remo con barra/, /^Press de banca/])
}

test('rutina → sesión con objetivos → historial con detalle', async ({ page }) => {
  await createRoutine(page)

  await page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Entrenar' }).click()
  await page.getByRole('button', { name: /^Torso/ }).click()
  await expect(page.locator('section.exercise h2')).toHaveText(['Remo con barra', 'Press de banca'])
  const bench = page.getByRole('region', { name: 'Press de banca' })
  await expect(bench.getByText('Objetivo 3 × 8')).toBeVisible()
  await expect(bench.getByRole('textbox', { name: 'Reps', exact: true })).toHaveValue('8')
  await bench.getByRole('textbox', { name: 'Kg', exact: true }).fill('70')
  await bench.getByRole('button', { name: 'Añadir serie' }).click()
  await expect(bench.getByText('Objetivo 3 × 8 · 1/3')).toBeVisible()
  await page.getByRole('button', { name: 'Terminar entrenamiento' }).click()
  await expect(page.getByRole('status')).toContainText('Entrenamiento guardado: 1 serie, 560 kg')

  await page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Historial' }).click()
  const entry = page.getByRole('list', { name: 'Entrenamientos' }).getByRole('link')
  await expect(entry).toHaveCount(1)
  await expect(entry).toContainText('Torso · 1 serie · 560 kg')
  await entry.click()
  // Solo queda el ejercicio con series.
  await expect(page.locator('section.exercise h2')).toHaveText(['Press de banca'])
  await expect(page.getByRole('region', { name: 'Press de banca' })).toContainText('8 × 70 kg')
})

test('borrar rutina se puede deshacer', async ({ page }) => {
  await createRoutine(page)
  await page.getByRole('button', { name: 'Eliminar rutina' }).click()
  await expect(page).toHaveURL(/\/rutinas$/)
  await expect(page.getByText('Aún no tienes rutinas.')).toBeVisible()
  await page.getByRole('button', { name: 'Deshacer' }).click()
  await expect(page.getByRole('list', { name: 'Tus rutinas' })).toContainText('Torso')
})

test('el deshacer de una rutina no reaparece al recargar', async ({ page }) => {
  await createRoutine(page)
  await page.getByRole('button', { name: 'Eliminar rutina' }).click()
  await expect(page.getByRole('button', { name: 'Deshacer' })).toBeVisible()
  await page.reload()
  await expect(page.getByText('Aún no tienes rutinas.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Deshacer' })).toHaveCount(0)
})

test('exportar e importar: rechaza archivos inválidos y reemplaza con uno válido', async ({ page }) => {
  await createRoutine(page)
  await page.goto('/historial')
  await expect(page.getByText('Aún no has hecho ninguna copia.')).toBeVisible()

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exportar copia' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(/^fittrack-\d{4}-\d{2}-\d{2}\.json$/)
  const backupPath = await download.path()
  await expect(page.getByText(/Última copia:/)).toBeVisible()

  // Archivo manipulado: referencia rota y una clave extraña. No debe cambiar nada.
  const backup = JSON.parse(await (await import('node:fs/promises')).readFile(backupPath, 'utf8'))
  backup.routines[0].items[0].exerciseId = 'no-existe'
  const input = page.locator('input[type=file]')
  await input.setInputFiles({ name: 'mala.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backup)) })
  await expect(page.getByRole('alert')).toContainText('Hay referencias a ejercicios que no existen')
  await input.setInputFiles({ name: 'texto.json', mimeType: 'application/json', buffer: Buffer.from('<html>') })
  await expect(page.getByRole('alert')).toContainText('no es JSON válido')

  // Cambia los datos locales y después restaura la copia buena.
  await page.goto('/rutinas')
  await page.getByRole('link', { name: /Torso/ }).click()
  await page.getByRole('button', { name: 'Eliminar rutina' }).click()
  await page.goto('/historial')
  await page.locator('input[type=file]').setInputFiles(backupPath)
  const confirm = page.getByRole('group', { name: 'Confirmar importación' })
  await expect(confirm).toContainText('1 rutina,')
  await confirm.getByRole('button', { name: 'Reemplazar mis datos' }).click()
  await expect(page.getByRole('region', { name: 'Copia de seguridad' }).getByRole('status')).toHaveText(
    'Copia importada. Tus datos se han reemplazado.',
  )

  await page.goto('/rutinas')
  await expect(page.getByRole('list', { name: 'Tus rutinas' })).toContainText('Torso')
})
