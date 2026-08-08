<script setup lang="ts">
/* global AbortController, Blob, fetch, URL */
import { computed, onMounted, ref } from 'vue'

import AppButton from '@/components/ui/AppButton.vue'
import { trackEvent } from '@/shared/analytics/analytics.service'

const storageKey = 'resilience976.userExperiment.feedback'
const feedbackDatabaseEnabled = import.meta.env.DEV
  ? import.meta.env.VITE_FEEDBACK_DATABASE_ENABLED !== 'false'
  : import.meta.env.VITE_FEEDBACK_DATABASE_ENABLED === 'true'
const defaultFeedbackEndpoint = import.meta.env.PROD
  ? 'https://resilience-976-analytics.onrender.com/api/feedback'
  : '/api/feedback'
const feedbackEndpoint =
  import.meta.env.VITE_FEEDBACK_ENDPOINT ?? defaultFeedbackEndpoint

const ratingQuestions = [
  {
    key: 'objective',
    label: 'J’ai compris l’objectif de la plateforme dès la page d’accueil.',
  },
  {
    key: 'questions',
    label: 'Les questions du diagnostic étaient faciles à comprendre.',
  },
  {
    key: 'autonomy',
    label: 'J’ai pu avancer sans me perdre ni demander beaucoup d’aide.',
  },
  {
    key: 'score',
    label: 'Le résultat et le score étaient faciles à interpréter.',
  },
  {
    key: 'priorities',
    label: 'Les priorités proposées correspondaient à ma situation.',
  },
  {
    key: 'actions',
    label: 'Les actions proposées me semblent concrètes et réalisables.',
  },
  {
    key: 'deliverables',
    label: 'La checklist ou le kit d’urgence me seront utiles.',
  },
  {
    key: 'trust',
    label:
      'J’ai confiance dans les informations car les sources et limites sont visibles.',
  },
  {
    key: 'officialWarnings',
    label: 'Je comprends que l’outil ne remplace pas les alertes officielles.',
  },
  {
    key: 'recommendation',
    label: 'Je recommanderais ce parcours à un proche ou à mon public.',
  },
] as const

type RatingKey = (typeof ratingQuestions)[number]['key']
type FeedbackSaveStatus = 'idle' | 'saving' | 'database' | 'local'

interface ExperimentFeedback {
  id: string
  createdAt: string
  participantCode: string
  device: string
  browser: string
  profile: string
  assistance: string
  durationMinutes: number
  completedJourney: boolean
  ratings: Record<RatingKey, number>
  usefulAction: string
  difficulty: string
  priorityImprovement: string
  concern: string
}

const participantCode = ref(generateParticipantCode())
const device = ref('smartphone')
const browser = ref('')
const profile = ref('famille')
const assistance = ref('aucune')
const durationMinutes = ref(15)
const completedJourney = ref(true)
const ratings = ref<Record<RatingKey, number>>(createInitialRatings())
const usefulAction = ref('')
const difficulty = ref('')
const priorityImprovement = ref('')
const concern = ref('')
const savedFeedback = ref<ExperimentFeedback[]>([])
const feedbackSaveStatus = ref<FeedbackSaveStatus>('idle')

const submissionsCount = computed(() => savedFeedback.value.length)
const lastSubmission = computed(() => savedFeedback.value[0])
const saveStatusLabel = computed(() => {
  if (feedbackSaveStatus.value === 'saving') {
    return 'Enregistrement dans la base en cours.'
  }

  if (feedbackSaveStatus.value === 'database') {
    return 'Dernier retour enregistré dans la base SQLite.'
  }

  if (feedbackSaveStatus.value === 'local') {
    return 'Copie locale conservée. Base indisponible ou désactivée.'
  }

  return ''
})

function createInitialRatings(): Record<RatingKey, number> {
  return ratingQuestions.reduce(
    (values, question) => ({
      ...values,
      [question.key]: 4,
    }),
    {} as Record<RatingKey, number>,
  )
}

function generateParticipantCode(): string {
  return `P${String(Date.now()).slice(-6)}`
}

function loadSavedFeedback() {
  const raw = window.localStorage.getItem(storageKey)

  if (!raw) {
    return
  }

  try {
    savedFeedback.value = JSON.parse(raw) as ExperimentFeedback[]
  } catch {
    savedFeedback.value = []
  }
}

function persistSavedFeedback() {
  window.localStorage.setItem(storageKey, JSON.stringify(savedFeedback.value))
}

