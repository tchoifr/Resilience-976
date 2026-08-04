import type { AssessmentState } from '../types/assessment'

export const ASSESSMENT_VERSION = '1.0.0'
export const STORAGE_KEY = `resilience976-assessment:${ASSESSMENT_VERSION}`

function canUseLocalStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

export function saveAssessmentState(state: AssessmentState): void {
  if (!canUseLocalStorage()) {
    return
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function loadAssessmentState(): AssessmentState | null {
  if (!canUseLocalStorage()) {
    return null
  }

  const raw = window.localStorage.getItem(STORAGE_KEY)

  if (!raw) {
    return null
  }

  try {
    return JSON.parse(raw) as AssessmentState
  } catch {
    clearAssessmentState()
    return null
  }
}

export function clearAssessmentState(): void {
  if (!canUseLocalStorage()) {
    return
  }

  window.localStorage.removeItem(STORAGE_KEY)
}
