<script setup lang="ts">
/* global fetch, navigator */
import { computed, onMounted, ref } from 'vue'

import { getVisitorId } from '@/shared/analytics/analytics.service'
import { formatVisitorIdForDisplay } from '@/shared/analytics/visitor-id.service'
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
const visitorRankEndpoint = endpoint(
  '/api/visitors/rank',
  import.meta.env.VITE_VISITOR_RANK_ENDPOINT,
)
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
const engagedDigits = computed(() => String(engagedVisitors.value).padStart(6, '0').split(''))

// L'identifiant est affiche en entier, mais sans tirets : la recherche du
// tableau de bord les remet elle-meme, le visiteur n'a donc que 32 caracteres
// a lire ou a recopier.
const visitorId = formatVisitorIdForDisplay(getVisitorId())
const copied = ref(false)
const isTickerPaused = ref(false)
const arrivalRank = ref<number | null>(null)

// « 1er » puis « 2e » : la forme francaise change au premier rang seulement.
const arrivalLabel = computed(() => {
  if (arrivalRank.value === null) {
    return ''
  }

  return arrivalRank.value === 1
    ? t('retroStats.arrivalFirst')
    : t('retroStats.arrivalRank', { rank: arrivalRank.value })
})

async function copyVisitorId() {
  try {
    await navigator.clipboard.writeText(visitorId)
    copied.value = true
    window.setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch {
    copied.value = false
  }
}

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

  const [dashboard, quiz, video, scenario, arrival] = await Promise.all([
    fetchJson<DashboardStats>(dashboardEndpoint),
    fetchJson<{ total: number }>(quizStatsEndpoint),
    fetchJson<{ totalParticipants: number }>(videoStatsEndpoint),
    fetchJson<{ total: number }>(scenarioStatsEndpoint),
    // Le rang n'existe qu'a partir du premier evenement enregistre : a la
    // toute premiere visite, le serveur repond `rank: null` et la ligne reste
    // masquee plutot que d'annoncer un rang faux.
    fetchJson<{ rank: number | null }>(
      `${visitorRankEndpoint}?visitorId=${encodeURIComponent(getVisitorId())}`,
    ),
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

  if (arrival) {
    arrivalRank.value = arrival.rank
  }
})
</script>

<template>
  <div class="retro-banner">
    <div class="retro-id-badge">
      <span class="retro-id-badge__label">{{ t('retroStats.idBadgeLabel') }}</span>
      <span class="retro-id-badge__value">{{ visitorId }}</span>
      <button type="button" class="retro-id-badge__copy" @click="copyVisitorId">
        {{ copied ? t('retroStats.idCopied') : t('retroStats.idCopy') }}
      </button>
      <span v-if="arrivalLabel" class="retro-id-badge__rank">{{ arrivalLabel }}</span>
    </div>

    <!-- Deux compteurs distincts : les visites mesurent la frequentation, les
         visiteurs engages mesurent l'objectif JNR. Les melanger dans un seul
         bloc laissait croire a un seul indicateur. -->
    <div
      class="retro-counter"
      role="img"
      :aria-label="t('retroStats.counterAria', { visits })"
    >
      <span class="retro-counter__label">{{ t('retroStats.counterLabel') }}</span>
      <div class="retro-counter__digits" aria-hidden="true">
        <span v-for="(digit, index) in digits" :key="index">{{ digit }}</span>
      </div>
      <span class="retro-counter__unit" aria-hidden="true">{{ t('retroStats.counterUnit') }}</span>
    </div>

    <div
      class="retro-counter"
      role="img"
      :aria-label="
        t('retroStats.engagedAria', {
          engaged: engagedVisitors,
          target,
        })
      "
    >
      <span class="retro-counter__label">{{ t('retroStats.engagedLabel') }}</span>
      <div class="retro-counter__digits" aria-hidden="true">
        <span v-for="(digit, index) in engagedDigits" :key="index">{{ digit }}</span>
      </div>
      <span class="retro-counter__goal">
        {{ t('retroStats.goalLine', { target: target.toLocaleString('fr-FR') }) }}
      </span>
    </div>

    <!-- Le bandeau defile en boucle : le RGAA (critere 13.8) demande une
         commande de pause offerte a l'utilisateur, la seule preference
         systeme « animations reduites » ne suffisant pas. -->
    <div class="retro-ticker-zone">
      <div class="retro-ticker" role="img" :aria-label="tickerSummary">
        <div
          class="retro-ticker__track"
          :class="{ 'retro-ticker__track--paused': isTickerPaused }"
          aria-hidden="true"
        >
          <span v-for="(item, index) in [...tickerItems, ...tickerItems]" :key="index">
            ★ {{ item }}
          </span>
        </div>
      </div>
      <button
        type="button"
        class="retro-ticker__control"
        :aria-pressed="isTickerPaused"
        @click="isTickerPaused = !isTickerPaused"
      >
        {{ isTickerPaused ? t('retroStats.tickerResume') : t('retroStats.tickerPause') }}
      </button>
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
  background: var(--retro-banner-bg);
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
  color: rgba(255, 255, 255, 0.85);
}

