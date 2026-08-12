# Outil d'aide à la traduction shimaore Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Donner à l'équipe éditoriale un outil interne (page à URL non listée) qui produit un brouillon de traduction français → shimaore via le swahili comme langue pivot, pour accélérer le premier jet avant relecture par un locuteur natif.

**Architecture:** Nouvel endpoint `POST /api/i18n/draft-shimaore` dans `server/analytics-server.mjs`, calqué sur `/api/assistant/ask` existant (même `HF_TOKEN`, même modèle Hugging Face, même style de garde-fous, mais limite de débit dédiée). Logique de prompt et de parsing extraite dans un module serveur séparé et testable, `server/translation-draft.mjs`. Nouvelle page `TranslationDraftView.vue` sur une route non ajoutée à `AppHeader.vue`.

**Tech Stack:** Node.js (`server/analytics-server.mjs`, ESM), Vue 3 + TypeScript (frontend), Vitest (tests unitaires), Playwright (test e2e), Hugging Face Inference Providers (déjà configuré pour l'assistant).

## Global Constraints

- Aucune traduction générée ne doit être publiée automatiquement dans `swb.ts` — l'outil produit un brouillon, la sauvegarde reste un geste humain (édition manuelle + relecture).
- La page n'est jamais ajoutée à `AppHeader.vue` (accessible uniquement par URL directe, comme `/assistant-documentaire`).
- Réutilise `HF_TOKEN`, `HF_CHAT_MODEL`, `HF_ROUTER_URL` déjà définis dans `server/analytics-server.mjs` — aucune nouvelle clé à configurer.
- Limite de débit **dédiée** (compteur distinct de celui de l'assistant) pour ne pas consommer le quota des visiteurs réels de l'assistant public.
- Le prompt impose explicitement la chaîne français → swahili → shimaore (pas de traduction directe français → shimaore).
- Plafond de texte en entrée : 2000 caractères.
- Hors périmètre explicite : reconnaissance/synthèse vocale, publication automatique, kibushi, authentification.

---

### Task 1: Module serveur de traduction (fonctions pures testables)

**Files:**
- Create: `server/translation-draft.mjs`
- Test: `tests/unit/translation-draft.spec.ts`

**Interfaces:**
- Produces: `sanitizeTranslationText(value: unknown): string`, `buildTranslationSystemPrompt(glossaryEntries: Array<{french: string, shimaore: string}>): string`, `parseTranslationCompletion(rawContent: string): {swahili: string, shimaore: string} | null` — tous exportés depuis `server/translation-draft.mjs`, consommés par Task 2.

- [ ] **Step 1: Write the failing tests**

Créer `tests/unit/translation-draft.spec.ts` :

```ts
import { describe, expect, it } from 'vitest'

import {
  buildTranslationSystemPrompt,
  parseTranslationCompletion,
  sanitizeTranslationText,
} from '../../server/translation-draft.mjs'

describe('translation-draft.mjs', () => {
  describe('sanitizeTranslationText', () => {
    it('trims whitespace', () => {
      expect(sanitizeTranslationText('  bonjour  ')).toBe('bonjour')
    })

    it('truncates to 2000 characters', () => {
      const long = 'a'.repeat(2500)
      expect(sanitizeTranslationText(long)).toHaveLength(2000)
    })

    it('returns an empty string for non-string input', () => {
      expect(sanitizeTranslationText(undefined)).toBe('')
      expect(sanitizeTranslationText(42)).toBe('')
    })
  })

  describe('buildTranslationSystemPrompt', () => {
    const glossary = [
      { french: 'Accueil', shimaore: 'agoni' },
      { french: 'Sans compte', shimaore: 'tsi ha si siau' },
    ]

    it('includes every glossary entry', () => {
      const prompt = buildTranslationSystemPrompt(glossary)
      expect(prompt).toContain('Accueil')
      expect(prompt).toContain('agoni')
      expect(prompt).toContain('Sans compte')
      expect(prompt).toContain('tsi ha si siau')
    })

    it('instructs the french -> swahili -> shimaore chain', () => {
      const prompt = buildTranslationSystemPrompt(glossary)
      expect(prompt).toContain('swahili')
      expect(prompt).toContain('shimaore')
    })

    it('requires strict JSON output with swahili and shimaore fields', () => {
      const prompt = buildTranslationSystemPrompt(glossary)
      expect(prompt).toContain('"swahili"')
      expect(prompt).toContain('"shimaore"')
    })
  })

  describe('parseTranslationCompletion', () => {
    it('parses a valid completion', () => {
      const raw = JSON.stringify({ swahili: 'Karibu', shimaore: 'Karibuni' })
      expect(parseTranslationCompletion(raw)).toEqual({
        swahili: 'Karibu',
        shimaore: 'Karibuni',
      })
    })

    it('returns null for malformed JSON', () => {
      expect(parseTranslationCompletion('not json')).toBeNull()
    })

    it('returns null when swahili is missing', () => {
      const raw = JSON.stringify({ shimaore: 'Karibuni' })
      expect(parseTranslationCompletion(raw)).toBeNull()
    })

    it('returns null when shimaore is missing', () => {
      const raw = JSON.stringify({ swahili: 'Karibu' })
      expect(parseTranslationCompletion(raw)).toBeNull()
    })

    it('returns null when either field is an empty string', () => {
      const raw = JSON.stringify({ swahili: '', shimaore: 'Karibuni' })
      expect(parseTranslationCompletion(raw)).toBeNull()
    })

    it('truncates overly long fields to 2000 characters', () => {
      const raw = JSON.stringify({
        swahili: 'a'.repeat(2500),
        shimaore: 'b'.repeat(2500),
      })
      const result = parseTranslationCompletion(raw)
      expect(result?.swahili).toHaveLength(2000)
      expect(result?.shimaore).toHaveLength(2000)
    })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/unit/translation-draft.spec.ts`
Expected: FAIL — `Cannot find module '../../server/translation-draft.mjs'`

- [ ] **Step 3: Write the implementation**

Créer `server/translation-draft.mjs` :

```js
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/unit/translation-draft.spec.ts`
Expected: PASS (10 tests)

- [ ] **Step 5: Commit**

```bash
git add server/translation-draft.mjs tests/unit/translation-draft.spec.ts
git commit -m "feat(i18n-tools): module serveur de traduction shimaore (fonctions pures + tests)"
```

---

### Task 2: Glossaire et endpoint HTTP

**Files:**
- Create: `src/data/shimaore-glossary.json`
- Modify: `server/analytics-server.mjs`

**Interfaces:**
- Consumes: `sanitizeTranslationText`, `buildTranslationSystemPrompt`, `parseTranslationCompletion` (Task 1) ; `HF_TOKEN`, `HF_CHAT_MODEL`, `HF_ROUTER_URL`, `getClientIp(request)`, `readBody(request)`, `sendJson(response, statusCode, payload, origin)`, `allowedPaths` (déjà existants dans `analytics-server.mjs`).
- Produces: endpoint HTTP `POST /api/i18n/draft-shimaore` — body `{ "text": string }`, réponse succès `200 { "swahili": string, "shimaore": string }`, erreurs `400 { "error": "invalid_text" }` / `503 { "error": "translation_unconfigured" }` / `429 { "error": "rate_limited" }` / `502 { "error": "translation_upstream_error" }`. Consommé par Task 3.

- [ ] **Step 1: Créer le glossaire**

Créer `src/data/shimaore-glossary.json` (paires déjà présentes dans `src/shared/i18n/locales/swb.ts`, réutilisées comme référence de style) :

```json
[
  { "french": "Outil de sensibilisation", "shimaore": "Trongo ya sensibilisation" },
  { "french": "Accueil", "shimaore": "agoni" },
  { "french": "Diagnostic", "shimaore": "Udzisa" },
  { "french": "Sans compte", "shimaore": "tsi ha si siau" },
  { "french": "Commencer le diagnostic", "shimaore": "mainsha ya andrisa Untru" },
  { "french": "Progression", "shimaore": "tsena" },
  { "french": "Sources", "shimaore": "ziashi" },
  { "french": "Oui", "shimaore": "ewa" }
]
```

- [ ] **Step 2: Ajouter l'import et les constantes**

Dans `server/analytics-server.mjs`, ajouter l'import en haut du fichier, juste après les imports existants (ligne 6) :

```js
import {
  buildTranslationSystemPrompt,
  parseTranslationCompletion,
  sanitizeTranslationText,
} from './translation-draft.mjs'
```

Juste après la déclaration de `ASSISTANT_RATE_WINDOW_MS` (ligne 42), ajouter :

```js
const SHIMAORE_GLOSSARY_FILE = resolve(
  process.env.SHIMAORE_GLOSSARY_DATA_FILE ?? 'src/data/shimaore-glossary.json',
)
const TRANSLATION_RATE_LIMIT = Number.parseInt(
  process.env.TRANSLATION_RATE_LIMIT ?? '20',
  10,
)
const TRANSLATION_RATE_WINDOW_MS = 60_000
```

- [ ] **Step 3: Ajouter le chemin à `allowedPaths`**

Dans le `Set` `allowedPaths`, ajouter une entrée après `'/assistant-documentaire',` :

```js
  '/outils/traduction-shimaore',
```

- [ ] **Step 4: Ajouter le cache du glossaire et le limiteur de débit dédié**

Juste après la fonction `getAssistantEntriesIndex` (après sa fermeture, avant `sanitizeAssistantQuestion`), ajouter :

```js
let shimaoreGlossary = null

async function getShimaoreGlossary() {
  if (shimaoreGlossary) {
    return shimaoreGlossary
  }

  shimaoreGlossary = JSON.parse(await readFile(SHIMAORE_GLOSSARY_FILE, 'utf8'))
  return shimaoreGlossary
}
```

Juste après la fonction `allowAssistantRequest` (après sa fermeture, avant `buildAssistantSystemPrompt`), ajouter :

```js
// Compteur distinct de celui de l'assistant : un usage interne en rafale
// (traduire un fichier phrase par phrase) ne doit pas consommer le quota
// des visiteurs reels de l'assistant public.
const translationRateLimitByIp = new Map()

function allowTranslationRequest(request) {
  const ip = getClientIp(request)
  const now = Date.now()
  const windowStart = now - TRANSLATION_RATE_WINDOW_MS
  const timestamps = (translationRateLimitByIp.get(ip) ?? []).filter(
    (timestamp) => timestamp > windowStart,
  )

  if (timestamps.length >= TRANSLATION_RATE_LIMIT) {
    translationRateLimitByIp.set(ip, timestamps)
    return false
  }

  timestamps.push(now)
  translationRateLimitByIp.set(ip, timestamps)
  return true
}
```

- [ ] **Step 5: Ajouter l'appel Hugging Face**

Juste après la fonction `askHuggingFace` (après sa fermeture, avant `sanitizeKitProfile`), ajouter :

```js
async function askHuggingFaceForTranslation(text, glossary) {
  const response = await fetch(HF_ROUTER_URL, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${HF_TOKEN}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: HF_CHAT_MODEL,
      temperature: 0.2,
      max_tokens: 800,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: buildTranslationSystemPrompt(glossary) },
        { role: 'user', content: text },
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

  const result = parseTranslationCompletion(rawContent)

  if (!result) {
    throw new Error('translation_parse_failed')
  }

  return result
}
```

- [ ] **Step 6: Ajouter la route**

Juste après le bloc `if (request.method === 'POST' && requestUrl.pathname === '/api/assistant/ask') { ... }` (avant le bloc `/api/health`), ajouter :

```js
    if (
      request.method === 'POST' &&
      requestUrl.pathname === '/api/i18n/draft-shimaore'
    ) {
      const body = await readBody(request)
      const text = sanitizeTranslationText(body.text)

      if (!text) {
        sendJson(response, 400, { error: 'invalid_text' }, origin)
        return
      }

      if (!HF_TOKEN) {
        sendJson(response, 503, { error: 'translation_unconfigured' }, origin)
        return
      }

      if (!allowTranslationRequest(request)) {
        sendJson(response, 429, { error: 'rate_limited' }, origin)
        return
      }

      try {
        const glossary = await getShimaoreGlossary()
        const result = await askHuggingFaceForTranslation(text, glossary)
        sendJson(response, 200, result, origin)
      } catch (error) {
        console.error('[translation-draft] hugging face request failed', error)
        sendJson(response, 502, { error: 'translation_upstream_error' }, origin)
      }
      return
    }
```

- [ ] **Step 7: Vérifier la syntaxe et le comportement sans clé configurée**

Run: `node --check server/analytics-server.mjs`
Expected: pas de sortie (syntaxe valide)

Run (dans un terminal, sans `HF_TOKEN` défini) :
```bash
ANALYTICS_DATA_FILE=/tmp/rs976-plan-test/events.jsonl RESILIENCE_DATABASE_FILE=/tmp/rs976-plan-test/resilience.sqlite PORT=8799 ANALYTICS_ALLOWED_ORIGINS=http://localhost:5173 node server/analytics-server.mjs &
sleep 1
curl -s -X POST http://127.0.0.1:8799/api/i18n/draft-shimaore -H "Content-Type: application/json" -H "Origin: http://localhost:5173" -d '{"text":"Bienvenue"}'
```
Expected: `{"error":"translation_unconfigured"}` avec un code 503 — arrêter le serveur ensuite (`kill %1`).

- [ ] **Step 8: Commit**

```bash
git add src/data/shimaore-glossary.json server/analytics-server.mjs
git commit -m "feat(i18n-tools): endpoint /api/i18n/draft-shimaore"
```

---

### Task 3: Types et service client

**Files:**
- Create: `src/features/i18n-tools/types/translation-draft.ts`
- Create: `src/features/i18n-tools/services/translation-draft.service.ts`

**Interfaces:**
- Consumes: rien de nouveau (fetch natif du navigateur).
- Produces: `TranslationDraftEntry` (type), `requestTranslationDraft(text: string): Promise<TranslationDraftOutcome>` où `TranslationDraftOutcome = { ok: true; result: { swahili: string; shimaore: string } } | { ok: false; errorCode: string }`. Consommés par Task 4.

- [ ] **Step 1: Créer le type d'entrée d'historique**

Créer `src/features/i18n-tools/types/translation-draft.ts` :

```ts
export interface TranslationDraftEntry {
  id: string
  frenchText: string
  status: 'pending' | 'success' | 'error'
  swahili?: string
  shimaore?: string
  errorText?: string
}
```

- [ ] **Step 2: Créer le service client**

Créer `src/features/i18n-tools/services/translation-draft.service.ts` :

```ts
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
```

Pas de test unitaire dédié pour ce fichier : même choix que `src/features/assistant/services/assistant-llm.service.ts` (fetch mince, sans logique propre à isoler) — la vérification passe par le type-check.

- [ ] **Step 3: Vérifier**

Run: `npm run type-check`
Expected: pas d'erreur

- [ ] **Step 4: Commit**

```bash
git add src/features/i18n-tools/
git commit -m "feat(i18n-tools): types et service client pour le brouillon de traduction"
```

---

### Task 4: Page, route et textes

**Files:**
- Create: `src/views/TranslationDraftView.vue`
- Modify: `src/app/router.ts`
- Modify: `src/shared/i18n/locales/fr.ts`

**Interfaces:**
- Consumes: `requestTranslationDraft`, `TranslationDraftOutcome` (Task 3) ; `TranslationDraftEntry` (Task 3) ; `AppAlert`, `AppButton` (existants) ; `useI18n` (existant).
- Produces: route `/outils/traduction-shimaore`, jamais référencée dans `AppHeader.vue`.

- [ ] **Step 1: Ajouter les textes français**

Dans `src/shared/i18n/locales/fr.ts`, dans le bloc `seo`, ajouter après l'entrée `assistant` :

```ts
    translationDraft: {
      title: 'Outil de traduction shimaore - Resilience 976',
      description:
        'Brouillon de traduction français vers shimaore via le swahili comme langue pivot, à relire par un locuteur natif avant publication.',
    },
```

Puis, au niveau racine du fichier (même niveau que le bloc `assistant:`), ajouter :

```ts
  translationDraft: {
    eyebrow: 'Outil interne',
    title: 'Brouillon de traduction shimaore',
    intro:
      'Colle un texte en français pour obtenir un brouillon de traduction en shimaore, via le swahili comme langue pivot (proximité lexicale entre les deux langues).',
    guardrail:
      'Brouillon non validé — à faire relire par un locuteur natif avant toute publication dans swb.ts.',
    inputLabel: 'Texte en français',
    inputPlaceholder: 'Ex : Commencer le diagnostic',
    submit: 'Traduire',
    translating: 'Traduction en cours…',
    swahiliLabel: 'Swahili :',
    shimaoreLabel: 'Shimaore :',
    copy: 'Copier le shimaore',
    errors: {
      invalidText: 'Le texte est vide ou invalide.',
      unconfigured: 'L’outil n’est pas configuré (clé Hugging Face manquante).',
      rateLimited: 'Trop de demandes, réessayez dans quelques instants.',
      upstream: 'La traduction a échoué, réessayez.',
      network: 'Erreur réseau, réessayez.',
    },
  },
```

- [ ] **Step 2: Créer la vue**

Créer `src/views/TranslationDraftView.vue` :

```vue
<script setup lang="ts">
/* global navigator, window */
import { ref } from 'vue'

import AppAlert from '@/components/ui/AppAlert.vue'
import AppButton from '@/components/ui/AppButton.vue'
import { requestTranslationDraft } from '@/features/i18n-tools/services/translation-draft.service'
import type { TranslationDraftEntry } from '@/features/i18n-tools/types/translation-draft'
import { useI18n } from '@/shared/i18n/i18n.service'

const { t } = useI18n()

const inputText = ref('')
const entries = ref<TranslationDraftEntry[]>([])
const isTranslating = ref(false)

const errorMessageKeys: Record<string, string> = {
  invalid_text: 'translationDraft.errors.invalidText',
  translation_unconfigured: 'translationDraft.errors.unconfigured',
  rate_limited: 'translationDraft.errors.rateLimited',
  translation_upstream_error: 'translationDraft.errors.upstream',
  malformed_response: 'translationDraft.errors.upstream',
  network_error: 'translationDraft.errors.network',
}

function errorMessageFor(errorCode: string): string {
  return t(errorMessageKeys[errorCode] ?? 'translationDraft.errors.network')
}

async function submitTranslation() {
  const frenchText = inputText.value.trim()

  if (!frenchText || isTranslating.value) {
    return
  }

  const pendingId = window.crypto.randomUUID()
  entries.value = [{ id: pendingId, frenchText, status: 'pending' }, ...entries.value]
  inputText.value = ''
  isTranslating.value = true

  const outcome = await requestTranslationDraft(frenchText)
  const index = entries.value.findIndex((entry) => entry.id === pendingId)

  if (index !== -1) {
    entries.value[index] = outcome.ok
      ? {
          id: pendingId,
          frenchText,
          status: 'success',
          swahili: outcome.result.swahili,
          shimaore: outcome.result.shimaore,
        }
      : {
          id: pendingId,
          frenchText,
          status: 'error',
          errorText: errorMessageFor(outcome.errorCode),
        }
  }

  isTranslating.value = false
}

async function copyShimaore(text: string) {
  await navigator.clipboard.writeText(text)
}
</script>

<template>
  <section class="page">
    <div class="stack">
      <p class="eyebrow">{{ t('translationDraft.eyebrow') }}</p>
      <h1>{{ t('translationDraft.title') }}</h1>
      <p class="muted">{{ t('translationDraft.intro') }}</p>

      <AppAlert :title="t('common.important')" variant="warning">
        {{ t('translationDraft.guardrail') }}
      </AppAlert>

      <section class="panel stack">
        <form class="stack" @submit.prevent="submitTranslation">
          <label class="form-row" for="translation-input">
            <span>{{ t('translationDraft.inputLabel') }}</span>
            <textarea
              id="translation-input"
              v-model="inputText"
              class="text-input textarea"
              :disabled="isTranslating"
              :placeholder="t('translationDraft.inputPlaceholder')"
            />
          </label>
          <div class="cluster">
            <AppButton type="submit" :disabled="!inputText.trim() || isTranslating">
              {{
                isTranslating ? t('translationDraft.translating') : t('translationDraft.submit')
              }}
            </AppButton>
          </div>
        </form>
      </section>

      <section v-if="entries.length > 0" class="stack">
        <article v-for="entry in entries" :key="entry.id" class="panel stack translation-entry">
          <p class="translation-entry__french">{{ entry.frenchText }}</p>

          <p v-if="entry.status === 'pending'" class="muted">
            {{ t('translationDraft.translating') }}
          </p>

          <template v-else-if="entry.status === 'success'">
            <p><strong>{{ t('translationDraft.swahiliLabel') }}</strong> {{ entry.swahili }}</p>
            <p><strong>{{ t('translationDraft.shimaoreLabel') }}</strong> {{ entry.shimaore }}</p>
            <div class="cluster">
              <AppButton
                variant="secondary"
                @click="entry.shimaore && copyShimaore(entry.shimaore)"
              >
                {{ t('translationDraft.copy') }}
              </AppButton>
            </div>
          </template>

          <p v-else class="translation-entry__error">{{ entry.errorText }}</p>
        </article>
      </section>
    </div>
  </section>
</template>

<style scoped>
.translation-entry__french {
  font-weight: 600;
  color: var(--color-text-strong);
}

.translation-entry__error {
  color: var(--color-danger-fg);
}
</style>
```

- [ ] **Step 3: Ajouter la route**

Dans `src/app/router.ts`, juste après le bloc de la route `/assistant-documentaire` (après sa fermeture `},`), ajouter :

```ts
    {
      path: '/outils/traduction-shimaore',
      component: () => import('@/views/TranslationDraftView.vue'),
      meta: {
        seoKey: 'translationDraft',
      },
    },
```

**Ne pas** ajouter cette route à `src/components/ui/AppHeader.vue` — c'est la contrainte centrale du design.

- [ ] **Step 4: Vérifier**

Run: `npm run type-check`
Expected: pas d'erreur

Run: `npx eslint src/views/TranslationDraftView.vue src/app/router.ts src/shared/i18n/locales/fr.ts --no-warn-ignored`
Expected: 0 erreur (les avertissements de fin de ligne CRLF préexistants sont normaux)

- [ ] **Step 5: Commit**

```bash
git add src/views/TranslationDraftView.vue src/app/router.ts src/shared/i18n/locales/fr.ts
git commit -m "feat(i18n-tools): page /outils/traduction-shimaore (non listee)"
```

---

### Task 5: Test end-to-end

**Files:**
- Create: `tests/e2e/translation-draft.spec.ts`

**Interfaces:**
- Consumes: route `/outils/traduction-shimaore` (Task 4), endpoint `/api/i18n/draft-shimaore` (mocké via `page.route`, pas d'appel réseau réel).

- [ ] **Step 1: Write the e2e test**

Créer `tests/e2e/translation-draft.spec.ts` :

```ts
import { expect, test } from '@playwright/test'

test('affiche le brouillon de traduction shimaore', async ({ page }) => {
  await page.route('**/api/i18n/draft-shimaore', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ swahili: 'Karibu', shimaore: 'Karibuni' }),
    })
  })

  await page.goto('/outils/traduction-shimaore')
  await page.getByLabel('Texte en français').fill('Bienvenue')
  await page.getByRole('button', { name: 'Traduire' }).click()

  await expect(page.getByText('Karibu')).toBeVisible()
  await expect(page.getByText('Karibuni')).toBeVisible()
})

test('affiche un message clair quand le service est indisponible', async ({ page }) => {
  await page.route('**/api/i18n/draft-shimaore', async (route) => {
    await route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'translation_unconfigured' }),
    })
  })

  await page.goto('/outils/traduction-shimaore')
  await page.getByLabel('Texte en français').fill('Bienvenue')
  await page.getByRole('button', { name: 'Traduire' }).click()

  await expect(
    page.getByText('L’outil n’est pas configuré (clé Hugging Face manquante).'),
  ).toBeVisible()
})
```

- [ ] **Step 2: Run the test**

Run: `npx playwright test tests/e2e/translation-draft.spec.ts`
Expected: PASS (2 tests, sur les projets `chromium` et `mobile-chrome`)

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/translation-draft.spec.ts
git commit -m "test(e2e): parcours du brouillon de traduction shimaore"
```

---

### Task 6: Vérification finale

- [ ] **Step 1: Lancer la suite complète**

Run: `npm run quality`
Expected: lint, type-check, tests unitaires et build passent tous.

- [ ] **Step 2: Lancer les tests e2e complets**

Run: `npm run test:e2e`
Expected: tous les tests passent, y compris les deux nouveaux.

- [ ] **Step 3: Commit final si des ajustements ont été nécessaires**

```bash
git add -A
git commit -m "chore(i18n-tools): ajustements finaux suite a la verification qualite"
```

(Ne committer que s'il y a effectivement des changements — sinon, sauter cette étape.)