function resetForm() {
  participantCode.value = generateParticipantCode()
  device.value = 'smartphone'
  profile.value = 'famille'
  assistance.value = 'aucune'
  durationMinutes.value = 15
  completedJourney.value = true
  ratings.value = createInitialRatings()
  usefulAction.value = ''
  difficulty.value = ''
  priorityImprovement.value = ''
  concern.value = ''
}

async function saveFeedbackToDatabase(entry: ExperimentFeedback): Promise<boolean> {
  if (!feedbackDatabaseEnabled) {
    return false
  }

  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), 4_000)

  try {
    const response = await fetch(feedbackEndpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(entry),
      signal: controller.signal,
    })

    return response.ok
  } catch {
    return false
  } finally {
    window.clearTimeout(timeoutId)
  }
}

function submitFeedback() {
  const entry: ExperimentFeedback = {
    id: window.crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    participantCode: participantCode.value.trim() || generateParticipantCode(),
    device: device.value,
    browser: browser.value.trim().slice(0, 160),
    profile: profile.value,
    assistance: assistance.value,
    durationMinutes: Math.max(0, durationMinutes.value),
    completedJourney: completedJourney.value,
    ratings: { ...ratings.value },
    usefulAction: usefulAction.value.trim().slice(0, 500),
    difficulty: difficulty.value.trim().slice(0, 500),
    priorityImprovement: priorityImprovement.value.trim().slice(0, 500),
    concern: concern.value.trim().slice(0, 500),
  }

  savedFeedback.value = [entry, ...savedFeedback.value].slice(0, 200)
  persistSavedFeedback()
  feedbackSaveStatus.value = feedbackDatabaseEnabled ? 'saving' : 'local'
  void saveFeedbackToDatabase(entry).then((savedInDatabase) => {
    feedbackSaveStatus.value = savedInDatabase ? 'database' : 'local'
  })
  trackEvent('feedback_submitted')
  resetForm()
}

