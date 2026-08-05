import { afterEach, describe, expect, it } from 'vitest'

import {
  actions,
  actionsById,
  kitItems,
  questions,
  resources,
  sources,
  sourcesById,
} from '@/features/assessment/services/content.service'
import { registerLocale, setLocale } from '@/shared/i18n/i18n.service'
import { swbMessages } from '@/shared/i18n/locales/swb'

describe('contenus metier', () => {
  afterEach(() => {
    setLocale('fr')
  })

  it('bascule les contenus metier en shimaore quand la langue swb est active', () => {
    registerLocale({ code: 'swb', label: swbMessages.language.shimaore, messages: swbMessages })
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

  it('garde les recommandations sensibles en validation metier', () => {
    expect(actions.value.every((action) => action.validationStatus === 'to_validate')).toBe(true)
    expect(kitItems.value.every((item) => item.validationStatus === 'to_validate')).toBe(true)
  })
})
