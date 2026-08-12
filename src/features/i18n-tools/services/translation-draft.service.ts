/* global fetch, AbortController, window */
const translationDraftEndpoint =
  import.meta.env.VITE_TRANSLATION_DRAFT_ENDPOINT ?? '/api/i18n/draft-shimaore'
const REQUEST_TIMEOUT_MS = 20_000

export interface TranslationDraftResult {
  swahili: string
  shimaore: string
}

export type TranslationDraftOutcome =
  | { ok: true; result: TranslationDraftResult }
  | { ok: false; errorCode: string }

export async function requestTranslationDraft(text: string): Promise<TranslationDraftOutcome> {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(translationDraftEndpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text }),
      signal: controller.signal,
    })

    const payload = await response.json().catch(() => null)

    if (!response.ok) {
      return {
        ok: false,
        errorCode: typeof payload?.error === 'string' ? payload.error : 'network_error',
      }
    }

    if (typeof payload?.swahili !== 'string' || typeof payload?.shimaore !== 'string') {
      return { ok: false, errorCode: 'malformed_response' }
    }

    return { ok: true, result: { swahili: payload.swahili, shimaore: payload.shimaore } }
  } catch {
    return { ok: false, errorCode: 'network_error' }
  } finally {
    window.clearTimeout(timeout)
  }
}
