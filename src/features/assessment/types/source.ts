import type { AssessmentDomain } from './question'
import type { ValidationStatus } from './recommendation'

export interface Source {
  id: string
  label: string
  organization: string
  url: string
  consultedAt: string
  validationStatus: ValidationStatus
}

export interface Resource {
  id: string
  title: string
  domain: AssessmentDomain
  description: string
  sourceIds: string[]
  validationStatus: ValidationStatus
}
