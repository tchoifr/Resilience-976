import { describe, expect, it } from 'vitest'

import { getScenarioLevel } from '../../src/features/scenarios/services/scenario.service'

describe('getScenarioLevel', () => {
  it('classe un score bas en toImprove', () => {
    expect(getScenarioLevel(0)).toBe('toImprove')
    expect(getScenarioLevel(49)).toBe('toImprove')
  })

  it('classe un score intermediaire en good', () => {
    expect(getScenarioLevel(50)).toBe('good')
    expect(getScenarioLevel(79)).toBe('good')
  })

  it('classe un score haut en excellent', () => {
    expect(getScenarioLevel(80)).toBe('excellent')
    expect(getScenarioLevel(100)).toBe('excellent')
  })
})