.retro-id-badge__value {
  font-family: ui-monospace, "SF Mono", Consolas, "Courier New", monospace;
  font-weight: 700;
  font-size: 0.78rem;
  letter-spacing: 0.04em;
  color: var(--retro-highlight);
  text-shadow: 0 0 8px rgba(0, 161, 173, 0.85);
  overflow-wrap: anywhere;
  max-width: 22ch;
  text-align: center;
}

.retro-id-badge__copy {
  border: 1px solid var(--color-teal);
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--retro-highlight);
  font-size: 0.68rem;
  font-weight: 700;
  padding: 2px 10px;
  cursor: pointer;
}

.retro-id-badge__copy:hover,
.retro-id-badge__copy:focus-visible {
  background: rgba(255, 255, 255, 0.12);
}

.retro-id-badge__rank {
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: rgba(255, 255, 255, 0.85);
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
  color: rgba(255, 255, 255, 0.85);
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

/* « IL Y A EU / 001247 / VISITES » se lit en trois lignes : sans l'unite
   sous les chiffres, le compteur n'annoncerait plus ce qu'il compte. */
.retro-counter__unit {
  display: block;
  margin-bottom: 8px;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: rgba(255, 255, 255, 0.85);
}

.retro-counter__goal {
  display: block;
  font-size: 0.68rem;
  font-weight: 600;
  /* 0.65 tombait a 3,83:1 sur le turquoise clair, sous le seuil AA ;
     0.85 remonte a 5,38:1 sans eclaircir le bloc. */
  color: rgba(255, 255, 255, 0.85);
}

.retro-ticker {
  min-width: 0;
  width: 100%;
  max-width: 480px;
  background: var(--retro-ticker-bg);
  border-radius: var(--radius-sm);
  overflow: hidden;
  padding: 10px 0;
}

.retro-ticker-zone {
  display: grid;
  gap: 8px;
  justify-items: center;
  width: 100%;
  min-width: 0;
}

.retro-ticker__control {
  min-height: 32px;
  border: 1px solid var(--color-teal);
  border-radius: 999px;
  background: transparent;
  color: var(--retro-highlight);
  padding: 4px 14px;
  font-size: 0.72rem;
  font-weight: 800;
  cursor: pointer;
}

.retro-ticker__control:hover,
.retro-ticker__control:focus-visible {
  background: rgba(255, 255, 255, 0.12);
}

.retro-ticker__track {
  display: flex;
  width: max-content;
  gap: 40px;
  animation: retro-ticker-scroll 18s linear infinite;
  white-space: nowrap;
}

/* Apres la regle ci-dessus, et non avant : la forme courte `animation`
   reinitialise `animation-play-state`, ce qui annulait la pause. */
.retro-ticker__track--paused {
  animation-play-state: paused;
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

/* En theme sombre, le fond --color-primary-dark de la banniere se detache
   mal du fond de page (#060f18) : elle perd le relief qu'elle a en theme
   clair. Une bordure turquoise lui redonne son contour sans changer sa
   couleur de fond, deja porteuse de l'identite du bloc. */
/* Sans `:global()`. Ecrit `:global(:root[data-theme="dark"]) .retro-banner`,
   le compilateur de styles scopes appliquait la declaration a `:root` et
   perdait la fin du selecteur : le liseré turquoise entourait tout l'ecran,
   sur chaque page, en theme sombre. Un selecteur d'ancetre n'a pas besoin
   d'etre globalise, seul le dernier element recoit l'attribut de portee. */
:root[data-theme="dark"] .retro-banner {
  border: 1px solid var(--color-teal);
}
</style>
