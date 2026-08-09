/* global fetch */
import {
  getCampaignId,
  getVisitorId,
} from '@/shared/analytics/analytics.service'

const diagnosticSyncEnabled = import.meta.env.DEV
  ? import.meta.env.VITE_ANALYTICS_ENABLED !== 'false'
  : import.meta.env.VITE_ANALYTICS_ENABLED === 'true'
const defaultDiagnosticSyncEndpoint = import.meta.env.PROD
  ? 'https://resilience-976-analytics.onrender.com/api/diagnostic-responses'
  : '/api/diagnostic-responses'
const diagnosticSyncEndpoint =
  import.meta.env.VITE_DIAGNOSTIC_SYNC_ENDPOINT ?? defaultDiagnosticSyncEndpoint

export function syncDiagnosticResponses(answers: Record<string, string>): void {
  if (!diagnosticSyncEnabled) {
    return
  }

  const payload = {
    id: window.crypto.randomUUID(),
    visitorId: getVisitorId(),
    campaignId: getCampaignId(),
    version: import.meta.env.VITE_ASSESSMENT_VERSION ?? '1.0.0',
    answers,
  }

  void fetch(diagnosticSyncEndpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    keepalive: true,
    body: JSON.stringify(payload),
  }).catch(() => undefined)
}
