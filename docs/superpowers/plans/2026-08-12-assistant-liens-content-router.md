# Assistant de liens vers le contenu du site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Donner aux visiteurs un outil qui, à partir d'une question libre ("les risques par rapport aux séismes"), renvoie des liens directs vers le contenu déjà validé du site (vidéos, mises en situation, ressources, quiz) — jamais une réponse rédigée.

**Architecture:** Nouvel endpoint `POST /api/assistant-liens` dans `server/analytics-server.mjs`, avec sa propre plomberie Hugging Face (`HF_TOKEN`, rate limiting dédié) construite directement sur cette branche — `feature/chatbot-ia` part de `main` et ne dépend d'aucune autre branche non fusionnée. La logique de construction d'index et de validation de la réponse LLM est extraite dans un module serveur séparé et testable, `server/content-links.mjs`. Le LLM sélectionne des identifiants dans un index construit à partir des fichiers de données existants ; le serveur résout et valide ces identifiants contre l'index réel avant de renvoyer des URLs. Nouvelle page `ContentLinksView.vue` sur une route publique non ajoutée à `AppHeader.vue`.

**Tech Stack:** Node.js (`server/analytics-server.mjs`, ESM), Vue 3 + TypeScript (frontend), Vitest (tests unitaires), Playwright (test e2e), Hugging Face Inference Providers (tier gratuit).

## Global Constraints

- La page n'est jamais ajoutée à `AppHeader.vue` — accessible uniquement par URL directe (`/assistant-liens`), même trajectoire initiale que `/assistant-documentaire`.
- Le LLM ne renvoie jamais une URL directement : il sélectionne des identifiants dans l'index, le serveur résout ces identifiants vers les vraies URLs et rejette silencieusement tout identifiant inconnu.
- Limite de débit dédiée (compteur distinct de tout autre outil), même mécanisme que les endpoints LLM existants du projet (par IP, fenêtre glissante).
- Maximum 6 résultats renvoyés par réponse.
- Plafond de question en entrée : 300 caractères.
- Types de contenu indexés : vidéos (`/videos/:slug`), mises en situation (`/mises-en-situation/:id`), ressources (`/ressources`, lien générique — pas de lien profond par fiche), quiz (`/quiz`, lien générique, un seul repère par risque).
- Hors périmètre explicite : intégration data.gouv.fr/Géorisques, authentification, lien profond par ressource individuelle, ajout au menu principal.

---

### Task 1: Module serveur `content-links.mjs` (fonctions pures testables)

**Files:**
- Create: `server/content-links.mjs`
- Test: `tests/unit/content-links.spec.ts`

**Interfaces:**
- Produces: `sanitizeContentLinksQuestion(value: unknown): string`, `buildContentIndex(videos: Array<{id, slug, title, risk}>, scenarios: Array<{id, title, domain}>, resources: Array<{id, title, domain}>, quizQuestions: Array<{risk}>): {entries: ContentLinkEntry[], byId: Map<string, ContentLinkEntry>}`, `buildContentLinksSystemPrompt(index: {entries: ContentLinkEntry[]}): string`, `parseContentLinksCompletion(rawContent: string, index: {byId: Map<string, ContentLinkEntry>}): {matchedIds: string[], refused: boolean}` — tous exportés depuis `server/content-links.mjs`, consommés par Task 2. `ContentLinkEntry` est `{id: string, type: 'video'|'scenario'|'resource'|'quiz', title: string, riskOrDomain: string, url: string}`.

- [ ] **Step 1: Write the failing tests**

Créer `tests/unit/content-links.spec.ts` :

