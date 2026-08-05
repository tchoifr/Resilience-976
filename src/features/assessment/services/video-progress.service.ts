import type { VideoProgressEntry, VideoProgressState, VideoProgressStatus } from '../types/video'

export const VIDEO_PROGRESS_VERSION = '1.0.0'
export const VIDEO_PROGRESS_STORAGE_KEY = `resilience976-videos:${VIDEO_PROGRESS_VERSION}`

function canUseLocalStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

export function loadVideoProgress(): VideoProgressState {
  if (!canUseLocalStorage()) {
    return {}
  }

  const raw = window.localStorage.getItem(VIDEO_PROGRESS_STORAGE_KEY)

  if (!raw) {
    return {}
  }

  try {
    return JSON.parse(raw) as VideoProgressState
  } catch {
    window.localStorage.removeItem(VIDEO_PROGRESS_STORAGE_KEY)
    return {}
  }
}

export function saveVideoProgress(state: VideoProgressState): void {
  if (!canUseLocalStorage()) {
    return
  }

  window.localStorage.setItem(VIDEO_PROGRESS_STORAGE_KEY, JSON.stringify(state))
}

export function getVideoProgress(videoId: string): VideoProgressEntry {
  const progress = loadVideoProgress()

  return (
    progress[videoId] ?? {
      status: 'not_started',
      lastWatchedAt: '',
      quizAnsweredCorrectly: false,
    }
  )
}

export function updateVideoProgress(
  videoId: string,
  status: VideoProgressStatus,
  quizAnsweredCorrectly = false,
): VideoProgressEntry {
  const progress = loadVideoProgress()
  const previous = progress[videoId]
  const nextEntry: VideoProgressEntry = {
    status,
    lastWatchedAt: new Date().toISOString(),
    quizAnsweredCorrectly: quizAnsweredCorrectly || previous?.quizAnsweredCorrectly || false,
  }

  progress[videoId] = nextEntry
  saveVideoProgress(progress)

  return nextEntry
}

export function clearVideoProgress(): void {
  if (!canUseLocalStorage()) {
    return
  }

  window.localStorage.removeItem(VIDEO_PROGRESS_STORAGE_KEY)
}
