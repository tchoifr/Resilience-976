/* global console, process, URL */
import { createServer } from 'node:http'
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { randomUUID } from 'node:crypto'
import { DatabaseSync } from 'node:sqlite'

const PORT = Number.parseInt(process.env.PORT ?? '8787', 10)
const HOST = process.env.HOST ?? '127.0.0.1'
const DATA_FILE = resolve(
  process.env.ANALYTICS_DATA_FILE ?? 'server/data/events.jsonl',
)
const DATABASE_FILE = resolve(
  process.env.RESILIENCE_DATABASE_FILE ??
    process.env.FEEDBACK_DATABASE_FILE ??
    'server/data/resilience.sqlite',
)
const ALLOWED_ORIGINS = (
  process.env.ANALYTICS_ALLOWED_ORIGINS ??
  'http://127.0.0.1:5173,http://localhost:5173'
)
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

const eventMap = {
  page_view: 'page_view',
  action_plan_opened: 'action_plan_opened',
  certificate_generated: 'certificate_generated',
  checklist_progress: 'checklist_progress',
  diagnostic_started: 'journey_started',
  diagnostic_completed: 'journey_completed',
  feedback_submitted: 'feedback_submitted',
  result_viewed: 'diagnostic_result_viewed',
  checklist_opened: 'checklist_opened',
  kit_opened: 'emergency_kit_generated',
  pdf_downloaded: 'pdf_downloaded',
  source_opened: 'source_opened',
  technical_error: 'technical_error',
}

const allowedEvents = new Set(Object.keys(eventMap))
const ratingKeys = [
  'objective',
  'questions',
  'autonomy',
  'score',
  'priorities',
  'actions',
  'deliverables',
  'trust',
  'officialWarnings',
  'recommendation',
]
const allowedPaths = new Set([
  '/',
  '/diagnostic',
  '/resultats',
  '/checklist',
  '/kit',
  '/ressources',
  '/videos',
  '/tableau-de-bord',
  '/experimentation-utilisateurs',
  '/mentions-legales',
])

const actionEvents = new Set([
  'action_plan_opened',
  'certificate_generated',
  'checklist_opened',
  'kit_opened',
  'pdf_downloaded',
])
const allowedDevices = new Set(['smartphone', 'ordinateur', 'tablette'])
const allowedProfiles = new Set([
  'famille',
  'jeune',
  'senior',
  'aidant',
  'relais',
  'autre',
])
const allowedAssistanceLevels = new Set(['aucune', 'faible', 'importante'])
let database = null

function getCorsOrigin(request) {
  const origin = request.headers.origin

  if (!origin) {
    return '*'
  }

  return ALLOWED_ORIGINS.includes(origin) ? origin : ''
}

function sendJson(response, statusCode, payload, origin = '*') {
  response.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'access-control-allow-origin': origin,
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'content-type',
  })
  response.end(JSON.stringify(payload))
}

async function readBody(request) {
  let body = ''

  for await (const chunk of request) {
    body += chunk

    if (body.length > 16_384) {
      throw new Error('payload_too_large')
    }
  }

  return JSON.parse(body || '{}')
}

function sanitizePath(path) {
  if (typeof path !== 'string') {
    return '/'
  }

  const cleanPath = path.split('?')[0] || '/'
  return allowedPaths.has(cleanPath) ? cleanPath : '/autre'
}

function sanitizeCampaign(value) {
  if (typeof value !== 'string') {
    return 'DIRECT'
  }

  const normalized = value.trim().slice(0, 80)
  return /^[A-Z0-9_-]+$/i.test(normalized) ? normalized : 'DIRECT'
}

