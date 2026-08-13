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
    // Index du theme affiche (0 a 5), et non plus de la question : le
    // diagnostic presente un domaine par ecran. Tout changement de sens de
    // ce champ impose de monter ASSESSMENT_VERSION, sinon les parcours
    // enregistres reprennent a un index errone.
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
        // Deux ajouts dans la meme milliseconde partageaient le meme
        // identifiant : cocher ou supprimer l'un emportait l'autre.
        id: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
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
    removeCustomChecklistItem(id: string) {
      this.customChecklistItems = this.customChecklistItems.filter((entry) => entry.id !== id)
      this.persist()
    },
    reset() {
      clearAssessmentState()
      this.$reset()
    },
  },
})
