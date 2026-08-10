import { afterEach, describe, expect, it } from 'vitest'

import {
  actions,
  actionsById,
  assistantEntries,
  kitItems,
  questions,
  quizQuestions,
  resources,
  scenarios,
  sources,
  sourcesById,
  videosById,
} from '@/features/assessment/services/content.service'
import { findBestMatch } from '@/features/assistant/services/assistant.service'
import { registerLocale, setLocale } from '@/shared/i18n/i18n.service'
import { swbMessages } from '@/shared/i18n/locales/swb'

describe('contenus metier', () => {
  afterEach(() => {
    setLocale('fr')
  })

  it('bascule les contenus metier en shimaore quand la langue swb est active', () => {
    registerLocale({
      code: 'swb',
      label: swbMessages.language.shimaore,
      messages: swbMessages,
    })
    setLocale('swb')

    expect(questions.value[0]?.id).toBe('household_01')
    expect(questions.value[0]?.text).toBe(
      'Eba haho dagoni haho ujua wantru wahifagna hayi harimwa trongo yahidjiri?',
    )
    expect(questions.value).toHaveLength(24)

    // La traduction shimaore du quiz et des mises en situation est un
    // brouillon non relu par un locuteur natif (cf. commit) : on ne peut
    // pas verifier la langue ici, seulement que la structure reste valide
    // (memes ids/scores/sources que la version francaise).
    expect(quizQuestions.value).toHaveLength(16)
    for (const question of quizQuestions.value) {
      expect(question.correctOptionIndex).toBeLessThan(question.options.length)

      for (const sourceId of question.sourceIds) {
        expect(
          sourcesById.value.has(sourceId),
          `${question.id} (swb) reference source inconnue ${sourceId}`,
        ).toBe(true)
      }
    }

    expect(scenarios.value).toHaveLength(5)
    for (const scenario of scenarios.value) {
      for (const sourceId of scenario.sourceIds) {
        expect(
          sourcesById.value.has(sourceId),
          `${scenario.id} (swb) reference source inconnue ${sourceId}`,
        ).toBe(true)
      }

      for (const step of scenario.steps) {
        const maxScore = Math.max(...step.options.map((option) => option.score))
        expect(maxScore, `${scenario.id}/${step.id} (swb) n'a pas d'option a 100`).toBe(100)
      }
    }
  })

  it('charge une base MVP complete', () => {
    expect(questions.value).toHaveLength(24)
    expect(actions.value.length).toBeGreaterThanOrEqual(18)
    expect(kitItems.value.length).toBeGreaterThanOrEqual(10)
    expect(resources.value.length).toBeGreaterThanOrEqual(4)
    expect(sources.value.length).toBeGreaterThanOrEqual(4)
  })

  it('couvre les quatre risques naturels promis dans les ressources', () => {
    expect(resources.value.map((resource) => resource.id)).toEqual(
      expect.arrayContaining([
        'resource_cyclone',
        'resource_inondation',
        'resource_seisme',
        'resource_mouvement_terrain',
      ]),
    )
  })

  it('relie chaque question a des actions et sources existantes', () => {
    for (const question of questions.value) {
      for (const actionId of question.actionIds) {
        expect(
          actionsById.value.has(actionId),
          `${question.id} reference action inconnue ${actionId}`,
        ).toBe(true)
      }

      for (const sourceId of question.sourceIds) {
        expect(
          sourcesById.value.has(sourceId),
          `${question.id} reference source inconnue ${sourceId}`,
        ).toBe(true)
      }
    }
  })

  it('relie chaque action et element de kit a des sources existantes', () => {
    for (const action of actions.value) {
      expect(action.instructions.length).toBeGreaterThan(0)
      expect(action.sourceIds.length).toBeGreaterThan(0)

      for (const sourceId of action.sourceIds) {
        expect(
          sourcesById.value.has(sourceId),
          `${action.id} reference source inconnue ${sourceId}`,
        ).toBe(true)
      }
    }

    for (const item of kitItems.value) {
      expect(item.sourceIds.length).toBeGreaterThan(0)

      for (const sourceId of item.sourceIds) {
        expect(
          sourcesById.value.has(sourceId),
          `${item.id} reference source inconnue ${sourceId}`,
        ).toBe(true)
      }
    }
  })

  it('couvre les quatre risques du quiz avec des questions et sources valides', () => {
    const risks = ['cyclone', 'inondation', 'seisme', 'mouvement_terrain']

    for (const risk of risks) {
      expect(
        quizQuestions.value.filter((question) => question.risk === risk).length,
      ).toBeGreaterThanOrEqual(2)
    }

    for (const question of quizQuestions.value) {
      expect(question.correctOptionIndex).toBeLessThan(question.options.length)

      for (const sourceId of question.sourceIds) {
        expect(
          sourcesById.value.has(sourceId),
          `${question.id} reference source inconnue ${sourceId}`,
        ).toBe(true)
      }
    }
  })

  it('relie chaque mise en situation a une capsule et des sources existantes', () => {
    expect(scenarios.value.length).toBeGreaterThanOrEqual(1)

    for (const scenario of scenarios.value) {
      expect(
        videosById.value.has(scenario.videoId),
        `${scenario.id} reference capsule inconnue ${scenario.videoId}`,
      ).toBe(true)

      for (const sourceId of scenario.sourceIds) {
        expect(
          sourcesById.value.has(sourceId),
          `${scenario.id} reference source inconnue ${sourceId}`,
        ).toBe(true)
      }

      for (const step of scenario.steps) {
        const maxScore = Math.max(...step.options.map((option) => option.score))
        expect(
          maxScore,
          `${scenario.id}/${step.id} n'a pas d'option a 100`,
        ).toBe(100)
      }
    }
  })

  it('relie chaque entree de l’assistant a des sources existantes', () => {
    expect(assistantEntries.value.length).toBeGreaterThanOrEqual(1)

    for (const entry of assistantEntries.value) {
      for (const sourceId of entry.sourceIds) {
        expect(
          sourcesById.value.has(sourceId),
          `${entry.id} reference source inconnue ${sourceId}`,
        ).toBe(true)
      }
    }
  })

  it('route la question canonique de chaque entree de l’assistant vers elle-meme', () => {
    for (const entry of assistantEntries.value) {
      const match = findBestMatch(entry.question, assistantEntries.value)

      expect(
        match?.entry.id,
        `la question canonique de ${entry.id} ne matche pas cette meme entree`,
      ).toBe(entry.id)
    }
  })

  it('garde les recommandations sensibles en validation metier', () => {
    expect(
      actions.value.every(
        (action) => action.validationStatus === 'to_validate',
      ),
    ).toBe(true)
    expect(
      kitItems.value.every((item) => item.validationStatus === 'to_validate'),
    ).toBe(true)
  })
})
