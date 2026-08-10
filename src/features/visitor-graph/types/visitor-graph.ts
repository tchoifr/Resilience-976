export type VisitorStatus = 'visited' | 'engaged' | 'actioned' | 'completed'
export type VisitorGraphEdgeType =
  | 'campaign'
  | 'risk'
  | 'strength'
  | 'scenario_weak'
  | 'scenario_strong'
export type VisitorGraphNodeType = 'campaign' | 'visitor' | VisitorGraphEdgeType

export interface VisitorGraphNodeData {
  id: string
  type: VisitorGraphNodeType
  // Present on type: 'campaign' and type: 'visitor'.
  campaignId?: string
  // Present on every hub type (campaign, risk, strength, scenario_weak,
  // scenario_strong) — never on type: 'visitor'.
  visitorCount?: number
  // Present only on type: 'visitor'.
  status?: VisitorStatus
  // Present only on type: 'risk' and type: 'strength' — the diagnostic
  // domain slug, translate via getDomainLabel().
  domain?: string
  // Present only on type: 'scenario_weak' and type: 'scenario_strong'.
  scenarioId?: string
  // Present only on type: 'scenario_weak' and type: 'scenario_strong' — the
  // scenario's title, already resolved server-side (content data, not an
  // i18n key, so no client-side lookup needed).
  label?: string
}

export interface VisitorGraphEdgeData {
  source: string
  target: string
  type: VisitorGraphEdgeType
}

export interface VisitorGraphResponse {
  generatedAt: string
  totalVisitors: number
  totalCampaigns: number
  totalRiskDomains: number
  totalStrengthDomains: number
  totalScenarioWeakSpots: number
  totalScenarioStrongSpots: number
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

export interface VisitorDiagnosticResponse {
  id: string
  createdAt: string
  campaignId: string
  version: string
  answers: Record<string, string>
}

export interface VisitorQuizResult {
  id: string
  createdAt: string
  campaignId: string
  score: number
  total: number
  answers: Record<string, number>
}

export interface VisitorScenarioResult {
  id: string
  createdAt: string
  campaignId: string
  scenarioId: string
  score: number
  choices: Record<string, string>
}

export interface VisitorVideoProgress {
  videoId: string
  campaignId: string
  status: 'started' | 'completed'
  quizAnsweredCorrectly: boolean
  updatedAt: string
}

export interface VisitorKitProfile {
  campaignId: string
  adults: number
  children: number
  elderly: number
  pets: number
  specialNeeds: boolean
  updatedAt: string
}

export interface VisitorTimelineEvent {
  name: string
  path: string
  campaignId: string
  createdAt: string
}

export interface VisitorProfileResponse {
  visitorId: string
  found: boolean
  diagnosticResponses: VisitorDiagnosticResponse[]
  quizResults: VisitorQuizResult[]
  scenarioResults: VisitorScenarioResult[]
  videoProgress: VisitorVideoProgress[]
  kitProfile: VisitorKitProfile | null
  timeline: VisitorTimelineEvent[]
}
