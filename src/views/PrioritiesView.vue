<script setup lang="ts">
/* global fetch */
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'

import { quizQuestions, scenarios, videos } from '@/features/assessment/services/content.service'
import type { AssessmentDomain } from '@/features/assessment/types/question'
import { getDomainLabel, useI18n } from '@/shared/i18n/i18n.service'

const { t } = useI18n()

interface DiagnosticStats {
  domainPriority: Array<{ domain: string; averageScore: number; respondentCount: number }>
}

interface QuizStats {
  questionPriority: Array<{
    id: string
    risk: string
    correctRate: number
    totalAnswered: number
  }>
}

interface VideoStats {
  videoPriority: Array<{ id: string; completionRate: number; totalEngaged: number }>
}

interface ScenarioStats {
  stepPriority: Array<{
    scenarioId: string
    stepId: string
    averageScore: number
    totalResponses: number
  }>
}

type ModuleKey = 'diagnostic' | 'quiz' | 'video' | 'scenario'

interface CombinedPriorityItem {
  key: string
  module: ModuleKey
  label: string
  score: number
  scoreSuffix: string
  affected: number
  affectedLabelKey: string
  link: string
  impact: number
}

function resolveEndpoint(envValue: string | undefined, path: string): string {
  if (envValue) {
    return envValue
  }

  return import.meta.env.PROD ? `https://resilience-976-analytics.onrender.com${path}` : path
}

const diagnosticEndpoint = resolveEndpoint(
  import.meta.env.VITE_DIAGNOSTIC_STATS_ENDPOINT,
  '/api/diagnostic-responses/stats',
)
const quizEndpoint = resolveEndpoint(import.meta.env.VITE_QUIZ_STATS_ENDPOINT, '/api/quiz-results/stats')
const videoEndpoint = resolveEndpoint(
  import.meta.env.VITE_VIDEO_STATS_ENDPOINT,
  '/api/video-progress/stats',
)
const scenarioEndpoint = resolveEndpoint(
  import.meta.env.VITE_SCENARIO_STATS_ENDPOINT,
  '/api/scenario-results/stats',
)

const statsEnabled = import.meta.env.DEV
  ? import.meta.env.VITE_ANALYTICS_ENABLED !== 'false'
  : import.meta.env.VITE_ANALYTICS_ENABLED === 'true'

const diagnosticStats = ref<DiagnosticStats | null>(null)
const quizStats = ref<QuizStats | null>(null)
const videoStats = ref<VideoStats | null>(null)
const scenarioStats = ref<ScenarioStats | null>(null)
const isLoading = ref(true)

async function fetchJson<T>(endpoint: string): Promise<T | null> {
  try {
    const response = await fetch(endpoint)
    return response.ok ? ((await response.json()) as T) : null
  } catch {
    return null
  }
}

// Severity (how far from 100) times reach (how many people it affects) —
// a weak score touching one respondent isn't a priority, it's noise; a
// mediocre score touching everyone is. Every module's metric is already a
// 0-100 scale where lower is worse, so they combine directly.
function computeImpact(score: number, affected: number): number {
  return (100 - score) * affected
}

const diagnosticItems = computed<CombinedPriorityItem[]>(() =>
  (diagnosticStats.value?.domainPriority ?? []).map((item) => ({
    key: `diagnostic_${item.domain}`,
    module: 'diagnostic',
    label: getDomainLabel(item.domain as AssessmentDomain),
    score: item.averageScore,
    scoreSuffix: '/100',
    affected: item.respondentCount,
    affectedLabelKey: 'priorities.affected.respondents',
    link: '/tableau-de-bord/diagnostics',
    impact: computeImpact(item.averageScore, item.respondentCount),
  })),
)

const quizItems = computed<CombinedPriorityItem[]>(() =>
  (quizStats.value?.questionPriority ?? []).map((item) => {
    const question = quizQuestions.value.find((entry) => entry.id === item.id)

    return {
      key: `quiz_${item.id}`,
      module: 'quiz',
      label: question?.text ?? item.id,
      score: item.correctRate,
      scoreSuffix: '%',
      affected: item.totalAnswered,
      affectedLabelKey: 'priorities.affected.respondents',
      link: '/tableau-de-bord/quiz',
      impact: computeImpact(item.correctRate, item.totalAnswered),
    }
  }),
)

