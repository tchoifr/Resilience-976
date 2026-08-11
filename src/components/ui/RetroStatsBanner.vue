<script setup lang="ts">
/* global fetch */
import { computed, onMounted, ref } from 'vue'

import { getVisitorId } from '@/shared/analytics/analytics.service'
import { useI18n } from '@/shared/i18n/i18n.service'

const { t } = useI18n()

interface DashboardStats {
  target: number
  totals: {
    visits: number
    engagedVisitors: number
    journeysCompleted: number
  }
}

const statsEnabled = import.meta.env.DEV
  ? import.meta.env.VITE_ANALYTICS_ENABLED !== 'false'
  : import.meta.env.VITE_ANALYTICS_ENABLED === 'true'

function endpoint(devPath: string, envOverride: string | undefined): string {
  const defaultEndpoint = import.meta.env.PROD
    ? `https://resilience-976-analytics.onrender.com${devPath}`
    : devPath
  return envOverride ?? defaultEndpoint
}

const dashboardEndpoint = endpoint('/api/dashboard', import.meta.env.VITE_DASHBOARD_ENDPOINT)
const quizStatsEndpoint = endpoint(
  '/api/quiz-results/stats',
  import.meta.env.VITE_QUIZ_STATS_ENDPOINT,
)
const videoStatsEndpoint = endpoint(
  '/api/video-progress/stats',
  import.meta.env.VITE_VIDEO_STATS_ENDPOINT,
)
const scenarioStatsEndpoint = endpoint(
  '/api/scenario-results/stats',
  import.meta.env.VITE_SCENARIO_STATS_ENDPOINT,
)

const visits = ref(0)
const engagedVisitors = ref(0)
const target = ref(5000)
const journeysCompleted = ref(0)
const quizSessions = ref(0)
const videoParticipants = ref(0)
const scenarioSessions = ref(0)

const digits = computed(() => String(visits.value).padStart(6, '0').split(''))
const engagedDigits = computed(() => String(engagedVisitors.value).padStart(6, '0'))

const visitorId = getVisitorId()
const parts = visitorId.split('-')

const shortVisitorId = (
  (parts[0] ?? '').slice(0, 4) +
  (parts[1] ?? '').slice(0, 4) +
  (parts[2] ?? '').slice(0, 4)
).toUpperCase()

const tickerItems = computed(() => [
  t('retroStats.ticker.diagnostics', { count: journeysCompleted.value.toLocaleString('fr-FR') }),
  t('retroStats.ticker.quiz', { count: quizSessions.value.toLocaleString('fr-FR') }),
  t('retroStats.ticker.videos', { count: videoParticipants.value.toLocaleString('fr-FR') }),
  t('retroStats.ticker.scenarios', { count: scenarioSessions.value.toLocaleString('fr-FR') }),
  t('retroStats.ticker.goal', { target: target.value.toLocaleString('fr-FR') }),
])
const tickerSummary = computed(() => tickerItems.value.join(' — '))

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url)
    return response.ok ? ((await response.json()) as T) : null
  } catch {
    return null
  }
}

onMounted(async () => {
  if (!statsEnabled) {
    return
  }

  const [dashboard, quiz, video, scenario] = await Promise.all([
    fetchJson<DashboardStats>(dashboardEndpoint),
    fetchJson<{ total: number }>(quizStatsEndpoint),
    fetchJson<{ totalParticipants: number }>(videoStatsEndpoint),
    fetchJson<{ total: number }>(scenarioStatsEndpoint),
  ])

  if (dashboard) {
    visits.value = dashboard.totals.visits
    engagedVisitors.value = dashboard.totals.engagedVisitors
    target.value = dashboard.target
    journeysCompleted.value = dashboard.totals.journeysCompleted
  }

  if (quiz) {
    quizSessions.value = quiz.total
  }

  if (video) {
    videoParticipants.value = video.totalParticipants
  }

  if (scenario) {
    scenarioSessions.value = scenario.total
  }
})
</script>

