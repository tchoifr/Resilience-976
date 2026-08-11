<script setup lang="ts">
/* global fetch */
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'

import StackedBar from '@/components/ui/StackedBar.vue'
import TrendSparkline from '@/components/ui/TrendSparkline.vue'
import { quizQuestions } from '@/features/assessment/services/content.service'
import { useI18n } from '@/shared/i18n/i18n.service'

const { t } = useI18n()

interface QuizStats {
  generatedAt: string
  total: number
  questionBreakdown: Array<{
    id: string
    risk: string
    totalAnswered: number
    correctCount: number
    options: Array<{ index: number; label: string; count: number }>
  }>
  questionPriority: Array<{
    id: string
    risk: string
    correctRate: number
    totalAnswered: number
  }>
  trend: Array<{ date: string; sessions: number; averageScorePercent: number }>
}

const defaultStatsEndpoint = import.meta.env.PROD
  ? 'https://resilience-976-analytics.onrender.com/api/quiz-results/stats'
  : '/api/quiz-results/stats'
const statsEndpoint = import.meta.env.VITE_QUIZ_STATS_ENDPOINT ?? defaultStatsEndpoint
const statsEnabled = import.meta.env.DEV
  ? import.meta.env.VITE_ANALYTICS_ENABLED !== 'false'
  : import.meta.env.VITE_ANALYTICS_ENABLED === 'true'

const stats = ref<QuizStats | null>(null)
const isLoading = ref(true)

const optionColors = { correct: '#00394b', other: '#66b8bf' }

const questionRows = computed(() =>
  (stats.value?.questionBreakdown ?? []).map((row) => {
    const question = quizQuestions.value.find((item) => item.id === row.id)

    return {
      id: row.id,
      label: question?.text ?? row.id,
      riskLabel: t(`quiz.riskLabels.${row.risk}`),
      segments: row.options.map((option) => ({
        key: `${row.id}_${option.index}`,
        label: option.label,
        count: option.count,
        color:
          question?.correctOptionIndex === option.index
            ? optionColors.correct
            : optionColors.other,
      })),
    }
  }),
)

const priorityItems = computed(() =>
  (stats.value?.questionPriority ?? []).map((item) => {
    const question = quizQuestions.value.find((entry) => entry.id === item.id)

    return {
      id: item.id,
      label: question?.text ?? item.id,
      riskLabel: t(`quiz.riskLabels.${item.risk}`),
      correctRate: item.correctRate,
      totalAnswered: item.totalAnswered,
    }
  }),
)

const trendPoints = computed(
  () =>
    stats.value?.trend.map((point) => ({
      date: point.date,
      value: point.averageScorePercent,
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
        <p class="eyebrow">{{ t('quizStats.eyebrow') }}</p>
        <h1>{{ t('quizStats.title') }}</h1>
        <p>{{ t('quizStats.intro') }}</p>
      </header>

      <div class="cluster">
        <RouterLink class="link-button link-button--secondary" to="/tableau-de-bord">
          {{ t('quizStats.backToDashboard') }}
        </RouterLink>
      </div>

      <p v-if="isLoading" class="muted">{{ t('quizStats.loading') }}</p>
      <p v-else-if="!stats || stats.total === 0" class="muted">
        {{ t('quizStats.noData') }}
      </p>

      <template v-else>
        <section class="dashboard-summary" aria-label="Indicateurs principaux">
          <article class="metric-card metric-card--primary">
            <span>{{ t('quizStats.summary.total') }}</span>
            <strong>{{ stats.total }}</strong>
          </article>
        </section>

        <section class="panel dashboard-panel">
          <h2>{{ t('quizStats.priority.title') }}</h2>
          <p class="muted">{{ t('quizStats.priority.intro') }}</p>
          <ol class="priority-list">
            <li
              v-for="(item, index) in priorityItems"
              :key="item.id"
              class="priority-row"
            >
              <span class="priority-row__rank">{{ index + 1 }}</span>
              <span class="priority-row__label">{{ item.riskLabel }} — {{ item.label }}</span>
              <span class="priority-row__meta">
                {{
                  t('quizStats.priority.correctRate', { rate: item.correctRate })
                }}
                ·
                {{
                  t('quizStats.priority.respondents', { count: item.totalAnswered })
                }}
              </span>
            </li>
          </ol>
        </section>

        <section class="panel dashboard-panel">
          <h2>{{ t('quizStats.questionBreakdown.title') }}</h2>
          <div class="stack">
            <StackedBar
              v-for="row in questionRows"
              :key="row.id"
              :label="`${row.riskLabel} — ${row.label}`"
              :segments="row.segments"
            />
          </div>
        </section>

        <section v-if="trendPoints.length > 0" class="panel dashboard-panel">
          <h2>{{ t('quizStats.trend.title') }}</h2>
          <p class="muted">{{ t('quizStats.trend.intro') }}</p>
          <TrendSparkline
            :points="trendPoints"
            :label="t('quizStats.trend.title')"
            suffix="%"
          />
        </section>
      </template>
    </div>
  </section>
</template>
