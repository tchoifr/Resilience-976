export type VisitorStatus = 'visited' | 'engaged' | 'actioned' | 'completed'

export interface VisitorGraphNodeData {
  id: string
  type: 'campaign' | 'visitor'
  campaignId: string
  // Present only on type: 'campaign'.
  visitorCount?: number
  // Present only on type: 'visitor'.
  status?: VisitorStatus
}

export interface VisitorGraphEdgeData {
  source: string
  target: string
}

export interface VisitorGraphResponse {
  generatedAt: string
  totalVisitors: number
  totalCampaigns: number
  nodes: VisitorGraphNodeData[]
  edges: VisitorGraphEdgeData[]
}

// Simulation-only fields, added on top of the fetched data for layout.
export interface SimulationNode extends VisitorGraphNodeData {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
}
