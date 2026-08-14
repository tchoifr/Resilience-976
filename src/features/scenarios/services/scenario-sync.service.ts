import { getCampaignId, getVisitorId } from '@/shared/analytics/analytics.service'
import { postBeacon } from '@/shared/analytics/beacon.service'

const scenarioSyncEnabled = import.meta.env.DEV
  ? import.meta.env.VITE_ANALYTICS_ENABLED !== 'false'
  : import.meta.env.VITE_ANALYTICS_ENABLED === 'true'
const defaultScenarioSyncEndpoint = import.meta.env.PROD
  ? 'https://resilience-976-analytics.onrender.com/api/scenario-results'
  : '/api/scenario-results'
const scenarioSyncEndpoint =
  import.meta.env.VITE_SCENARIO_SYNC_ENDPOINT ?? defaultScenarioSyncEndpoint

export interface ScenarioResultInput {
  scenarioId: string
  score: number
  // stepId -> chosen option id, so per-step stats can be computed later.
  choices: Record<string, string>
}

export function syncScenarioResult(input: ScenarioResultInput): void {
  if (!scenarioSyncEnabled) {
    return
  }

  const payload = {
    id: window.crypto.randomUUID(),
    visitorId: getVisitorId(),
    campaignId: getCampaignId(),
    scenarioId: input.scenarioId,
    score: input.score,
    choices: input.choices,
  }

  postBeacon(scenarioSyncEndpoint, payload)
}
