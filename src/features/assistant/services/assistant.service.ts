import type { AssistantEntry, AssistantMatch } from '../types/assistant'

// Deliberately not an LLM: matching a question against a validated bank of
// keyword-tagged answers means the assistant can never answer outside its
// documented scope or invent something not already reviewed as content.
const STOPWORDS = new Set([
  'le', 'la', 'les', 'de', 'des', 'du', 'un', 'une', 'et', 'ou', 'est',
  'pour', 'avec', 'dans', 'sur', 'que', 'qui', 'quoi', 'comment', 'pourquoi',
  'a', 'au', 'aux', 'ce', 'cette', 'ces', 'mon', 'ma', 'mes', 'je', 'tu',
  'il', 'elle', 'nous', 'vous', 'ils', 'elles', 'en', 'se', 'sa', 'son',
  'ses', 'faire', 'fais', 'dois', 'faut', 'si', 'apres', 'ne', 'pas', 'y',
])

const MIN_MATCHES = 1
const COMBINING_DIACRITICS = /[̀-ͯ]/g
// NFD only decomposes precomposed accented letters (é -> e + ́); ligatures
// like œ/æ have no canonical decomposition and must be expanded by hand,
// otherwise "œil" and "oeil" normalize to different, unmatchable tokens.
const LIGATURES: Record<string, string> = { œ: 'oe', æ: 'ae' }

function expandLigatures(text: string): string {
  return text.replace(/[œæ]/g, (ligature) => LIGATURES[ligature] ?? ligature)
}

function normalize(text: string): string {
  return expandLigatures(text.toLowerCase())
    .normalize('NFD')
    .replace(COMBINING_DIACRITICS, '')
    .replace(/[^a-z0-9\s]/g, ' ')
}

function tokenize(text: string): string[] {
  return normalize(text)
    .split(/\s+/)
    .filter((token) => token.length > 1 && !STOPWORDS.has(token))
}

export function findBestMatch(query: string, entries: AssistantEntry[]): AssistantMatch | null {
  const queryTokens = new Set(tokenize(query))

  if (queryTokens.size === 0) {
    return null
  }

  let best: AssistantMatch | null = null

  for (const entry of entries) {
    const entryTokens = new Set(entry.keywords.map((keyword) => normalize(keyword)))
    let matches = 0

    for (const token of queryTokens) {
      if (entryTokens.has(token)) {
        matches += 1
      }
    }

    if (matches >= MIN_MATCHES && (!best || matches > best.score)) {
      best = { entry, score: matches }
    }
  }

  return best
}
