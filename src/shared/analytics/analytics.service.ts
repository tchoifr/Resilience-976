export type AnalyticsEventName =
  | 'diagnostic_started'
  | 'diagnostic_completed'
  | 'result_viewed'
  | 'pdf_downloaded'
  | 'checklist_opened'
  | 'kit_opened'

export interface AnalyticsEvent {
  name: AnalyticsEventName
  version: string
  path: string
}

const analyticsEnabled = import.meta.env.VITE_ANALYTICS_ENABLED === 'true'

export function trackEvent(name: AnalyticsEventName): void {
  if (!analyticsEnabled) {
    return
  }

  const event: AnalyticsEvent = {
    name,
    version: import.meta.env.VITE_ASSESSMENT_VERSION ?? '1.0.0',
    path: window.location.pathname,
  }

  window.dispatchEvent(new CustomEvent('resilience976:analytics', { detail: event }))
}
