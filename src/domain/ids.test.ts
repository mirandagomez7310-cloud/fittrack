import { afterEach, expect, test, vi } from 'vitest'
import { newId } from './ids.ts'

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

test('genera UUID v4 también sin crypto.randomUUID (contexto no seguro)', () => {
  vi.stubGlobal('crypto', { getRandomValues: crypto.getRandomValues.bind(crypto) })
  const ids = Array.from({ length: 200 }, newId)
  for (const id of ids) expect(id).toMatch(UUID_V4)
  expect(new Set(ids).size).toBe(ids.length)
})

test('usa crypto.randomUUID cuando existe', () => {
  const native = vi.spyOn(crypto, 'randomUUID')
  const fallback = vi.spyOn(crypto, 'getRandomValues')
  expect(newId()).toMatch(UUID_V4)
  expect(native).toHaveBeenCalledOnce()
  expect(fallback).not.toHaveBeenCalled()
})
