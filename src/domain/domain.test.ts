import { describe, expect, test } from 'vitest'
import { exerciseInput, parseDecimal, setInput } from './model.ts'
import { formatSet, totalVolume } from './stats.ts'

describe('setInput', () => {
  test('acepta coma decimal y redondea a 2 decimales', () => {
    expect(setInput.parse({ reps: '8', weightKg: '62,5' })).toEqual({ reps: 8, weightKg: 62.5 })
    expect(setInput.parse({ reps: '8', weightKg: '10.333' }).weightKg).toBe(10.33)
  })

  test('kg vacío cuenta como 0 (peso corporal sin lastre)', () => {
    expect(setInput.parse({ reps: '12', weightKg: '' }).weightKg).toBe(0)
  })

  test.each([
    [{ reps: '0', weightKg: '50' }, 'reps'],
    [{ reps: '', weightKg: '50' }, 'reps'],
    [{ reps: '8,5', weightKg: '50' }, 'reps'],
    [{ reps: '8', weightKg: 'abc' }, 'weightKg'],
    [{ reps: '8', weightKg: '-5' }, 'weightKg'],
    [{ reps: '8', weightKg: '1001' }, 'weightKg'],
  ])('rechaza %o en %s', (input, field) => {
    const r = setInput.safeParse(input)
    expect(r.success).toBe(false)
    expect(r.error?.issues[0]?.path[0]).toBe(field)
  })
})

test('exerciseInput recorta el nombre y exige grupo válido', () => {
  expect(exerciseInput.parse({ name: '  Remo  ', muscle: 'Espalda', kind: 'weighted' }).name).toBe('Remo')
  expect(exerciseInput.safeParse({ name: ' ', muscle: 'Espalda', kind: 'weighted' }).success).toBe(false)
  expect(exerciseInput.safeParse({ name: 'X', muscle: 'Cuello', kind: 'weighted' }).success).toBe(false)
})

test('parseDecimal', () => {
  expect(parseDecimal(' 2,5 ')).toBe(2.5)
  expect(Number.isNaN(parseDecimal('2,5,1'))).toBe(true)
})

test('volumen y formato', () => {
  expect(totalVolume([{ reps: 10, weightKg: 60 }, { reps: 8, weightKg: 62.5 }])).toBe(1100)
  expect(formatSet({ reps: 8, weightKg: 62.5 }, 'weighted')).toBe('8 × 62,5 kg')
  expect(formatSet({ reps: 10, weightKg: 0 }, 'bodyweight')).toBe('10 reps')
  expect(formatSet({ reps: 6, weightKg: 10 }, 'bodyweight')).toBe('6 × +10 kg')
})
