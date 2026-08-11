<script setup lang="ts">
/* global fetch */
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'

import SourceLink from '@/components/ui/SourceLink.vue'
import TrendSparkline from '@/components/ui/TrendSparkline.vue'
import { sourcesById } from '@/features/assessment/services/content.service'

interface DashboardStats {
  generatedAt: string
  updatedAt: string | null
  target: number
  projection: {
    averageDailyRate: number
    windowDays: number
    remainingVisitors: number
    projectedDate: string | null
    targetReached: boolean
  } | null
  totals: {
    visits: number | null
    engagedVisitors: number
    journeysStarted: number
    journeysCompleted: number
    resultViews: number
    actionOpens: number
    pdfDownloads: number
    certificatesGenerated: number
    checklistProgressEvents: number
    sourcesOpened: number
    feedbackSubmitted: number
    technicalErrors: number
    completionRate: number
  }
  trend: Array<{ date: string; started: number; completed: number; actions: number }>
}

const defaultDashboardEndpoint = import.meta.env.PROD
  ? 'https://resilience-976-analytics.onrender.com/api/dashboard'
  : '/api/dashboard'
const dashboardEndpoint =
  import.meta.env.VITE_DASHBOARD_ENDPOINT ?? defaultDashboardEndpoint
const dashboardEnabled = import.meta.env.DEV
  ? import.meta.env.VITE_ANALYTICS_ENABLED !== 'false'
  : import.meta.env.VITE_ANALYTICS_ENABLED === 'true'
const stats = ref<DashboardStats | null>(null)
const isLoading = ref(true)
const populationSource = computed(() =>
  sourcesById.value.get('source_insee_population_mayotte'),
)

const displayValue = (value: number | null | undefined) =>
  typeof value === 'number' ? value.toLocaleString('fr-FR') : '—'

const formatProjectedDate = (value: string) =>
  new Date(`${value}T00:00:00`).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

const startedTrend = computed(
  () => stats.value?.trend.map((point) => ({ date: point.date, value: point.started })) ?? [],
)
const completedTrend = computed(
  () => stats.value?.trend.map((point) => ({ date: point.date, value: point.completed })) ?? [],
)
const actionsTrend = computed(
  () => stats.value?.trend.map((point) => ({ date: point.date, value: point.actions })) ?? [],
)

const summaryCards = computed(() => [
  {
    label: 'Objectif JNR',
    value: displayValue(stats.value?.target ?? 5000),
    detail: 'visiteurs engagés uniques',
    tone: 'primary',
  },
  {
    label: 'Engagés réels',
    value: displayValue(stats.value?.totals.engagedVisitors),
    detail: stats.value
      ? 'visiteurs engagés uniques'
      : 'à renseigner après instrumentation',
    tone: 'neutral',
  },
  {
    label: 'Complétion',
    value:
      typeof stats.value?.totals.completionRate === 'number'
        ? `${stats.value.totals.completionRate}%`
        : '—',
    detail: 'parcours terminés / commencés',
    tone: 'green',
  },
  {
    label: 'Livrables',
    value: displayValue(stats.value?.totals.actionOpens),
    detail: 'PDF, checklists, kits, attestations',
    tone: 'orange',
  },
])

const funnelSteps = computed(() => [
  {
    label: 'Visites',
    value: displayValue(stats.value?.totals.visits),
    help: 'Information descriptive, non comptée comme sensibilisation',
  },
  {
    label: 'Parcours commencés',
    value: displayValue(stats.value?.totals.journeysStarted),
    help: 'Seuil d’entrée dans l’objectif des 5 000',
  },
  {
    label: 'Résultats consultés',
    value: displayValue(stats.value?.totals.resultViews),
    help: 'Diagnostic ou module terminé',
  },
  {
    label: 'Passage à l’action',
    value: displayValue(stats.value?.totals.actionOpens),
    help: 'Plan, checklist, kit ou PDF ouvert/généré',
  },
  {
    label: 'Retours utilisateurs',
    value: displayValue(stats.value?.totals.feedbackSubmitted),
    help: 'Formulaires anonymisés reçus',
  },
  {
    label: 'Sources ouvertes',
    value: displayValue(stats.value?.totals.sourcesOpened),
    help: 'Consultation des références officielles',
  },
])

