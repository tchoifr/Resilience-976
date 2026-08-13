import { describe, expect, it } from 'vitest'

import { buildScenarioDebrief } from '@/features/scenarios/services/scenario-debrief.service'
import type { ScenarioChoice, ScenarioOption, ScenarioStep } from '@/features/scenarios/types/scenario'

const options: ScenarioOption[] = [
  { id: 'sortir', label: 'Sortir immédiatement', score: 0 },
  { id: 'attendre', label: 'Attendre la fin des secousses', score: 100 },
  { id: 'appeler', label: 'Appeler un proche', score: 50 },
]

function buildStep(id: string): ScenarioStep {
  return {
    id,
    prompt: `Que faites-vous à l’étape ${id} ?`,
    options,
    explanation: 'Se protéger sur place reste le geste le plus sûr.',
  }
}

function choose(stepId: string, optionId: string): ScenarioChoice {
  const selectedOption = options.find((option) => option.id === optionId)

  if (!selectedOption) {
    throw new Error(`option inconnue : ${optionId}`)
  }

  return { step: buildStep(stepId), selectedOption }
}

describe('buildScenarioDebrief', () => {
  it('signale le meilleur choix de l etape', () => {
    const debrief = buildScenarioDebrief([choose('s1', 'attendre')])

    expect(debrief.entries[0]?.isBest).toBe(true)
    expect(debrief.entries[0]?.bestOption.id).toBe('attendre')
    expect(debrief.goodCount).toBe(1)
  })

  it('signale un choix perfectible et donne l option la plus sure', () => {
    const debrief = buildScenarioDebrief([choose('s1', 'appeler')])

    expect(debrief.entries[0]?.isBest).toBe(false)
    expect(debrief.entries[0]?.bestOption.label).toBe('Attendre la fin des secousses')
    expect(debrief.goodCount).toBe(0)
  })

  it('compte les bons reflexes sur l ensemble du scenario', () => {
    const debrief = buildScenarioDebrief([
      choose('s1', 'attendre'),
      choose('s2', 'sortir'),
      choose('s3', 'attendre'),
    ])

    expect(debrief.goodCount).toBe(2)
    expect(debrief.total).toBe(3)
  })

  // Deux options au meme score sont aussi sures : la seconde ne doit pas etre
  // presentee comme une erreur au pretexte qu'elle n'est pas la premiere.
  it('accepte une option a egalite de score', () => {
    const exAequo: ScenarioOption[] = [
      { id: 'a', label: 'A', score: 100 },
      { id: 'b', label: 'B', score: 100 },
    ]
    const step: ScenarioStep = {
      id: 's1',
      prompt: 'Prompt',
      options: exAequo,
      explanation: 'Explication',
    }

    const debrief = buildScenarioDebrief([
      { step, selectedOption: exAequo[1] as ScenarioOption },
    ])

    expect(debrief.entries[0]?.isBest).toBe(true)
  })

  it('renvoie un debrief vide sans choix', () => {
    expect(buildScenarioDebrief([])).toEqual({ entries: [], goodCount: 0, total: 0 })
  })
})
