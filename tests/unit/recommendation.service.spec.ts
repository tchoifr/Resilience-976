import { describe, expect, it } from 'vitest'

import {
  buildActionPlan,
  getRecommendedActions,
} from '@/features/assessment/services/recommendation.service'
import type { Question } from '@/features/assessment/types/question'
import type { RecommendationAction } from '@/features/assessment/types/recommendation'

const questions: Question[] = [
  {
    id: 'water_01',
    domain: 'water_food',
    text: 'Reserve d eau ?',
    required: true,
    weight: 5,
    criticality: 'critical',
    answers: [
      { id: 'none', label: 'Non', score: 0 },
      { id: 'ready', label: 'Oui', score: 100 },
    ],
    actionIds: ['action_water'],
    sourceIds: ['source_01'],
  },
  {
    id: 'water_02',
    domain: 'water_food',
    text: 'Rotation ?',
    required: true,
    weight: 3,
    criticality: 'medium',
    answers: [
      { id: 'none', label: 'Non', score: 0 },
      { id: 'ready', label: 'Oui', score: 100 },
    ],
    actionIds: ['action_water'],
    sourceIds: ['source_01'],
  },
]

const actions: RecommendationAction[] = [
  {
    id: 'action_water',
    title: 'Preparer eau',
    priorityBand: 'now',
    effort: 'medium',
    why: 'Utile',
    instructions: ['Verifier'],
    sourceIds: ['source_01'],
    validationStatus: 'to_validate',
  },
]

describe('recommendation.service', () => {
  it('deduplique les actions en conservant la priorite la plus forte', () => {
    const recommended = getRecommendedActions(questions, actions, {
      water_01: 'none',
      water_02: 'none',
    })

    expect(recommended).toHaveLength(1)
    expect(recommended[0]?.priority).toBe(1000)
  })

  it('construit un plan avec priorites immediates et actions semaine', () => {
    const recommended = getRecommendedActions(questions, actions, {
      water_01: 'none',
    })
    const plan = buildActionPlan(recommended)

    expect(plan.immediate).toHaveLength(1)
    expect(plan.week).toHaveLength(0)
  })
})
