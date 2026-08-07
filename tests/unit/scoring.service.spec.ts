import { describe, expect, it } from 'vitest'

import {
  calculateAssessment,
  criticalityFactor,
  getScoreLevel,
} from '@/features/assessment/services/scoring.service'
import type { Criticality } from '@/features/assessment/types/question'
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

function buildQuestion(
  id: string,
  overrides: Partial<Question> & Pick<Question, 'domain'>,
): Question {
  return {
    id,
    domain: overrides.domain,
    text: `${id} ?`,
    required: true,
    weight: 1,
    criticality: 'medium',
    answers: [
      { id: 'zero', label: 'Zero', score: 0 },
      { id: 'half', label: 'Half', score: 50 },
      { id: 'full', label: 'Full', score: 100 },
    ],
    actionIds: [`action_${id}`],
    sourceIds: ['source_01'],
    ...overrides,
  }
}

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

  it('calcule un score de domaine avec les poids des questions', () => {
    const weightedQuestions = [
      buildQuestion('q_low_weight', { domain: 'housing', weight: 1 }),
      buildQuestion('q_high_weight', { domain: 'housing', weight: 3 }),
    ]

    const result = calculateAssessment(weightedQuestions, {
      q_low_weight: 'zero',
      q_high_weight: 'full',
    })

    expect(result.domainScores).toEqual([
      expect.objectContaining({
        id: 'housing',
        score: 75,
        answeredWeight: 4,
      }),
    ])
  })

  it('arrondit les scores de domaine au point le plus proche', () => {
    const result = calculateAssessment(
      [
        buildQuestion('q_a', { domain: 'behaviors' }),
        buildQuestion('q_b', { domain: 'behaviors' }),
        buildQuestion('q_c', { domain: 'behaviors' }),
      ],
      { q_a: 'zero', q_b: 'half', q_c: 'half' },
    )

    expect(result.domainScores[0]?.score).toBe(33)
  })

  it('calcule le score global comme moyenne non ponderee des domaines repondus', () => {
    const result = calculateAssessment(
      [
        buildQuestion('housing_01', { domain: 'housing', weight: 5 }),
        buildQuestion('behavior_01', { domain: 'behaviors', weight: 1 }),
      ],
      { housing_01: 'full', behavior_01: 'zero' },
    )

    expect(result.globalScore).toBe(50)
  })

  it('ignore une reponse inconnue sans creer de score ni de priorite', () => {
    const result = calculateAssessment(questions, { water_01: 'unknown' })

    expect(result.globalScore).toBe(0)
    expect(result.domainScores).toEqual([])
    expect(result.priorities).toEqual([])
  })

  it('ignore uniquement les reponses inconnues et conserve les reponses valides', () => {
    const result = calculateAssessment(questions, { water_01: 'unknown', docs_01: 'partial' })

    expect(result.globalScore).toBe(50)
    expect(result.domainScores).toHaveLength(1)
    expect(result.domainScores[0]).toEqual(
      expect.objectContaining({
        id: 'health_documents',
        score: 50,
      }),
    )
  })

  it('ne cree pas de priorite pour une reponse au score maximum', () => {
    const result = calculateAssessment(questions, { water_01: 'ready', docs_01: 'ready' })

    expect(result.priorities).toEqual([])
  })

  it('conserve les metadonnees de la question dans une priorite', () => {
    const result = calculateAssessment(questions, { docs_01: 'partial' })

    expect(result.priorities[0]).toEqual(
      expect.objectContaining({
        questionId: 'docs_01',
        domain: 'health_documents',
        actionIds: ['action_docs'],
        answerScore: 50,
        criticality: 'medium',
      }),
    )
  })

  it('accepte une question faible sans action associee', () => {
    const result = calculateAssessment(
      [buildQuestion('no_action', { domain: 'energy_communication', actionIds: [] })],
      { no_action: 'zero' },
    )

    expect(result.priorities[0]).toEqual(
      expect.objectContaining({
        questionId: 'no_action',
        actionIds: [],
      }),
    )
  })

  it('calcule la priorite avec score restant, poids et criticite', () => {
    const result = calculateAssessment(questions, { docs_01: 'partial' })

    expect(result.priorities[0]?.priority).toBe(125)
  })

  it('reduire le score restant reduit aussi la priorite', () => {
    const result = calculateAssessment(
      [buildQuestion('risk_01', { domain: 'housing', weight: 2, criticality: 'high' })],
      { risk_01: 'half' },
    )

    expect(result.priorities[0]?.priority).toBe(160)
  })

  it.each([
    ['low', 100],
    ['medium', 125],
    ['high', 160],
    ['critical', 200],
  ] satisfies Array<[Criticality, number]>)(
    'applique le facteur de criticite %s aux priorites',
    (criticality, expectedPriority) => {
      const result = calculateAssessment(
        [buildQuestion('risk_01', { domain: 'water_food', criticality, weight: 1 })],
        { risk_01: 'zero' },
      )

      expect(result.priorities[0]?.priority).toBe(expectedPriority)
    },
  )

  it('trie les priorites par urgence decroissante', () => {
    const result = calculateAssessment(
      [
        buildQuestion('low_risk', {
          domain: 'household',
          criticality: 'low',
          weight: 1,
        }),
        buildQuestion('critical_risk', {
          domain: 'water_food',
          criticality: 'critical',
          weight: 2,
        }),
        buildQuestion('medium_risk', {
          domain: 'health_documents',
          criticality: 'medium',
          weight: 1,
        }),
      ],
      {
        low_risk: 'zero',
        critical_risk: 'half',
        medium_risk: 'zero',
      },
    )

    expect(result.priorities.map((priority) => priority.questionId)).toEqual([
      'critical_risk',
      'medium_risk',
      'low_risk',
    ])
  })

  it('expose les facteurs de criticite attendus par le bareme', () => {
    expect(criticalityFactor).toEqual({
      low: 1,
      medium: 1.25,
      high: 1.6,
      critical: 2,
    })
  })

  it('renseigne un libelle de domaine lisible', () => {
    const result = calculateAssessment([buildQuestion('home_01', { domain: 'household' })], {
      home_01: 'full',
    })

    expect(result.domainScores[0]?.label).toBe('Mon foyer')
  })
})

describe('getScoreLevel', () => {
  it.each([
    [0, 'insufficient'],
    [39, 'insufficient'],
    [40, 'fragile'],
    [59, 'fragile'],
    [60, 'good'],
    [79, 'good'],
    [80, 'very_good'],
    [100, 'very_good'],
  ] as const)('classe le score %i dans le niveau %s', (score, expectedLevel) => {
    expect(getScoreLevel(score).id).toBe(expectedLevel)
  })

  it('renvoie un libelle et un message pour chaque niveau', () => {
    const levels = [0, 40, 60, 80].map((score) => getScoreLevel(score))

    expect(levels.every((level) => level.label.length > 0 && level.message.length > 0)).toBe(true)
  })
})
