<script setup lang="ts">
/* global AbortController, Blob, fetch, URL */
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
    'visitorId',
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
      entry.visitorId,
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
      <p class="eyebrow">{{ t('userExperiment.eyebrow') }}</p>
      <h1>{{ t('userExperiment.title') }}</h1>

      <section class="panel experiment-summary">
        <strong>{{ t('userExperiment.summary.submissions', { count: submissionsCount }) }}</strong>
        <span>
          {{ t('userExperiment.summary.description') }}
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
          <AppButton type="submit">{{ t('userExperiment.actions.submit') }}</AppButton>
          <AppButton
            variant="secondary"
            :disabled="submissionsCount === 0"
            @click="exportCsv"
          >
            {{ t('userExperiment.actions.exportCsv') }}
          </AppButton>
          <AppButton
            variant="secondary"
            :disabled="submissionsCount === 0"
            @click="exportJson"
          >
            {{ t('userExperiment.actions.exportJson') }}
          </AppButton>
        </div>
      </form>

      <section v-if="lastSubmission" class="panel stack">
        <h2 class="section-title">{{ t('userExperiment.lastSubmission.title') }}</h2>
        <div class="quality-list">
          <div class="quality-row">
            <strong>{{ t('userExperiment.lastSubmission.code') }}</strong>
            <span>{{ lastSubmission.participantCode }}</span>
            <small>{{ lastSubmission.createdAt }}</small>
          </div>
          <div class="quality-row">
            <strong>{{ t('userExperiment.lastSubmission.duration') }}</strong>
            <span
              >{{ lastSubmission.durationMinutes }}
              {{ t('userExperiment.lastSubmission.minutesSuffix') }}</span
            >
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
