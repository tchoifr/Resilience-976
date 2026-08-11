<script setup lang="ts">
/* global fetch, cancelAnimationFrame, requestAnimationFrame, ResizeObserver, HTMLCanvasElement */
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'

import {
  createSimulationNodes,
  stepSimulation,
} from '@/features/visitor-graph/services/force-layout.service'
import type {
  SimulationNode,
  VisitorGraphEdgeType,
  VisitorGraphNodeData,
  VisitorGraphResponse,
  VisitorStatus,
} from '@/features/visitor-graph/types/visitor-graph'
import { getDomainLabel, useI18n } from '@/shared/i18n/i18n.service'

const { t } = useI18n()
const router = useRouter()

const defaultGraphEndpoint = import.meta.env.PROD
  ? 'https://resilience-976-analytics.onrender.com/api/visitors/graph'
  : '/api/visitors/graph'
const graphEndpoint = import.meta.env.VITE_VISITOR_GRAPH_ENDPOINT ?? defaultGraphEndpoint
const graphEnabled = import.meta.env.DEV
  ? import.meta.env.VITE_ANALYTICS_ENABLED !== 'false'
  : import.meta.env.VITE_ANALYTICS_ENABLED === 'true'

const isLoading = ref(true)
const stats = ref<VisitorGraphResponse | null>(null)
const canvasEl = ref<HTMLCanvasElement | null>(null)
const hoveredNode = ref<SimulationNode | null>(null)
const tooltipPosition = ref({ x: 0, y: 0 })
const showCampaignLinks = ref(true)
const showRiskLinks = ref(true)
const showStrengthLinks = ref(true)
const showScenarioWeakLinks = ref(true)
const showScenarioStrongLinks = ref(true)
const selectedCampaign = ref('all')

let simulationNodes: SimulationNode[] = []
let edges: VisitorGraphResponse['edges'] = []
let animationFrame: number | null = null
let resizeObserver: ResizeObserver | null = null

const statusColor: Record<VisitorStatus, string> = {
  visited: '#dce8ee',
  engaged: '#007f86',
  actioned: '#00a1ad',
  completed: '#7bb661',
}
const hubColor: Record<VisitorGraphEdgeType, string> = {
  campaign: '#00394b',
  risk: '#ff8a2a',
  strength: '#7bb661',
  scenario_weak: '#e63946',
  scenario_strong: '#00a1ad',
}
const edgeColor = 'rgba(38, 56, 77, 0.15)'

function isLinkTypeVisible(type: VisitorGraphEdgeType): boolean {
  if (type === 'campaign') return showCampaignLinks.value
  if (type === 'risk') return showRiskLinks.value
  if (type === 'strength') return showStrengthLinks.value
  if (type === 'scenario_weak') return showScenarioWeakLinks.value
  return showScenarioStrongLinks.value
}

const rawId = computed(() => {
  const id = hoveredNode.value?.id ?? ''
  return id.slice(id.indexOf(':') + 1)
})

// The hub a hovered visitor is linked to for a given cluster, looked up
// from the full (never filtered) edge/node lists — informational in the
// tooltip regardless of whether that link type is currently toggled on.
function findLinkedHub(edgeType: VisitorGraphEdgeType): VisitorGraphNodeData | null {
  if (hoveredNode.value?.type !== 'visitor' || !stats.value) {
    return null
  }

  const edge = stats.value.edges.find(
    (candidate) => candidate.type === edgeType && candidate.source === hoveredNode.value?.id,
  )

  if (!edge) {
    return null
  }

  return stats.value.nodes.find((node) => node.id === edge.target) ?? null
}

const hoveredVisitorRisk = computed(() => findLinkedHub('risk'))
const hoveredVisitorStrength = computed(() => findLinkedHub('strength'))
const hoveredVisitorScenarioWeak = computed(() => findLinkedHub('scenario_weak'))
const hoveredVisitorScenarioStrong = computed(() => findLinkedHub('scenario_strong'))

const campaignOptions = computed(() => {
  if (!stats.value) {
    return []
  }

  return stats.value.nodes
    .filter((node) => node.type === 'campaign')
    .map((node) => ({ id: node.campaignId ?? '', visitorCount: node.visitorCount ?? 0 }))
    .sort((a, b) => b.visitorCount - a.visitorCount)
})

