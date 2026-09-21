import { describe, expect, it } from 'vitest'
import { errorMessage, inr } from './format'

describe('format helpers', () => {
  it('reads API error messages', () => {
    expect(errorMessage({ response: { data: { message: 'Nope' } } })).toBe('Nope')
    expect(errorMessage({}, 'fallback')).toBe('fallback')
  })

  it('formats INR without fractions', () => {
    expect(inr(15000)).toMatch(/15,000/)
  })
})