```ts
import { describe, expect, it } from 'vitest'

import {
  buildContentIndex,
  buildContentLinksSystemPrompt,
  parseContentLinksCompletion,
  sanitizeContentLinksQuestion,
} from '../../server/content-links.mjs'

describe('content-links.mjs', () => {
  describe('sanitizeContentLinksQuestion', () => {
    it('trims whitespace', () => {
      expect(sanitizeContentLinksQuestion('  les séismes  ')).toBe('les séismes')
    })

    it('truncates to 300 characters', () => {
      const long = 'a'.repeat(400)
      expect(sanitizeContentLinksQuestion(long)).toHaveLength(300)
    })

    it('returns an empty string for non-string input', () => {
      expect(sanitizeContentLinksQuestion(undefined)).toBe('')
      expect(sanitizeContentLinksQuestion(42)).toBe('')
    })
  })

  const videos = [
    {
      id: 'VID-01',
      slug: 'preparer-son-logement',
      title: 'Préparer son logement',
      risk: 'Cyclone et fortes pluies',
    },
  ]
  const scenarios = [
    { id: 'scenario_cyclone', title: 'Une alerte cyclone est déclenchée', domain: 'behaviors' },
  ]
  const resources = [{ id: 'resource_seisme', title: 'Séisme', domain: 'behaviors' }]
  const quizQuestions = [
    { risk: 'cyclone' },
    { risk: 'cyclone' },
    { risk: 'mouvement_terrain' },
  ]

  describe('buildContentIndex', () => {
    it('builds one entry per video, with the /videos/:slug url', () => {
      const index = buildContentIndex(videos, [], [], [])
      expect(index.entries).toEqual([
        {
          id: 'VID-01',
          type: 'video',
          title: 'Préparer son logement',
          riskOrDomain: 'Cyclone et fortes pluies',
          url: '/videos/preparer-son-logement',
        },
      ])
    })

    it('builds one entry per scenario, with the /mises-en-situation/:id url', () => {
      const index = buildContentIndex([], scenarios, [], [])
      expect(index.entries).toEqual([
        {
          id: 'scenario_cyclone',
          type: 'scenario',
          title: 'Une alerte cyclone est déclenchée',
          riskOrDomain: 'behaviors',
          url: '/mises-en-situation/scenario_cyclone',
        },
      ])
    })

    it('builds one entry per resource, all pointing to /ressources', () => {
      const index = buildContentIndex([], [], resources, [])
      expect(index.entries).toEqual([
        {
          id: 'resource_seisme',
          type: 'resource',
          title: 'Séisme',
          riskOrDomain: 'behaviors',
          url: '/ressources',
        },
      ])
    })

    it('deduplicates quiz questions by risk, one entry per risk pointing to /quiz', () => {
      const index = buildContentIndex([], [], [], quizQuestions)
      expect(index.entries).toEqual([
        {
          id: 'quiz_cyclone',
          type: 'quiz',
          title: 'Quiz : Cyclone',
          riskOrDomain: 'cyclone',
          url: '/quiz',
        },
        {
          id: 'quiz_mouvement_terrain',
          type: 'quiz',
          title: 'Quiz : Mouvement terrain',
          riskOrDomain: 'mouvement_terrain',
          url: '/quiz',
        },
      ])
    })

    it('exposes every entry by id in byId', () => {
      const index = buildContentIndex(videos, scenarios, resources, quizQuestions)
      expect(index.byId.get('VID-01')?.title).toBe('Préparer son logement')
      expect(index.byId.get('scenario_cyclone')?.title).toBe(
        'Une alerte cyclone est déclenchée',
      )
      expect(index.byId.get('resource_seisme')?.title).toBe('Séisme')
      expect(index.byId.get('quiz_cyclone')?.title).toBe('Quiz : Cyclone')
      expect(index.byId.has('unknown_id')).toBe(false)
    })
  })

  describe('buildContentLinksSystemPrompt', () => {
    const index = buildContentIndex(videos, scenarios, resources, quizQuestions)

    it('includes every entry id and title', () => {
      const prompt = buildContentLinksSystemPrompt(index)
      expect(prompt).toContain('[VID-01]')
      expect(prompt).toContain('Préparer son logement')
      expect(prompt).toContain('[scenario_cyclone]')
      expect(prompt).toContain('[resource_seisme]')
      expect(prompt).toContain('[quiz_cyclone]')
    })

    it('requires strict JSON output with matchedIds and refused fields', () => {
      const prompt = buildContentLinksSystemPrompt(index)
      expect(prompt).toContain('"matchedIds"')
      expect(prompt).toContain('"refused"')
    })
  })

  describe('parseContentLinksCompletion', () => {
    const index = buildContentIndex(videos, scenarios, resources, quizQuestions)

    it('parses a valid completion', () => {
      const raw = JSON.stringify({ matchedIds: ['VID-01', 'quiz_cyclone'], refused: false })
      expect(parseContentLinksCompletion(raw, index)).toEqual({
        matchedIds: ['VID-01', 'quiz_cyclone'],
        refused: false,
      })
    })

    it('returns refused true with an empty list for malformed JSON', () => {
      expect(parseContentLinksCompletion('not json', index)).toEqual({
        matchedIds: [],
        refused: true,
      })
    })

    it('silently drops ids that are not in the index', () => {
      const raw = JSON.stringify({
        matchedIds: ['VID-01', 'this_id_does_not_exist'],
        refused: false,
      })
      expect(parseContentLinksCompletion(raw, index)).toEqual({
        matchedIds: ['VID-01'],
        refused: false,
      })
    })

    it('caps matchedIds at 6 entries', () => {
      const manyVideos = Array.from({ length: 10 }, (_, i) => ({
        id: `VID-${i}`,
        slug: `video-${i}`,
        title: `Vidéo ${i}`,
        risk: 'Cyclone',
      }))
      const bigIndex = buildContentIndex(manyVideos, [], [], [])
      const raw = JSON.stringify({
        matchedIds: manyVideos.map((video) => video.id),
        refused: false,
      })
      const result = parseContentLinksCompletion(raw, bigIndex)
      expect(result.matchedIds).toHaveLength(6)
    })

    it('preserves an explicit refused flag even when matchedIds is missing', () => {
      const raw = JSON.stringify({ refused: true })
      expect(parseContentLinksCompletion(raw, index)).toEqual({
        matchedIds: [],
        refused: true,
      })
    })

    it('treats a non-boolean refused as false', () => {
      const raw = JSON.stringify({ matchedIds: ['VID-01'] })
      expect(parseContentLinksCompletion(raw, index)).toEqual({
        matchedIds: ['VID-01'],
        refused: false,
      })
    })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/unit/content-links.spec.ts`