function downloadTextFile(filename: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const link = document.createElement('a')

  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function exportJson() {
  downloadTextFile(
    'retours-utilisateurs-resilience-976.json',
    JSON.stringify(savedFeedback.value, null, 2),
    'application/json;charset=utf-8',
  )
}

function toCsvValue(value: string | number | boolean): string {
  return `"${String(value).replace(/"/g, '""')}"`
}

function exportCsv() {
  const headers = [
    'id',
    'createdAt',
    'participantCode',
    'device',
    'browser',
    'profile',
    'assistance',
    'durationMinutes',
    'completedJourney',
    ...ratingQuestions.map((question) => question.key),
    'usefulAction',
    'difficulty',
    'priorityImprovement',
    'concern',
  ]
  const rows = savedFeedback.value.map((entry) =>
    [
      entry.id,
      entry.createdAt,
      entry.participantCode,
      entry.device,
      entry.browser,
      entry.profile,
      entry.assistance,
      entry.durationMinutes,
      entry.completedJourney,
      ...ratingQuestions.map((question) => entry.ratings[question.key]),
      entry.usefulAction,
      entry.difficulty,
      entry.priorityImprovement,
      entry.concern,
    ]
      .map(toCsvValue)
      .join(','),
  )

  downloadTextFile(
    'retours-utilisateurs-resilience-976.csv',
    [headers.join(','), ...rows].join('\n'),
    'text/csv;charset=utf-8',
  )
}

onMounted(() => {
  loadSavedFeedback()
  browser.value = window.navigator.userAgent.slice(0, 120)
})
</script>

<template>
  <section class="page page--narrow">
    <div class="stack">
      <p class="eyebrow">Expérimentation utilisateurs</p>
      <h1>Questionnaire de test</h1>

      <section class="panel experiment-summary">
        <strong>{{ submissionsCount }} retour(s) enregistré(s)</strong>
        <span>
          Base SQLite côté serveur quand elle est active, avec copie locale de
          secours sur cet appareil.
        </span>
        <small v-if="saveStatusLabel" aria-live="polite">
          {{ saveStatusLabel }}
        </small>
      </section>

      <form
        class="panel stack experiment-form"
        @submit.prevent="submitFeedback"
      >
        <fieldset class="form-fieldset">
          <legend class="section-title">Session</legend>
          <div class="form-grid">
            <label class="form-row" for="participant-code">
              <span>Code participant</span>
              <input
                id="participant-code"
                v-model="participantCode"
                class="text-input"
                maxlength="20"
                type="text"
              />
            </label>

            <label class="form-row" for="experiment-device">
              <span>Appareil</span>
              <select
                id="experiment-device"
                v-model="device"
                class="text-input"
              >
                <option value="smartphone">Smartphone</option>
                <option value="ordinateur">Ordinateur</option>
                <option value="tablette">Tablette</option>
              </select>
            </label>

            <label class="form-row" for="experiment-profile">
              <span>Profil général</span>
              <select
                id="experiment-profile"
                v-model="profile"
                class="text-input"
              >
                <option value="famille">Famille</option>
                <option value="jeune">Jeune</option>
                <option value="senior">Senior</option>
                <option value="aidant">Aidant</option>
                <option value="relais">Relais territorial</option>
                <option value="autre">Autre</option>
              </select>
            </label>

            <label class="form-row" for="experiment-assistance">
              <span>Aide reçue</span>
              <select
                id="experiment-assistance"
                v-model="assistance"
                class="text-input"
              >
                <option value="aucune">Aucune</option>
                <option value="faible">Faible</option>
                <option value="importante">Importante</option>
              </select>
            </label>

            <label class="form-row" for="experiment-duration">
              <span>Durée totale en minutes</span>
              <input
                id="experiment-duration"
                v-model.number="durationMinutes"
                class="number-input"
                max="90"
                min="0"
                type="number"
              />
            </label>

            <label class="check-row experiment-check">
              <input v-model="completedJourney" type="checkbox" />
              <span>
                <strong>Parcours terminé</strong>
                <small
                  >Diagnostic, résultats et au moins un livrable
                  consulté.</small
                >
              </span>
            </label>
          </div>

          <label class="form-row" for="experiment-browser">
            <span>Navigateur</span>
            <input
              id="experiment-browser"
              v-model="browser"
              class="text-input"
              type="text"
            />
          </label>
        </fieldset>

        <fieldset class="form-fieldset">
          <legend class="section-title">Évaluation</legend>
          <p class="muted">1 = pas du tout, 3 = moyen, 5 = tout à fait.</p>
          <div class="rating-grid">
            <label
              v-for="question in ratingQuestions"
              :key="question.key"
              class="rating-row"
            >
              <span>{{ question.label }}</span>
              <select v-model.number="ratings[question.key]" class="text-input">
                <option
                  v-for="score in [1, 2, 3, 4, 5]"
                  :key="score"
                  :value="score"
                >
                  {{ score }}
                </option>
              </select>
            </label>
          </div>
        </fieldset>

        <fieldset class="form-fieldset">
          <legend class="section-title">Commentaires</legend>
          <label class="form-row" for="useful-action">
            <span>Quelle action utile avez-vous découverte ?</span>
            <textarea
              id="useful-action"
              v-model="usefulAction"
              class="text-input textarea"
            />
          </label>

          <label class="form-row" for="difficulty">
            <span>Quel élément vous a semblé difficile ou peu clair ?</span>
            <textarea
              id="difficulty"
              v-model="difficulty"
              class="text-input textarea"
            />
          </label>

          <label class="form-row" for="priority-improvement">
            <span>Quelle amélioration vous paraît prioritaire ?</span>
            <textarea
              id="priority-improvement"
              v-model="priorityImprovement"
              class="text-input textarea"
            />
          </label>

          <label class="form-row" for="concern">
            <span>Y a-t-il une recommandation inadaptée ou préoccupante ?</span>
            <textarea
              id="concern"
              v-model="concern"
              class="text-input textarea"
            />
          </label>
        </fieldset>

        <div class="cluster">
          <AppButton type="submit">Enregistrer le retour</AppButton>
          <AppButton
            variant="secondary"
            :disabled="submissionsCount === 0"
            @click="exportCsv"
          >
            Export CSV
          </AppButton>
          <AppButton
            variant="secondary"
            :disabled="submissionsCount === 0"
            @click="exportJson"
          >
            Export JSON
          </AppButton>
        </div>
      </form>

      <section v-if="lastSubmission" class="panel stack">
        <h2 class="section-title">Dernier retour</h2>
        <div class="quality-list">
          <div class="quality-row">
            <strong>Code</strong>
            <span>{{ lastSubmission.participantCode }}</span>
            <small>{{ lastSubmission.createdAt }}</small>
          </div>
          <div class="quality-row">
            <strong>Durée</strong>
            <span>{{ lastSubmission.durationMinutes }} min</span>
            <small
              >{{ lastSubmission.device }} -
              {{ lastSubmission.assistance }}</small
            >
          </div>
        </div>
      </section>
    </div>
  </section>
</template>
