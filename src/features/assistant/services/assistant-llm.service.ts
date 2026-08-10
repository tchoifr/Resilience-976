/* global fetch, AbortController, window */
const assistantEndpoint = import.meta.env.VITE_ASSISTANT_ENDPOINT ?? '/api/assistant/ask'
const REQUEST_TIMEOUT_MS = 15_000

export interface AssistantLlmResult {
  answered: boolean
  answer: string
  matchedEntryId: string | null
}

// null means a technical failure (network, timeout, server not configured,
// malformed response) — the caller should fall back to local keyword
// matching. A resolved { answered: false } is a legitimate, grounded refusal
// from the model and must not be second-guessed.
export async function askAssistantLlm(question: string): Promise<AssistantLlmResult | null> {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(assistantEndpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ question }),
      signal: controller.signal,
    })

    if (!response.ok) {
      return null
    }

    const payload = await response.json()

    if (typeof payload.answered !== 'boolean') {
      return null
    }

    return {
      answered: payload.answered,
      answer: typeof payload.answer === 'string' ? payload.answer : '',
      matchedEntryId:
        typeof payload.matchedEntryId === 'string' ? payload.matchedEntryId : null,
    }
  } catch {
    return null
  } finally {
    window.clearTimeout(timeout)
  }
}
