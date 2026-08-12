const TEXT_MAX_LENGTH = 2000

export function sanitizeTranslationText(value) {
  const text = typeof value === 'string' ? value.trim() : ''
  return text.slice(0, TEXT_MAX_LENGTH)
}

// Le swahili sert de langue pivot : le comorien (dont le shimaore est un
// dialecte) partage un lexique proche du swahili, une proximite documentee
// par la recherche (arXiv:2412.12143, transfer learning swahili -> comorien).
// Traduire en deux temps (francais -> swahili -> shimaore) donne de
// meilleurs resultats qu'une traduction directe francais -> shimaore.
export function buildTranslationSystemPrompt(glossaryEntries) {
  const glossary = glossaryEntries
    .map((entry) => `Francais : ${entry.french}\nShimaore : ${entry.shimaore}`)
    .join('\n---\n')

  return [
    "Tu es un assistant de traduction pour l'equipe editoriale du site Resilience 976 (prevention des risques a Mayotte).",
    'On te donne un texte en francais. Produis un brouillon de traduction en deux etapes :',
    '1. Traduis le texte francais en swahili.',
    "2. A partir de ce swahili, adapte-le en shimaore (dialecte comorien de Mayotte) en t'appuyant sur la proximite lexicale entre le swahili et le shimaore.",
    '',
    'Glossaire de reference (vocabulaire et style deja utilises sur le site) :',
    glossary,
    '',
    'Reponds STRICTEMENT en JSON, sans aucun texte hors du JSON, au format :',
    '{"swahili": string, "shimaore": string}',
    '',
    'Ce brouillon ne sera jamais publie sans relecture par un locuteur natif : traduis du mieux que tu peux a partir de la proximite swahili-comorien, sans fabriquer de certitude.',
  ].join('\n')
}

// Ne fait jamais confiance au JSON du modele sans validation : les deux
// champs doivent etre des chaines non vides, sinon le brouillon est
// considere comme un echec plutot que d'exposer un resultat partiel.
export function parseTranslationCompletion(rawContent) {
  let parsed

  try {
    parsed = JSON.parse(rawContent)
  } catch {
    return null
  }

  const swahili = typeof parsed.swahili === 'string' ? parsed.swahili.trim() : ''
  const shimaore = typeof parsed.shimaore === 'string' ? parsed.shimaore.trim() : ''

  if (!swahili || !shimaore) {
    return null
  }

  return {
    swahili: swahili.slice(0, TEXT_MAX_LENGTH),
    shimaore: shimaore.slice(0, TEXT_MAX_LENGTH),
  }
}
