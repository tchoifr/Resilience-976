import { describe, expect, it } from 'vitest'

import { buildScenarioSession } from '@/features/scenarios/services/scenario.service'
import type { Scenario } from '@/features/scenarios/types/scenario'

function buildScenario(): Scenario {
  return {
    id: 'scenario_test',
    title: 'Test',
    intro: 'Intro',
    domain: 'behaviors',
    videoId: 'VID-01',
    steps: [
      {
        id: 'step_1',
        prompt: 'Question ?',
        options: [
          { id: 'safe', label: 'Safe', score: 100 },
          { id: 'risky', label: 'Risky', score: 0 },
          { id: 'middle', label: 'Middle', score: 50 },
        ],
        explanation: 'Because',
      },
    ],
    sourceIds: ['source_01'],
    validationStatus: 'to_validate',
    revisionDate: '2026-08-10',
  }
}

describe('buildScenarioSession', () => {
  it('conserve toutes les options et leur score apres melange', () => {
    const session = buildScenarioSession(buildScenario())

    expect(session).toHaveLength(1)
    expect(session[0]?.options).toHaveLength(3)
    expect(new Set(session[0]?.options.map((option) => option.id))).toEqual(
      new Set(['safe', 'risky', 'middle']),
    )

    const safeOption = session[0]?.options.find((option) => option.id === 'safe')
    expect(safeOption?.score).toBe(100)
  })

  it('produit une session vide pour un scenario sans etape', () => {
    const scenario = { ...buildScenario(), steps: [] }

    expect(buildScenarioSession(scenario)).toEqual([])
  })
})
