import type {
  AssessmentAnswers,
  AssessmentResult,
  PriorityCandidate,
  ScoreLevel,
} from '../types/assessment'
import type { AssessmentDomain, Criticality, Question } from '../types/question'
import { getDomainLabel, translate } from '@/shared/i18n/i18n.service'

export const criticalityFactor: Record<Criticality, number> = {
  low: 1,
  medium: 1.25,
  high: 1.6,
  critical: 2,
}

export function getScoreLevel(score: number): ScoreLevel {
  if (score <= 39) {
    return {
      id: 'insufficient',
      label: translate('scoreLevels.insufficient.label'),
      message: translate('scoreLevels.insufficient.message'),
    }
  }

  if (score <= 59) {
    return {
      id: 'fragile',
      label: translate('scoreLevels.fragile.label'),
      message: translate('scoreLevels.fragile.message'),
    }
  }

  if (score <= 79) {
    return {
      id: 'good',
      label: translate('scoreLevels.good.label'),
      message: translate('scoreLevels.good.message'),
    }
  }

  return {
    id: 'very_good',
    label: translate('scoreLevels.very_good.label'),
    message: translate('scoreLevels.very_good.message'),
  }
}

// Reprend les memes seuils que getScoreLevel, mais ne renvoie que
// l'identifiant : la jauge d'un domaine a besoin d'une classe CSS, pas du
// libelle ni du message associes au niveau global.
export function getDomainLevelId(
  score: number,
): 'insufficient' | 'fragile' | 'good' | 'very_good' {
  if (score <= 39) {
    return 'insufficient'
  }

  if (score <= 59) {
    return 'fragile'
  }

  if (score <= 79) {
    return 'good'
  }

  return 'very_good'
}

// L'ordre des domaines est fixe et volontaire : il va du plus concret
// (« mon foyer ») au plus abstrait (« comportements »), pour que le visiteur
// entre dans le diagnostic par ce qu'il connait le mieux.
export const DOMAIN_ORDER = [
  'household',
  'housing',
  'water_food',
  'energy_communication',
  'health_documents',
  'behaviors',
] as const

export interface QuestionGroup {
  domain: AssessmentDomain
  questions: Question[]
}

export function groupQuestionsByDomain(questions: Question[]): QuestionGroup[] {
  return DOMAIN_ORDER.map((domain) => ({
    domain,
    questions: questions.filter((question) => question.domain === domain),
  })).filter((group) => group.questions.length > 0)
}

export function calculateAssessment(
  questions: Question[],
  answers: AssessmentAnswers,
): AssessmentResult {
  const domains = new Map<Question['domain'], { sum: number; weight: number }>()
  const priorities: PriorityCandidate[] = []

  for (const question of questions) {
    const answerId = answers[question.id]
    const option = question.answers.find((answer) => answer.id === answerId)

    if (!option) {
      continue
    }

    const weighted = option.score * question.weight
    const current = domains.get(question.domain) ?? { sum: 0, weight: 0 }
    current.sum += weighted
    current.weight += question.weight
    domains.set(question.domain, current)

    if (option.score < 100) {
      priorities.push({
        questionId: question.id,
        domain: question.domain,
        actionIds: question.actionIds,
        priority: (100 - option.score) * question.weight * criticalityFactor[question.criticality],
        answerScore: option.score,
        criticality: question.criticality,
      })
    }
  }

  const domainScores = [...domains.entries()].map(([id, value]) => ({
    id,
    label: getDomainLabel(id),
    score: Math.round(value.sum / value.weight),
    answeredWeight: value.weight,
  }))

  const globalScore =
    domainScores.length === 0
      ? 0
      : Math.round(
          domainScores.reduce((sum, domain) => sum + domain.score, 0) / domainScores.length,
        )

  return {
    globalScore,
    level: getScoreLevel(globalScore),
    domainScores,
    priorities: priorities.sort((a, b) => b.priority - a.priority),
  }
}
