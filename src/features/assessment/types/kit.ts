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

export interface KitQuantityRule {
  // Household fields summed to get the "count" this quantity scales with
  // (e.g. adults + children + elderly for water, just pets for animal food).
  fields: HouseholdField[]
  amountPerUnit: number
  perDay: boolean
  durationDays?: number
  unit: string
  // Human-readable formula shown next to the computed amount, e.g.
  // "3 L / jour / personne x 3 jours".
  detail: string
}

export interface KitItem {
  id: string
  label: string
  category: string
  conditions: KitCondition[]
  quantityRule?: KitQuantityRule
  // Household field whose value is shown as an affected headcount for
  // conditional items that aren't quantity-scaled (e.g. "2 enfant(s)").
  countField?: HouseholdField
  sourceIds: string[]
  validationStatus: ValidationStatus
}

export interface KitItemQuantity {
  amount: number
  unit: string
  detail: string
}

export interface PersonalizedKitItem extends KitItem {
  computedQuantity: KitItemQuantity | null
  affectedCount: number | null
}
