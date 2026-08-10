<script setup lang="ts">
/* global fetch, cancelAnimationFrame, requestAnimationFrame, ResizeObserver, HTMLCanvasElement */
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'

import {
  createSimulationNodes,
  stepSimulation,
} from '@/features/visitor-graph/services/force-layout.service'
import type {
  SimulationNode,
  VisitorGraphResponse,
  VisitorStatus,
} from '@/features/visitor-graph/types/visitor-graph'
import { useI18n } from '@/shared/i18n/i18n.service'

const { t } = useI18n()

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
const edgeColor = 'rgba(38, 56, 77, 0.15)'

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
      node.type === 'campaign' ? campaignColor : statusColor[node.status ?? 'visited']
    context.fill()
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

  simulationNodes = createSimulationNodes(stats.value.nodes, canvas.width, canvas.height)
  edges = stats.value.edges

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
        </section>

        <section class="panel dashboard-panel">
          <canvas ref="canvasEl" class="visitor-graph-canvas"></canvas>
        </section>

        <section class="panel stack">
          <h2 class="section-title">{{ t('visitorGraph.legend.title') }}</h2>
          <ul class="visitor-graph-legend">
            <li>
              <span class="visitor-graph-swatch" style="background: #00394b"></span>
              {{ t('visitorGraph.legend.campaign') }}
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
