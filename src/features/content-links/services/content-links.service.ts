/* global fetch, AbortController, window */
import type { ContentLinksResult } from '../types/content-links'

const contentLinksEndpoint =
  import.meta.env.VITE_CONTENT_LINKS_ENDPOINT ?? '/api/assistant-liens'
const REQUEST_TIMEOUT_MS = 15_000

// null signifie un echec technique (reseau, timeout, endpoint non
// configure, reponse malformee) : l'appelant doit alors afficher le meme
// message de repli qu'un refus explicite, sans distinguer les deux cas a
// l'utilisateur.
export async function askContentLinks(question: string): Promise<ContentLinksResult | null> {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(contentLinksEndpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ question }),
      signal: controller.signal,
    })

    if (!response.ok) {
      return null
    }

    const payload = await response.json()

    if (!Array.isArray(payload.matches) || typeof payload.refused !== 'boolean') {
      return null
    }

    return {
      matches: payload.matches,
      refused: payload.refused,
    }
  } catch {
    return null
  } finally {
    window.clearTimeout(timeout)
  }
}
