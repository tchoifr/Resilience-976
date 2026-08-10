import { describe, expect, it } from 'vitest'

import { drawQuizSession } from '@/features/quiz/services/quiz.service'
import type { QuizQuestion, QuizRisk } from '@/features/quiz/types/quiz'

const RISKS: QuizRisk[] = ['cyclone', 'inondation', 'seisme', 'mouvement_terrain']

function buildQuestions(perRisk: number): QuizQuestion[] {
  return RISKS.flatMap((risk) =>
    Array.from({ length: perRisk }, (_, index) => ({
      id: `${risk}_${index}`,
      risk,
      text: `${risk} question ${index}`,
      options: ['correct', 'wrong-a', 'wrong-b'],
      correctOptionIndex: 0,
      explanation: 'because',
      sourceIds: ['source_01'],
      validationStatus: 'to_validate' as const,
      revisionDate: '2026-08-10',
    })),
  )
}

describe('drawQuizSession', () => {
  it('tire un nombre egal de questions par risque', () => {
    const session = drawQuizSession(buildQuestions(5), 2)

    for (const risk of RISKS) {
      expect(session.filter((item) => item.question.risk === risk)).toHaveLength(2)
    }
    expect(session).toHaveLength(RISKS.length * 2)
  })

  it('ne tire jamais plus de questions que ce qui existe pour un risque', () => {
    const session = drawQuizSession(buildQuestions(1), 3)

    expect(session).toHaveLength(RISKS.length)
  })

  it('conserve la bonne reponse apres melange des options', () => {
    const session = drawQuizSession(buildQuestions(2), 2)

    for (const item of session) {
      expect(item.options[item.correctOptionIndex]).toBe('correct')
      expect(item.options).toHaveLength(item.question.options.length)
      expect(new Set(item.options)).toEqual(new Set(item.question.options))
    }
  })

  it('retourne un tableau vide si aucune question n’est fournie', () => {
    expect(drawQuizSession([], 2)).toEqual([])
  })
})
