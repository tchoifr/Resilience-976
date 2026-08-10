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
const campaignColor = '#00394b'
const riskColor = '#ff8a2a'
const edgeColor = 'rgba(38, 56, 77, 0.15)'

const rawId = computed(() => {
  const id = hoveredNode.value?.id ?? ''
  return id.slice(id.indexOf(':') + 1)
})

// Weakest domain for the hovered visitor, looked up from the full (never
// filtered) edge list — informational in the tooltip regardless of whether
// the risk links are currently toggled on.
const hoveredVisitorRiskDomain = computed(() => {
  if (hoveredNode.value?.type !== 'visitor' || !stats.value) {
    return null
  }

  const riskEdge = stats.value.edges.find(
    (edge) => edge.type === 'risk' && edge.source === hoveredNode.value?.id,
  )

  return riskEdge ? riskEdge.target.slice(riskEdge.target.indexOf(':') + 1) : null
})

const visibleNodes = computed(() => {
  if (!stats.value) {
    return []
  }

  return stats.value.nodes.filter((node) => {
    if (node.type === 'campaign') return showCampaignLinks.value
    if (node.type === 'risk') return showRiskLinks.value
    return true
  })
})

const visibleEdges = computed(() => {
  if (!stats.value) {
    return []
  }

  return stats.value.edges.filter((edge) => {
    if (edge.type === 'campaign') return showCampaignLinks.value
    if (edge.type === 'risk') return showRiskLinks.value
    return true
  })
})

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
      node.type === 'campaign'
        ? campaignColor
        : node.type === 'risk'
          ? riskColor
          : statusColor[node.status ?? 'visited']
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
watch([showCampaignLinks, showRiskLinks], () => {
  startSimulation()
})

// Visitors are checked before campaigns: their radius is much smaller, so a
// visitor sitting near a hub's edge would otherwise always lose to the hub.
function findNodeAt(x: number, y: number): SimulationNode | null {
  const visitors = simulationNodes.filter((node) => node.type === 'visitor')
  const campaigns = simulationNodes.filter((node) => node.type === 'campaign')

  for (const node of [...visitors, ...campaigns]) {
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
        </section>

        <div class="cluster">
          <label class="visitor-graph-toggle">
            <input v-model="showCampaignLinks" type="checkbox" />
            {{ t('visitorGraph.toggles.campaign') }}
          </label>
          <label class="visitor-graph-toggle">
            <input v-model="showRiskLinks" type="checkbox" />
            {{ t('visitorGraph.toggles.risk') }}
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
            <template v-else-if="hoveredNode.type === 'risk'">
              <strong>{{ getDomainLabel(hoveredNode.domain ?? '') }}</strong>
              <span>{{ hoveredNode.visitorCount }} {{ t('visitorGraph.tooltip.visitors') }}</span>
            </template>
            <template v-else>
              <strong>{{ rawId }}</strong>
              <span
                >{{ t('visitorGraph.tooltip.campaign') }} {{ hoveredNode.campaignId }} —
                {{ t(`visitorGraph.statusShort.${hoveredNode.status}`) }}</span
              >
              <span v-if="hoveredVisitorRiskDomain">
                {{ t('visitorGraph.tooltip.weakestDomain') }}
                {{ getDomainLabel(hoveredVisitorRiskDomain) }}
              </span>
              <span class="muted">{{ t('visitorGraph.tooltip.clickHint') }}</span>
            </template>
          </div>
        </section>

        <section class="panel stack">
          <h2 class="section-title">{{ t('visitorGraph.legend.title') }}</h2>
          <ul class="visitor-graph-legend">
            <li>
              <span class="visitor-graph-swatch" style="background: #00394b"></span>
              {{ t('visitorGraph.legend.campaign') }}
            </li>
            <li>
              <span class="visitor-graph-swatch" style="background: #ff8a2a"></span>
              {{ t('visitorGraph.legend.risk') }}
            </li>
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
  gap: var(--space-2);
}

.visitor-graph-swatch {
  display: inline-block;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}
</style>
