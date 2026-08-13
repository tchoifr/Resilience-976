<script setup lang="ts">
/* global AbortController, fetch */
import { computed, onMounted, ref } from 'vue'

import AppButton from '@/components/ui/AppButton.vue'
import { getVisitorId, trackEvent } from '@/shared/analytics/analytics.service'
import { useI18n } from '@/shared/i18n/i18n.service'

const { t } = useI18n()

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
  { key: 'objective' },
  { key: 'questions' },
  { key: 'autonomy' },
  { key: 'score' },
  { key: 'priorities' },
  { key: 'actions' },
  { key: 'deliverables' },
  { key: 'trust' },
  { key: 'officialWarnings' },
  { key: 'recommendation' },
] as const

type RatingKey = (typeof ratingQuestions)[number]['key']
type FeedbackSaveStatus = 'idle' | 'saving' | 'database' | 'local'

interface ExperimentFeedback {
  id: string
  createdAt: string
  visitorId: string
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
    return t('userExperiment.summary.statusSaving')
  }

  if (feedbackSaveStatus.value === 'database') {
    return t('userExperiment.summary.statusDatabase')
  }

  if (feedbackSaveStatus.value === 'local') {
    return t('userExperiment.summary.statusLocal')
  }

  return ''
})

// Les libelles sont ceux des listes deroulantes du formulaire : reafficher la
// valeur brute ('smartphone') ferait lire au visiteur autre chose que ce qu'il
// a choisi.
const deviceLabels: Record<string, string> = {
  smartphone: 'userExperiment.session.deviceSmartphone',
  ordinateur: 'userExperiment.session.deviceComputer',
  tablette: 'userExperiment.session.deviceTablet',
}
const profileLabels: Record<string, string> = {
  famille: 'userExperiment.session.profileFamily',
  jeune: 'userExperiment.session.profileYoung',
  senior: 'userExperiment.session.profileSenior',
  aidant: 'userExperiment.session.profileHelper',
  relais: 'userExperiment.session.profileRelay',
  autre: 'userExperiment.session.profileOther',
}
const assistanceLabels: Record<string, string> = {
  aucune: 'userExperiment.session.assistanceNone',
  faible: 'userExperiment.session.assistanceLow',
  importante: 'userExperiment.session.assistanceHigh',
}

// Une valeur inconnue (retour enregistre avant un changement de formulaire)
// est reaffichee telle quelle plutot que remplacee par une cle technique.
function labelFor(labels: Record<string, string>, value: string): string {
  const key = labels[value]

  return key ? t(key) : value
}

function deviceLabel(value: string): string {
  return labelFor(deviceLabels, value)
}

function profileLabel(value: string): string {
  return labelFor(profileLabels, value)
}

function assistanceLabel(value: string): string {
  return labelFor(assistanceLabels, value)
}

function formatDateTime(iso: string): string {
  const date = new Date(iso)

  if (Number.isNaN(date.getTime())) {
    return iso
  }

  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(date)
}

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
  return window.crypto.randomUUID()
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
    visitorId: getVisitorId(),
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

onMounted(() => {
  loadSavedFeedback()
  browser.value = window.navigator.userAgent.slice(0, 120)
})
</script>