Expected: FAIL — `Cannot find module '../../server/content-links.mjs'`

- [ ] **Step 3: Write the implementation**

Créer `server/content-links.mjs` :

```js
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
    '- "refused" est true si aucune entree du catalogue ne correspond clairement a la question ; dans ce cas "matchedIds" doit etre un tableau vide.',
  ].join('\n')
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
  const matchedIds = rawIds
    .filter((id) => typeof id === 'string' && index.byId.has(id))
    .slice(0, MAX_MATCHES)

  return { matchedIds, refused: parsed.refused === true }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/unit/content-links.spec.ts`
Expected: PASS (16 tests)

- [ ] **Step 5: Commit**

```bash
git add server/content-links.mjs tests/unit/content-links.spec.ts
git commit -m "feat(content-links): module serveur de selection de contenu (fonctions pures + tests)"
```

---

### Task 2: Index des ressources, plomberie Hugging Face et endpoint HTTP

**Files:**
- Modify: `server/analytics-server.mjs`
- Modify: `deploy/analytics.env.example`
- Modify: `.env.production`

**Interfaces:**
- Consumes: `sanitizeContentLinksQuestion`, `buildContentIndex`, `buildContentLinksSystemPrompt`, `parseContentLinksCompletion` (Task 1) ; `getVideosIndex()`, `getScenariosIndex()`, `getQuizQuestionsIndex()`, `readBody(request)`, `sendJson(response, statusCode, payload, origin)`, `allowedPaths` (déjà existants dans `analytics-server.mjs`).
- Produces: endpoint HTTP `POST /api/assistant-liens` — body `{ "question": string }`, réponse succès `200 { "matches": Array<{title: string, type: string, url: string}>, "refused": boolean }`, erreurs `400 { "error": "invalid_question" }` / `503 { "error": "assistant_links_unconfigured" }` / `429 { "error": "rate_limited" }` / `502 { "error": "assistant_links_upstream_error" }`. Consommé par Task 3.

