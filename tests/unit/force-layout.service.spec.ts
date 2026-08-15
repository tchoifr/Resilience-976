import { describe, expect, it } from 'vitest'

import {
  createSimulationNodes,
  SETTLED_ENERGY,
  stepSimulation,
} from '@/features/visitor-graph/services/force-layout.service'
import type {
  VisitorGraphEdgeData,
  VisitorGraphNodeData,
} from '@/features/visitor-graph/types/visitor-graph'

import fixture from '../fixtures/visitor-graph.fixture.json'

const WIDTH = 800
const HEIGHT = 600

function buildStarGraph(): { nodes: VisitorGraphNodeData[]; edges: VisitorGraphEdgeData[] } {
  const nodes: VisitorGraphNodeData[] = [
    { id: 'campaign:A', type: 'campaign', campaignId: 'A', visitorCount: 3 },
    { id: 'campaign:B', type: 'campaign', campaignId: 'B', visitorCount: 3 },
    { id: 'visitor:1', type: 'visitor', campaignId: 'A', status: 'completed' },
    { id: 'visitor:2', type: 'visitor', campaignId: 'A', status: 'engaged' },
    { id: 'visitor:3', type: 'visitor', campaignId: 'A', status: 'visited' },
    { id: 'visitor:4', type: 'visitor', campaignId: 'B', status: 'actioned' },
  ]
  const edges: VisitorGraphEdgeData[] = [
    { source: 'visitor:1', target: 'campaign:A', type: 'campaign' },
    { source: 'visitor:2', target: 'campaign:A', type: 'campaign' },
    { source: 'visitor:3', target: 'campaign:A', type: 'campaign' },
    { source: 'visitor:4', target: 'campaign:B', type: 'campaign' },
  ]

  return { nodes, edges }
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

describe('force-layout.service', () => {
  it('places every node within bounds and gives campaign nodes a bigger radius', () => {
    const { nodes } = buildStarGraph()
    const simulationNodes = createSimulationNodes(nodes, WIDTH, HEIGHT)

    expect(simulationNodes).toHaveLength(nodes.length)

    for (const node of simulationNodes) {
      expect(node.x).toBeGreaterThanOrEqual(0)
      expect(node.x).toBeLessThanOrEqual(WIDTH)
      expect(node.y).toBeGreaterThanOrEqual(0)
      expect(node.y).toBeLessThanOrEqual(HEIGHT)
    }

    const campaignNode = simulationNodes.find((node) => node.id === 'campaign:A')
    const visitorNode = simulationNodes.find((node) => node.id === 'visitor:1')
    expect(campaignNode!.radius).toBeGreaterThan(visitorNode!.radius)
  })

  it('keeps positions finite and within bounds after many simulation steps', () => {
    const { nodes, edges } = buildStarGraph()
    const simulationNodes = createSimulationNodes(nodes, WIDTH, HEIGHT)

    for (let step = 0; step < 200; step += 1) {
      stepSimulation(simulationNodes, edges, WIDTH, HEIGHT)
    }

    for (const node of simulationNodes) {
      expect(Number.isFinite(node.x)).toBe(true)
      expect(Number.isFinite(node.y)).toBe(true)
      expect(node.x).toBeGreaterThanOrEqual(0)
      expect(node.x).toBeLessThanOrEqual(WIDTH)
      expect(node.y).toBeGreaterThanOrEqual(0)
      expect(node.y).toBeLessThanOrEqual(HEIGHT)
    }
  })

  it('pulls visitors closer to their own campaign hub than to an unrelated one', () => {
    const { nodes, edges } = buildStarGraph()
    const simulationNodes = createSimulationNodes(nodes, WIDTH, HEIGHT)

    for (let step = 0; step < 300; step += 1) {
      stepSimulation(simulationNodes, edges, WIDTH, HEIGHT)
    }

    const byId = new Map(simulationNodes.map((node) => [node.id, node]))
    const visitor1 = byId.get('visitor:1')!
    const campaignA = byId.get('campaign:A')!
    const campaignB = byId.get('campaign:B')!

    expect(distance(visitor1, campaignA)).toBeLessThan(distance(visitor1, campaignB))
  })

  // Le graphe en etoile ci-dessus ne compte que trois visiteurs par pole : trop
  // peu pour que les noeuds se tassent, et il converge meme sans correctif. Un
  // graphe synthetique plus dense n'a pas suffi non plus. Seule la vraie
  // structure — un pole de campagne dominant, des poles secondaires, et des
  // visiteurs relies a plusieurs a la fois — fait diverger la simulation.
  //
  // D'ou cette capture reelle, dont les identifiants de visiteurs ont ete
  // remplaces par des numeros. Mesure sur ce jeu, en 1 200 pas : energie
  // 9,3×10¹³ sans plancher de repulsion, 0,1 avec.
  //
  // La hauteur compte : le canvas de la vue est fige a 480 px, et c'est a
  // cette hauteur que la simulation part. En 800 × 600, elle converge — d'ou
  // l'interet de mesurer aux dimensions reelles et non a des dimensions
  // commodes.
  it('converges on the real graph shape instead of diverging', () => {
    const { nodes, edges } = fixture as {
      nodes: VisitorGraphNodeData[]
      edges: VisitorGraphEdgeData[]
    }

    const CANVAS_WIDTH = 1200
    const CANVAS_HEIGHT = 480

    const simulationNodes = createSimulationNodes(nodes, CANVAS_WIDTH, CANVAS_HEIGHT)
    let energy = Number.POSITIVE_INFINITY

    for (let step = 0; step < 1200; step += 1) {
      energy = stepSimulation(simulationNodes, edges, CANVAS_WIDTH, CANVAS_HEIGHT)
    }

    expect(energy).toBeLessThan(SETTLED_ENERGY)

    for (const node of simulationNodes) {
      expect(Number.isFinite(node.x)).toBe(true)
      expect(Number.isFinite(node.y)).toBe(true)
    }
  })
})
