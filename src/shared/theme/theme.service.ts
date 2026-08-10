import { readonly, ref } from 'vue'

export type ThemeMode = 'light' | 'dark'

const STORAGE_KEY = 'resilience-976-theme'
const DARK_MEDIA_QUERY = '(prefers-color-scheme: dark)'

const currentTheme = ref<ThemeMode>('light')

function isThemeMode(value: unknown): value is ThemeMode {
  return value === 'light' || value === 'dark'
}

function persistTheme(theme: ThemeMode): void {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(STORAGE_KEY, theme)
}

function readStoredTheme(): ThemeMode | null {
  if (typeof window === 'undefined') {
    return null
  }

  const stored = window.localStorage.getItem(STORAGE_KEY)
  return isThemeMode(stored) ? stored : null
}

function readPreferredTheme(): ThemeMode {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return 'light'
  }

  return window.matchMedia(DARK_MEDIA_QUERY).matches ? 'dark' : 'light'
}

function applyTheme(theme: ThemeMode): void {
  if (typeof document === 'undefined') {
    return
  }

  document.documentElement.dataset.theme = theme
}

export function setTheme(theme: ThemeMode): void {
  currentTheme.value = theme
  applyTheme(theme)
  persistTheme(theme)
}

export function toggleTheme(): void {
  setTheme(currentTheme.value === 'dark' ? 'light' : 'dark')
}

// Explicit choice (persisted) wins over the OS preference, which is only
// used the first time a visitor shows up with nothing stored yet.
export function initializeTheme(): void {
  setTheme(readStoredTheme() ?? readPreferredTheme())
}

export function useTheme() {
  return {
    theme: readonly(currentTheme),
    setTheme,
    toggleTheme,
  }
}
