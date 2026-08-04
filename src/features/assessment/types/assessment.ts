import type { AssessmentDomain, Criticality } from './question'
import type { Household } from './kit'

export type AssessmentAnswers = Record<string, string>
export type ChecklistState = Record<string, boolean>

export interface CustomChecklistItem {
  id: string
  label: string
  completed: boolean
}

export interface AssessmentState {
  version: string
  currentIndex: number
  answers: AssessmentAnswers
  household: Household
  checklist: ChecklistState
  customChecklistItems: CustomChecklistItem[]
  completedAt: string | null
}

export interface DomainScore {
  id: AssessmentDomain
  label: string
  score: number
  answeredWeight: number
}

export interface PriorityCandidate {
  questionId: string
  domain: AssessmentDomain
  actionIds: string[]
  priority: number
  answerScore: number
  criticality: Criticality
}

export type ScoreLevelId = 'insufficient' | 'fragile' | 'good' | 'very_good'

export interface ScoreLevel {
  id: ScoreLevelId
  label: string
  message: string
}

export interface AssessmentResult {
  globalScore: number
  level: ScoreLevel
  domainScores: DomainScore[]
  priorities: PriorityCandidate[]
}
