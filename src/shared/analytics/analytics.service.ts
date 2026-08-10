export type AnalyticsEventName =
  | 'page_view'
  | 'action_plan_opened'
  | 'certificate_generated'
  | 'checklist_progress'
  | 'diagnostic_started'
  | 'diagnostic_completed'
  | 'feedback_submitted'
  | 'result_viewed'
  | 'pdf_downloaded'
  | 'checklist_opened'
  | 'kit_opened'
  | 'source_opened'
  | 'technical_error'
  | 'quiz_started'
  | 'quiz_completed'
  | 'quiz_attestation_generated'
  | 'scenario_started'
  | 'scenario_completed'
  | 'video_attestation_generated'

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
const analyticsEndpoint =
  import.meta.env.VITE_ANALYTICS_ENDPOINT ?? defaultAnalyticsEndpoint
const googleAnalyticsId = import.meta.env.VITE_GOOGLE_ANALYTICS_ID
const googleAnalyticsEnabled =
  analyticsEnabled &&
  import.meta.env.VITE_GOOGLE_ANALYTICS_ENABLED === 'true' &&
  typeof googleAnalyticsId === 'string' &&
  googleAnalyticsId.length > 0
const visitorStorageKey = 'resilience976.analytics.visitorId'
let googleAnalyticsLoaded = false

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
  }
}

export function getVisitorId(): string {
  const existingVisitorId = window.localStorage.getItem(visitorStorageKey)

  if (existingVisitorId) {
    return existingVisitorId
  }

  const visitorId = window.crypto.randomUUID()
  window.localStorage.setItem(visitorStorageKey, visitorId)
  return visitorId
}

export function getCampaignId(): string {
  const params = new URLSearchParams(window.location.search)
  return params.get('campaign_id') ?? params.get('utm_campaign') ?? 'DIRECT'
}

function loadGoogleAnalytics(): void {
  if (!googleAnalyticsEnabled || googleAnalyticsLoaded) {
    return
  }

  googleAnalyticsLoaded = true
  window.dataLayer = window.dataLayer ?? []
  window.gtag = (...args: unknown[]) => window.dataLayer?.push(args)
  window.gtag('js', new Date())
  window.gtag('config', googleAnalyticsId, {
    anonymize_ip: true,
    send_page_view: false,
  })

  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(googleAnalyticsId)}`
  document.head.append(script)
}

function forwardToGoogleAnalytics(event: AnalyticsEvent): void {
  if (!googleAnalyticsEnabled) {
    return
  }

  loadGoogleAnalytics()
  window.gtag?.('event', event.name, {
    app_version: event.version,
    campaign_id: event.campaignId,
    event_category: 'resilience_976',
    page_path: event.path,
  })
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

  window.dispatchEvent(
    new CustomEvent('resilience976:analytics', { detail: event }),
  )

  void fetch(analyticsEndpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    keepalive: true,
    body: JSON.stringify(event),
  }).catch(() => undefined)

  forwardToGoogleAnalytics(event)
}