- [ ] **Step 1: Ajouter l'import du module et le global `fetch`**

Dans `server/analytics-server.mjs`, remplacer la ligne 1 :

```js
/* global console, process, URL */
```

par :

```js
/* global console, process, URL, fetch */
```

Puis, juste après les imports existants (après la ligne `import { DatabaseSync } from 'node:sqlite'`), ajouter :

```js

import {
  buildContentIndex,
  buildContentLinksSystemPrompt,
  parseContentLinksCompletion,
  sanitizeContentLinksQuestion,
} from './content-links.mjs'
```

- [ ] **Step 2: Ajouter les constantes de configuration**

Juste après la déclaration de `ENGAGEMENT_TARGET = 5000` (avant `const ALLOWED_ORIGINS`), ajouter :

```js
const RESOURCES_FILE = resolve(
  process.env.RESOURCES_DATA_FILE ?? 'src/data/resources.json',
)
// Cle personnelle Hugging Face avec la permission "Inference Providers"
// (https://huggingface.co/settings/tokens). Jamais exposee au navigateur :
// uniquement lue ici, cote serveur.
const HF_TOKEN = process.env.HF_TOKEN ?? ''
const HF_CHAT_MODEL = process.env.HF_CHAT_MODEL ?? 'Qwen/Qwen2.5-7B-Instruct'
const HF_ROUTER_URL = 'https://router.huggingface.co/v1/chat/completions'
const CONTENT_LINKS_RATE_LIMIT = Number.parseInt(
  process.env.CONTENT_LINKS_RATE_LIMIT ?? '20',
  10,
)
const CONTENT_LINKS_RATE_WINDOW_MS = 60_000
```

- [ ] **Step 3: Ajouter le chemin à `allowedPaths`**

Dans le `Set` `allowedPaths`, ajouter une entrée juste après `'/mises-en-situation',` :

```js
  '/assistant-liens',
```

- [ ] **Step 4: Ajouter l'index des ressources et l'index combiné de contenu**

Juste après la fonction `sanitizeQuizAnswers` (après sa fermeture, avant `let videosIndex = null`), ajouter :

```js
let resourcesIndex = null

async function getResourcesIndex() {
  if (resourcesIndex) {
    return resourcesIndex
  }

  const resources = JSON.parse(await readFile(RESOURCES_FILE, 'utf8'))
  const byId = new Map(resources.map((resource) => [resource.id, resource]))

  resourcesIndex = { resources, byId }
  return resourcesIndex
}

let contentLinksIndex = null

async function getContentLinksIndex() {
  if (contentLinksIndex) {
    return contentLinksIndex
  }

  const [{ videos }, { scenarios }, { resources }, { questions }] = await Promise.all([
    getVideosIndex(),
    getScenariosIndex(),
    getResourcesIndex(),
    getQuizQuestionsIndex(),
  ])

  contentLinksIndex = buildContentIndex(videos, scenarios, resources, questions)
  return contentLinksIndex
}
```

- [ ] **Step 5: Ajouter le client IP et le limiteur de débit dédié**

Juste après la fonction `sanitizeScenarioResult` (après sa fermeture, avant `function sanitizeKitProfile`), ajouter :

