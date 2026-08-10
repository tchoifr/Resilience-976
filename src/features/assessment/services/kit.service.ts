import type {
  Household,
  KitCondition,
  KitItem,
  KitItemQuantity,
  KitQuantityRule,
  PersonalizedKitItem,
} from '../types/kit'

function evaluateCondition(condition: KitCondition, household: Household): boolean {
  const current = household[condition.field]

  switch (condition.operator) {
    case '>':
      return Number(current) > Number(condition.value)
    case '>=':
      return Number(current) >= Number(condition.value)
    case '<':
      return Number(current) < Number(condition.value)
    case '<=':
      return Number(current) <= Number(condition.value)
    case '=':
      return current === condition.value
    case '!=':
      return current !== condition.value
  }
}

function sumFields(fields: KitQuantityRule['fields'], household: Household): number {
  return fields.reduce((sum, field) => sum + Number(household[field]), 0)
}

export function computeQuantity(rule: KitQuantityRule, household: Household): KitItemQuantity {
  const count = sumFields(rule.fields, household)
  const perUnit = rule.perDay ? rule.amountPerUnit * (rule.durationDays ?? 3) : rule.amountPerUnit

  return {
    amount: Math.round(count * perUnit * 10) / 10,
    unit: rule.unit,
    detail: rule.detail,
  }
}

export function getKitItems(items: KitItem[], household: Household): PersonalizedKitItem[] {
  return items
    .filter((item) => item.conditions.every((condition) => evaluateCondition(condition, household)))
    .map((item) => ({
      ...item,
      computedQuantity: item.quantityRule ? computeQuantity(item.quantityRule, household) : null,
      affectedCount: item.countField ? Number(household[item.countField]) : null,
    }))
}
