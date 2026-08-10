<script setup lang="ts">
/* global fetch */
import { computed, onMounted, ref } from 'vue'

interface DashboardStats {
  target: number
  totals: {
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

const engagedVisitors = ref(0)
const target = ref(5000)
const journeysCompleted = ref(0)
const quizSessions = ref(0)
const videoParticipants = ref(0)
const scenarioSessions = ref(0)

const digits = computed(() => String(engagedVisitors.value).padStart(6, '0').split(''))

const tickerItems = computed(() => [
  `${journeysCompleted.value.toLocaleString('fr-FR')} diagnostics complétés`,
  `${quizSessions.value.toLocaleString('fr-FR')} quiz joués`,
  `${videoParticipants.value.toLocaleString('fr-FR')} parcours de formation suivis`,
  `${scenarioSessions.value.toLocaleString('fr-FR')} mises en situation testées`,
  `Objectif JNR 2026 : ${target.value.toLocaleString('fr-FR')} visiteurs engagés`,
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
      class="retro-counter"
      role="img"
      :aria-label="`Vous êtes le visiteur numéro ${engagedVisitors}, objectif JNR 2026 : ${target} visiteurs engagés`"
    >
      <span class="retro-counter__label">VOUS ÊTES LE VISITEUR N°</span>
      <div class="retro-counter__digits" aria-hidden="true">
        <span v-for="(digit, index) in digits" :key="index">{{ digit }}</span>
      </div>
      <span class="retro-counter__goal">
        OBJECTIF JNR 2026&nbsp;: {{ target.toLocaleString('fr-FR') }} VISITEURS ENGAGÉS
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
  display: flex;
  flex-wrap: wrap;
  gap: 18px;
  align-items: center;
  justify-content: center;
  background: #0d0d10;
  background-image: repeating-linear-gradient(
    to bottom,
    rgba(255, 255, 255, 0.035) 0px,
    rgba(255, 255, 255, 0.035) 1px,
    transparent 1px,
    transparent 3px
  );
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

.retro-counter {
  background: linear-gradient(#111, #000);
  border: 4px solid #7a7a78;
  border-radius: 4px;
  box-shadow:
    inset 0 0 0 2px #2a2a28,
    inset 0 2px 10px rgba(0, 0, 0, 0.7);
  padding: 14px 20px 16px;
  text-align: center;
  flex-shrink: 0;
}

.retro-counter__label {
  display: block;
  font-family: Verdana, Geneva, sans-serif;
  font-size: 0.6rem;
  letter-spacing: 0.06em;
  color: #9fb8b4;
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
  color: #33ff6a;
  background: #041505;
  border: 1px solid #163d1c;
  border-radius: 2px;
  padding: 2px 3px;
  min-width: 20px;
  text-shadow: 0 0 6px rgba(51, 255, 106, 0.85);
  font-variant-numeric: tabular-nums;
}

.retro-counter__goal {
  display: block;
  font-family: Verdana, Geneva, sans-serif;
  font-size: 0.56rem;
  color: #7f9490;
}

.retro-ticker {
  width: 100%;
  max-width: 480px;
  background: #000080;
  border: 3px solid #ffd400;
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
  font-family: Verdana, Geneva, sans-serif;
  font-weight: 700;
  font-size: 0.85rem;
  color: #ffe063;
  padding-right: 40px;
  border-right: 2px dotted #4d5bb0;
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
