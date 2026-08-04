import { afterEach, describe, expect, it } from 'vitest'

import {
  ASSESSMENT_VERSION,
  clearAssessmentState,
  loadAssessmentState,
  saveAssessmentState,
} from '@/features/assessment/services/storage.service'
import type { AssessmentState } from '@/features/assessment/types/assessment'

const state: AssessmentState = {
  version: ASSESSMENT_VERSION,
  currentIndex: 1,
  answers: { water_01: 'ready' },
  household: {
    adults: 2,
    children: 1,
    elderly: 0,
    pets: 0,
    specialNeeds: false,
  },
  checklist: { action_water: true },
  customChecklistItems: [],
  completedAt: null,
}

describe('storage.service', () => {
  afterEach(() => {
    clearAssessmentState()
  })

  it('sauvegarde et restaure les donnees locales', () => {
    saveAssessmentState(state)

    expect(loadAssessmentState()).toEqual(state)
  })

  it('efface les donnees locales', () => {
    saveAssessmentState(state)
    clearAssessmentState()

    expect(loadAssessmentState()).toBeNull()
  })
})
