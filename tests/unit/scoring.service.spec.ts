import { describe, expect, it } from 'vitest'

import { calculateAssessment } from '@/features/assessment/services/scoring.service'
import type { Question } from '@/features/assessment/types/question'

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
    id: 'docs_01',
    domain: 'health_documents',
    text: 'Documents ?',
    required: true,
    weight: 2,
    criticality: 'medium',
    answers: [
      { id: 'none', label: 'Non', score: 0 },
      { id: 'partial', label: 'Partiel', score: 50 },
      { id: 'ready', label: 'Oui', score: 100 },
    ],
    actionIds: ['action_docs'],
    sourceIds: ['source_01'],
  },
]

describe('calculateAssessment', () => {
  it('retourne le meme score pour les memes reponses', () => {
    const answers = { water_01: 'ready', docs_01: 'partial' }

    expect(calculateAssessment(questions, answers)).toEqual(calculateAssessment(questions, answers))
  })

  it('place une reponse critique insuffisante dans les priorites', () => {
    const result = calculateAssessment(questions, { water_01: 'none', docs_01: 'none' })

    expect(result.priorities[0]?.questionId).toBe('water_01')
  })

  it('ignore les questions non repondues sans division par zero', () => {
    const result = calculateAssessment(questions, {})

    expect(result.globalScore).toBe(0)
    expect(result.domainScores).toEqual([])
    expect(result.priorities).toEqual([])
  })

  it('conserve les scores entre 0 et 100', () => {
    const result = calculateAssessment(questions, { water_01: 'none', docs_01: 'ready' })

    expect(result.globalScore).toBeGreaterThanOrEqual(0)
    expect(result.globalScore).toBeLessThanOrEqual(100)
    expect(result.domainScores.every((domain) => domain.score >= 0 && domain.score <= 100)).toBe(
      true,
    )
  })
})
