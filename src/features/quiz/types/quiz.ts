import type { ValidationStatus } from '@/features/assessment/types/recommendation'

export type QuizRisk = 'cyclone' | 'inondation' | 'seisme' | 'mouvement_terrain'

export interface QuizQuestion {
  id: string
  risk: QuizRisk
  text: string
  options: string[]
  correctOptionIndex: number
  explanation: string
  sourceIds: string[]
  validationStatus: ValidationStatus
  revisionDate: string
}

export interface QuizSessionItem {
  question: QuizQuestion
  options: string[]
  correctOptionIndex: number
  // Maps a shuffled option position back to its original index in
  // question.options, so an answer can be recorded and later scored
  // against the (unshuffled) question bank.
  originalIndexes: number[]
}
