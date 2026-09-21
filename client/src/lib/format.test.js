import { describe, expect, it } from 'vitest'
import { errorMessage, inr, pricingLabel, formatRelative, formatDue } from './format'

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

  it('formats relative past times', () => {
    expect(formatRelative(new Date(Date.now() - 2 * 60 * 1000))).toBe('2m ago')
    expect(formatRelative(new Date(Date.now() - 3 * 60 * 60 * 1000))).toBe('3h ago')
  })

  it('formats upcoming deadlines', () => {
    expect(formatDue(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000))).toBe('due in 3d')
    expect(formatDue(new Date(Date.now() - 2 * 24 * 60 * 60 * 1000))).toBe('overdue 2d')
  })
})