function sanitizeEvent(input) {
  if (!allowedEvents.has(input.name)) {
    throw new Error('invalid_event')
  }

  const visitorId =
    typeof input.visitorId === 'string' &&
    /^[a-f0-9-]{36}$/.test(input.visitorId)
      ? input.visitorId
      : randomUUID()

  return {
    id: randomUUID(),
    name: input.name,
    metricName: eventMap[input.name],
    visitorId,
    version:
      typeof input.version === 'string' ? input.version.slice(0, 32) : '1.0.0',
    path: sanitizePath(input.path),
    campaignId: sanitizeCampaign(input.campaignId),
    createdAt: new Date().toISOString(),
  }
}

function sanitizeText(value, maxLength) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

function sanitizeEnum(value, allowedValues, fallback) {
  return typeof value === 'string' && allowedValues.has(value)
    ? value
    : fallback
}

function sanitizeInteger(value, min, max, fallback) {
  const numberValue = Number(value)

  if (!Number.isFinite(numberValue)) {
    return fallback
  }

  return Math.min(max, Math.max(min, Math.round(numberValue)))
}

function sanitizeParticipantCode(value) {
  const participantCode = sanitizeText(value, 20)

  return /^[a-z0-9_-]{1,20}$/i.test(participantCode)
    ? participantCode
    : `P${Date.now().toString().slice(-6)}`
}

function sanitizeClientDate(value) {
  if (typeof value !== 'string') {
    return new Date().toISOString()
  }

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString()
}

function sanitizeRatings(value) {
  const input = value && typeof value === 'object' ? value : {}

  return ratingKeys.reduce(
    (ratings, key) => ({
      ...ratings,
      [key]: sanitizeInteger(input[key], 1, 5, 3),
    }),
    {},
  )
}

function sanitizeFeedback(input) {
  return {
    id:
      typeof input.id === 'string' && /^[a-f0-9-]{36}$/.test(input.id)
        ? input.id
        : randomUUID(),
    createdAt: new Date().toISOString(),
    clientCreatedAt: sanitizeClientDate(input.createdAt),
    participantCode: sanitizeParticipantCode(input.participantCode),
    device: sanitizeEnum(input.device, allowedDevices, 'smartphone'),
    browser: sanitizeText(input.browser, 160),
    profile: sanitizeEnum(input.profile, allowedProfiles, 'famille'),
    assistance: sanitizeEnum(input.assistance, allowedAssistanceLevels, 'aucune'),
    durationMinutes: sanitizeInteger(input.durationMinutes, 0, 90, 0),
    completedJourney: input.completedJourney === true,
    ratings: sanitizeRatings(input.ratings),
    usefulAction: sanitizeText(input.usefulAction, 500),
    difficulty: sanitizeText(input.difficulty, 500),
    priorityImprovement: sanitizeText(input.priorityImprovement, 500),
    concern: sanitizeText(input.concern, 500),
  }
}

async function appendEventToJsonl(event) {
  await mkdir(dirname(DATA_FILE), { recursive: true })
  await writeFile(DATA_FILE, `${JSON.stringify(event)}\n`, { flag: 'a' })
}

async function getDatabase() {
  if (database) {
    return database
  }

  await mkdir(dirname(DATABASE_FILE), { recursive: true })
  database = new DatabaseSync(DATABASE_FILE)
  database.exec(`
    CREATE TABLE IF NOT EXISTS analytics_events (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      metric_name TEXT NOT NULL,
      visitor_id TEXT NOT NULL,
      version TEXT NOT NULL,
      path TEXT NOT NULL,
      campaign_id TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS analytics_events_created_at_idx
      ON analytics_events (created_at DESC);

    CREATE INDEX IF NOT EXISTS analytics_events_name_idx
      ON analytics_events (name);

    CREATE TABLE IF NOT EXISTS user_feedback (
      id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      client_created_at TEXT NOT NULL,
      participant_code TEXT NOT NULL,
      device TEXT NOT NULL,
      browser TEXT NOT NULL,
      profile TEXT NOT NULL,
      assistance TEXT NOT NULL,
      duration_minutes INTEGER NOT NULL,
      completed_journey INTEGER NOT NULL,
      ratings_json TEXT NOT NULL,
      useful_action TEXT NOT NULL,
      difficulty TEXT NOT NULL,
      priority_improvement TEXT NOT NULL,
      concern TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS user_feedback_created_at_idx
      ON user_feedback (created_at DESC);
  `)

  return database
}

