import { describe, expect, it } from 'vitest'

import { getDomainLevelId } from '../../src/features/assessment/services/scoring.service'

describe('getDomainLevelId', () => {
  it('classe un score tres bas en insufficient', () => {
    expect(getDomainLevelId(0)).toBe('insufficient')
    expect(getDomainLevelId(39)).toBe('insufficient')
  })

  it('classe un score intermediaire bas en fragile', () => {
    expect(getDomainLevelId(40)).toBe('fragile')
    expect(getDomainLevelId(59)).toBe('fragile')
  })

  it('classe un score intermediaire haut en good', () => {
    expect(getDomainLevelId(60)).toBe('good')
    expect(getDomainLevelId(79)).toBe('good')
  })

  it('classe un score haut en very_good', () => {
    expect(getDomainLevelId(80)).toBe('very_good')
    expect(getDomainLevelId(100)).toBe('very_good')
  })
})
