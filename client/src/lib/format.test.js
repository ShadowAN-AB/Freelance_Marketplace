import { describe, expect, it } from 'vitest'
import { errorMessage, inr, pricingLabel } from './format'

describe('format helpers', () => {
  it('reads API error messages', () => {
    expect(errorMessage({ response: { data: { message: 'Nope' } } })).toBe('Nope')
    expect(errorMessage({}, 'fallback')).toBe('fallback')
  })

  it('formats INR without fractions', () => {
    expect(inr(15000)).toMatch(/15,000/)
  })

  it('labels pricing type and planned milestones', () => {
    expect(pricingLabel({ pricingType: 'hourly' })).toBe('Hourly')
    expect(pricingLabel({ pricingType: 'fixed', milestones: [{}, {}] })).toBe('Fixed · 2 milestones')
    expect(pricingLabel({ pricingType: 'fixed' })).toBe('Fixed price')
  })
})
