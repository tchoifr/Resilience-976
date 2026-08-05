export type Criticality = 'low' | 'medium' | 'high' | 'critical'

export type AssessmentDomain =
  'household' | 'housing' | 'water_food' | 'energy_communication' | 'health_documents' | 'behaviors'

export interface AnswerOption {
  id: string
  label: string
  score: number
}

export interface Question {
  id: string
  domain: AssessmentDomain
  text: string
  help?: string
  required: boolean
  weight: number
  criticality: Criticality
  answers: AnswerOption[]
  actionIds: string[]
  sourceIds: string[]
}
