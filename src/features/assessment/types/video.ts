import type { AssessmentDomain } from './question'
import type { ValidationStatus } from './recommendation'

export type VideoProgressStatus = 'not_started' | 'started' | 'completed'

export interface VideoSubtitle {
  language: string
  label: string
  url: string
}

export interface VideoQuiz {
  question: string
  options: string[]
  correctOptionIndex: number
  explanation: string
}

export interface VideoCapsule {
  id: string
  slug: string
  title: string
  summary: string
  duration: string
  level: string
  risk: string
  audience: string
  domain: AssessmentDomain
  videoUrl: string
  externalVideoUrl?: string
  externalVideoLabel?: string
  thumbnailUrl: string
  subtitles: VideoSubtitle[]
  transcript: string[]
  quiz: VideoQuiz
  recommendedActionId: string
  resourceId: string
  sourceIds: string[]
  revisionDate: string
  language: string
  status: ValidationStatus | 'published' | 'archived'
  order: number
}

export interface VideoProgressEntry {
  status: VideoProgressStatus
  lastWatchedAt: string
  quizAnsweredCorrectly: boolean
}

export type VideoProgressState = Record<string, VideoProgressEntry>