async function saveEvent(event) {
  const currentDatabase = await getDatabase()

  currentDatabase
    .prepare(
      `
        INSERT OR IGNORE INTO analytics_events (
          id,
          name,
          metric_name,
          visitor_id,
          version,
          path,
          campaign_id,
          created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
    )
    .run(
      event.id,
      event.name,
      event.metricName,
      event.visitorId,
      event.version,
      event.path,
      event.campaignId,
      event.createdAt,
    )

  await appendEventToJsonl(event)
}

async function saveFeedback(feedback) {
  const currentDatabase = await getDatabase()

  currentDatabase
    .prepare(
      `
        INSERT INTO user_feedback (
          id,
          created_at,
          client_created_at,
          participant_code,
          device,
          browser,
          profile,
          assistance,
          duration_minutes,
          completed_journey,
          ratings_json,
          useful_action,
          difficulty,
          priority_improvement,
          concern
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
    )
    .run(
      feedback.id,
      feedback.createdAt,
      feedback.clientCreatedAt,
      feedback.participantCode,
      feedback.device,
      feedback.browser,
      feedback.profile,
      feedback.assistance,
      feedback.durationMinutes,
      feedback.completedJourney ? 1 : 0,
      JSON.stringify(feedback.ratings),
      feedback.usefulAction,
      feedback.difficulty,
      feedback.priorityImprovement,
      feedback.concern,
    )
}

async function countFeedback() {
  const currentDatabase = await getDatabase()
  const row = currentDatabase
    .prepare('SELECT COUNT(*) AS total FROM user_feedback')
    .get()

  return Number(row.total)
}

async function readEventsFromDatabase() {
  const currentDatabase = await getDatabase()

  return currentDatabase
    .prepare(
      `
        SELECT
          id,
          name,
          metric_name,
          visitor_id,
          version,
          path,
          campaign_id,
          created_at
        FROM analytics_events
        ORDER BY created_at ASC
      `,
    )
    .all()
    .map((event) => ({
      id: event.id,
      name: event.name,
      metricName: event.metric_name,
      visitorId: event.visitor_id,
      version: event.version,
      path: event.path,
      campaignId: event.campaign_id,
      createdAt: event.created_at,
    }))
}

async function readEventsFromJsonl() {
  try {
    const content = await readFile(DATA_FILE, 'utf8')
    return content
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line))
  } catch (error) {
    if (error.code === 'ENOENT') {
      return []
    }

    throw error
  }
}

async function readEvents() {
  const events = await readEventsFromDatabase()

  if (events.length > 0) {
    return events
  }

  return readEventsFromJsonl()
}

async function getFileUpdatedAt(filePath) {
  try {
    const stats = await stat(filePath)
    return stats.mtime.toISOString()
  } catch (error) {
    if (error.code === 'ENOENT') {
      return null
    }

    throw error
  }
}

async function getUpdatedAt() {
  const dates = [await getFileUpdatedAt(DATA_FILE), await getFileUpdatedAt(DATABASE_FILE)]
    .filter(Boolean)
    .sort()

  return dates.at(-1) ?? null
}

