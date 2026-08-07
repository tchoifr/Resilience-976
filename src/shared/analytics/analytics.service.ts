export type AnalyticsEventName =
  | 'page_view'
  | 'diagnostic_started'
  | 'diagnostic_completed'
  | 'result_viewed'
  | 'pdf_downloaded'
  | 'checklist_opened'
  | 'kit_opened'
  | 'technical_error'

export interface AnalyticsEvent {
  name: AnalyticsEventName
  version: string
  path: string
  visitorId: string
  campaignId: string
}

const analyticsEnabled = import.meta.env.DEV
  ? import.meta.env.VITE_ANALYTICS_ENABLED !== 'false'
  : import.meta.env.VITE_ANALYTICS_ENABLED === 'true'
const defaultAnalyticsEndpoint = import.meta.env.PROD
  ? 'https://resilience-976-analytics.onrender.com/api/events'
  : '/api/events'
const analyticsEndpoint = import.meta.env.VITE_ANALYTICS_ENDPOINT ?? defaultAnalyticsEndpoint
const visitorStorageKey = 'resilience976.analytics.visitorId'

function getVisitorId(): string {
  const existingVisitorId = window.localStorage.getItem(visitorStorageKey)

  if (existingVisitorId) {
    return existingVisitorId
  }

  const visitorId = window.crypto.randomUUID()
  window.localStorage.setItem(visitorStorageKey, visitorId)
  return visitorId
}

function getCampaignId(): string {
  const params = new URLSearchParams(window.location.search)
  return params.get('campaign_id') ?? params.get('utm_campaign') ?? 'DIRECT'
}

export function trackEvent(name: AnalyticsEventName): void {
  if (!analyticsEnabled) {
    return
  }

  const event: AnalyticsEvent = {
    name,
    version: import.meta.env.VITE_ASSESSMENT_VERSION ?? '1.0.0',
    path: window.location.pathname,
    visitorId: getVisitorId(),
    campaignId: getCampaignId(),
  }

  window.dispatchEvent(new CustomEvent('resilience976:analytics', { detail: event }))

  void fetch(analyticsEndpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    keepalive: true,
    body: JSON.stringify(event),
  }).catch(() => undefined)
}
