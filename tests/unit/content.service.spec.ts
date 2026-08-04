import { describe, expect, it } from 'vitest'

import {
  actions,
  actionsById,
  kitItems,
  questions,
  resources,
  sources,
  sourcesById,
} from '@/features/assessment/services/content.service'

describe('contenus metier', () => {
  it('charge une base MVP complete', () => {
    expect(questions).toHaveLength(24)
    expect(actions.length).toBeGreaterThanOrEqual(18)
    expect(kitItems.length).toBeGreaterThanOrEqual(10)
    expect(resources.length).toBeGreaterThanOrEqual(4)
    expect(sources.length).toBeGreaterThanOrEqual(4)
  })

  it('relie chaque question a des actions et sources existantes', () => {
    for (const question of questions) {
      for (const actionId of question.actionIds) {
        expect(
          actionsById.has(actionId),
          `${question.id} reference action inconnue ${actionId}`,
        ).toBe(true)
      }

      for (const sourceId of question.sourceIds) {
        expect(
          sourcesById.has(sourceId),
          `${question.id} reference source inconnue ${sourceId}`,
        ).toBe(true)
      }
    }
  })

  it('relie chaque action et element de kit a des sources existantes', () => {
    for (const action of actions) {
      expect(action.instructions.length).toBeGreaterThan(0)
      expect(action.sourceIds.length).toBeGreaterThan(0)

      for (const sourceId of action.sourceIds) {
        expect(
          sourcesById.has(sourceId),
          `${action.id} reference source inconnue ${sourceId}`,
        ).toBe(true)
      }
    }

    for (const item of kitItems) {
      expect(item.sourceIds.length).toBeGreaterThan(0)

      for (const sourceId of item.sourceIds) {
        expect(sourcesById.has(sourceId), `${item.id} reference source inconnue ${sourceId}`).toBe(
          true,
        )
      }
    }
  })

  it('garde les recommandations sensibles en validation metier', () => {
    expect(actions.every((action) => action.validationStatus === 'to_validate')).toBe(true)
    expect(kitItems.every((item) => item.validationStatus === 'to_validate')).toBe(true)
  })
})
