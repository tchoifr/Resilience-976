import { afterEach, describe, expect, it } from 'vitest'

import {
  actions,
  actionsById,
  kitItems,
  questions,
  quizQuestions,
  resources,
  scenarios,
  sources,
  sourcesById,
  videosById,
} from '@/features/assessment/services/content.service'
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
