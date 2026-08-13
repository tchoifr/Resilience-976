import { describe, expect, it } from 'vitest'

import { questions } from '@/features/assessment/services/content.service'
import {
  DOMAIN_ORDER,
  groupQuestionsByDomain,
} from '@/features/assessment/services/scoring.service'

describe('groupQuestionsByDomain', () => {
  it('produit un groupe par domaine, dans l ordre fixe', () => {
    const groups = groupQuestionsByDomain(questions.value)

    expect(groups.map((group) => group.domain)).toEqual([...DOMAIN_ORDER])
  })

  it('ne perd aucune question', () => {
    const groups = groupQuestionsByDomain(questions.value)
    const total = groups.reduce((sum, group) => sum + group.questions.length, 0)

    expect(total).toBe(questions.value.length)
  })

  it('place chaque question dans le groupe de son domaine', () => {
    for (const group of groupQuestionsByDomain(questions.value)) {
      for (const question of group.questions) {
        expect(question.domain).toBe(group.domain)
      }
    }
  })

  // Un domaine ajoute aux donnees sans etre declare dans DOMAIN_ORDER
  // disparaitrait silencieusement du diagnostic.
  it('ignore un domaine absent des donnees plutot que de produire un groupe vide', () => {
    const groups = groupQuestionsByDomain(
      questions.value.filter((question) => question.domain !== 'behaviors'),
    )

    expect(groups.map((group) => group.domain)).not.toContain('behaviors')
  })
})
