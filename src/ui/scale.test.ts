import { expect, test } from 'vitest'
import { nearestIndex, niceTicks } from './scale.ts'

test('niceTicks cubre el rango con pasos redondos', () => {
  expect(niceTicks(102, 128)).toEqual([100, 110, 120, 130])
  expect(niceTicks(0, 1480)).toEqual([0, 500, 1000, 1500])
  expect(niceTicks(70.2, 72.8)).toEqual([70, 71, 72, 73])
  // Regresión: max justo por encima de un múltiplo del paso.
  expect(niceTicks(100, 124)).toEqual([100, 110, 120, 130])
})

test('niceTicks: la primera marca ≤ min y la última ≥ max en rangos variados', () => {
  for (const [min, max] of [[0, 1], [3, 7], [61.3, 61.4], [100, 124], [999, 1001], [0.5, 1765]] as const) {
    const ticks = niceTicks(min, max)
    expect(ticks[0]).toBeLessThanOrEqual(min)
    expect(ticks.at(-1)).toBeGreaterThanOrEqual(max)
  }
})

test('niceTicks con un solo valor abre un rango alrededor', () => {
  const ticks = niceTicks(100, 100)
  expect(ticks[0]).toBeLessThan(100)
  expect(ticks.at(-1)).toBeGreaterThan(100)
})

test('nearestIndex', () => {
  expect(nearestIndex([0, 10, 20], 14)).toBe(1)
  expect(nearestIndex([0, 10, 20], 16)).toBe(2)
  expect(nearestIndex([5], 100)).toBe(0)
})
