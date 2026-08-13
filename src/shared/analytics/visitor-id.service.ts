// L'identifiant est genere et stocke sous forme d'UUID canonique
// (8-4-4-4-12). Il est affiche sans tirets, plus court a lire et a recopier ;
// la recherche du tableau de bord doit donc savoir remettre les tirets, sinon
// un visiteur qui recopie ce qu'il voit ne retrouve rien.
const HEX_32 = /^[0-9a-f]{32}$/i

export function formatVisitorIdForDisplay(visitorId: string): string {
  return visitorId.replace(/-/g, '')
}

export function normalizeVisitorId(input: string): string {
  const trimmed = input.trim()
  const compact = trimmed.replace(/-/g, '')

  if (!HEX_32.test(compact)) {
    // Identifiant d'une autre forme (jeu de donnees importe, saisie
    // partielle) : le renvoyer tel quel plutot que d'inventer des tirets.
    return trimmed
  }

  const lower = compact.toLowerCase()

  return [
    lower.slice(0, 8),
    lower.slice(8, 12),
    lower.slice(12, 16),
    lower.slice(16, 20),
    lower.slice(20),
  ].join('-')
}
