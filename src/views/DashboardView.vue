<script setup lang="ts">
/* global fetch */
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'

interface DashboardStats {
  generatedAt: string
  updatedAt: string | null
  target: number
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

const displayValue = (value: number | null | undefined) =>
  typeof value === 'number' ? value.toLocaleString('fr-FR') : '—'

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
])

const qualityRows = computed(() => [
  ['Disponibilité', '—', 'Suivi hebdomadaire après mise en ligne'],
  [
    'Erreurs bloquantes',
    displayValue(stats.value?.totals.technicalErrors),
    'Objectif proche de 0',
  ],
  [
    'Retours utilisateurs',
    displayValue(stats.value?.totals.feedbackSubmitted),
    'Formulaires anonymisés reçus',
  ],
  [
    'Sources ouvertes',
    displayValue(stats.value?.totals.sourcesOpened),
    'Consultation des références officielles',
  ],
  [
    'Dernière extraction',
    stats.value?.updatedAt ?? '—',
    'Date visible dans chaque bilan',
  ],
])

const eventRows = computed(() => [
  [
    'diagnostic_started',
    displayValue(stats.value?.totals.journeysStarted),
    'Parcours commencé',
  ],
  [
    'diagnostic_completed',
    displayValue(stats.value?.totals.journeysCompleted),
    'Parcours terminé',
  ],
  [
    'result_viewed',
    displayValue(stats.value?.totals.resultViews),
    'Résultat consulté',
  ],
  [
    'action_plan_opened',
    displayValue(stats.value?.totals.actionOpens),
    'Passage à l’action',
  ],
  [
    'certificate_generated',
    displayValue(stats.value?.totals.certificatesGenerated),
    'Attestation générée',
  ],
  [
    'pdf_downloaded',
    displayValue(stats.value?.totals.pdfDownloads),
    'PDF téléchargé',
  ],
  [
    'checklist_progress',
    displayValue(stats.value?.totals.checklistProgressEvents),
    'Seuil checklist atteint',
  ],
  [
    'source_opened',
    displayValue(stats.value?.totals.sourcesOpened),
    'Source officielle ouverte',
  ],
  [
    'feedback_submitted',
    displayValue(stats.value?.totals.feedbackSubmitted),
    'Retour utilisateur reçu',
  ],
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

      <section class="panel dashboard-panel">
        <h2>Qualité de service</h2>
        <div class="quality-list">
          <div v-for="row in qualityRows" :key="row[0]" class="quality-row">
            <strong>{{ row[0] }}</strong>
            <span>{{ row[1] }}</span>
            <small>{{ row[2] }}</small>
          </div>
        </div>
      </section>

      <section class="panel dashboard-panel">
        <div class="dashboard-section-heading">
          <h2>Plan de marquage</h2>
          <RouterLink
            class="link-button link-button--secondary"
            to="/experimentation-utilisateurs"
          >
            Formulaire test
          </RouterLink>
        </div>
        <div class="quality-list">
          <div v-for="row in eventRows" :key="row[0]" class="quality-row">
            <strong>{{ row[0] }}</strong>
            <span>{{ row[1] }}</span>
            <small>{{ row[2] }}</small>
          </div>
        </div>
      </section>
    </div>
  </section>
</template>
