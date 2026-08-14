import { getCampaignId, getVisitorId } from '@/shared/analytics/analytics.service'
import { postBeacon } from '@/shared/analytics/beacon.service'

const quizSyncEnabled = import.meta.env.DEV
  ? import.meta.env.VITE_ANALYTICS_ENABLED !== 'false'
  : import.meta.env.VITE_ANALYTICS_ENABLED === 'true'
const defaultQuizSyncEndpoint = import.meta.env.PROD
  ? 'https://resilience-976-analytics.onrender.com/api/quiz-results'
  : '/api/quiz-results'
const quizSyncEndpoint = import.meta.env.VITE_QUIZ_SYNC_ENDPOINT ?? defaultQuizSyncEndpoint

export interface QuizResultInput {
  score: number
  total: number
  // questionId -> selected option index (in the question's original,
  // unshuffled option order), so per-question stats can be computed later.
  answers: Record<string, number>
}

// No name is ever collected: a school, company or local authority can
// mobilize a group under the shared campaign_id without gathering any
// personal identity data.
export function syncQuizResult(input: QuizResultInput): void {
  if (!quizSyncEnabled) {
    return
  }

  const payload = {
    id: window.crypto.randomUUID(),
    visitorId: getVisitorId(),
    campaignId: getCampaignId(),
    score: input.score,
    total: input.total,
    answers: input.answers,
  }

  postBeacon(quizSyncEndpoint, payload)
}
