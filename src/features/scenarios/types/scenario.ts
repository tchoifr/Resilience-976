import type { AssessmentDomain } from '@/features/assessment/types/question'
import type { ValidationStatus } from '@/features/assessment/types/recommendation'

export interface ScenarioOption {
  id: string
  label: string
  score: number
}

export interface ScenarioStep {
  id: string
  prompt: string
  options: ScenarioOption[]
  // Explains the safest behavior for this step; only shown in the debrief
  // once the whole scenario is finished, not as an immediate correction.
  explanation: string
}

export interface Scenario {
  id: string
  title: string
  intro: string
  domain: AssessmentDomain
  // Links back to an existing micro-formation capsule (VideoCapsule.id) so
  // the debrief can point to it for more detail.
  videoId: string
  steps: ScenarioStep[]
  sourceIds: string[]
  validationStatus: ValidationStatus
  revisionDate: string
}

export interface ScenarioSessionStep {
  step: ScenarioStep
  options: ScenarioOption[]
}

export interface ScenarioChoice {
  step: ScenarioStep
  selectedOption: ScenarioOption
}
