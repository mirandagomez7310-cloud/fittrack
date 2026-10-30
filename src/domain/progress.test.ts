import { expect, test } from 'vitest'
import type { SetEntry } from './model.ts'
import { localDate, todayISO } from './dates.ts'
import { bodyWeightInput } from './model.ts'
import { epley, exerciseSeries, maxOf, personalRecord } from './progress.ts'

const set = (workoutId: string, reps: number, weightKg: number): SetEntry => ({
  id: `${workoutId}-${reps}-${weightKg}`,
  workoutId,
  exerciseId: 'e',
  reps,
  weightKg,
  createdAt: '2026-10-01T10:00:00.000Z',
})

test('Epley con valores de referencia', () => {
  expect(epley(100, 1)).toBe(100)
  expect(epley(100, 10)).toBeCloseTo(133.33, 2)
  expect(epley(60, 5)).toBe(70)
})

// Dos sesiones, la segunda registrada antes en el array: el resultado debe ir en orden cronológico.
const sets = [set('w2', 5, 105), set('w2', 3, 110), set('w1', 10, 80), set('w1', 8, 85), set('otra', 1, 999)]
const dates = new Map([
  ['w1', '2026-10-01T10:00:00.000Z'],
  ['w2', '2026-10-08T10:00:00.000Z'],
])

test('series por sesión para cada métrica', () => {
  expect(exerciseSeries(sets, dates, 'e1rm')).toEqual([
    { date: '2026-10-01T10:00:00.000Z', value: 107.7 }, // 85 × (1 + 8/30) = 107.67 > 80 × 1.333 = 106.67
    { date: '2026-10-08T10:00:00.000Z', value: 122.5 }, // 105 × 7/6 = 122.5 > 110 × 1.1 = 121
  ])
  expect(exerciseSeries(sets, dates, 'maxLoad').map((p) => p.value)).toEqual([85, 110])
  expect(exerciseSeries(sets, dates, 'volume').map((p) => p.value)).toEqual([1480, 855])
  expect(exerciseSeries(sets, dates, 'maxReps').map((p) => p.value)).toEqual([10, 5])
})

test('las series de sesiones sin fecha conocida se ignoran', () => {
  expect(exerciseSeries(sets, dates, 'maxLoad')).toHaveLength(2)
})

test('marca personal: el mejor valor y su primera fecha', () => {
  expect(personalRecord([])).toBeNull()
  expect(
    personalRecord([
      { date: 'a', value: 100 },
      { date: 'b', value: 120 },
      { date: 'c', value: 120 },
    ]),
  ).toEqual({ date: 'b', value: 120 })
})

test('peso corporal: rechaza fechas futuras y acepta hoy', () => {
  expect(bodyWeightInput.safeParse({ date: todayISO(), weightKg: '72' }).success).toBe(true)
  expect(bodyWeightInput.safeParse({ date: '2999-01-01', weightKg: '72' }).success).toBe(false)
})

test('maxOf aguanta listas enormes (Math.max(...arr) desbordaría la pila)', () => {
  const big = Array.from({ length: 300_000 }, (_, i) => i)
  expect(maxOf(big)).toBe(299_999)
})

test('fechas locales sin desfase de zona horaria', () => {
  expect(todayISO(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05')
  expect(localDate('2026-10-30').getDate()).toBe(30)
})