const videoItems = computed<CombinedPriorityItem[]>(() =>
  (videoStats.value?.videoPriority ?? []).map((item) => {
    const video = videos.value.find((entry) => entry.id === item.id)

    return {
      key: `video_${item.id}`,
      module: 'video',
      label: video?.title ?? item.id,
      score: item.completionRate,
      scoreSuffix: '%',
      affected: item.totalEngaged,
      affectedLabelKey: 'priorities.affected.engaged',
      link: '/tableau-de-bord/formations',
      impact: computeImpact(item.completionRate, item.totalEngaged),
    }
  }),
)

const scenarioItems = computed<CombinedPriorityItem[]>(() =>
  (scenarioStats.value?.stepPriority ?? []).map((item) => {
    const scenario = scenarios.value.find((entry) => entry.id === item.scenarioId)
    const step = scenario?.steps.find((entry) => entry.id === item.stepId)

    return {
      key: `scenario_${item.scenarioId}_${item.stepId}`,
      module: 'scenario',
      label: `${scenario?.title ?? item.scenarioId} — ${step?.prompt ?? item.stepId}`,
      score: item.averageScore,
      scoreSuffix: '/100',
      affected: item.totalResponses,
      affectedLabelKey: 'priorities.affected.respondents',
      link: '/tableau-de-bord/mises-en-situation',
      impact: computeImpact(item.averageScore, item.totalResponses),
    }
  }),
)

const combinedItems = computed(() =>
  [...diagnosticItems.value, ...quizItems.value, ...videoItems.value, ...scenarioItems.value]
    .filter((item) => item.impact > 0)
    .sort((a, b) => b.impact - a.impact)
    .slice(0, 10),
)

onMounted(async () => {
  if (!statsEnabled) {
    isLoading.value = false
    return
  }

  const [diagnostic, quiz, video, scenario] = await Promise.all([
    fetchJson<DiagnosticStats>(diagnosticEndpoint),
    fetchJson<QuizStats>(quizEndpoint),
    fetchJson<VideoStats>(videoEndpoint),
    fetchJson<ScenarioStats>(scenarioEndpoint),
  ])

  diagnosticStats.value = diagnostic
  quizStats.value = quiz
  videoStats.value = video
  scenarioStats.value = scenario
  isLoading.value = false
})
</script>

<template>
  <section class="page">
    <div class="dashboard-layout">
      <header class="dashboard-hero">
        <p class="eyebrow">{{ t('priorities.eyebrow') }}</p>
        <h1>{{ t('priorities.title') }}</h1>
        <p>{{ t('priorities.intro') }}</p>
      </header>

      <div class="cluster">
        <RouterLink class="link-button link-button--secondary" to="/tableau-de-bord">
          {{ t('priorities.backToDashboard') }}
        </RouterLink>
      </div>

      <p v-if="isLoading" class="muted">{{ t('priorities.loading') }}</p>
      <p v-else-if="combinedItems.length === 0" class="muted">
        {{ t('priorities.noData') }}
      </p>

      <section v-else class="panel dashboard-panel">
        <h2>{{ t('priorities.list.title') }}</h2>
        <p class="muted">{{ t('priorities.list.intro') }}</p>
        <ol class="priority-list">
          <li v-for="(item, index) in combinedItems" :key="item.key" class="priority-row">
            <span class="priority-row__rank">{{ index + 1 }}</span>
            <RouterLink :to="item.link" class="priority-row__label">
              <span class="priority-row__module">{{ t(`priorities.modules.${item.module}`) }}</span>
              {{ item.label }}
            </RouterLink>
            <span class="priority-row__meta">
              {{ item.score }}{{ item.scoreSuffix }} ·
              {{ t(item.affectedLabelKey, { count: item.affected }) }}
            </span>
          </li>
        </ol>
      </section>
    </div>
  </section>
</template>

<style scoped>
.priority-row__module {
  display: block;
  color: var(--color-text);
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.priority-row__label {
  color: var(--color-text-strong);
  text-decoration: none;
}

.priority-row__label:hover,
.priority-row__label:focus-visible {
  text-decoration: underline;
}
</style>
