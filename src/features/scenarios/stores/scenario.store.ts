import { defineStore } from 'pinia'

import { buildScenarioSession } from '../services/scenario.service'
import type { Scenario, ScenarioChoice, ScenarioSessionStep } from '../types/scenario'

export type ScenarioStatus = 'idle' | 'playing' | 'debrief'

interface ScenarioStoreState {
  scenario: Scenario | null
  session: ScenarioSessionStep[]
  currentIndex: number
  selectedOptionId: string | null
  choices: ScenarioChoice[]
  status: ScenarioStatus
}

function createInitialState(): ScenarioStoreState {
  return {
    scenario: null,
    session: [],
    currentIndex: 0,
    selectedOptionId: null,
    choices: [],
    status: 'idle',
  }
}

export const useScenarioStore = defineStore('scenario', {
  state: createInitialState,
  getters: {
    currentStep: (state): ScenarioSessionStep | undefined => state.session[state.currentIndex],
    total: (state): number => state.session.length,
    isLastStep: (state): boolean => state.currentIndex >= state.session.length - 1,
    score: (state): number => {
      if (state.choices.length === 0) {
        return 0
      }

      const sum = state.choices.reduce((total, choice) => total + choice.selectedOption.score, 0)
      return Math.round(sum / state.choices.length)
    },
  },
  actions: {
    start(scenario: Scenario) {
      this.scenario = scenario
      this.session = buildScenarioSession(scenario)
      this.currentIndex = 0
      this.selectedOptionId = null
      this.choices = []
      this.status = this.session.length > 0 ? 'playing' : 'idle'
    },
    select(optionId: string) {
      this.selectedOptionId = optionId
    },
    confirm() {
      const step = this.currentStep
      const selectedOption = step?.options.find((option) => option.id === this.selectedOptionId)

      if (!step || !selectedOption) {
        return
      }

      this.choices.push({ step: step.step, selectedOption })
      this.selectedOptionId = null

      if (this.isLastStep) {
        this.status = 'debrief'
        return
      }

      this.currentIndex += 1
    },
    reset() {
      this.$reset()
    },
  },
})
