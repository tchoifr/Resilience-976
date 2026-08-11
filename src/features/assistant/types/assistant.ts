import type { ValidationStatus } from '@/features/assessment/types/recommendation'

export type AssistantTopic =
  | 'household_preparation'
  | 'kit_composition'
  | 'document_protection'
  | 'power_outage'
  | 'water_outage'
  | 'cyclone_eye_behavior'
  | 'vulnerable_people_help'
  | 'return_to_normal'

export interface AssistantEntry {
  id: string
  topic: AssistantTopic
  question: string
  // Words/phrases matched against the visitor's question; not displayed.
  keywords: string[]
  answer: string
  sourceIds: string[]
  validationStatus: ValidationStatus
  revisionDate: string
}

export interface AssistantMatch {
  entry: AssistantEntry
  score: number
}

export type AssistantMessageRole = 'user' | 'assistant'

export interface AssistantMessage {
  id: string
  role: AssistantMessageRole
  text: string
  matchedEntry?: AssistantEntry
  refused?: boolean
  pending?: boolean
  // true when text is an LLM paraphrase of the matched entry rather than
  // its verbatim validated wording — shown as a small disclosure.
  viaLlm?: boolean
}
