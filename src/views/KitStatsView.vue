<script setup lang="ts">
/* global fetch */
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'

import BarChart from '@/components/ui/BarChart.vue'
import type { AssessmentDomain } from '@/features/assessment/types/question'
import { getDomainLabel, useI18n } from '@/shared/i18n/i18n.service'

const { t } = useI18n()

interface KitStats {
  generatedAt: string
  total: number
  averageHouseholdSize: number
  withChildrenPercent: number
  withElderlyPercent: number
  withPetsPercent: number
  withSpecialNeedsPercent: number
  domainGapBySegment: {
    totalMatched: number
    segments: Array<{
      key: string
      label: string
      withCount: number
      withoutCount: number
      domainAverages: {
        with: Record<string, number>
        without: Record<string, number>
      }
    }>
  }
}

const domainOrder: AssessmentDomain[] = [
  'household',
  'housing',
  'water_food',
  'energy_communication',
  'health_documents',
  'behaviors',
]

const segmentLabelKeys: Record<string, string> = {
  children: 'kitStats.domainGap.segments.children',
  elderly: 'kitStats.domainGap.segments.elderly',
  pets: 'kitStats.domainGap.segments.pets',
  specialNeeds: 'kitStats.domainGap.segments.specialNeeds',
}

const defaultStatsEndpoint = import.meta.env.PROD
  ? 'https://resilience-976-analytics.onrender.com/api/kit-profiles/stats'
  : '/api/kit-profiles/stats'
const statsEndpoint = import.meta.env.VITE_KIT_STATS_ENDPOINT ?? defaultStatsEndpoint
const statsEnabled = import.meta.env.DEV
  ? import.meta.env.VITE_ANALYTICS_ENABLED !== 'false'
  : import.meta.env.VITE_ANALYTICS_ENABLED === 'true'

const stats = ref<KitStats | null>(null)
const isLoading = ref(true)

const breakdownItems = computed(() => [
  { key: 'children', label: t('kitStats.breakdown.withChildren'), value: stats.value?.withChildrenPercent ?? 0 },
  { key: 'elderly', label: t('kitStats.breakdown.withElderly'), value: stats.value?.withElderlyPercent ?? 0 },
  { key: 'pets', label: t('kitStats.breakdown.withPets'), value: stats.value?.withPetsPercent ?? 0 },
  {
    key: 'specialNeeds',
    label: t('kitStats.breakdown.withSpecialNeeds'),
    value: stats.value?.withSpecialNeedsPercent ?? 0,
  },
])

const segmentRows = computed(() => {
  const segments = stats.value?.domainGapBySegment.segments ?? []

  return segments
    .filter((segment) => segment.withCount > 0 && segment.withoutCount > 0)
    .map((segment) => ({
      key: segment.key,
      label: t(segmentLabelKeys[segment.key] ?? segment.key),
      withCount: segment.withCount,
      withoutCount: segment.withoutCount,
      domainRows: domainOrder
        .map((domain) => {
          const withScore = segment.domainAverages.with[domain]
          const withoutScore = segment.domainAverages.without[domain]

          if (withScore === undefined || withoutScore === undefined) {
            return null
          }

          return {
            domain,
            label: getDomainLabel(domain),
            withScore,
            withoutScore,
            gap: withScore - withoutScore,
          }
        })
        .filter((row): row is NonNullable<typeof row> => row !== null)
        .sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap)),
    }))
})

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
        <p class="eyebrow">{{ t('kitStats.eyebrow') }}</p>
        <h1>{{ t('kitStats.title') }}</h1>
        <p>{{ t('kitStats.intro') }}</p>
      </header>

      <div class="cluster">
        <RouterLink class="link-button link-button--secondary" to="/tableau-de-bord">
          {{ t('kitStats.backToDashboard') }}
        </RouterLink>
      </div>

      <p v-if="isLoading" class="muted">{{ t('kitStats.loading') }}</p>
      <p v-else-if="!stats || stats.total === 0" class="muted">
        {{ t('kitStats.noData') }}
      </p>

      <template v-else>
        <section class="dashboard-summary" aria-label="Indicateurs principaux">
          <article class="metric-card metric-card--primary">
            <span>{{ t('kitStats.summary.total') }}</span>
            <strong>{{ stats.total }}</strong>
          </article>
          <article class="metric-card metric-card--neutral">
            <span>{{ t('kitStats.summary.averageSize') }}</span>
            <strong>{{ stats.averageHouseholdSize }}</strong>
            <small>{{ t('kitStats.summary.people') }}</small>
          </article>
        </section>

        <section class="panel dashboard-panel">
          <h2>{{ t('kitStats.breakdown.title') }}</h2>
          <BarChart :items="breakdownItems" suffix="%" :max="100" />
        </section>

        <section
          v-for="segment in segmentRows"
          :key="segment.key"
          class="panel dashboard-panel"
        >
          <div class="dashboard-section-heading">
            <h2>{{ segment.label }}</h2>
            <span class="pill pill--warning">
              {{ t('kitStats.domainGap.counts', { with: segment.withCount, without: segment.withoutCount }) }}
            </span>
          </div>
          <table class="gap-table">
            <thead>
              <tr>
                <th scope="col">{{ t('kitStats.domainGap.domain') }}</th>
                <th scope="col">{{ t('kitStats.domainGap.with') }}</th>
                <th scope="col">{{ t('kitStats.domainGap.without') }}</th>
                <th scope="col">{{ t('kitStats.domainGap.gap') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in segment.domainRows" :key="row.domain">
                <td>{{ row.label }}</td>
                <td>{{ row.withScore }}/100</td>
                <td>{{ row.withoutScore }}/100</td>
                <td :class="row.gap < 0 ? 'gap-value--negative' : 'gap-value--positive'">
                  {{ row.gap > 0 ? '+' : '' }}{{ row.gap }}
                </td>
              </tr>
            </tbody>
          </table>
        </section>
      </template>
    </div>
  </section>
</template>
