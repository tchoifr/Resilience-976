import { describe, expect, it } from 'vitest'

import { buildAnswerSummary } from '@/features/assessment/services/answer-summary.service'
import { questions } from '@/features/assessment/services/content.service'
import type { Question } from '@/features/assessment/types/question'

function firstQuestionOf(domain: Question['domain']): Question {
  const found = questions.value.find((question) => question.domain === domain)

  if (!found) {
    throw new Error(`aucune question pour ${domain}`)
  }

  return found
}

describe('buildAnswerSummary', () => {
  it('reprend le decoupage en six themes du diagnostic', () => {
    const groups = buildAnswerSummary(questions.value, {})

    expect(groups).toHaveLength(6)
    expect(groups.map((group) => group.domain)).toEqual([
      'household',
      'housing',
      'water_food',
      'energy_communication',
      'health_documents',
      'behaviors',
    ])
  })

  it('affiche le libelle de la reponse choisie', () => {
    const question = firstQuestionOf('household')
    const option = question.answers[1]
    const groups = buildAnswerSummary(questions.value, { [question.id]: String(option?.id) })

    const item = groups
      .flatMap((group) => group.items)
      .find((entry) => entry.questionId === question.id)

    expect(item?.answerLabel).toBe(option?.label)
  })

  it('signale une question sans reponse', () => {
    const groups = buildAnswerSummary(questions.value, {})

    expect(groups.every((group) => group.items.every((item) => item.answerLabel === null))).toBe(
      true,
    )
    expect(groups.every((group) => group.answeredCount === 0)).toBe(true)
  })

  // Une reponse enregistree puis retiree du contenu ne doit pas s'afficher
  // sous son identifiant technique.
  it('traite une reponse inconnue comme une absence de reponse', () => {
    const question = firstQuestionOf('housing')
    const groups = buildAnswerSummary(questions.value, { [question.id]: 'option_supprimee' })

    const item = groups
      .flatMap((group) => group.items)
      .find((entry) => entry.questionId === question.id)

    expect(item?.answerLabel).toBeNull()
  })

  it('compte les reponses données par theme', () => {
    const question = firstQuestionOf('behaviors')
    const groups = buildAnswerSummary(questions.value, {
      [question.id]: String(question.answers[0]?.id),
    })

    const behaviors = groups.find((group) => group.domain === 'behaviors')

    expect(behaviors?.answeredCount).toBe(1)
  })
})