<template>
  <section class="page page--narrow">
    <div class="stack">
      <p class="eyebrow">{{ t('userExperiment.eyebrow') }}</p>
      <h1>{{ t('userExperiment.title') }}</h1>
      <p class="muted">{{ t('userExperiment.intro') }}</p>

      <section class="panel experiment-summary">
        <strong>{{ t('userExperiment.summary.submissions', { count: submissionsCount }) }}</strong>
        <small v-if="saveStatusLabel" aria-live="polite">
          {{ saveStatusLabel }}
        </small>
      </section>

      <form
        class="panel stack experiment-form"
        @submit.prevent="submitFeedback"
      >
        <fieldset class="form-fieldset">
          <legend class="section-title">{{ t('userExperiment.session.legend') }}</legend>
          <div class="form-grid">
            <label class="form-row" for="experiment-device">
              <span>{{ t('userExperiment.session.device') }}</span>
              <select
                id="experiment-device"
                v-model="device"
                class="text-input"
              >
                <option value="smartphone">{{ t('userExperiment.session.deviceSmartphone') }}</option>
                <option value="ordinateur">{{ t('userExperiment.session.deviceComputer') }}</option>
                <option value="tablette">{{ t('userExperiment.session.deviceTablet') }}</option>
              </select>
            </label>

            <label class="form-row" for="experiment-profile">
              <span>{{ t('userExperiment.session.profile') }}</span>
              <select
                id="experiment-profile"
                v-model="profile"
                class="text-input"
              >
                <option value="famille">{{ t('userExperiment.session.profileFamily') }}</option>
                <option value="jeune">{{ t('userExperiment.session.profileYoung') }}</option>
                <option value="senior">{{ t('userExperiment.session.profileSenior') }}</option>
                <option value="aidant">{{ t('userExperiment.session.profileHelper') }}</option>
                <option value="relais">{{ t('userExperiment.session.profileRelay') }}</option>
                <option value="autre">{{ t('userExperiment.session.profileOther') }}</option>
              </select>
            </label>

            <label class="form-row" for="experiment-assistance">
              <span>{{ t('userExperiment.session.assistance') }}</span>
              <select
                id="experiment-assistance"
                v-model="assistance"
                class="text-input"
              >
                <option value="aucune">{{ t('userExperiment.session.assistanceNone') }}</option>
                <option value="faible">{{ t('userExperiment.session.assistanceLow') }}</option>
                <option value="importante">{{ t('userExperiment.session.assistanceHigh') }}</option>
              </select>
            </label>

            <label class="form-row" for="experiment-duration">
              <span>{{ t('userExperiment.session.duration') }}</span>
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
                <strong>{{ t('userExperiment.session.completed') }}</strong>
                <small>{{ t('userExperiment.session.completedHelp') }}</small>
              </span>
            </label>
          </div>
        </fieldset>

        <fieldset class="form-fieldset">
          <legend class="section-title">{{ t('userExperiment.evaluation.legend') }}</legend>
          <p class="muted">{{ t('userExperiment.evaluation.scaleHelp') }}</p>
          <div class="rating-grid">
            <label
              v-for="question in ratingQuestions"
              :key="question.key"
              class="rating-row"
            >
              <span>{{ t(`userExperiment.evaluation.${question.key}`) }}</span>
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
          <legend class="section-title">{{ t('userExperiment.comments.legend') }}</legend>
          <label class="form-row" for="useful-action">
            <span>{{ t('userExperiment.comments.usefulAction') }}</span>
            <textarea
              id="useful-action"
              v-model="usefulAction"
              class="text-input textarea"
            />
          </label>

          <label class="form-row" for="difficulty">
            <span>{{ t('userExperiment.comments.difficulty') }}</span>
            <textarea
              id="difficulty"
              v-model="difficulty"
              class="text-input textarea"
            />
          </label>

          <label class="form-row" for="priority-improvement">
            <span>{{ t('userExperiment.comments.priorityImprovement') }}</span>
            <textarea
              id="priority-improvement"
              v-model="priorityImprovement"
              class="text-input textarea"
            />
          </label>

          <label class="form-row" for="concern">
            <span>{{ t('userExperiment.comments.concern') }}</span>
            <textarea
              id="concern"
              v-model="concern"
              class="text-input textarea"
            />
          </label>
        </fieldset>

        <div class="cluster">
          <AppButton type="submit" icon="check">{{
            t('userExperiment.actions.submit')
          }}</AppButton>
        </div>
      </form>

      <!-- Les valeurs enregistrees sont des codes ('smartphone', 'aucune',
           date ISO) : elles sont reaffichees avec les libelles du formulaire
           et une date lisible, pour que le visiteur relise ce qu'il a saisi. -->
      <section v-if="lastSubmission" class="panel stack">
        <h2 class="section-title">{{ t('userExperiment.lastSubmission.title') }}</h2>
        <dl class="compact-definitions">
          <div>
            <dt>{{ t('userExperiment.lastSubmission.sentAt') }}</dt>
            <dd>{{ formatDateTime(lastSubmission.createdAt) }}</dd>
          </div>
          <div>
            <dt>{{ t('userExperiment.lastSubmission.code') }}</dt>
            <dd class="experiment-code">{{ lastSubmission.participantCode }}</dd>
          </div>
          <div>
            <dt>{{ t('userExperiment.session.device') }}</dt>
            <dd>{{ deviceLabel(lastSubmission.device) }}</dd>
          </div>
          <div>
            <dt>{{ t('userExperiment.session.profile') }}</dt>
            <dd>{{ profileLabel(lastSubmission.profile) }}</dd>
          </div>
          <div>
            <dt>{{ t('userExperiment.session.assistance') }}</dt>
            <dd>{{ assistanceLabel(lastSubmission.assistance) }}</dd>
          </div>
          <div>
            <dt>{{ t('userExperiment.lastSubmission.duration') }}</dt>
            <dd>
              {{ lastSubmission.durationMinutes }}
              {{ t('userExperiment.lastSubmission.minutesSuffix') }}
            </dd>
          </div>
          <div>
            <dt>{{ t('userExperiment.session.completed') }}</dt>
            <dd>{{ lastSubmission.completedJourney ? t('common.yes') : t('common.no') }}</dd>
          </div>
        </dl>
      </section>
    </div>
  </section>
</template>
