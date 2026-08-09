<script setup lang="ts">
/* global fetch */
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'

import BarChart from '@/components/ui/BarChart.vue'
import RatingDistributionBar from '@/components/ui/RatingDistributionBar.vue'
import { useI18n } from '@/shared/i18n/i18n.service'

const { t } = useI18n()

interface FeedbackStats {
  generatedAt: string
  total: number
  byDevice: Record<string, number>
  byProfile: Record<string, number>
  byAssistance: Record<string, number>
  completionRate: number
  averageDurationMinutes: number
  medianDurationMinutes: number
  ratingAverages: Record<string, number>
  overallRatingAverage: number
  ratingDistribution: Record<string, Record<'1' | '2' | '3' | '4' | '5', number>>
  recommendationRate: number
  commentsCount: number
  byDate: Array<{ date: string; count: number }>
  recentComments: Array<{
    createdAt: string
    usefulAction: string
    difficulty: string
    priorityImprovement: string
    concern: string
  }>
}

const ratingKeys = [
  'objective',
  'questions',
  'autonomy',
  'score',
  'priorities',
  'actions',
  'deliverables',
  'trust',
  'officialWarnings',
  'recommendation',
] as const

const deviceKeys = ['smartphone', 'ordinateur', 'tablette'] as const
const profileKeys = [
  'famille',
  'jeune',
  'senior',
  'aidant',
  'relais',
  'autre',
] as const
const assistanceKeys = ['aucune', 'faible', 'importante'] as const

const deviceLabelKeys: Record<(typeof deviceKeys)[number], string> = {
  smartphone: 'userExperiment.session.deviceSmartphone',
  ordinateur: 'userExperiment.session.deviceComputer',
  tablette: 'userExperiment.session.deviceTablet',
}
const profileLabelKeys: Record<(typeof profileKeys)[number], string> = {
  famille: 'userExperiment.session.profileFamily',
  jeune: 'userExperiment.session.profileYoung',
  senior: 'userExperiment.session.profileSenior',
  aidant: 'userExperiment.session.profileHelper',
  relais: 'userExperiment.session.profileRelay',
  autre: 'userExperiment.session.profileOther',
}
const assistanceLabelKeys: Record<(typeof assistanceKeys)[number], string> = {
  aucune: 'userExperiment.session.assistanceNone',
  faible: 'userExperiment.session.assistanceLow',
  importante: 'userExperiment.session.assistanceHigh',
}

const defaultStatsEndpoint = import.meta.env.PROD
  ? 'https://resilience-976-analytics.onrender.com/api/feedback/stats'
  : '/api/feedback/stats'
const statsEndpoint =
  import.meta.env.VITE_FEEDBACK_STATS_ENDPOINT ?? defaultStatsEndpoint
const statsEnabled = import.meta.env.DEV
  ? import.meta.env.VITE_ANALYTICS_ENABLED !== 'false'
  : import.meta.env.VITE_ANALYTICS_ENABLED === 'true'

const stats = ref<FeedbackStats | null>(null)
const isLoading = ref(true)

const summaryCards = computed(() => [
  {
    label: t('experimentStats.summary.total'),
    value: stats.value ? stats.value.total.toLocaleString('fr-FR') : '—',
    tone: 'primary',
  },
  {
    label: t('experimentStats.summary.completionRate'),
    value: stats.value ? `${stats.value.completionRate}%` : '—',
    tone: 'green',
  },
  {
    label: t('experimentStats.summary.medianDuration'),
    value: stats.value
      ? `${stats.value.medianDurationMinutes} ${t('experimentStats.summary.minutesSuffix')}`
      : '—',
    tone: 'neutral',
  },
  {
    label: t('experimentStats.summary.recommendationRate'),
    value: stats.value ? `${stats.value.recommendationRate}%` : '—',
    tone: 'orange',
  },
])

function breakdownRows(
  counts: Record<string, number> | undefined,
  keys: readonly string[],
  labelKeys: Record<string, string>,
) {
  return keys.map((key) => ({
    key,
    label: t(labelKeys[key] ?? key),
    value: counts?.[key] ?? 0,
  }))
}

const deviceRows = computed(() =>
  breakdownRows(stats.value?.byDevice, deviceKeys, deviceLabelKeys),
)
const profileRows = computed(() =>
  breakdownRows(stats.value?.byProfile, profileKeys, profileLabelKeys),
)
const assistanceRows = computed(() =>
  breakdownRows(stats.value?.byAssistance, assistanceKeys, assistanceLabelKeys),
)

const evaluationBarItems = computed(() =>
  ratingKeys.map((key) => ({
    key,
    label: t(`userExperiment.evaluation.${key}`),
    value: stats.value?.ratingAverages[key] ?? 0,
  })),
)

