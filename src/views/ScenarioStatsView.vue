<script setup lang="ts">
/* global fetch */
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'

import StackedBar from '@/components/ui/StackedBar.vue'
import TrendSparkline from '@/components/ui/TrendSparkline.vue'
import { scenarios } from '@/features/assessment/services/content.service'
import { useI18n } from '@/shared/i18n/i18n.service'

const { t } = useI18n()

interface ScenarioStats {
  generatedAt: string
  total: number
  scenarios: Array<{
    id: string
    sessions: number
    stepBreakdown: Array<{
      id: string
      options: Array<{ id: string; label: string; score: number; count: number }>
    }>
  }>
  stepPriority: Array<{
    scenarioId: string
    stepId: string
    averageScore: number
    totalResponses: number
  }>
  trend: Array<{ date: string; count: number }>
}

const defaultStatsEndpoint = import.meta.env.PROD
  ? 'https://resilience-976-analytics.onrender.com/api/scenario-results/stats'
  : '/api/scenario-results/stats'
const statsEndpoint = import.meta.env.VITE_SCENARIO_STATS_ENDPOINT ?? defaultStatsEndpoint
const statsEnabled = import.meta.env.DEV
  ? import.meta.env.VITE_ANALYTICS_ENABLED !== 'false'
  : import.meta.env.VITE_ANALYTICS_ENABLED === 'true'

const stats = ref<ScenarioStats | null>(null)
const isLoading = ref(true)

const optionColors = { safest: '#00394b', other: '#66b8bf' }

const scenarioRows = computed(() =>
  (stats.value?.scenarios ?? [])
    .filter((row) => row.sessions > 0)
    .map((row) => {
      const scenario = scenarios.value.find((item) => item.id === row.id)

      return {
        id: row.id,
        title: scenario?.title ?? row.id,
        sessions: row.sessions,
        steps: row.stepBreakdown.map((stepRow) => {
          const step = scenario?.steps.find((item) => item.id === stepRow.id)

          return {
            id: stepRow.id,
            label: step?.prompt ?? stepRow.id,
            segments: stepRow.options.map((option) => ({
              key: option.id,
              label: option.label,
              count: option.count,
              color: option.score === 100 ? optionColors.safest : optionColors.other,
            })),
          }
        }),
      }
    }),
)

const priorityItems = computed(() =>
  (stats.value?.stepPriority ?? []).map((item) => {
    const scenario = scenarios.value.find((entry) => entry.id === item.scenarioId)
    const step = scenario?.steps.find((entry) => entry.id === item.stepId)

    return {
      key: `${item.scenarioId}_${item.stepId}`,
      scenarioTitle: scenario?.title ?? item.scenarioId,
      label: step?.prompt ?? item.stepId,
      averageScore: item.averageScore,
      totalResponses: item.totalResponses,
    }
  }),
)

const trendPoints = computed(
  () => stats.value?.trend.map((point) => ({ date: point.date, value: point.count })) ?? [],
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
        <p class="eyebrow">{{ t('scenarioStats.eyebrow') }}</p>
        <h1>{{ t('scenarioStats.title') }}</h1>
        <p>{{ t('scenarioStats.intro') }}</p>
      </header>

      <div class="cluster">
        <RouterLink class="link-button link-button--secondary" to="/tableau-de-bord">
          {{ t('scenarioStats.backToDashboard') }}
        </RouterLink>
      </div>

      <p v-if="isLoading" class="muted">{{ t('scenarioStats.loading') }}</p>
      <p v-else-if="!stats || stats.total === 0" class="muted">
        {{ t('scenarioStats.noData') }}
      </p>

      <template v-else>
        <section class="dashboard-summary" aria-label="Indicateurs principaux">
          <article class="metric-card metric-card--primary">
            <span>{{ t('scenarioStats.summary.total') }}</span>
            <strong>{{ stats.total }}</strong>
          </article>
        </section>

        <section class="panel dashboard-panel">
          <h2>{{ t('scenarioStats.priority.title') }}</h2>
          <p class="muted">{{ t('scenarioStats.priority.intro') }}</p>
          <ol class="priority-list">
            <li
              v-for="(item, index) in priorityItems"
              :key="item.key"
              class="priority-row"
            >
              <span class="priority-row__rank">{{ index + 1 }}</span>
              <span class="priority-row__label">{{ item.scenarioTitle }} — {{ item.label }}</span>
              <span class="priority-row__meta">
                {{
                  t('scenarioStats.priority.averageScore', { score: item.averageScore })
                }}
                ·
                {{
                  t('scenarioStats.priority.respondents', { count: item.totalResponses })
                }}
              </span>
            </li>
          </ol>
        </section>

        <section class="panel dashboard-panel">
          <h2>{{ t('scenarioStats.breakdown.title') }}</h2>
          <div class="stack">
            <div v-for="scenarioRow in scenarioRows" :key="scenarioRow.id" class="stack">
              <p>
                <strong>{{ scenarioRow.title }}</strong>
                — {{ scenarioRow.sessions }} {{ t('scenarioStats.breakdown.sessions') }}
              </p>
              <StackedBar
                v-for="step in scenarioRow.steps"
                :key="step.id"
                :label="step.label"
                :segments="step.segments"
              />
            </div>
          </div>
        </section>

        <section v-if="trendPoints.length > 0" class="panel dashboard-panel">
          <h2>{{ t('scenarioStats.trend.title') }}</h2>
          <p class="muted">{{ t('scenarioStats.trend.intro') }}</p>
          <TrendSparkline :points="trendPoints" :label="t('scenarioStats.trend.title')" />
        </section>
      </template>
    </div>
  </section>
</template>
