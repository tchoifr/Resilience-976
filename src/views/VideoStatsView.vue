<script setup lang="ts">
/* global fetch */
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'

import StackedBar from '@/components/ui/StackedBar.vue'
import TrendSparkline from '@/components/ui/TrendSparkline.vue'
import { videos } from '@/features/assessment/services/content.service'
import { useI18n } from '@/shared/i18n/i18n.service'

const { t } = useI18n()

interface VideoStats {
  generatedAt: string
  totalParticipants: number
  videos: Array<{
    id: string
    startedCount: number
    completedCount: number
    quizCorrectCount: number
  }>
  videoPriority: Array<{ id: string; completionRate: number; totalEngaged: number }>
  trend: Array<{ date: string; count: number }>
}

const defaultStatsEndpoint = import.meta.env.PROD
  ? 'https://resilience-976-analytics.onrender.com/api/video-progress/stats'
  : '/api/video-progress/stats'
const statsEndpoint = import.meta.env.VITE_VIDEO_STATS_ENDPOINT ?? defaultStatsEndpoint
const statsEnabled = import.meta.env.DEV
  ? import.meta.env.VITE_ANALYTICS_ENABLED !== 'false'
  : import.meta.env.VITE_ANALYTICS_ENABLED === 'true'

const stats = ref<VideoStats | null>(null)
const isLoading = ref(true)

const videoRows = computed(() =>
  (stats.value?.videos ?? []).map((row) => {
    const video = videos.value.find((item) => item.id === row.id)

    return {
      id: row.id,
      label: video?.title ?? row.id,
      quizCorrectCount: row.quizCorrectCount,
      segments: [
        {
          key: 'started',
          label: t('videoStats.breakdown.started'),
          count: row.startedCount,
          color: '#66b8bf',
        },
        {
          key: 'completed',
          label: t('videoStats.breakdown.completed'),
          count: row.completedCount,
          color: '#00394b',
        },
      ],
    }
  }),
)

const priorityItems = computed(() =>
  (stats.value?.videoPriority ?? []).map((item) => {
    const video = videos.value.find((entry) => entry.id === item.id)

    return {
      id: item.id,
      label: video?.title ?? item.id,
      completionRate: item.completionRate,
      totalEngaged: item.totalEngaged,
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
        <p class="eyebrow">{{ t('videoStats.eyebrow') }}</p>
        <h1>{{ t('videoStats.title') }}</h1>
        <p>{{ t('videoStats.intro') }}</p>
      </header>

      <div class="cluster">
        <RouterLink class="link-button link-button--secondary" to="/tableau-de-bord">
          {{ t('videoStats.backToDashboard') }}
        </RouterLink>
      </div>

      <p v-if="isLoading" class="muted">{{ t('videoStats.loading') }}</p>
      <p v-else-if="!stats || stats.totalParticipants === 0" class="muted">
        {{ t('videoStats.noData') }}
      </p>

      <template v-else>
        <section class="dashboard-summary" aria-label="Indicateurs principaux">
          <article class="metric-card metric-card--primary">
            <span>{{ t('videoStats.summary.total') }}</span>
            <strong>{{ stats.totalParticipants }}</strong>
          </article>
        </section>

        <section class="panel dashboard-panel">
          <h2>{{ t('videoStats.priority.title') }}</h2>
          <p class="muted">{{ t('videoStats.priority.intro') }}</p>
          <ol class="priority-list">
            <li
              v-for="(item, index) in priorityItems"
              :key="item.id"
              class="priority-row"
            >
              <span class="priority-row__rank">{{ index + 1 }}</span>
              <span class="priority-row__label">{{ item.label }}</span>
              <span class="priority-row__meta">
                {{
                  t('videoStats.priority.completionRate', { rate: item.completionRate })
                }}
                ·
                {{
                  t('videoStats.priority.engaged', { count: item.totalEngaged })
                }}
              </span>
            </li>
          </ol>
        </section>

        <section class="panel dashboard-panel">
          <h2>{{ t('videoStats.breakdown.title') }}</h2>
          <div class="stack">
            <div v-for="row in videoRows" :key="row.id">
              <StackedBar :label="row.label" :segments="row.segments" />
              <p class="muted">
                {{ row.quizCorrectCount }} {{ t('videoStats.breakdown.quizCorrect') }}
              </p>
            </div>
          </div>
        </section>

        <section v-if="trendPoints.length > 0" class="panel dashboard-panel">
          <h2>{{ t('videoStats.trend.title') }}</h2>
          <p class="muted">{{ t('videoStats.trend.intro') }}</p>
          <TrendSparkline :points="trendPoints" :label="t('videoStats.trend.title')" />
        </section>
      </template>
    </div>
  </section>
</template>
