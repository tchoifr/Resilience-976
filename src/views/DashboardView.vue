<script setup lang="ts">
/* global fetch */
import { computed, onMounted, ref } from 'vue'

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
    technicalErrors: number
    completionRate: number
  }
  campaigns: Array<{
    campaignId: string
    engaged: number
    completed: number
    actions: number
  }>
}

const dashboardEndpoint = import.meta.env.VITE_DASHBOARD_ENDPOINT ?? '/api/dashboard'
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
    detail: stats.value ? 'visiteurs engagés uniques' : 'à renseigner après instrumentation',
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

const fallbackCampaignRows = [
  ['CAMP-01', 'Structure à renseigner', 'QR / affiche', '—', '—', 'Prévue'],
  ['CAMP-02', 'Structure à renseigner', 'Lien partenaire', '—', '—', 'Prévue'],
  ['CAMP-03', 'Structure à renseigner', 'Événement', '—', '—', 'Prévue'],
  ['DIRECT', 'Accès direct', 'Site / partage libre', '—', '—', 'À mesurer'],
]

const campaignRows = computed(() => {
  if (!stats.value || stats.value.campaigns.length === 0) {
    return fallbackCampaignRows
  }

  return stats.value.campaigns.map((campaign) => [
    campaign.campaignId,
    campaign.campaignId === 'DIRECT' ? 'Accès direct' : 'Campagne',
    campaign.campaignId === 'DIRECT' ? 'Site / partage libre' : 'Lien tracé',
    displayValue(campaign.engaged),
    displayValue(campaign.completed),
    'Mesurée',
  ])
})

const qualityRows = computed(() => [
  ['Disponibilité', '—', 'Suivi hebdomadaire après mise en ligne'],
  ['Erreurs bloquantes', displayValue(stats.value?.totals.technicalErrors), 'Objectif proche de 0'],
  ['Retours utilisateurs', '—', 'À qualifier par thème'],
  ['Dernière extraction', stats.value?.updatedAt ?? '—', 'Date visible dans chaque bilan'],
])

const eventRows = [
  ['journey_started', 'Début diagnostic, quiz ou micro-formation', 'module, campagne, date'],
  ['journey_completed', 'Affichage du résultat final', 'module, durée, campagne'],
  ['diagnostic_result_viewed', 'Consultation résultat personnalisé', 'niveau agrégé, campagne'],
  ['checklist_opened', 'Ouverture checklist', 'campagne'],
  ['emergency_kit_generated', 'Génération du kit', 'catégorie de foyer agrégée'],
  ['pdf_downloaded', 'Téléchargement PDF', 'type de document'],
  ['technical_error', 'Erreur bloquante interface', 'écran, code technique'],
]

const recipeRows = [
  ['M01', 'Ouverture seule de l’accueil', 'Aucun visiteur touché compté'],
  ['M02', 'Démarrage d’un diagnostic', '1 visiteur engagé et 1 parcours commencé'],
  ['M04', 'Fin du diagnostic', '1 parcours terminé et durée calculable'],
  ['M05', 'Checklist et kit', 'Actions enregistrées sans réponses détaillées'],
  ['M10', 'Inspection réseau', 'Aucune donnée nominative ni réponse détaillée'],
  ['M12', 'Export mensuel', 'Totaux cohérents avec les événements de test'],
]

onMounted(async () => {
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
          Suivi prévu pour mesurer l’objectif de sensibilisation sans compter une simple page vue et
          sans collecter de données nominatives.
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
            stats ? 'Données collecteur' : isLoading ? 'Chargement' : 'Valeurs à alimenter'
          }}</span>
        </div>
        <div class="funnel-grid">
          <article v-for="step in funnelSteps" :key="step.label" class="funnel-step">
            <strong>{{ step.value }}</strong>
            <span>{{ step.label }}</span>
            <small>{{ step.help }}</small>
          </article>
        </div>
      </section>

      <section class="grid grid--2">
        <article class="panel dashboard-panel">
          <h2>Canaux et campagnes</h2>
          <div class="table-wrap" tabindex="0" aria-label="Tableau des campagnes">
            <table>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Relais</th>
                  <th>Canal</th>
                  <th>Engagés</th>
                  <th>Terminés</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in campaignRows" :key="row[0]">
                  <td v-for="cell in row" :key="cell">{{ cell }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </article>

        <article class="panel dashboard-panel">
          <h2>Qualité de service</h2>
          <div class="quality-list">
            <div v-for="row in qualityRows" :key="row[0]" class="quality-row">
              <strong>{{ row[0] }}</strong>
              <span>{{ row[1] }}</span>
              <small>{{ row[2] }}</small>
            </div>
          </div>
        </article>
      </section>

      <section class="grid grid--2">
        <article class="panel dashboard-panel">
          <h2>Événements à instrumenter</h2>
          <ul class="event-list">
            <li v-for="row in eventRows" :key="row[0]">
              <code>{{ row[0] }}</code>
              <span>{{ row[1] }}</span>
              <small>{{ row[2] }}</small>
            </li>
          </ul>
        </article>

        <article class="panel dashboard-panel">
          <h2>Recette avant ouverture</h2>
          <ul class="recipe-list">
            <li v-for="row in recipeRows" :key="row[0]">
              <strong>{{ row[0] }}</strong>
              <span>{{ row[1] }}</span>
              <small>{{ row[2] }}</small>
            </li>
          </ul>
        </article>
      </section>

      <section class="panel dashboard-panel">
        <h2>Règle de prudence</h2>
        <p class="muted">
          Le compteur principal ne devra pas être présenté comme atteint avec des impressions, des
          pages vues ou de la portée sociale. Seuls les visiteurs engagés uniques alimenteront le
          bilan final, avec date d’extraction, période et limites méthodologiques.
        </p>
      </section>
    </div>
  </section>
</template>