```js
function getClientIp(request) {
  const forwarded = request.headers['x-forwarded-for']

  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim()
  }

  return request.socket.remoteAddress ?? 'unknown'
}

const contentLinksRateLimitByIp = new Map()

function allowContentLinksRequest(request) {
  const ip = getClientIp(request)
  const now = Date.now()
  const windowStart = now - CONTENT_LINKS_RATE_WINDOW_MS
  const timestamps = (contentLinksRateLimitByIp.get(ip) ?? []).filter(
    (timestamp) => timestamp > windowStart,
  )

  if (timestamps.length >= CONTENT_LINKS_RATE_LIMIT) {
    contentLinksRateLimitByIp.set(ip, timestamps)
    return false
  }

  timestamps.push(now)
  contentLinksRateLimitByIp.set(ip, timestamps)
  return true
}

async function askHuggingFaceForContentLinks(question, index) {
  const response = await fetch(HF_ROUTER_URL, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${HF_TOKEN}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: HF_CHAT_MODEL,
      temperature: 0.2,
      max_tokens: 300,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: buildContentLinksSystemPrompt(index) },
        { role: 'user', content: question },
      ],
    }),
  })

  if (!response.ok) {
    throw new Error(`hugging_face_http_${response.status}`)
  }

  const payload = await response.json()
  const rawContent = payload.choices?.[0]?.message?.content

  if (typeof rawContent !== 'string') {
    throw new Error('hugging_face_empty_response')
  }

  return parseContentLinksCompletion(rawContent, index)
}
```

- [ ] **Step 6: Ajouter le handler HTTP**

Juste avant le bloc `if (request.method === 'GET' && requestUrl.pathname === '/api/health') {`, ajouter :

```js
    if (request.method === 'POST' && requestUrl.pathname === '/api/assistant-liens') {
      const body = await readBody(request)
      const question = sanitizeContentLinksQuestion(body.question)

      if (!question) {
        sendJson(response, 400, { error: 'invalid_question' }, origin)
        return
      }

      if (!HF_TOKEN) {
        sendJson(response, 503, { error: 'assistant_links_unconfigured' }, origin)
        return
      }

      if (!allowContentLinksRequest(request)) {
        sendJson(response, 429, { error: 'rate_limited' }, origin)
        return
      }

      try {
        const index = await getContentLinksIndex()
        const { matchedIds, refused } = await askHuggingFaceForContentLinks(question, index)
        const matches = matchedIds.map((id) => {
          const entry = index.byId.get(id)
          return { title: entry.title, type: entry.type, url: entry.url }
        })

        sendJson(response, 200, { matches, refused }, origin)
      } catch (error) {
        console.error('[assistant-liens] hugging face request failed', error)
        sendJson(response, 502, { error: 'assistant_links_upstream_error' }, origin)
      }
      return
    }

```

- [ ] **Step 7: Documenter les variables d'environnement**

Dans `deploy/analytics.env.example`, ajouter à la fin du fichier :

```
# Assistant de liens vers le contenu du site (Hugging Face Inference
# Providers, tier gratuit). Cle personnelle avec la permission "Inference
# Providers" :
# https://huggingface.co/settings/tokens/new?ownUserPermissions=inference.serverless.write&tokenType=fineGrained
# Sans cette variable, l'endpoint repond 503.
HF_TOKEN=
# Modele par defaut : Qwen/Qwen2.5-7B-Instruct (correct en francais, tier gratuit).
# HF_CHAT_MODEL=Qwen/Qwen2.5-7B-Instruct
```

Dans `.env.production`, ajouter à la fin du fichier :

```
VITE_CONTENT_LINKS_ENDPOINT=/api/assistant-liens
```

- [ ] **Step 8: Vérification manuelle**

Démarrer le serveur sans `HF_TOKEN` configuré :

Run: `npm run analytics:server`

Dans un autre terminal :

```bash
curl -s -X POST http://127.0.0.1:8787/api/assistant-liens -H 'content-type: application/json' -d '{"question": "les séismes"}'
```

Expected: `{"error":"assistant_links_unconfigured"}` avec un statut HTTP 503.

```bash
curl -s -X POST http://127.0.0.1:8787/api/assistant-liens -H 'content-type: application/json' -d '{"question": ""}'
```

Expected: `{"error":"invalid_question"}` avec un statut HTTP 400.

Arrêter le serveur (Ctrl+C).

- [ ] **Step 9: Commit**

```bash
git add server/analytics-server.mjs deploy/analytics.env.example .env.production
git commit -m "feat(content-links): endpoint /api/assistant-liens (index de contenu + Hugging Face)"
```

