export type PriorityBand = 'now' | 'week' | 'later'
export type Effort = 'low' | 'medium' | 'high'
export type ValidationStatus = 'draft' | 'to_validate' | 'validated'

export interface RecommendationAction {
  id: string
  title: string
  priorityBand: PriorityBand
  effort: Effort
  why: string
  instructions: string[]
  sourceIds: string[]
  validationStatus: ValidationStatus
}

export interface PrioritizedAction extends RecommendationAction {
  priority: number
}

export interface ActionPlan {
  immediate: PrioritizedAction[]
  week: PrioritizedAction[]
}
