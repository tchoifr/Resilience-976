<script setup lang="ts">
/* global fetch */
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'

import BarChart from '@/components/ui/BarChart.vue'
import StackedBar from '@/components/ui/StackedBar.vue'
import { questions } from '@/features/assessment/services/content.service'
import type { AssessmentDomain } from '@/features/assessment/types/question'
import { getDomainLabel, useI18n } from '@/shared/i18n/i18n.service'

const { t } = useI18n()

interface DiagnosticStats {
  generatedAt: string
  totalStarted: number
  total: number
  averageGlobalScore: number
  domainAverages: Record<string, number>
  levelCounts: Record<'insufficient' | 'fragile' | 'good' | 'very_good', number>
  questionBreakdown: Array<{
    id: string
    domain: string
    answers: Array<{ id: string; score: number; count: number }>
  }>
}

const defaultStatsEndpoint = import.meta.env.PROD
  ? 'https://resilience-976-analytics.onrender.com/api/diagnostic-responses/stats'
  : '/api/diagnostic-responses/stats'
const statsEndpoint =
  import.meta.env.VITE_DIAGNOSTIC_STATS_ENDPOINT ?? defaultStatsEndpoint
const statsEnabled = import.meta.env.DEV
  ? import.meta.env.VITE_ANALYTICS_ENABLED !== 'false'
  : import.meta.env.VITE_ANALYTICS_ENABLED === 'true'

const stats = ref<DiagnosticStats | null>(null)
const isLoading = ref(true)

const summaryCards = computed(() => [
  {
    label: t('diagnosticStats.summary.totalStarted'),
    value: stats.value ? stats.value.totalStarted.toLocaleString('fr-FR') : '—',
    tone: 'neutral',
  },
  {
    label: t('diagnosticStats.summary.total'),
    value: stats.value ? stats.value.total.toLocaleString('fr-FR') : '—',
    tone: 'primary',
  },
  {
    label: t('diagnosticStats.summary.averageScore'),
    value: stats.value ? `${stats.value.averageGlobalScore}/100` : '—',
    tone: 'green',
  },
])

const domainOrder: AssessmentDomain[] = [
  'household',
  'housing',
  'water_food',
  'energy_communication',
  'health_documents',
  'behaviors',
]

const domainItems = computed(() =>
  domainOrder.map((domain) => ({
    key: domain,
    label: getDomainLabel(domain),
    value: stats.value?.domainAverages[domain] ?? 0,
  })),
)

const levelOrder = ['insufficient', 'fragile', 'good', 'very_good'] as const

const levelItems = computed(() =>
  levelOrder.map((level) => ({
    key: level,
    label: t(`scoreLevels.${level}.label`),
    value: stats.value?.levelCounts[level] ?? 0,
  })),
)

const answerColors: Record<string, string> = {
  none: '#66b8bf',
  partial: '#00a1ad',
  ready: '#00394b',
}
const answerLabelKeys: Record<string, string> = {
  none: 'diagnosticStats.questionBreakdown.answerNone',
  partial: 'diagnosticStats.questionBreakdown.answerPartial',
  ready: 'diagnosticStats.questionBreakdown.answerReady',
}

const questionRows = computed(() =>
  (stats.value?.questionBreakdown ?? []).map((row) => {
    const question = questions.value.find((item) => item.id === row.id)

    return {
      id: row.id,
      label: question?.text ?? row.id,
      domainLabel: getDomainLabel(row.domain as AssessmentDomain),
      segments: row.answers.map((answer) => ({
        key: answer.id,
        label: t(answerLabelKeys[answer.id] ?? answer.id),
        count: answer.count,
        color: answerColors[answer.id] ?? '#66b8bf',
      })),
    }
  }),
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
        <p class="eyebrow">{{ t('diagnosticStats.eyebrow') }}</p>
        <h1>{{ t('diagnosticStats.title') }}</h1>
        <p>{{ t('diagnosticStats.intro') }}</p>
      </header>

      <div class="cluster">
        <RouterLink class="link-button link-button--secondary" to="/tableau-de-bord">
          {{ t('diagnosticStats.backToDashboard') }}
        </RouterLink>
      </div>

      <p v-if="isLoading" class="muted">{{ t('diagnosticStats.loading') }}</p>
      <p v-else-if="!stats || stats.total === 0" class="muted">
        {{ t('diagnosticStats.noData') }}
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
          <h2>{{ t('diagnosticStats.domains.title') }}</h2>
          <BarChart :items="domainItems" suffix="/100" :max="100" />
        </section>

        <section class="panel dashboard-panel">
          <h2>{{ t('diagnosticStats.levels.title') }}</h2>
          <BarChart :items="levelItems" />
        </section>

        <section class="panel dashboard-panel">
          <h2>{{ t('diagnosticStats.questionBreakdown.title') }}</h2>
          <div class="stack">
            <StackedBar
              v-for="row in questionRows"
              :key="row.id"
              :label="`${row.domainLabel} — ${row.label}`"
              :segments="row.segments"
            />
          </div>
        </section>
      </template>
    </div>
  </section>
</template>