---

### Task 3: Types et service client

**Files:**
- Create: `src/features/content-links/types/content-links.ts`
- Create: `src/features/content-links/services/content-links.service.ts`

**Interfaces:**
- Consumes: endpoint `POST /api/assistant-liens` (Task 2).
- Produces: `ContentLinkMatch` type `{title: string, type: 'video'|'scenario'|'resource'|'quiz', url: string}`, `ContentLinksResult` type `{matches: ContentLinkMatch[], refused: boolean}`, `askContentLinks(question: string): Promise<ContentLinksResult | null>` (retourne `null` en cas d'échec technique — réseau, timeout, endpoint non configuré, réponse malformée). Consommés par Task 4.

- [ ] **Step 1: Créer les types**

Créer `src/features/content-links/types/content-links.ts` :

```ts
export type ContentLinkType = 'video' | 'scenario' | 'resource' | 'quiz'

export interface ContentLinkMatch {
  title: string
  type: ContentLinkType
  url: string
}

export interface ContentLinksResult {
  matches: ContentLinkMatch[]
  refused: boolean
}
```

- [ ] **Step 2: Créer le service client**

Créer `src/features/content-links/services/content-links.service.ts` :

```ts
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
```

- [ ] **Step 3: Vérifier les types**

Run: `npm run type-check`
Expected: pas de nouvelle erreur liée à `src/features/content-links/`.

- [ ] **Step 4: Commit**

```bash
git add src/features/content-links/
git commit -m "feat(content-links): types et service client pour l'assistant de liens"
```

---

### Task 4: Page `/assistant-liens`

**Files:**
- Create: `src/views/ContentLinksView.vue`
- Modify: `src/app/router.ts`
- Modify: `src/shared/i18n/locales/fr.ts`

**Interfaces:**
- Consumes: `askContentLinks` et types (Task 3) ; `AppAlert`, `AppButton` (composants existants) ; `useI18n` (`src/shared/i18n/i18n.service`).
- Produces: route publique `/assistant-liens`, non ajoutée à `AppHeader.vue`.

- [ ] **Step 1: Ajouter les clés de traduction dans `seo`**

Dans `src/shared/i18n/locales/fr.ts`, dans le bloc `seo: { ... }`, juste après la fermeture de `notFound` (juste avant le `},` qui ferme le bloc `seo`), ajouter :

```ts
    contentLinks: {
      title: 'Assistant de liens - Resilience 976',
      description:
        'Trouvez rapidement les vidéos, mises en situation, ressources et quiz du site liés à un risque ou un sujet.',
    },
```

- [ ] **Step 2: Ajouter les clés de traduction de la page**

Toujours dans `src/shared/i18n/locales/fr.ts`, juste avant la ligne `} as const` qui termine `frMessages`, ajouter :

```ts
  contentLinks: {
    eyebrow: 'Trouver le bon contenu',
    title: 'Assistant de liens vers le contenu du site',
    intro:
      'Posez une question sur un risque ou un sujet : l’outil renvoie des liens directs vers le contenu déjà validé du site (vidéos, mises en situation, ressources, quiz). Il ne rédige jamais de nouvelle réponse.',
    inputLabel: 'Votre question',
    inputPlaceholder: 'Ex. les risques par rapport aux séismes',
    submit: 'Rechercher',
    emptyState: 'Posez une question pour voir apparaître les liens correspondants.',
    fallbackText: 'Aucun contenu du site ne correspond clairement à cette question.',
    openResources: 'Voir toutes les ressources',
    type: {
      video: 'Vidéo',
      scenario: 'Mise en situation',
      resource: 'Ressources',
      quiz: 'Quiz',
    },
  },
```

- [ ] **Step 3: Ajouter la route**

Dans `src/app/router.ts`, juste après le bloc de la route `/mises-en-situation/:id`, ajouter :

```ts
    {
      path: '/assistant-liens',
      component: () => import('@/views/ContentLinksView.vue'),
      meta: {
        seoKey: 'contentLinks',
      },
    },
```

- [ ] **Step 4: Créer la vue**

Créer `src/views/ContentLinksView.vue` :

```vue
<script setup lang="ts">
import { nextTick, ref } from 'vue'

import AppAlert from '@/components/ui/AppAlert.vue'
import AppButton from '@/components/ui/AppButton.vue'
import { askContentLinks } from '@/features/content-links/services/content-links.service'
import type { ContentLinkMatch } from '@/features/content-links/types/content-links'
import { useI18n } from '@/shared/i18n/i18n.service'

interface ContentLinksMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  matches: ContentLinkMatch[]
  refused: boolean
}

const { t } = useI18n()

const inputText = ref('')
const messages = ref<ContentLinksMessage[]>([])
const isLoading = ref(false)
const transcript = ref<HTMLElement | null>(null)

function typeLabel(type: ContentLinkMatch['type']): string {
  return t(`contentLinks.type.${type}`)
}

async function scrollToEnd() {
  await nextTick()
  if (transcript.value) {
    transcript.value.scrollTop = transcript.value.scrollHeight
  }
}

async function ask(question: string) {
  const trimmed = question.trim()

  if (!trimmed || isLoading.value) {
    return
  }

  messages.value.push({
    id: window.crypto.randomUUID(),
    role: 'user',
    text: trimmed,
    matches: [],
    refused: false,
  })
  inputText.value = ''
  isLoading.value = true
  void scrollToEnd()

  const result = await askContentLinks(trimmed)
  const matches = result?.matches ?? []
  const refused = result === null || result.refused || matches.length === 0

  messages.value.push({
    id: window.crypto.randomUUID(),
    role: 'assistant',
    text: '',
    matches: refused ? [] : matches,
    refused,
  })

  isLoading.value = false
  void scrollToEnd()
}

function submitForm() {
  void ask(inputText.value)
}
</script>

<template>
  <section class="page">
    <div class="stack">
      <p class="eyebrow">{{ t('contentLinks.eyebrow') }}</p>
      <h1>{{ t('contentLinks.title') }}</h1>
      <p class="muted">{{ t('contentLinks.intro') }}</p>

      <section class="panel stack">
        <div ref="transcript" class="assistant-transcript" aria-live="polite">
          <div
            v-for="message in messages"
            :key="message.id"
            class="assistant-message"
            :class="`assistant-message--${message.role}`"
          >
            <p v-if="message.role === 'user'">{{ message.text }}</p>
            <ul v-if="message.matches.length > 0" class="content-links-list">
              <li v-for="match in message.matches" :key="match.url + match.title">
                <RouterLink :to="match.url" class="content-link-card">
                  <span class="content-link-type">{{ typeLabel(match.type) }}</span>
                  <span class="content-link-title">{{ match.title }}</span>
                </RouterLink>
              </li>
            </ul>
            <AppAlert v-if="message.refused" :title="t('common.important')" variant="info">
              {{ t('contentLinks.fallbackText') }}
              <div class="cluster">
                <RouterLink class="link-button link-button--secondary" to="/ressources">
                  {{ t('contentLinks.openResources') }}
                </RouterLink>
              </div>
            </AppAlert>
          </div>
          <p v-if="messages.length === 0" class="muted">{{ t('contentLinks.emptyState') }}</p>
        </div>

        <form class="cluster" @submit.prevent="submitForm">
          <label class="sr-only" for="content-links-input">
            {{ t('contentLinks.inputLabel') }}
          </label>
          <input
            id="content-links-input"
            v-model="inputText"
            class="text-input"
            type="text"
            :placeholder="t('contentLinks.inputPlaceholder')"
          />
          <AppButton type="submit" :disabled="!inputText.trim() || isLoading">
            {{ t('contentLinks.submit') }}
          </AppButton>
        </form>
      </section>
    </div>
  </section>
</template>

<style scoped>
.assistant-transcript {
  display: grid;
  gap: var(--space-3);
  max-height: 420px;
  overflow-y: auto;
}

.assistant-message {
  display: grid;
  gap: var(--space-2);
  padding: var(--space-3);
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
}

.assistant-message--user {
  background: var(--color-muted);
  justify-self: end;
  max-width: 80%;
}

.assistant-message--assistant {
  background: #ffffff;
  justify-self: start;
  max-width: 100%;
}

.content-links-list {
  display: grid;
  gap: var(--space-2);
  list-style: none;
  padding: 0;
  margin: 0;
}

.content-link-card {
  display: grid;
  gap: var(--space-1);
  padding: var(--space-2);
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  text-decoration: none;
  color: inherit;
}

.content-link-type {
  font-size: 0.8em;
  text-transform: uppercase;
}

.content-link-title {
  font-weight: 600;
}
</style>
```

- [ ] **Step 5: Vérification manuelle**

Run: `npm run dev`

Ouvrir `http://127.0.0.1:5173/assistant-liens` dans le navigateur, saisir une question, envoyer. Sans `HF_TOKEN` configuré côté serveur (`npm run analytics:server` dans un autre terminal), vérifier que le message de repli avec le lien vers `/ressources` s'affiche.

Arrêter les deux serveurs (Ctrl+C).

- [ ] **Step 6: Commit**

```bash
git add src/views/ContentLinksView.vue src/app/router.ts src/shared/i18n/locales/fr.ts
git commit -m "feat(content-links): page /assistant-liens"
```

---

### Task 5: Test e2e Playwright

**Files:**
- Create: `tests/e2e/content-links.spec.ts`

**Interfaces:**
- Consumes: route `/assistant-liens` (Task 4), endpoint mocké `POST /api/assistant-liens` (forme de réponse définie en Task 2).

- [ ] **Step 1: Écrire le test**

Créer `tests/e2e/content-links.spec.ts` :

```ts
import { expect, test } from '@playwright/test'

test('affiche les liens correspondant à la question', async ({ page }) => {
  await page.route('**/api/assistant-liens', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        matches: [
          { title: 'Séisme', type: 'resource', url: '/ressources' },
          { title: 'Quiz : Seisme', type: 'quiz', url: '/quiz' },
        ],
        refused: false,
      }),
    })
  })

  await page.goto('/assistant-liens')
  await page.getByLabel('Votre question').fill('les risques par rapport aux séismes')
  await page.getByRole('button', { name: 'Rechercher' }).click()

  await expect(page.getByRole('link', { name: /Séisme/ })).toBeVisible()
  await expect(page.getByRole('link', { name: /Quiz : Seisme/ })).toBeVisible()
})

test('affiche un message de repli quand aucune correspondance n’est trouvée', async ({
  page,
}) => {
  await page.route('**/api/assistant-liens', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ matches: [], refused: true }),
    })
  })

  await page.goto('/assistant-liens')
  await page.getByLabel('Votre question').fill('une question hors sujet')
  await page.getByRole('button', { name: 'Rechercher' }).click()

  await expect(
    page.getByText('Aucun contenu du site ne correspond clairement à cette question.'),
  ).toBeVisible()
  await expect(page.getByRole('link', { name: 'Voir toutes les ressources' })).toBeVisible()
})
```

- [ ] **Step 2: Lancer le test**

Run: `npx playwright test tests/e2e/content-links.spec.ts`
Expected: PASS (2 tests)

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/content-links.spec.ts
git commit -m "test(e2e): parcours de l'assistant de liens vers le contenu"
```

---

### Task 6: Vérification finale

- [ ] **Step 1: Lancer la suite complète**

Run: `npm run quality`
Expected: PASS (lint, type-check, tests unitaires, build)

- [ ] **Step 2: Lancer la suite e2e complète**

Run: `npm run test:e2e`
Expected: PASS

- [ ] **Step 3: Vérifier qu'aucun ajout n'a été fait à `AppHeader.vue`**

Run: `git diff main --stat -- src/components/ui/AppHeader.vue`
Expected: pas de sortie (fichier non modifié).
