<script setup lang="ts">
/* global fetch */
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'

import StackedBar from '@/components/ui/StackedBar.vue'
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
      </template>
    </div>
  </section>
</template>
