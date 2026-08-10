/* global fetch */
import { getCampaignId, getVisitorId } from '@/shared/analytics/analytics.service'

import type { VideoProgressStatus } from '../types/video'

const videoProgressSyncEnabled = import.meta.env.DEV
  ? import.meta.env.VITE_ANALYTICS_ENABLED !== 'false'
  : import.meta.env.VITE_ANALYTICS_ENABLED === 'true'
const defaultVideoProgressSyncEndpoint = import.meta.env.PROD
  ? 'https://resilience-976-analytics.onrender.com/api/video-progress'
  : '/api/video-progress'
const videoProgressSyncEndpoint =
  import.meta.env.VITE_VIDEO_PROGRESS_SYNC_ENDPOINT ?? defaultVideoProgressSyncEndpoint

export function syncVideoProgress(
  videoId: string,
  status: VideoProgressStatus,
  quizAnsweredCorrectly: boolean,
): void {
  if (!videoProgressSyncEnabled || status === 'not_started') {
    return
  }

  const payload = {
    visitorId: getVisitorId(),
    campaignId: getCampaignId(),
    videoId,
    status,
    quizAnsweredCorrectly,
  }

  void fetch(videoProgressSyncEndpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    keepalive: true,
    body: JSON.stringify(payload),
  }).catch(() => undefined)
}
