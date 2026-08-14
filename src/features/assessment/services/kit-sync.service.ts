import { getCampaignId, getVisitorId } from '@/shared/analytics/analytics.service'
import { postBeacon } from '@/shared/analytics/beacon.service'

import type { Household } from '../types/kit'

const kitSyncEnabled = import.meta.env.DEV
  ? import.meta.env.VITE_ANALYTICS_ENABLED !== 'false'
  : import.meta.env.VITE_ANALYTICS_ENABLED === 'true'
const defaultKitSyncEndpoint = import.meta.env.PROD
  ? 'https://resilience-976-analytics.onrender.com/api/kit-profiles'
  : '/api/kit-profiles'
const kitSyncEndpoint = import.meta.env.VITE_KIT_SYNC_ENDPOINT ?? defaultKitSyncEndpoint

// One evolving profile per visitor (not one row per change): the backend
// upserts on visitorId so this always reflects the current household.
export function syncKitProfile(household: Household): void {
  if (!kitSyncEnabled) {
    return
  }

  const payload = {
    visitorId: getVisitorId(),
    campaignId: getCampaignId(),
    adults: household.adults,
    children: household.children,
    elderly: household.elderly,
    pets: household.pets,
    specialNeeds: household.specialNeeds,
  }

  postBeacon(kitSyncEndpoint, payload)
}