onMounted(async () => {
  if (!dashboardEnabled) {
    isLoading.value = false
    return
  }

  try {
    const response = await fetch(dashboardEndpoint)

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
        <p class="eyebrow">Pilotage d’impact</p>
        <h1>Tableau de bord statistique</h1>
        <p>
          Suivi prévu pour mesurer l’objectif de sensibilisation sans compter
          une simple page vue et sans collecter de données nominatives.
        </p>
      </header>

      <section class="dashboard-summary" aria-label="Indicateurs principaux">
        <article
          v-for="card in summaryCards"
          :key="card.label"
          class="metric-card"
          :class="`metric-card--${card.tone}`"
        >
          <span>{{ card.label }}</span>
          <strong>{{ card.value }}</strong>
          <small>{{ card.detail }}</small>
        </article>
      </section>

      <p v-if="populationSource" class="muted">
        Objectif calculé sur la base de la population de Mayotte (323 153
        habitants au 1er janvier 2026).
        <SourceLink :source="populationSource" />
      </p>

      <section v-if="stats" class="panel dashboard-panel">
        <h2>Estimation d’atteinte de l’objectif</h2>
        <p v-if="!stats.projection" class="muted">
          Pas encore assez d’activité enregistrée pour estimer une date.
        </p>
        <p v-else-if="stats.projection.targetReached" class="muted">
          Objectif de {{ displayValue(stats.target) }} visiteurs engagés déjà atteint.
        </p>
        <p v-else-if="stats.projection.projectedDate">
          Au rythme actuel (~{{ stats.projection.averageDailyRate }} nouveaux visiteurs
          engagés/jour en moyenne sur les {{ stats.projection.windowDays }} derniers jours),
          l’objectif serait atteint vers le
          <strong>{{ formatProjectedDate(stats.projection.projectedDate) }}</strong>.
        </p>
        <p v-else class="muted">
          Le rythme des {{ stats.projection.windowDays }} derniers jours est proche de zéro :
          impossible d’estimer une date sans relance d’activité.
        </p>
        <p class="muted">
          Extrapolation simple du rythme récent — pas une prévision garantie, à recalculer
          après chaque nouvelle campagne.
        </p>
      </section>

      <section class="panel dashboard-panel">
        <div class="dashboard-section-heading">
          <h2>Entonnoir de participation</h2>
          <span class="pill pill--warning">{{
            stats
              ? 'Données collecteur'
              : isLoading
                ? 'Chargement'
                : 'Valeurs à alimenter'
          }}</span>
        </div>
        <div class="funnel-grid">
          <article
            v-for="step in funnelSteps"
            :key="step.label"
            class="funnel-step"
          >
            <strong>{{ step.value }}</strong>
            <span>{{ step.label }}</span>
            <small>{{ step.help }}</small>
          </article>
        </div>
      </section>

      <section v-if="startedTrend.length > 0" class="panel dashboard-panel">
        <div class="dashboard-section-heading">
          <h2>Évolution quotidienne</h2>
          <span class="pill">30 derniers jours</span>
        </div>
        <div class="stack">
          <TrendSparkline :points="startedTrend" label="Parcours commencés" color="var(--color-teal)" />
          <TrendSparkline :points="completedTrend" label="Parcours terminés" color="#4caf50" />
          <TrendSparkline :points="actionsTrend" label="Passages à l’action" color="#f4a261" />
        </div>
      </section>

      <section class="stack">
        <h2 class="section-title">Statistiques agrégées</h2>
        <div class="cluster">
          <RouterLink class="link-button link-button--primary" to="/tableau-de-bord/priorites">
            Priorités d’action (tous modules)
          </RouterLink>
          <RouterLink
            class="link-button link-button--secondary"
            to="/tableau-de-bord/diagnostics"
          >
            Statistiques du diagnostic
          </RouterLink>
          <RouterLink
            class="link-button link-button--secondary"
            to="/tableau-de-bord/quiz"
          >
            Statistiques du quiz
          </RouterLink>
          <RouterLink
            class="link-button link-button--secondary"
            to="/tableau-de-bord/formations"
          >
            Statistiques des formations
          </RouterLink>
          <RouterLink
            class="link-button link-button--secondary"
            to="/tableau-de-bord/mises-en-situation"
          >
            Statistiques des mises en situation
          </RouterLink>
          <RouterLink
            class="link-button link-button--secondary"
            to="/tableau-de-bord/kit"
          >
            Statistiques du kit
          </RouterLink>
          <RouterLink
            class="link-button link-button--secondary"
            to="/tableau-de-bord/experimentation"
          >
            Statistiques du formulaire
          </RouterLink>
        </div>
      </section>

      <section class="stack">
        <h2 class="section-title">Visiteurs individuels</h2>
        <div class="cluster">
          <RouterLink
            class="link-button link-button--secondary"
            to="/tableau-de-bord/graphe-visiteurs"
          >
            Graphe des visiteurs
          </RouterLink>
          <RouterLink class="link-button link-button--secondary" to="/tableau-de-bord/visiteur">
            Rechercher un visiteur
          </RouterLink>
        </div>
      </section>
    </div>
  </section>
</template>
