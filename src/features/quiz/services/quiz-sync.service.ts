/* global fetch */
import { getCampaignId, getVisitorId } from '@/shared/analytics/analytics.service'

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
  }

  void fetch(quizSyncEndpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    keepalive: true,
    body: JSON.stringify(payload),
  }).catch(() => undefined)
}