<template>
  <div class="retro-banner">
    <div
      class="retro-id-badge"
      role="img"
      :aria-label="t('retroStats.idBadgeAria', { id: visitorId })"
    >
      <span class="retro-id-badge__label">{{ t('retroStats.idBadgeLabel') }}</span>
      <span class="retro-id-badge__value">{{ shortVisitorId }}</span>
    </div>

    <div
      class="retro-counter"
      role="img"
      :aria-label="
        t('retroStats.counterAria', {
          visits,
          engaged: engagedVisitors,
          target,
        })
      "
    >
      <span class="retro-counter__label">{{ t('retroStats.counterLabel') }}</span>
      <div class="retro-counter__digits" aria-hidden="true">
        <span v-for="(digit, index) in digits" :key="index">{{ digit }}</span>
      </div>
      <span class="retro-counter__goal">
        {{
          t('retroStats.goalLine', {
            engaged: engagedDigits,
            target: target.toLocaleString('fr-FR'),
          })
        }}
      </span>
    </div>

    <div class="retro-ticker" role="img" :aria-label="tickerSummary">
      <div class="retro-ticker__track" aria-hidden="true">
        <span v-for="(item, index) in [...tickerItems, ...tickerItems]" :key="index">
          ★ {{ item }}
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.retro-banner {
  /* Without this, .retro-banner (a grid item of .home-screen) keeps the
     automatic min-width of its content, so the ticker's max-content track
     further down can force this whole banner (and the page) to overflow
     on narrow screens even though .retro-ticker itself clips its track. */
  min-width: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 18px;
  align-items: center;
  justify-content: center;
  background: var(--color-primary-dark);
  border-radius: var(--radius-md);
  padding: 20px;
  animation: retro-banner-in 0.5s ease-out;
}

@media (prefers-reduced-motion: reduce) {
  .retro-banner {
    animation: none;
  }
}

@keyframes retro-banner-in {
  from {
    opacity: 0;
    transform: scale(0.97);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.retro-id-badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid var(--color-teal);
  border-radius: var(--radius-sm);
  padding: 10px 16px;
  flex-shrink: 0;
}

.retro-id-badge__label {
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: rgba(255, 255, 255, 0.75);
}

.retro-id-badge__value {
  font-family: ui-monospace, "SF Mono", Consolas, "Courier New", monospace;
  font-weight: 700;
  font-size: 1.05rem;
  letter-spacing: 0.1em;
  color: var(--color-teal);
  text-shadow: 0 0 8px rgba(0, 161, 173, 0.85);
}

.retro-counter {
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: var(--radius-sm);
  padding: 14px 20px 16px;
  text-align: center;
  flex-shrink: 0;
}

.retro-counter__label {
  display: block;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: rgba(255, 255, 255, 0.75);
  margin-bottom: 8px;
}

.retro-counter__digits {
  display: flex;
  justify-content: center;
  gap: 4px;
  margin-bottom: 8px;
}

.retro-counter__digits span {
  font-family: ui-monospace, "SF Mono", Consolas, "Courier New", monospace;
  font-weight: 700;
  font-size: 1.6rem;
  color: #ffffff;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid var(--color-teal);
  border-radius: 2px;
  padding: 2px 3px;
  min-width: 20px;
  text-shadow: 0 0 8px rgba(0, 161, 173, 0.85);
  font-variant-numeric: tabular-nums;
}

.retro-counter__goal {
  display: block;
  font-size: 0.68rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.65);
}

.retro-ticker {
  min-width: 0;
  width: 100%;
  max-width: 480px;
  background: var(--color-primary);
  border-radius: var(--radius-sm);
  overflow: hidden;
  padding: 10px 0;
}

.retro-ticker__track {
  display: flex;
  width: max-content;
  gap: 40px;
  animation: retro-ticker-scroll 18s linear infinite;
  white-space: nowrap;
}

.retro-ticker__track span {
  font-weight: 700;
  font-size: 0.85rem;
  color: #ffffff;
  padding-right: 40px;
  border-right: 1px solid rgba(255, 255, 255, 0.35);
}

@keyframes retro-ticker-scroll {
  from {
    transform: translateX(0);
  }
  to {
    transform: translateX(-50%);
  }
}

@media (prefers-reduced-motion: reduce) {
  .retro-ticker__track {
    animation: none;
  }
}
</style>
