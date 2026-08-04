import { defineStore } from 'pinia'

import type { AssessmentState } from '../types/assessment'
import type { Household, HouseholdField } from '../types/kit'
import {
  ASSESSMENT_VERSION,
  clearAssessmentState,
  loadAssessmentState,
  saveAssessmentState,
} from '../services/storage.service'

export function createInitialAssessmentState(): AssessmentState {
  return {
    version: ASSESSMENT_VERSION,
    currentIndex: 0,
    answers: {},
    household: {
      adults: 1,
      children: 0,
      elderly: 0,
      pets: 0,
      specialNeeds: false,
    },
    checklist: {},
    customChecklistItems: [],
    completedAt: null,
  }
}

export const useAssessmentStore = defineStore('assessment', {
  state: createInitialAssessmentState,
  getters: {
    answeredCount: (state) => Object.keys(state.answers).length,
    hasAnswers: (state) => Object.keys(state.answers).length > 0,
  },
  actions: {
    restore() {
      const saved = loadAssessmentState()

      if (!saved) {
        return
      }

      if (saved.version !== ASSESSMENT_VERSION) {
        clearAssessmentState()
        return
      }

      this.$patch(saved)
    },
    persist() {
      saveAssessmentState(this.$state)
    },
    answer(questionId: string, answerId: string) {
      this.answers[questionId] = answerId
      this.persist()
    },
    setCurrentIndex(index: number) {
      this.currentIndex = Math.max(0, index)
      this.persist()
    },
    setHouseholdField(field: HouseholdField, value: Household[HouseholdField]) {
      if (typeof this.household[field] === 'number') {
        this.household[field] = Math.max(0, Number(value)) as never
      } else {
        this.household[field] = Boolean(value) as never
      }

      this.persist()
    },
    complete() {
      this.completedAt = new Date().toISOString()
      this.persist()
    },
    toggleChecklistItem(id: string) {
      this.checklist[id] = !this.checklist[id]
      this.persist()
    },
    addCustomChecklistItem(label: string) {
      const trimmed = label.trim()

      if (!trimmed) {
        return
      }

      this.customChecklistItems.push({
        id: `custom_${Date.now()}`,
        label: trimmed,
        completed: false,
      })
      this.persist()
    },
    toggleCustomChecklistItem(id: string) {
      const item = this.customChecklistItems.find((entry) => entry.id === id)

      if (!item) {
        return
      }

      item.completed = !item.completed
      this.persist()
    },
    reset() {
      clearAssessmentState()
      this.$reset()
    },
  },
})