const filteredVisitorIds = computed(() => {
  if (!stats.value) {
    return new Set<string>()
  }

  return new Set(
    stats.value.nodes
      .filter(
        (node) =>
          node.type === 'visitor' &&
          (selectedCampaign.value === 'all' || node.campaignId === selectedCampaign.value),
      )
      .map((node) => node.id),
  )
})

// Edges filtered to the selected campaign only — the base every other
// campaign-scoped view (hub sizing, hub summary list) is derived from, kept
// separate from the link-type toggles so switching a toggle doesn't need to
// re-derive the campaign scope.
const campaignFilteredEdges = computed(() => {
  if (!stats.value) {
    return []
  }

  return stats.value.edges.filter((edge) => filteredVisitorIds.value.has(edge.source))
})

// Recomputed from the campaign-filtered edges rather than read off the
// server's node.visitorCount, which is scoped to every visitor ever
// recorded — stale as soon as a campaign filter narrows the view.
const hubVisitorCounts = computed(() => {
  const counts = new Map<string, number>()

  for (const edge of campaignFilteredEdges.value) {
    counts.set(edge.target, (counts.get(edge.target) ?? 0) + 1)
  }

  return counts
})

const visibleNodes = computed(() => {
  if (!stats.value) {
    return []
  }

  return stats.value.nodes
    .filter((node) => {
      if (node.type === 'visitor') {
        return filteredVisitorIds.value.has(node.id)
      }

      if (node.type === 'campaign') {
        return selectedCampaign.value === 'all' || node.campaignId === selectedCampaign.value
      }

      return isLinkTypeVisible(node.type) && (hubVisitorCounts.value.get(node.id) ?? 0) > 0
    })
    .map((node) =>
      node.type === 'visitor' || node.type === 'campaign'
        ? node
        : { ...node, visitorCount: hubVisitorCounts.value.get(node.id) ?? 0 },
    )
})

const visibleEdges = computed(() => {
  if (!stats.value) {
    return []
  }

  return campaignFilteredEdges.value.filter((edge) => isLinkTypeVisible(edge.type))
})

// Text equivalent of the canvas clusters — same campaign scope, but
// independent of the show*Links toggles so it always reflects the real
// ranking even when a link type is hidden from the drawing.
function buildHubSummary(type: VisitorGraphEdgeType) {
  if (!stats.value) {
    return []
  }

  return stats.value.nodes
    .filter((node) => node.type === type)
    .map((node) => ({
      id: node.id,
      label:
        type === 'risk' || type === 'strength'
          ? getDomainLabel(node.domain ?? '')
          : (node.label ?? node.id),
      visitorCount: hubVisitorCounts.value.get(node.id) ?? 0,
    }))
    .filter((entry) => entry.visitorCount > 0)
    .sort((a, b) => b.visitorCount - a.visitorCount)
}

const riskSummary = computed(() => buildHubSummary('risk'))
const strengthSummary = computed(() => buildHubSummary('strength'))
const scenarioWeakSummary = computed(() => buildHubSummary('scenario_weak'))
const scenarioStrongSummary = computed(() => buildHubSummary('scenario_strong'))

function draw() {
  const canvas = canvasEl.value

  if (!canvas) {
    return
  }

  const context = canvas.getContext('2d')

  if (!context) {
    return
  }

  const byId = new Map(simulationNodes.map((node) => [node.id, node]))
  context.clearRect(0, 0, canvas.width, canvas.height)

  context.strokeStyle = edgeColor
  context.lineWidth = 1

  for (const edge of edges) {
    const source = byId.get(edge.source)
    const target = byId.get(edge.target)

    if (!source || !target) {
      continue
    }

    context.beginPath()
    context.moveTo(source.x, source.y)
    context.lineTo(target.x, target.y)
    context.stroke()
  }

  for (const node of simulationNodes) {
    context.beginPath()
    context.arc(node.x, node.y, node.radius, 0, Math.PI * 2)
    context.fillStyle =
      node.type === 'visitor' ? statusColor[node.status ?? 'visited'] : hubColor[node.type]
    context.fill()

    if (node.id === hoveredNode.value?.id) {
      context.lineWidth = 2
      context.strokeStyle = '#10233f'
      context.stroke()
    }
  }
}

