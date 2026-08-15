import type {
  SimulationNode,
  VisitorGraphEdgeData,
  VisitorGraphNodeData,
} from '../types/visitor-graph'

const REPULSION_STRENGTH = 1600
const REPULSION_MAX_DISTANCE = 160
const REPULSION_MAX_DISTANCE_SQUARED = REPULSION_MAX_DISTANCE * REPULSION_MAX_DISTANCE
const SPRING_STRENGTH = 0.02
const CENTERING_STRENGTH = 0.01
const DAMPING = 0.85
const CAMPAIGN_BASE_RADIUS = 14
const VISITOR_RADIUS = 4

// La repulsion varie en 1/d² : sans plancher, deux noeuds presque confondus
// produisent une force arbitrairement grande, que l'amortissement n'absorbe
// pas. Le cas se presente des qu'une campagne concentre beaucoup de visiteurs
// — 78 sur un meme noeud dans les donnees du 15 aout : les ressorts les
// tassent au meme endroit, la repulsion explose, et l'energie du systeme part
// a l'infini au lieu de decroitre. Le graphe ne se stabilise alors jamais et
// s'agite tant que la page reste ouverte.
//
// Mesure sur ces donnees : sans plancher, l'energie passe de 5×10⁴ a 7×10¹⁴ en
// 3 600 ticks. Avec, elle descend sous 1 des le tick 295, soit environ cinq
// secondes.
const REPULSION_MIN_DISTANCE = 12
const REPULSION_MIN_DISTANCE_SQUARED = REPULSION_MIN_DISTANCE * REPULSION_MIN_DISTANCE

// Seconde barriere, independante de la premiere : aucun noeud ne peut traverser
// l'ecran en une image, quelle que soit la configuration.
const MAX_SPEED = 12

// En dessous de ce seuil d'energie cinetique totale, la mise en page ne bouge
// plus a l'oeil nu. L'appelant peut alors arreter la boucle d'animation.
export const SETTLED_ENERGY = 1

export function createSimulationNodes(
  nodes: VisitorGraphNodeData[],
  width: number,
  height: number,
): SimulationNode[] {
  const centerX = width / 2
  const centerY = height / 2
  const spreadRadius = Math.min(width, height) / 2.5

  return nodes.map((node, index) => {
    const angle = (index / Math.max(nodes.length, 1)) * Math.PI * 2

    return {
      ...node,
      x: centerX + Math.cos(angle) * spreadRadius,
      y: centerY + Math.sin(angle) * spreadRadius,
      vx: 0,
      vy: 0,
      radius:
        node.type === 'visitor'
          ? VISITOR_RADIUS
          : CAMPAIGN_BASE_RADIUS + Math.sqrt(node.visitorCount ?? 0) * 2,
    }
  })
}

function idealEdgeLength(source: SimulationNode, target: SimulationNode): number {
  return source.radius + target.radius + 40
}

// O(n^2) par tick (chaque paire de noeuds testee pour la repulsion) : correct
// pour quelques centaines de noeuds a l'echelle d'un tableau de bord admin,
// mais deviendrait couteux au-dela (il faudrait alors un quadtree type
// Barnes-Hut plutot que cette version naive).
//
// Renvoie l'energie cinetique totale, pour que l'appelant sache quand la mise
// en page a converge et puisse cesser d'animer.
export function stepSimulation(
  nodes: SimulationNode[],
  edges: VisitorGraphEdgeData[],
  width: number,
  height: number,
): number {
  const byId = new Map(nodes.map((node) => [node.id, node]))
  const centerX = width / 2
  const centerY = height / 2

  for (let i = 0; i < nodes.length; i += 1) {
    for (let j = i + 1; j < nodes.length; j += 1) {
      const a = nodes[i]
      const b = nodes[j]

      if (!a || !b) {
        continue
      }

      let dx = a.x - b.x
      let dy = a.y - b.y
      let distanceSquared = dx * dx + dy * dy

      if (distanceSquared < 0.01) {
        dx = Math.random() - 0.5
        dy = Math.random() - 0.5
        distanceSquared = dx * dx + dy * dy
      }

      if (distanceSquared > REPULSION_MAX_DISTANCE_SQUARED) {
        continue
      }

      const distance = Math.sqrt(distanceSquared)
      const force =
        REPULSION_STRENGTH / Math.max(distanceSquared, REPULSION_MIN_DISTANCE_SQUARED)
      const fx = (dx / distance) * force
      const fy = (dy / distance) * force

      a.vx += fx
      a.vy += fy
      b.vx -= fx
      b.vy -= fy
    }
  }

  for (const edge of edges) {
    const source = byId.get(edge.source)
    const target = byId.get(edge.target)

    if (!source || !target) {
      continue
    }

    const dx = target.x - source.x
    const dy = target.y - source.y
    const distance = Math.sqrt(dx * dx + dy * dy) || 1
    const displacement = distance - idealEdgeLength(source, target)
    const force = displacement * SPRING_STRENGTH
    const fx = (dx / distance) * force
    const fy = (dy / distance) * force

    source.vx += fx
    source.vy += fy
    target.vx -= fx
    target.vy -= fy
  }

  let energy = 0

  for (const node of nodes) {
    node.vx += (centerX - node.x) * CENTERING_STRENGTH
    node.vy += (centerY - node.y) * CENTERING_STRENGTH

    node.vx *= DAMPING
    node.vy *= DAMPING

    const speed = Math.hypot(node.vx, node.vy)

    if (speed > MAX_SPEED) {
      node.vx = (node.vx / speed) * MAX_SPEED
      node.vy = (node.vy / speed) * MAX_SPEED
    }

    node.x += node.vx
    node.y += node.vy

    node.x = Math.min(width - node.radius, Math.max(node.radius, node.x))
    node.y = Math.min(height - node.radius, Math.max(node.radius, node.y))

    energy += node.vx * node.vx + node.vy * node.vy
  }

  return energy
}
