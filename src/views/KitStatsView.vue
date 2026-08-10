<script setup lang="ts">
/* global fetch */
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'

import BarChart from '@/components/ui/BarChart.vue'
import { useI18n } from '@/shared/i18n/i18n.service'

const { t } = useI18n()

interface KitStats {
  generatedAt: string
  total: number
  averageHouseholdSize: number
  withChildrenPercent: number
  withElderlyPercent: number
  withPetsPercent: number
  withSpecialNeedsPercent: number
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
      </template>
    </div>
  </section>
</template>
