import type { ValidationStatus } from './recommendation'

export type HouseholdField = 'adults' | 'children' | 'elderly' | 'pets' | 'specialNeeds'
export type ConditionOperator = '>' | '>=' | '<' | '<=' | '=' | '!='

export interface Household {
  adults: number
  children: number
  elderly: number
  pets: number
  specialNeeds: boolean
}

export interface KitCondition {
  field: HouseholdField
  operator: ConditionOperator
  value: number | boolean
}

export interface KitItem {
  id: string
  label: string
  category: string
  conditions: KitCondition[]
  sourceIds: string[]
  validationStatus: ValidationStatus
}