function buildDashboard(events, updatedAt, feedbackDatabaseCount = 0) {
  const engagedVisitorIds = new Set(
    events
      .filter((event) => event.name === 'diagnostic_started')
      .map((event) => event.visitorId),
  )
  const completedCount = events.filter(
    (event) => event.name === 'diagnostic_completed',
  ).length
  const visitCount = events.filter((event) => event.name === 'page_view').length
  const startedCount = events.filter(
    (event) => event.name === 'diagnostic_started',
  ).length
  const resultViewedCount = events.filter(
    (event) => event.name === 'result_viewed',
  ).length
  const actionCount = events.filter((event) =>
    actionEvents.has(event.name),
  ).length
  const pdfCount = events.filter(
    (event) => event.name === 'pdf_downloaded',
  ).length
  const certificateCount = events.filter(
    (event) => event.name === 'certificate_generated',
  ).length
  const checklistProgressCount = events.filter(
    (event) => event.name === 'checklist_progress',
  ).length
  const sourceOpenedCount = events.filter(
    (event) => event.name === 'source_opened',
  ).length
  const feedbackCount = events.filter(
    (event) => event.name === 'feedback_submitted',
  ).length
  const totalFeedbackCount = Math.max(feedbackCount, feedbackDatabaseCount)
  const technicalErrorCount = events.filter(
    (event) => event.name === 'technical_error',
  ).length
  const campaigns = new Map()

  for (const event of events) {
    const current = campaigns.get(event.campaignId) ?? {
      campaignId: event.campaignId,
      engaged: 0,
      completed: 0,
      actions: 0,
    }

    if (event.name === 'diagnostic_started') {
      current.engaged += 1
    }

    if (event.name === 'diagnostic_completed') {
      current.completed += 1
    }

    if (actionEvents.has(event.name)) {
      current.actions += 1
    }

    campaigns.set(event.campaignId, current)
  }

  return {
    generatedAt: new Date().toISOString(),
    updatedAt,
    target: 5000,
    totals: {
      visits: visitCount,
      engagedVisitors: engagedVisitorIds.size,
      journeysStarted: startedCount,
      journeysCompleted: completedCount,
      resultViews: resultViewedCount,
      actionOpens: actionCount,
      pdfDownloads: pdfCount,
      certificatesGenerated: certificateCount,
      checklistProgressEvents: checklistProgressCount,
      sourcesOpened: sourceOpenedCount,
      feedbackSubmitted: totalFeedbackCount,
      technicalErrors: technicalErrorCount,
      completionRate:
        startedCount === 0
          ? 0
          : Math.round((completedCount / startedCount) * 100),
    },
    campaigns: Array.from(campaigns.values()).sort(
      (a, b) => b.engaged - a.engaged,
    ),
  }
}

const server = createServer(async (request, response) => {
  const origin = getCorsOrigin(request)
  const requestUrl = new URL(request.url ?? '/', `http://${request.headers.host}`)

  if (!origin) {
    sendJson(response, 403, { error: 'origin_not_allowed' }, 'null')
    return
  }

  if (request.method === 'OPTIONS') {
    sendJson(response, 204, {}, origin)
    return
  }

  try {
    if (request.method === 'POST' && requestUrl.pathname === '/api/events') {
      const body = await readBody(request)
      const event = sanitizeEvent(body)

      await saveEvent(event)
      sendJson(response, 202, { ok: true, visitorId: event.visitorId }, origin)
      return
    }

    if (request.method === 'POST' && requestUrl.pathname === '/api/feedback') {
      const body = await readBody(request)
      const feedback = sanitizeFeedback(body)

      await saveFeedback(feedback)
      sendJson(response, 201, { ok: true, id: feedback.id }, origin)
      return
    }

    if (request.method === 'GET' && requestUrl.pathname === '/api/dashboard') {
      const events = await readEvents()
      const updatedAt = await getUpdatedAt()
      const feedbackDatabaseCount = await countFeedback()

      sendJson(
        response,
        200,
        buildDashboard(events, updatedAt, feedbackDatabaseCount),
        origin,
      )
      return
    }

    if (request.method === 'GET' && requestUrl.pathname === '/api/health') {
      sendJson(response, 200, { ok: true }, origin)
      return
    }

    sendJson(response, 404, { error: 'not_found' }, origin)
  } catch (error) {
    const statusCode = error.message === 'payload_too_large' ? 413 : 400
    sendJson(response, statusCode, { error: error.message }, origin)
  }
})

server.listen(PORT, HOST, () => {
  console.log(`Analytics server listening on http://${HOST}:${PORT}`)
})
