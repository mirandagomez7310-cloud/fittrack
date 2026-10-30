import { expect, test } from '@playwright/test'

test('arranca y navega entre secciones', async ({ page }) => {
  const errors: string[] = []
  page.on('console', (msg) => msg.type() === 'error' && errors.push(msg.text()))

  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1, name: 'Entrenar' })).toBeVisible()

  await page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Rutinas' }).click()
  await expect(page).toHaveURL(/\/rutinas$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Rutinas' })).toBeVisible()
  await expect(page).toHaveTitle('Rutinas · FitTrack')

  expect(errors).toEqual([])
})
