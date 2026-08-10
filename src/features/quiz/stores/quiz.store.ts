import { defineStore } from 'pinia'

import { drawQuizSession } from '../services/quiz.service'
import type { QuizQuestion, QuizSessionItem } from '../types/quiz'

export type QuizStatus = 'idle' | 'playing' | 'finished'

interface QuizStoreState {
  session: QuizSessionItem[]
  currentIndex: number
  selectedIndex: number | null
  isAnswered: boolean
  results: boolean[]
  answers: Record<string, number>
  status: QuizStatus
}

function createInitialState(): QuizStoreState {
  return {
    session: [],
    currentIndex: 0,
    selectedIndex: null,
    isAnswered: false,
    results: [],
    answers: {},
    status: 'idle',
  }
}

export const useQuizStore = defineStore('quiz', {
  state: createInitialState,
  getters: {
    currentItem: (state): QuizSessionItem | undefined => state.session[state.currentIndex],
    total: (state): number => state.session.length,
    answeredCount: (state): number => state.results.length,
    score: (state): number => state.results.filter(Boolean).length,
    isLastQuestion: (state): boolean => state.currentIndex >= state.session.length - 1,
    lastAnswerCorrect: (state): boolean => state.results[state.currentIndex] ?? false,
  },
  actions: {
    start(questions: QuizQuestion[], questionsPerRisk?: number) {
      this.session = drawQuizSession(questions, questionsPerRisk)
      this.currentIndex = 0
      this.selectedIndex = null
      this.isAnswered = false
      this.results = []
      this.answers = {}
      this.status = this.session.length > 0 ? 'playing' : 'idle'
    },
    select(optionIndex: number) {
      if (this.isAnswered) {
        return
      }

      this.selectedIndex = optionIndex
    },
    submit() {
      if (this.isAnswered || this.selectedIndex === null || !this.currentItem) {
        return
      }

      const originalIndex = this.currentItem.originalIndexes[this.selectedIndex]

      this.isAnswered = true
      this.results[this.currentIndex] = this.selectedIndex === this.currentItem.correctOptionIndex

      if (originalIndex !== undefined) {
        this.answers[this.currentItem.question.id] = originalIndex
      }
    },
    nextQuestion() {
      if (!this.isAnswered) {
        return
      }

      if (this.isLastQuestion) {
        this.status = 'finished'
        return
      }

      this.currentIndex += 1
      this.selectedIndex = null
      this.isAnswered = false
    },
    reset() {
      this.$reset()
    },
  },
})