const evaluationDistributions = computed(() =>
  ratingKeys.map((key) => ({
    key,
    label: t(`userExperiment.evaluation.${key}`),
    distribution: stats.value?.ratingDistribution[key] ?? {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    },
  })),
)

const byDateItems = computed(
  () =>
    stats.value?.byDate.map((entry) => ({
      key: entry.date,
      label: entry.date,
      value: entry.count,
    })) ?? [],
)

onMounted(async () => {
  if (!statsEnabled) {
    isLoading.value = false
    return
  }

  try {
    const response = await fetch(statsEndpoint)

    if (response.ok) {
      stats.value = await response.json()
    }
  } catch {
    stats.value = null
  } finally {
    isLoading.value = false
  }
})
</script>

<template>
  <section class="page">
    <div class="dashboard-layout">
      <header class="dashboard-hero">
        <p class="eyebrow">{{ t('experimentStats.eyebrow') }}</p>
        <h1>{{ t('experimentStats.title') }}</h1>
        <p>{{ t('experimentStats.intro') }}</p>
      </header>

      <div class="cluster">
        <RouterLink class="link-button link-button--secondary" to="/tableau-de-bord">
          {{ t('experimentStats.backToDashboard') }}
        </RouterLink>
        <RouterLink
          class="link-button link-button--secondary"
          to="/experimentation-utilisateurs"
        >
          {{ t('experimentStats.openForm') }}
        </RouterLink>
      </div>

      <p v-if="isLoading" class="muted">{{ t('experimentStats.loading') }}</p>
      <p v-else-if="!stats || stats.total === 0" class="muted">
        {{ t('experimentStats.noData') }}
      </p>

      <template v-else>
        <section class="dashboard-summary" aria-label="Indicateurs principaux">
          <article
            v-for="card in summaryCards"
            :key="card.label"
            class="metric-card"
            :class="`metric-card--${card.tone}`"
          >
            <span>{{ card.label }}</span>
            <strong>{{ card.value }}</strong>
          </article>
        </section>

        <section class="panel dashboard-panel">
          <h2>{{ t('experimentStats.profile.title') }}</h2>
          <p class="muted">{{ t('experimentStats.profile.device') }}</p>
          <BarChart :items="deviceRows" />
          <p class="muted">{{ t('experimentStats.profile.profile') }}</p>
          <BarChart :items="profileRows" />
          <p class="muted">{{ t('experimentStats.profile.assistance') }}</p>
          <BarChart :items="assistanceRows" />
        </section>

        <section class="panel dashboard-panel">
          <div class="dashboard-section-heading">
            <h2>{{ t('experimentStats.evaluation.title') }}</h2>
            <span class="pill pill--warning">
              {{ t('experimentStats.evaluation.overall') }}
              : {{ stats.overallRatingAverage }}/5
            </span>
          </div>
          <BarChart :items="evaluationBarItems" suffix="/5" :max="5" />

          <h3 class="section-title">
            {{ t('experimentStats.evaluation.distributionAria') }}
          </h3>
          <div class="stack">
            <RatingDistributionBar
              v-for="row in evaluationDistributions"
              :key="row.key"
              :label="row.label"
              :distribution="row.distribution"
              :disagree-label="t('experimentStats.evaluation.disagree')"
              :neutral-label="t('experimentStats.evaluation.neutral')"
              :agree-label="t('experimentStats.evaluation.agree')"
            />
          </div>
        </section>

        <section class="panel dashboard-panel">
          <h2>{{ t('experimentStats.trend.title') }}</h2>
          <p class="muted">{{ t('experimentStats.trend.help') }}</p>
          <BarChart :items="byDateItems" />
        </section>

        <section class="panel dashboard-panel">
          <h2>{{ t('experimentStats.comments.title') }}</h2>
          <p class="muted">
            {{ t('experimentStats.comments.count', { count: stats.commentsCount }) }}
          </p>
          <p v-if="stats.recentComments.length === 0" class="muted">
            {{ t('experimentStats.comments.empty') }}
          </p>
          <div v-else class="stack">
            <article
              v-for="comment in stats.recentComments"
              :key="comment.createdAt"
              class="panel"
            >
              <small>{{ comment.createdAt }}</small>
              <p v-if="comment.usefulAction">
                <strong>{{ t('experimentStats.comments.usefulAction') }}</strong>
                {{ comment.usefulAction }}
              </p>
              <p v-if="comment.difficulty">
                <strong>{{ t('experimentStats.comments.difficulty') }}</strong>
                {{ comment.difficulty }}
              </p>
              <p v-if="comment.priorityImprovement">
                <strong>{{ t('experimentStats.comments.priorityImprovement') }}</strong>
                {{ comment.priorityImprovement }}
              </p>
              <p v-if="comment.concern">
                <strong>{{ t('experimentStats.comments.concern') }}</strong>
                {{ comment.concern }}
              </p>
            </article>
          </div>
        </section>
      </template>
    </div>
  </section>
</template>
