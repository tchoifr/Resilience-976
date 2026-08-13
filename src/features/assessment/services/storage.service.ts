import type { AssessmentState } from '../types/assessment'

// 1.1.0 : `currentIndex` designe un theme (0 a 5) et non plus une question
// (0 a 23). Relire un etat 1.0.0 rouvrirait le diagnostic sur un theme
// arbitraire ou hors bornes, d'ou la montee de version.
export const ASSESSMENT_VERSION = '1.1.0'
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