function tick() {
  const canvas = canvasEl.value

  if (canvas) {
    stepSimulation(simulationNodes, edges, canvas.width, canvas.height)
    draw()
  }

  animationFrame = requestAnimationFrame(tick)
}

function startSimulation() {
  const canvas = canvasEl.value

  if (!canvas || !stats.value) {
    return
  }

  simulationNodes = createSimulationNodes(visibleNodes.value, canvas.width, canvas.height)
  edges = visibleEdges.value

  if (animationFrame === null) {
    animationFrame = requestAnimationFrame(tick)
  }
}

function resizeCanvas() {
  const canvas = canvasEl.value

  if (!canvas) {
    return
  }

  const rect = canvas.getBoundingClientRect()
  canvas.width = rect.width
  canvas.height = 480

  startSimulation()
}

// Toggling a link type swaps which nodes/edges are simulated, not just
// which are drawn — a hidden hub still pulling on visitors via physics
// would be a confusing, invisible force. Re-seeding is a deliberate,
// visible re-layout rather than trying to preserve position continuity.
watch(
  [
    showCampaignLinks,
    showRiskLinks,
    showStrengthLinks,
    showScenarioWeakLinks,
    showScenarioStrongLinks,
    selectedCampaign,
  ],
  () => {
    startSimulation()
  },
)

// Visitors are checked before hubs: their radius is much smaller, so a
// visitor sitting near a hub's edge would otherwise always lose to the hub.
function findNodeAt(x: number, y: number): SimulationNode | null {
  const visitors = simulationNodes.filter((node) => node.type === 'visitor')
  const hubs = simulationNodes.filter((node) => node.type !== 'visitor')

  for (const node of [...visitors, ...hubs]) {
    if (Math.hypot(node.x - x, node.y - y) <= node.radius + 2) {
      return node
    }
  }

  return null
}

function handleMouseMove(event: MouseEvent) {
  hoveredNode.value = findNodeAt(event.offsetX, event.offsetY)
  tooltipPosition.value = { x: event.clientX, y: event.clientY }
}

function handleMouseLeave() {
  hoveredNode.value = null
}

function handleClick() {
  if (hoveredNode.value?.type === 'visitor') {
    void router.push(`/tableau-de-bord/visiteur/${rawId.value}`)
  }
}

onMounted(async () => {
  if (!graphEnabled) {
    isLoading.value = false
    return
  }

  try {
    const response = await fetch(graphEndpoint)

    if (response.ok) {
      stats.value = await response.json()
    }
  } catch {
    stats.value = null
  } finally {
    isLoading.value = false
  }

  if (stats.value && stats.value.totalVisitors > 0) {
    // The canvas only exists once the v-else branch mounts, which happens
    // after isLoading flips to false above — wait for that DOM update.
    await nextTick()

    if (canvasEl.value) {
      resizeCanvas()
      resizeObserver = new ResizeObserver(() => resizeCanvas())
      resizeObserver.observe(canvasEl.value)
    }
  }
})

onBeforeUnmount(() => {
  if (animationFrame !== null) {
    cancelAnimationFrame(animationFrame)
  }

  resizeObserver?.disconnect()
})
</script>

