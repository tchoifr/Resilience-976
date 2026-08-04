import type { Household, KitCondition, KitItem } from '../types/kit'

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

export function getKitItems(items: KitItem[], household: Household): KitItem[] {
  return items.filter((item) =>
    item.conditions.every((condition) => evaluateCondition(condition, household)),
  )
}
