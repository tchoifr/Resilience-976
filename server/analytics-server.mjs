/* global console, process */
import { createServer } from 'node:http'
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { randomUUID } from 'node:crypto'

const PORT = Number.parseInt(process.env.PORT ?? '8787', 10)
const HOST = process.env.HOST ?? '127.0.0.1'
const DATA_FILE = resolve(process.env.ANALYTICS_DATA_FILE ?? 'server/data/events.jsonl')
const ALLOWED_ORIGINS = (process.env.ANALYTICS_ALLOWED_ORIGINS ?? 'http://127.0.0.1:5173,http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

const eventMap = {
  page_view: 'page_view',
  diagnostic_started: 'journey_started',
  diagnostic_completed: 'journey_completed',
  result_viewed: 'diagnostic_result_viewed',
  checklist_opened: 'checklist_opened',
  kit_opened: 'emergency_kit_generated',
  pdf_downloaded: 'pdf_downloaded',
  technical_error: 'technical_error',
}

const allowedEvents = new Set(Object.keys(eventMap))
const allowedPaths = new Set([
  '/',
  '/diagnostic',
  '/resultats',
  '/checklist',
  '/kit',
  '/ressources',
  '/videos',
  '/tableau-de-bord',
  '/mentions-legales',
])

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

    if (body.length > 4096) {
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

  const visitorId = typeof input.visitorId === 'string' && /^[a-f0-9-]{36}$/.test(input.visitorId)
    ? input.visitorId
    : randomUUID()

  return {
    id: randomUUID(),
    name: input.name,
    metricName: eventMap[input.name],
    visitorId,
    version: typeof input.version === 'string' ? input.version.slice(0, 32) : '1.0.0',
    path: sanitizePath(input.path),
    campaignId: sanitizeCampaign(input.campaignId),
    createdAt: new Date().toISOString(),
  }
}

async function appendEvent(event) {
  await mkdir(dirname(DATA_FILE), { recursive: true })
  await writeFile(DATA_FILE, `${JSON.stringify(event)}\n`, { flag: 'a' })
}

async function readEvents() {
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

async function getUpdatedAt() {
  try {
    const stats = await stat(DATA_FILE)
    return stats.mtime.toISOString()
  } catch (error) {
    if (error.code === 'ENOENT') {
      return null
    }

    throw error
  }
}

function buildDashboard(events, updatedAt) {
  const engagedVisitorIds = new Set(
    events.filter((event) => event.name === 'diagnostic_started').map((event) => event.visitorId),
  )
  const completedCount = events.filter((event) => event.name === 'diagnostic_completed').length
  const visitCount = events.filter((event) => event.name === 'page_view').length
  const startedCount = events.filter((event) => event.name === 'diagnostic_started').length
  const resultViewedCount = events.filter((event) => event.name === 'result_viewed').length
  const actionCount = events.filter((event) =>
    ['checklist_opened', 'kit_opened', 'pdf_downloaded'].includes(event.name),
  ).length
  const pdfCount = events.filter((event) => event.name === 'pdf_downloaded').length
  const technicalErrorCount = events.filter((event) => event.name === 'technical_error').length
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

    if (['checklist_opened', 'kit_opened', 'pdf_downloaded'].includes(event.name)) {
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
      technicalErrors: technicalErrorCount,
      completionRate: startedCount === 0 ? 0 : Math.round((completedCount / startedCount) * 100),
    },
    campaigns: Array.from(campaigns.values()).sort((a, b) => b.engaged - a.engaged),
  }
}

const server = createServer(async (request, response) => {
  const origin = getCorsOrigin(request)

  if (!origin) {
    sendJson(response, 403, { error: 'origin_not_allowed' }, 'null')
    return
  }

  if (request.method === 'OPTIONS') {
    sendJson(response, 204, {}, origin)
    return
  }

  try {
    if (request.method === 'POST' && request.url === '/api/events') {
      const body = await readBody(request)
      const event = sanitizeEvent(body)

      await appendEvent(event)
      sendJson(response, 202, { ok: true, visitorId: event.visitorId }, origin)
      return
    }

    if (request.method === 'GET' && request.url === '/api/dashboard') {
      const events = await readEvents()
      const updatedAt = await getUpdatedAt()

      sendJson(response, 200, buildDashboard(events, updatedAt), origin)
      return
    }

    if (request.method === 'GET' && request.url === '/api/health') {
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