<template>
  <section class="page">
    <div class="dashboard-layout">
      <header class="dashboard-hero">
        <p class="eyebrow">{{ t('visitorGraph.eyebrow') }}</p>
        <h1>{{ t('visitorGraph.title') }}</h1>
        <p>{{ t('visitorGraph.intro') }}</p>
      </header>

      <div class="cluster">
        <RouterLink class="link-button link-button--secondary" to="/tableau-de-bord">
          {{ t('visitorGraph.backToDashboard') }}
        </RouterLink>
        <RouterLink class="link-button link-button--secondary" to="/tableau-de-bord/visiteur">
          {{ t('visitorGraph.searchVisitor') }}
        </RouterLink>
      </div>

      <p v-if="isLoading" class="muted">{{ t('visitorGraph.loading') }}</p>
      <p v-else-if="!stats || stats.totalVisitors === 0" class="muted">
        {{ t('visitorGraph.noData') }}
      </p>

      <template v-else>
        <section class="dashboard-summary" aria-label="Indicateurs principaux">
          <article class="metric-card metric-card--primary">
            <span>{{ t('visitorGraph.summary.totalVisitors') }}</span>
            <strong>{{ stats.totalVisitors }}</strong>
          </article>
          <article class="metric-card metric-card--neutral">
            <span>{{ t('visitorGraph.summary.totalCampaigns') }}</span>
            <strong>{{ stats.totalCampaigns }}</strong>
          </article>
          <article class="metric-card metric-card--neutral">
            <span>{{ t('visitorGraph.summary.totalRiskDomains') }}</span>
            <strong>{{ stats.totalRiskDomains }}</strong>
          </article>
          <article class="metric-card metric-card--neutral">
            <span>{{ t('visitorGraph.summary.totalStrengthDomains') }}</span>
            <strong>{{ stats.totalStrengthDomains }}</strong>
          </article>
          <article class="metric-card metric-card--neutral">
            <span>{{ t('visitorGraph.summary.totalScenarioWeakSpots') }}</span>
            <strong>{{ stats.totalScenarioWeakSpots }}</strong>
          </article>
          <article class="metric-card metric-card--neutral">
            <span>{{ t('visitorGraph.summary.totalScenarioStrongSpots') }}</span>
            <strong>{{ stats.totalScenarioStrongSpots }}</strong>
          </article>
        </section>

        <div class="cluster">
          <label class="visitor-graph-toggle">
            {{ t('visitorGraph.campaignFilter.label') }}
            <select v-model="selectedCampaign">
              <option value="all">{{ t('visitorGraph.campaignFilter.all') }}</option>
              <option v-for="campaign in campaignOptions" :key="campaign.id" :value="campaign.id">
                {{ campaign.id }} ({{ campaign.visitorCount }})
              </option>
            </select>
          </label>
        </div>

        <div class="cluster">
          <label class="visitor-graph-toggle">
            <input v-model="showCampaignLinks" type="checkbox" />
            {{ t('visitorGraph.toggles.campaign') }}
          </label>
          <label class="visitor-graph-toggle">
            <input v-model="showRiskLinks" type="checkbox" />
            {{ t('visitorGraph.toggles.risk') }}
          </label>
          <label class="visitor-graph-toggle">
            <input v-model="showStrengthLinks" type="checkbox" />
            {{ t('visitorGraph.toggles.strength') }}
          </label>
          <label class="visitor-graph-toggle">
            <input v-model="showScenarioWeakLinks" type="checkbox" />
            {{ t('visitorGraph.toggles.scenarioWeak') }}
          </label>
          <label class="visitor-graph-toggle">
            <input v-model="showScenarioStrongLinks" type="checkbox" />
            {{ t('visitorGraph.toggles.scenarioStrong') }}
          </label>
        </div>

        <section class="panel dashboard-panel">
          <canvas
            ref="canvasEl"
            class="visitor-graph-canvas"
            :class="{ 'visitor-graph-canvas--pointer': hoveredNode }"
            @mousemove="handleMouseMove"
            @mouseleave="handleMouseLeave"
            @click="handleClick"
          ></canvas>

          <div
            v-if="hoveredNode"
            class="visitor-graph-tooltip"
            :style="{ left: `${tooltipPosition.x + 14}px`, top: `${tooltipPosition.y + 14}px` }"
          >
            <template v-if="hoveredNode.type === 'campaign'">
              <strong>{{ hoveredNode.campaignId }}</strong>
              <span>{{ hoveredNode.visitorCount }} {{ t('visitorGraph.tooltip.visitors') }}</span>
            </template>
            <template v-else-if="hoveredNode.type === 'risk' || hoveredNode.type === 'strength'">
              <strong>{{ getDomainLabel(hoveredNode.domain ?? '') }}</strong>
              <span>{{ hoveredNode.visitorCount }} {{ t('visitorGraph.tooltip.visitors') }}</span>
            </template>
            <template
              v-else-if="
                hoveredNode.type === 'scenario_weak' || hoveredNode.type === 'scenario_strong'
              "
            >
              <strong>{{ hoveredNode.label }}</strong>
              <span>{{ hoveredNode.visitorCount }} {{ t('visitorGraph.tooltip.visitors') }}</span>
            </template>
            <template v-else>
              <strong>{{ rawId }}</strong>
              <span
                >{{ t('visitorGraph.tooltip.campaign') }} {{ hoveredNode.campaignId }} —
                {{ t(`visitorGraph.statusShort.${hoveredNode.status}`) }}</span
              >
              <span v-if="hoveredVisitorRisk">
                {{ t('visitorGraph.tooltip.weakestDomain') }}
                {{ getDomainLabel(hoveredVisitorRisk.domain ?? '') }}
              </span>
              <span v-if="hoveredVisitorStrength">
                {{ t('visitorGraph.tooltip.strongestDomain') }}
                {{ getDomainLabel(hoveredVisitorStrength.domain ?? '') }}
              </span>
              <span v-if="hoveredVisitorScenarioWeak">
                {{ t('visitorGraph.tooltip.weakestScenario') }}
                {{ hoveredVisitorScenarioWeak.label }}
              </span>
              <span v-if="hoveredVisitorScenarioStrong">
                {{ t('visitorGraph.tooltip.strongestScenario') }}
                {{ hoveredVisitorScenarioStrong.label }}
              </span>
              <span class="muted">{{ t('visitorGraph.tooltip.clickHint') }}</span>
            </template>
          </div>
        </section>

        <section class="panel dashboard-panel">
          <h2>{{ t('visitorGraph.summaryList.title') }}</h2>
          <p class="muted">{{ t('visitorGraph.summaryList.intro') }}</p>

          <div class="visitor-graph-summary-grid">
            <div v-if="riskSummary.length > 0">
              <h3 class="visitor-graph-legend-group__title">
                {{ t('visitorGraph.summaryList.riskTitle') }}
              </h3>
              <ol class="priority-list">
                <li
                  v-for="(item, index) in riskSummary"
                  :key="item.id"
                  class="priority-row"
                >
                  <span class="priority-row__rank">{{ index + 1 }}</span>
                  <span class="priority-row__label">{{ item.label }}</span>
                  <span class="priority-row__meta"
                    >{{ item.visitorCount }} {{ t('visitorGraph.tooltip.visitors') }}</span
                  >
                </li>
              </ol>
            </div>

            <div v-if="strengthSummary.length > 0">
              <h3 class="visitor-graph-legend-group__title">
                {{ t('visitorGraph.summaryList.strengthTitle') }}
              </h3>
              <ol class="priority-list">
                <li
                  v-for="(item, index) in strengthSummary"
                  :key="item.id"
                  class="priority-row"
                >
                  <span class="priority-row__rank">{{ index + 1 }}</span>
                  <span class="priority-row__label">{{ item.label }}</span>
                  <span class="priority-row__meta"
                    >{{ item.visitorCount }} {{ t('visitorGraph.tooltip.visitors') }}</span
                  >
                </li>
              </ol>
            </div>

            <div v-if="scenarioWeakSummary.length > 0">
              <h3 class="visitor-graph-legend-group__title">
                {{ t('visitorGraph.summaryList.scenarioWeakTitle') }}
              </h3>
              <ol class="priority-list">
                <li
                  v-for="(item, index) in scenarioWeakSummary"
                  :key="item.id"
                  class="priority-row"
                >
                  <span class="priority-row__rank">{{ index + 1 }}</span>
                  <span class="priority-row__label">{{ item.label }}</span>
                  <span class="priority-row__meta"
                    >{{ item.visitorCount }} {{ t('visitorGraph.tooltip.visitors') }}</span
                  >
                </li>
              </ol>
            </div>

            <div v-if="scenarioStrongSummary.length > 0">
              <h3 class="visitor-graph-legend-group__title">
                {{ t('visitorGraph.summaryList.scenarioStrongTitle') }}
              </h3>
              <ol class="priority-list">
                <li
                  v-for="(item, index) in scenarioStrongSummary"
                  :key="item.id"
                  class="priority-row"
                >
                  <span class="priority-row__rank">{{ index + 1 }}</span>
                  <span class="priority-row__label">{{ item.label }}</span>
                  <span class="priority-row__meta"
                    >{{ item.visitorCount }} {{ t('visitorGraph.tooltip.visitors') }}</span
                  >
                </li>
              </ol>
            </div>
          </div>

          <p
            v-if="
              riskSummary.length === 0 &&
              strengthSummary.length === 0 &&
              scenarioWeakSummary.length === 0 &&
              scenarioStrongSummary.length === 0
            "
            class="muted"
          >
            {{ t('visitorGraph.summaryList.empty') }}
          </p>
        </section>

        <section class="panel stack">
          <h2 class="section-title">{{ t('visitorGraph.legend.title') }}</h2>

          <div class="visitor-graph-legend-group">
            <h3 class="visitor-graph-legend-group__title">
              {{ t('visitorGraph.legend.hubsTitle') }}
            </h3>
            <p class="muted">{{ t('visitorGraph.legend.hubsHint') }}</p>
            <ul class="visitor-graph-legend">
              <li>
                <span
                  class="visitor-graph-swatch visitor-graph-swatch--hub"
                  style="background: #00394b"
                ></span>
                {{ t('visitorGraph.legend.campaign') }}
              </li>
              <li>
                <span
                  class="visitor-graph-swatch visitor-graph-swatch--hub"
                  style="background: #ff8a2a"
                ></span>
                {{ t('visitorGraph.legend.risk') }}
              </li>
              <li>
                <span
                  class="visitor-graph-swatch visitor-graph-swatch--hub"
                  style="background: #7bb661"
                ></span>
                {{ t('visitorGraph.legend.strength') }}
              </li>
              <li>
                <span
                  class="visitor-graph-swatch visitor-graph-swatch--hub"
                  style="background: #e63946"
                ></span>
                {{ t('visitorGraph.legend.scenarioWeak') }}
              </li>
              <li>
                <span
                  class="visitor-graph-swatch visitor-graph-swatch--hub"
                  style="background: #00a1ad"
                ></span>
                {{ t('visitorGraph.legend.scenarioStrong') }}
              </li>
            </ul>
          </div>

          <div class="visitor-graph-legend-group">
            <h3 class="visitor-graph-legend-group__title">
              {{ t('visitorGraph.legend.visitorsTitle') }}
            </h3>
            <p class="muted">{{ t('visitorGraph.legend.visitorsHint') }}</p>
            <ul class="visitor-graph-legend">
              <li>
                <span class="visitor-graph-swatch" style="background: #dce8ee"></span>
                {{ t('visitorGraph.legend.visited') }}
              </li>
              <li>
                <span class="visitor-graph-swatch" style="background: #007f86"></span>
                {{ t('visitorGraph.legend.engaged') }}
              </li>
              <li>
                <span class="visitor-graph-swatch" style="background: #00a1ad"></span>
                {{ t('visitorGraph.legend.actioned') }}
              </li>
              <li>
                <span class="visitor-graph-swatch" style="background: #7bb661"></span>
                {{ t('visitorGraph.legend.completed') }}
              </li>
            </ul>
          </div>
        </section>
      </template>
    </div>
  </section>
</template>

<style scoped>
.visitor-graph-canvas {
  width: 100%;
  height: 480px;
  display: block;
  border-radius: var(--radius-sm);
  background: var(--color-surface);
}

.visitor-graph-canvas--pointer {
  cursor: pointer;
}

.visitor-graph-toggle {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
}

.visitor-graph-tooltip {
  position: fixed;
  z-index: 20;
  display: grid;
  gap: 2px;
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-sm);
  background: var(--color-text-strong);
  color: #ffffff;
  font-size: 0.85em;
  pointer-events: none;
  max-width: 260px;
}

.visitor-graph-summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: var(--space-4);
}

.visitor-graph-legend-group {
  display: grid;
  gap: var(--space-2);
}

.visitor-graph-legend-group__title {
  font-size: 1em;
  margin: 0;
}

.visitor-graph-legend {
  display: grid;
  gap: var(--space-2);
  list-style: none;
  padding: 0;
  margin: 0;
}

.visitor-graph-legend li {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.visitor-graph-swatch {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.visitor-graph-swatch--hub {
  width: 26px;
  height: 26px;
}
</style>
