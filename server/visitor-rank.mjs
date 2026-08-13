// Ordre d'arrivee d'un visiteur : son rang parmi les visiteurs distincts,
// classes par leur tout premier evenement. Le calcul est fait ici, en fonction
// pure, pour rester testable et identique quel que soit le stockage
// (base SQLite ou fichier JSONL).

/**
 * @param {{ visitorId: string, createdAt: string }[]} events
 * @param {string} visitorId
 * @returns {{ rank: number | null, total: number }}
 */
export function computeVisitorArrival(events, visitorId) {
  const firstSeen = new Map()

  for (const [index, event] of events.entries()) {
    if (!event || !event.visitorId) {
      continue
    }

    const current = firstSeen.get(event.visitorId)
    const createdAt = String(event.createdAt ?? '')

    // A egalite d'horodatage — deux evenements enregistres dans la meme
    // seconde — l'ordre de lecture departage, sinon le rang changerait d'un
    // appel a l'autre.
    if (!current || createdAt < current.createdAt) {
      firstSeen.set(event.visitorId, { createdAt, index })
    }
  }

  const total = firstSeen.size
  const target = firstSeen.get(visitorId)

  if (!target) {
    return { rank: null, total }
  }

  let rank = 1

  for (const [id, seen] of firstSeen) {
    if (id === visitorId) {
      continue
    }

    if (seen.createdAt < target.createdAt) {
      rank += 1
      continue
    }

    if (seen.createdAt === target.createdAt && seen.index < target.index) {
      rank += 1
    }
  }

  return { rank, total }
}
