import { computed, readonly, ref } from 'vue'

import { frMessages, type AppMessages } from './locales/fr'

type MessageValue = string | MessageTree
type MessageTree = { readonly [key: string]: MessageValue }
type MessageParams = Record<string, string | number>
type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends string ? string : DeepPartial<T[K]>
}

export interface LocaleDefinition {
  code: string
  label: string
  messages: DeepPartial<AppMessages>
}

const FALLBACK_LOCALE = 'fr'
const STORAGE_KEY = 'resilience-976-locale'

const localeRegistry = ref<Record<string, LocaleDefinition>>({
  fr: {
    code: 'fr',
    label: frMessages.language.french,
    messages: frMessages,
  },
})
const currentLocale = ref(FALLBACK_LOCALE)

export const availableLocales = computed(() =>
  Object.values(localeRegistry.value).map((locale) => ({
    code: locale.code,
    label: locale.label,
  })),
)

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function mergeMessages<T extends Record<string, unknown>>(
  fallback: T,
  override?: DeepPartial<T>,
): T {
  const merged: Record<string, unknown> = { ...fallback }

  if (!override) {
    return merged as T
  }

  for (const [key, value] of Object.entries(override)) {
    const fallbackValue = fallback[key]

    if (isRecord(fallbackValue) && isRecord(value)) {
      merged[key] = mergeMessages(fallbackValue, value as DeepPartial<typeof fallbackValue>)
    } else if (value !== undefined) {
      merged[key] = value
    }
  }

  return merged as T
}

function getMergedMessages(localeCode: string): AppMessages {
  const locale = localeRegistry.value[localeCode]

  if (!locale || localeCode === FALLBACK_LOCALE) {
    return frMessages
  }

  return mergeMessages(frMessages, locale.messages)
}

function resolveMessage(messages: MessageTree, key: string): unknown {
  return key.split('.').reduce<unknown>((current, segment) => {
    if (!isRecord(current)) {
      return undefined
    }

    return current[segment]
  }, messages)
}

function interpolate(template: string, params: MessageParams = {}): string {
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, key: string) => {
    const value = params[key]
    return value === undefined ? match : String(value)
  })
}

function persistLocale(localeCode: string): void {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(STORAGE_KEY, localeCode)
}

function readStoredLocale(): string | null {
  if (typeof window === 'undefined') {
    return null
  }

  return window.localStorage.getItem(STORAGE_KEY)
}

function updateDocumentLanguage(localeCode: string): void {
  if (typeof document === 'undefined') {
    return
  }

  document.documentElement.lang = localeCode
}

export function registerLocale(locale: LocaleDefinition): void {
  localeRegistry.value = {
    ...localeRegistry.value,
    [locale.code]: locale,
  }
}

export function setLocale(localeCode: string): void {
  const nextLocale = localeRegistry.value[localeCode] ? localeCode : FALLBACK_LOCALE
  currentLocale.value = nextLocale
  updateDocumentLanguage(nextLocale)
  persistLocale(nextLocale)
}

export function initializeLocale(): void {
  setLocale(readStoredLocale() ?? FALLBACK_LOCALE)
}

export function translate(key: string, params?: MessageParams): string {
  const activeMessages = getMergedMessages(currentLocale.value)
  const activeMessage = resolveMessage(activeMessages, key)
  const fallbackMessage = resolveMessage(frMessages, key)
  const message = typeof activeMessage === 'string' ? activeMessage : fallbackMessage

  return typeof message === 'string' ? interpolate(message, params) : key
}

export function getDomainLabel(domain: string): string {
  return translate(`domains.${domain}`)
}

export function getKitCategoryLabel(category: string): string {
  return translate(`kit.categories.${category}`)
}

export function useI18n() {
  return {
    locale: readonly(currentLocale),
    availableLocales,
    setLocale,
    t: translate,
  }
}
