import type { AssessmentAnswers } from '../types/assessment'
import type { Question } from '../types/question'
import type { ActionPlan, PrioritizedAction, RecommendationAction } from '../types/recommendation'
import { criticalityFactor } from './scoring.service'

function compact<T>(items: Array<T | undefined>): T[] {
  return items.filter((item): item is T => item !== undefined)
}

export function getRecommendedActions(
  questions: Question[],
  actions: RecommendationAction[],
  answers: AssessmentAnswers,
): PrioritizedAction[] {
  const scores = new Map<string, number>()
  const actionsById = new Map(actions.map((action) => [action.id, action]))

  for (const question of questions) {
    const option = question.answers.find((answer) => answer.id === answers[question.id])

    if (!option || option.score === 100) {
      continue
    }

    const priority =
      (100 - option.score) * question.weight * criticalityFactor[question.criticality]

    for (const actionId of question.actionIds) {
      scores.set(actionId, Math.max(scores.get(actionId) ?? 0, priority))
    }
  }

  return compact(
    [...scores.entries()].map(([id, priority]) => {
      const action = actionsById.get(id)
      return action ? { ...action, priority } : undefined
    }),
  ).sort((a, b) => b.priority - a.priority)
}

export function buildActionPlan(recommendedActions: PrioritizedAction[]): ActionPlan {
  const immediate = recommendedActions.filter((action) => action.priorityBand === 'now').slice(0, 3)
  const used = new Set(immediate.map((action) => action.id))

  if (immediate.length < 3) {
    for (const action of recommendedActions) {
      if (immediate.length >= 3) {
        break
      }

      if (!used.has(action.id)) {
        immediate.push(action)
        used.add(action.id)
      }
    }
  }

  const week = recommendedActions.filter((action) => !used.has(action.id)).slice(0, 5)

  return { immediate, week }
}
