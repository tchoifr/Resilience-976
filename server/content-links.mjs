const QUESTION_MAX_LENGTH = 300
const MAX_MATCHES = 6

export function sanitizeContentLinksQuestion(value) {
  const text = typeof value === 'string' ? value.trim() : ''
  return text.slice(0, QUESTION_MAX_LENGTH)
}

function humanizeRisk(risk) {
  const spaced = risk.replace(/_/g, ' ')
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

// Chaque type de contenu a une seule forme d'url possible dans ce catalogue
// (une page generique pour ressources/quiz, une page par slug/id pour
// videos/scenarios) : c'est ce qui permet au serveur de reconstruire une
// url fiable a partir du seul identifiant choisi par le modele.
export function buildContentIndex(videos, scenarios, resources, quizQuestions) {
  const entries = []

  for (const video of videos) {
    entries.push({
      id: video.id,
      type: 'video',
      title: video.title,
      riskOrDomain: video.risk,
      url: `/videos/${video.slug}`,
    })
  }

  for (const scenario of scenarios) {
    entries.push({
      id: scenario.id,
      type: 'scenario',
      title: scenario.title,
      riskOrDomain: scenario.domain,
      url: `/mises-en-situation/${scenario.id}`,
    })
  }

  for (const resource of resources) {
    entries.push({
      id: resource.id,
      type: 'resource',
      title: resource.title,
      riskOrDomain: resource.domain,
      url: '/ressources',
    })
  }

  const seenRisks = new Set()

  for (const question of quizQuestions) {
    if (seenRisks.has(question.risk)) {
      continue
    }

    seenRisks.add(question.risk)
    entries.push({
      id: `quiz_${question.risk}`,
      type: 'quiz',
      title: `Quiz : ${humanizeRisk(question.risk)}`,
      riskOrDomain: question.risk,
      url: '/quiz',
    })
  }

  return { entries, byId: new Map(entries.map((entry) => [entry.id, entry])) }
}

export function buildContentLinksSystemPrompt(index) {
  const catalogue = index.entries
    .map((entry) => `[${entry.id}] (${entry.type}) ${entry.title} — ${entry.riskOrDomain}`)
    .join('\n')

  return [
    "Tu es l'assistant de recherche de contenu du site public Resilience 976 (preparation aux risques a Mayotte).",
    "Ta seule tache est de selectionner, parmi le catalogue ci-dessous, les entrees qui repondent le mieux a la question posee. Tu ne rediges jamais de nouvelle reponse et n'ajoutes aucune information hors de ce catalogue.",
    '',
    'Catalogue disponible (format : [identifiant] (type) titre — sujet) :',
    catalogue,
    '',
    'Reponds STRICTEMENT en JSON, sans aucun texte hors du JSON, au format :',
    '{"matchedIds": string[], "refused": boolean}',
    '',
    'Regles :',
    '- "matchedIds" contient uniquement des identifiants exacts du catalogue ci-dessus (entre crochets), du plus au moins pertinent, au maximum 6.',
    "- Chaque identifiant est repris seul, sans les crochets et sans le reste de la ligne. Pour l'entree \"[VID-01] (video) Preparer son logement — Cyclone\", il faut ecrire exactement : {\"matchedIds\": [\"VID-01\"], \"refused\": false}",
    '- "refused" est true si aucune entree du catalogue ne correspond clairement a la question ; dans ce cas "matchedIds" doit etre un tableau vide.',
  ].join('\n')
}

// Le modele recopie souvent la ligne complete du catalogue
// ("[VID-01] (video) Preparer son logement — Cyclone") au lieu du seul
// identifiant : on reprend alors ce qui est entre crochets plutot que de
// perdre une correspondance pourtant correcte.
function normalizeMatchedId(rawId) {
  const bracketed = rawId.match(/^\s*\[([^\]]+)\]/)
  return (bracketed ? bracketed[1] : rawId).trim()
}

// Ne fait jamais confiance au JSON du modele tel quel : chaque id est
// verifie contre l'index reel avant d'etre renvoye au client, sinon un
// identifiant invente par le modele produirait un lien casse.
export function parseContentLinksCompletion(rawContent, index) {
  let parsed

  try {
    parsed = JSON.parse(rawContent)
  } catch {
    return { matchedIds: [], refused: true }
  }

  const rawIds = Array.isArray(parsed.matchedIds) ? parsed.matchedIds : []
  const matchedIds = []

  for (const rawId of rawIds) {
    if (typeof rawId !== 'string') {
      continue
    }

    const id = normalizeMatchedId(rawId)

    // Un meme contenu peut arriver deux fois sous ses deux formes.
    if (!index.byId.has(id) || matchedIds.includes(id)) {
      continue
    }

    matchedIds.push(id)

    if (matchedIds.length === MAX_MATCHES) {
      break
    }
  }

  return { matchedIds, refused: parsed.refused === true }
}
