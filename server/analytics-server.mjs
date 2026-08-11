/* global console, process, URL, fetch */
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
const QUESTIONS_FILE = resolve(
  process.env.QUESTIONS_DATA_FILE ?? 'src/data/questions.json',
)
const QUIZ_QUESTIONS_FILE = resolve(
  process.env.QUIZ_QUESTIONS_DATA_FILE ?? 'src/data/quiz-questions.json',
)
const VIDEOS_FILE = resolve(process.env.VIDEOS_DATA_FILE ?? 'src/data/videos.json')
const SCENARIOS_FILE = resolve(
  process.env.SCENARIOS_DATA_FILE ?? 'src/data/scenarios.json',
)
const ENGAGEMENT_TARGET = 5000
const ASSISTANT_ENTRIES_FILE = resolve(
  process.env.ASSISTANT_ENTRIES_DATA_FILE ?? 'src/data/assistant-entries.json',
)
// Cle personnelle Hugging Face avec la permission "Inference Providers"
// (https://huggingface.co/settings/tokens). Jamais exposee au navigateur :
// uniquement lue ici, cote serveur.
const HF_TOKEN = process.env.HF_TOKEN ?? ''
const HF_CHAT_MODEL = process.env.HF_CHAT_MODEL ?? 'Qwen/Qwen2.5-7B-Instruct'
const HF_ROUTER_URL = 'https://router.huggingface.co/v1/chat/completions'
const ASSISTANT_RATE_LIMIT = Number.parseInt(
  process.env.ASSISTANT_RATE_LIMIT ?? '20',
  10,
)
const ASSISTANT_RATE_WINDOW_MS = 60_000
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
  quiz_started: 'quiz_started',
  quiz_completed: 'quiz_completed',
  quiz_attestation_generated: 'quiz_attestation_generated',
  scenario_started: 'scenario_started',
  scenario_completed: 'scenario_completed',
  video_attestation_generated: 'video_attestation_generated',
  kit_pdf_generated: 'kit_pdf_generated',
  assistant_question_asked: 'assistant_question_asked',
  assistant_answered: 'assistant_answered',
  assistant_unanswered: 'assistant_unanswered',
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
  '/quiz',
  '/mises-en-situation',
  '/tableau-de-bord',
  '/tableau-de-bord/experimentation',
  '/tableau-de-bord/diagnostics',
  '/tableau-de-bord/quiz',
  '/tableau-de-bord/formations',
  '/tableau-de-bord/mises-en-situation',
  '/experimentation-utilisateurs',
  '/mentions-legales',
  '/politique-de-confidentialite',
  '/declaration-accessibilite',
  '/support',
  '/tableau-de-bord/kit',
  '/tableau-de-bord/graphe-visiteurs',
  '/tableau-de-bord/visiteur',
  '/tableau-de-bord/priorites',
  '/assistant-documentaire',
])

const actionEvents = new Set([
  'action_plan_opened',
  'certificate_generated',
  'checklist_opened',
  'kit_opened',
  'pdf_downloaded',
  'quiz_attestation_generated',
  'video_attestation_generated',
  'kit_pdf_generated',
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

  return {
    id: randomUUID(),
    name: input.name,
    metricName: eventMap[input.name],
    visitorId: sanitizeVisitorId(input.visitorId),
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
  return sanitizeVisitorId(value)
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

function sanitizeVisitorId(value) {
  return typeof value === 'string' && /^[a-f0-9-]{36}$/.test(value)
    ? value
    : randomUUID()
}

// Unlike sanitizeVisitorId (which silently substitutes a fresh id when the
// input is malformed, fine for write paths), a lookup must be able to say
// "that's not a valid id" instead of quietly generating a random one.
function isValidVisitorId(value) {
  return typeof value === 'string' && /^[a-f0-9-]{36}$/.test(value)
}

let questionsIndex = null

async function getQuestionsIndex() {
  if (questionsIndex) {
    return questionsIndex
  }

  const questions = JSON.parse(await readFile(QUESTIONS_FILE, 'utf8'))
  const byId = new Map(questions.map((question) => [question.id, question]))
  const validAnswersByQuestion = new Map(
    questions.map((question) => [
      question.id,
      new Set(question.answers.map((answer) => answer.id)),
    ]),
  )

  questionsIndex = { questions, byId, validAnswersByQuestion }
  return questionsIndex
}

let quizQuestionsIndex = null

async function getQuizQuestionsIndex() {
  if (quizQuestionsIndex) {
    return quizQuestionsIndex
  }

  const questions = JSON.parse(await readFile(QUIZ_QUESTIONS_FILE, 'utf8'))
  const byId = new Map(questions.map((question) => [question.id, question]))

  quizQuestionsIndex = { questions, byId }
  return quizQuestionsIndex
}

async function sanitizeQuizAnswers(input) {
  const { byId } = await getQuizQuestionsIndex()
  const answers = input && typeof input === 'object' ? input : {}
  const sanitized = {}

  for (const [questionId, optionIndex] of Object.entries(answers)) {
    const question = byId.get(questionId)
    const index = Number(optionIndex)

    if (
      question &&
      Number.isInteger(index) &&
      index >= 0 &&
      index < question.options.length
    ) {
      sanitized[questionId] = index
    }
  }

  return sanitized
}

let videosIndex = null

async function getVideosIndex() {
  if (videosIndex) {
    return videosIndex
  }

  const videos = JSON.parse(await readFile(VIDEOS_FILE, 'utf8'))
  const byId = new Map(videos.map((video) => [video.id, video]))

  videosIndex = { videos, byId }
  return videosIndex
}

const allowedVideoProgressStatuses = new Set(['started', 'completed'])

async function sanitizeVideoProgress(input) {
  const { byId } = await getVideosIndex()
  const video = byId.get(input.videoId)

  return {
    visitorId: sanitizeVisitorId(input.visitorId),
    campaignId: sanitizeCampaign(input.campaignId),
    videoId: video ? video.id : null,
    status: sanitizeEnum(input.status, allowedVideoProgressStatuses, 'started'),
    quizAnsweredCorrectly: input.quizAnsweredCorrectly === true,
    updatedAt: new Date().toISOString(),
  }
}

let scenariosIndex = null

async function getScenariosIndex() {
  if (scenariosIndex) {
    return scenariosIndex
  }

  const scenarios = JSON.parse(await readFile(SCENARIOS_FILE, 'utf8'))
  const byId = new Map(scenarios.map((scenario) => [scenario.id, scenario]))

  scenariosIndex = { scenarios, byId }
  return scenariosIndex
}

function sanitizeScenarioChoices(input, scenario) {
  const choices = input && typeof input === 'object' ? input : {}
  const stepsById = new Map(scenario.steps.map((step) => [step.id, step]))
  const sanitized = {}

  for (const [stepId, optionId] of Object.entries(choices)) {
    const step = stepsById.get(stepId)
    const option = step?.options.find((candidate) => candidate.id === optionId)

    if (option) {
      sanitized[stepId] = optionId
    }
  }

  return sanitized
}

async function sanitizeScenarioResult(input) {
  const { byId } = await getScenariosIndex()
  const scenario = byId.get(input.scenarioId)

  return {
    id: sanitizeVisitorId(input.id),
    createdAt: new Date().toISOString(),
    visitorId: sanitizeVisitorId(input.visitorId),
    campaignId: sanitizeCampaign(input.campaignId),
    scenarioId: scenario ? scenario.id : null,
    score: sanitizeInteger(input.score, 0, 100, 0),
    choices: scenario ? sanitizeScenarioChoices(input.choices, scenario) : {},
  }
}

let assistantEntriesIndex = null

async function getAssistantEntriesIndex() {
  if (assistantEntriesIndex) {
    return assistantEntriesIndex
  }

  const entries = JSON.parse(await readFile(ASSISTANT_ENTRIES_FILE, 'utf8'))
  const byId = new Map(entries.map((entry) => [entry.id, entry]))

  assistantEntriesIndex = { entries, byId }
  return assistantEntriesIndex
}

function sanitizeAssistantQuestion(value) {
  const text = typeof value === 'string' ? value.trim() : ''
  return text.slice(0, 300)
}

const assistantRateLimitByIp = new Map()

function getClientIp(request) {
  const forwarded = request.headers['x-forwarded-for']

  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim()
  }

  return request.socket.remoteAddress ?? 'unknown'
}

function allowAssistantRequest(request) {
  const ip = getClientIp(request)
  const now = Date.now()
  const windowStart = now - ASSISTANT_RATE_WINDOW_MS
  const timestamps = (assistantRateLimitByIp.get(ip) ?? []).filter(
    (timestamp) => timestamp > windowStart,
  )

  if (timestamps.length >= ASSISTANT_RATE_LIMIT) {
    assistantRateLimitByIp.set(ip, timestamps)
    return false
  }

  timestamps.push(now)
  assistantRateLimitByIp.set(ip, timestamps)
  return true
}

// Le corpus est petit (quelques fiches) : on l'inclut en entier a chaque
// appel plutot que de faire une recherche prealable, et on demande au
// modele de refuser explicitement s'il n'y trouve pas de correspondance
// claire. Aucun fait, chiffre ou conseil hors de ces fiches ne doit
// apparaitre dans la reponse.
function buildAssistantSystemPrompt(entries) {
  const sheets = entries
    .map(
      (entry) =>
        `[${entry.id}]\nQuestion type : ${entry.question}\nReponse validee : ${entry.answer}`,
    )
    .join('\n---\n')

  return [
    "Tu es l'assistant documentaire du site public Resilience 976 (preparation aux risques a Mayotte).",
    "Tu ne dois repondre qu'a partir des fiches validees ci-dessous, sans ajouter de fait, de chiffre, de conseil medical individuel ou de prevision meteo qui n'y figure pas.",
    'Si aucune fiche ne repond clairement a la question, tu dois refuser.',
    '',
    'Fiches disponibles :',
    sheets,
    '',
    'Reponds STRICTEMENT en JSON, sans aucun texte hors du JSON, au format :',
    '{"answered": boolean, "answerText": string, "matchedEntryId": string ou null}',
    '',
    'Regles :',
    '- "answered" est true seulement si une fiche correspond clairement a la question.',
    '- "answerText" reformule fidelement la reponse validee correspondante, en francais, de maniere concise, sans rien ajouter qui ne soit pas dans la fiche. Chaine vide si answered est false.',
    "- \"matchedEntryId\" est l'identifiant exact de la fiche utilisee (entre crochets ci-dessus), ou null si answered est false.",
  ].join('\n')
}

// Ne fait jamais confiance au JSON du modele tel quel : matchedEntryId doit
// correspondre a une fiche reelle du corpus, sinon la reponse est traitee
// comme un refus. Les sourceIds affichees a l'utilisateur viennent toujours
// de la fiche validee elle-meme, jamais d'un texte libre genere.
function parseAssistantCompletion(rawContent, entriesById) {
  let parsed

  try {
    parsed = JSON.parse(rawContent)
  } catch {
    return { answered: false, answer: '', matchedEntryId: null }
  }

  const matchedEntryId =
    typeof parsed.matchedEntryId === 'string' ? parsed.matchedEntryId : null
  const entry = matchedEntryId ? entriesById.get(matchedEntryId) : undefined
  const answerText = typeof parsed.answerText === 'string' ? parsed.answerText.trim() : ''

  if (parsed.answered !== true || !entry || !answerText) {
    return { answered: false, answer: '', matchedEntryId: null }
  }

  return { answered: true, answer: answerText.slice(0, 1000), matchedEntryId: entry.id }
}

async function askHuggingFace(question, entriesIndex) {
  const response = await fetch(HF_ROUTER_URL, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${HF_TOKEN}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: HF_CHAT_MODEL,
      temperature: 0.2,
      max_tokens: 400,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: buildAssistantSystemPrompt(entriesIndex.entries) },
        { role: 'user', content: question },
      ],
    }),
  })

  if (!response.ok) {
    throw new Error(`hugging_face_http_${response.status}`)
  }

  const payload = await response.json()
  const rawContent = payload.choices?.[0]?.message?.content

  if (typeof rawContent !== 'string') {
    throw new Error('hugging_face_empty_response')
  }

  return parseAssistantCompletion(rawContent, entriesIndex.byId)
}

function sanitizeKitProfile(input) {
  return {
    visitorId: sanitizeVisitorId(input.visitorId),
    campaignId: sanitizeCampaign(input.campaignId),
    adults: sanitizeInteger(input.adults, 0, 20, 0),
    children: sanitizeInteger(input.children, 0, 20, 0),
    elderly: sanitizeInteger(input.elderly, 0, 20, 0),
    pets: sanitizeInteger(input.pets, 0, 20, 0),
    specialNeeds: input.specialNeeds === true,
    updatedAt: new Date().toISOString(),
  }
}

async function sanitizeDiagnosticAnswers(input) {
  const { validAnswersByQuestion } = await getQuestionsIndex()
  const answers = input && typeof input === 'object' ? input : {}
  const sanitized = {}

  for (const [questionId, answerId] of Object.entries(answers)) {
    const allowedAnswers = validAnswersByQuestion.get(questionId)

    if (
      allowedAnswers &&
      typeof answerId === 'string' &&
      allowedAnswers.has(answerId)
    ) {
      sanitized[questionId] = answerId
    }
  }

  return sanitized
}

function getScoreLevelId(score) {
  if (score <= 39) {
    return 'insufficient'
  }

  if (score <= 59) {
    return 'fragile'
  }

  if (score <= 79) {
    return 'good'
  }

  return 'very_good'
}

// Mirrors calculateAssessment() in src/features/assessment/services/scoring.service.ts
// so aggregate stats match what the app itself would show a given respondent.
function calculateDiagnosticScore(answers, questionsById) {
  const domains = new Map()

  for (const [questionId, answerId] of Object.entries(answers)) {
    const question = questionsById.get(questionId)
    const option = question?.answers.find((answer) => answer.id === answerId)

    if (!question || !option) {
      continue
    }

    const current = domains.get(question.domain) ?? { sum: 0, weight: 0 }
    current.sum += option.score * question.weight
    current.weight += question.weight
    domains.set(question.domain, current)
  }

  const domainScores = {}

  for (const [domain, value] of domains) {
    domainScores[domain] =
      value.weight === 0 ? 0 : Math.round(value.sum / value.weight)
  }

  const scores = Object.values(domainScores)
  const globalScore =
    scores.length === 0
      ? 0
      : Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)

  return { globalScore, domainScores }
}

function buildDiagnosticStats(rows, index, totalStarted = 0) {
  const total = rows.length
  const domainSums = {}
  const domainCounts = {}
  const levelCounts = { insufficient: 0, fragile: 0, good: 0, very_good: 0 }
  const questionAnswerCounts = new Map()
  const dailyScores = new Map()
  let globalScoreSum = 0

  for (const row of rows) {
    const { globalScore, domainScores } = calculateDiagnosticScore(
      row.answers,
      index.byId,
    )

    globalScoreSum += globalScore
    levelCounts[getScoreLevelId(globalScore)] += 1

    const day = row.createdAt.slice(0, 10)
    const dayStats = dailyScores.get(day) ?? { count: 0, scoreSum: 0 }
    dayStats.count += 1
    dayStats.scoreSum += globalScore
    dailyScores.set(day, dayStats)

    for (const [domain, score] of Object.entries(domainScores)) {
      domainSums[domain] = (domainSums[domain] ?? 0) + score
      domainCounts[domain] = (domainCounts[domain] ?? 0) + 1
    }

    for (const [questionId, answerId] of Object.entries(row.answers)) {
      if (!questionAnswerCounts.has(questionId)) {
        questionAnswerCounts.set(questionId, new Map())
      }

      const counts = questionAnswerCounts.get(questionId)
      counts.set(answerId, (counts.get(answerId) ?? 0) + 1)
    }
  }

  const domainAverages = {}

  for (const domain of Object.keys(domainSums)) {
    domainAverages[domain] = Math.round(domainSums[domain] / domainCounts[domain])
  }

  // Weakest average first: this is the ranking a decision-maker actually
  // wants ("where do we act first"), with respondentCount alongside so a
  // low score from one respondent doesn't read the same as one from fifty.
  const domainPriority = Object.entries(domainAverages)
    .map(([domain, averageScore]) => ({
      domain,
      averageScore,
      respondentCount: domainCounts[domain],
    }))
    .sort((a, b) => a.averageScore - b.averageScore)

  const questionBreakdown = index.questions.map((question) => ({
    id: question.id,
    domain: question.domain,
    answers: question.answers.map((answer) => ({
      id: answer.id,
      score: answer.score,
      count: questionAnswerCounts.get(question.id)?.get(answer.id) ?? 0,
    })),
  }))

  const trend = Array.from(dailyScores.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .slice(-30)
    .map(([date, value]) => ({
      date,
      responses: value.count,
      averageGlobalScore: Math.round(value.scoreSum / value.count),
    }))

  return {
    generatedAt: new Date().toISOString(),
    totalStarted,
    total,
    averageGlobalScore: total === 0 ? 0 : Math.round(globalScoreSum / total),
    domainAverages,
    domainPriority,
    levelCounts,
    questionBreakdown,
    trend,
  }
}

async function sanitizeDiagnosticResponse(input) {
  return {
    id: sanitizeVisitorId(input.id),
    createdAt: new Date().toISOString(),
    visitorId: sanitizeVisitorId(input.visitorId),
    campaignId: sanitizeCampaign(input.campaignId),
    version:
      typeof input.version === 'string' ? input.version.slice(0, 32) : '1.0.0',
    answers: await sanitizeDiagnosticAnswers(input.answers),
  }
}

async function sanitizeQuizResult(input) {
  return {
    id: sanitizeVisitorId(input.id),
    createdAt: new Date().toISOString(),
    visitorId: sanitizeVisitorId(input.visitorId),
    campaignId: sanitizeCampaign(input.campaignId),
    score: sanitizeInteger(input.score, 0, 1000, 0),
    total: sanitizeInteger(input.total, 0, 1000, 0),
    answers: await sanitizeQuizAnswers(input.answers),
  }
}

function sanitizeFeedback(input) {
  return {
    id:
      typeof input.id === 'string' && /^[a-f0-9-]{36}$/.test(input.id)
        ? input.id
        : randomUUID(),
    createdAt: new Date().toISOString(),
    clientCreatedAt: sanitizeClientDate(input.createdAt),
    visitorId: sanitizeVisitorId(input.visitorId),
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
      visitor_id TEXT NOT NULL DEFAULT '',
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

    CREATE TABLE IF NOT EXISTS diagnostic_responses (
      id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      visitor_id TEXT NOT NULL,
      campaign_id TEXT NOT NULL,
      version TEXT NOT NULL,
      answers_json TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS diagnostic_responses_created_at_idx
      ON diagnostic_responses (created_at DESC);

    CREATE TABLE IF NOT EXISTS quiz_results (
      id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      visitor_id TEXT NOT NULL,
      campaign_id TEXT NOT NULL,
      score INTEGER NOT NULL,
      total INTEGER NOT NULL,
      answers_json TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS quiz_results_created_at_idx
      ON quiz_results (created_at DESC);

    CREATE INDEX IF NOT EXISTS quiz_results_campaign_id_idx
      ON quiz_results (campaign_id);

    CREATE TABLE IF NOT EXISTS video_progress (
      visitor_id TEXT NOT NULL,
      video_id TEXT NOT NULL,
      campaign_id TEXT NOT NULL,
      status TEXT NOT NULL,
      quiz_answered_correctly INTEGER NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (visitor_id, video_id)
    );

    CREATE INDEX IF NOT EXISTS video_progress_video_id_idx
      ON video_progress (video_id);

    CREATE TABLE IF NOT EXISTS scenario_results (
      id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      visitor_id TEXT NOT NULL,
      campaign_id TEXT NOT NULL,
      scenario_id TEXT NOT NULL,
      score INTEGER NOT NULL,
      choices_json TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS scenario_results_created_at_idx
      ON scenario_results (created_at DESC);

    CREATE INDEX IF NOT EXISTS scenario_results_scenario_id_idx
      ON scenario_results (scenario_id);

    CREATE TABLE IF NOT EXISTS kit_profiles (
      visitor_id TEXT PRIMARY KEY,
      campaign_id TEXT NOT NULL,
      adults INTEGER NOT NULL,
      children INTEGER NOT NULL,
      elderly INTEGER NOT NULL,
      pets INTEGER NOT NULL,
      special_needs INTEGER NOT NULL,
      updated_at TEXT NOT NULL
    );
  `)

  try {
    database.exec(
      `ALTER TABLE user_feedback ADD COLUMN visitor_id TEXT NOT NULL DEFAULT '';`,
    )
  } catch (error) {
    if (!String(error.message).includes('duplicate column name')) {
      throw error
    }
  }

  // quiz_results shipped first with a `pseudonym` column and no
  // `answers_json`; the pseudonym was dropped before this ever reached
  // production, replaced by per-question answers for future stats.
  try {
    database.exec(
      `ALTER TABLE quiz_results ADD COLUMN answers_json TEXT NOT NULL DEFAULT '{}';`,
    )
  } catch (error) {
    if (!String(error.message).includes('duplicate column name')) {
      throw error
    }
  }

  try {
    database.exec(`ALTER TABLE quiz_results DROP COLUMN pseudonym;`)
  } catch (error) {
    if (!String(error.message).includes('no such column')) {
      throw error
    }
  }

  return database
}

async function saveDiagnosticResponse(diagnosticResponse) {
  const currentDatabase = await getDatabase()

  currentDatabase
    .prepare(
      `
        INSERT OR IGNORE INTO diagnostic_responses (
          id,
          created_at,
          visitor_id,
          campaign_id,
          version,
          answers_json
        )
        VALUES (?, ?, ?, ?, ?, ?)
      `,
    )
    .run(
      diagnosticResponse.id,
      diagnosticResponse.createdAt,
      diagnosticResponse.visitorId,
      diagnosticResponse.campaignId,
      diagnosticResponse.version,
      JSON.stringify(diagnosticResponse.answers),
    )
}

async function saveQuizResult(quizResult) {
  const currentDatabase = await getDatabase()

  currentDatabase
    .prepare(
      `
        INSERT OR IGNORE INTO quiz_results (
          id,
          created_at,
          visitor_id,
          campaign_id,
          score,
          total,
          answers_json
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
    )
    .run(
      quizResult.id,
      quizResult.createdAt,
      quizResult.visitorId,
      quizResult.campaignId,
      quizResult.score,
      quizResult.total,
      JSON.stringify(quizResult.answers),
    )
}

async function saveVideoProgress(videoProgress) {
  const currentDatabase = await getDatabase()

  currentDatabase
    .prepare(
      `
        INSERT INTO video_progress (
          visitor_id,
          video_id,
          campaign_id,
          status,
          quiz_answered_correctly,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT (visitor_id, video_id) DO UPDATE SET
          campaign_id = excluded.campaign_id,
          status = excluded.status,
          quiz_answered_correctly = excluded.quiz_answered_correctly,
          updated_at = excluded.updated_at
      `,
    )
    .run(
      videoProgress.visitorId,
      videoProgress.videoId,
      videoProgress.campaignId,
      videoProgress.status,
      videoProgress.quizAnsweredCorrectly ? 1 : 0,
      videoProgress.updatedAt,
    )
}

async function saveScenarioResult(scenarioResult) {
  const currentDatabase = await getDatabase()

  currentDatabase
    .prepare(
      `
        INSERT OR IGNORE INTO scenario_results (
          id,
          created_at,
          visitor_id,
          campaign_id,
          scenario_id,
          score,
          choices_json
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
    )
    .run(
      scenarioResult.id,
      scenarioResult.createdAt,
      scenarioResult.visitorId,
      scenarioResult.campaignId,
      scenarioResult.scenarioId,
      scenarioResult.score,
      JSON.stringify(scenarioResult.choices),
    )
}

async function saveKitProfile(kitProfile) {
  const currentDatabase = await getDatabase()

  currentDatabase
    .prepare(
      `
        INSERT INTO kit_profiles (
          visitor_id,
          campaign_id,
          adults,
          children,
          elderly,
          pets,
          special_needs,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT (visitor_id) DO UPDATE SET
          campaign_id = excluded.campaign_id,
          adults = excluded.adults,
          children = excluded.children,
          elderly = excluded.elderly,
          pets = excluded.pets,
          special_needs = excluded.special_needs,
          updated_at = excluded.updated_at
      `,
    )
    .run(
      kitProfile.visitorId,
      kitProfile.campaignId,
      kitProfile.adults,
      kitProfile.children,
      kitProfile.elderly,
      kitProfile.pets,
      kitProfile.specialNeeds ? 1 : 0,
      kitProfile.updatedAt,
    )
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
          visitor_id,
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
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
    )
    .run(
      feedback.id,
      feedback.createdAt,
      feedback.clientCreatedAt,
      feedback.visitorId,
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

function parseRatingsJson(value) {
  try {
    return JSON.parse(value)
  } catch {
    return {}
  }
}

async function readDiagnosticResponseRows() {
  const currentDatabase = await getDatabase()

  return currentDatabase
    .prepare(
      `
        SELECT created_at, answers_json
        FROM diagnostic_responses
        ORDER BY created_at DESC
      `,
    )
    .all()
    .map((row) => ({
      createdAt: row.created_at,
      answers: parseRatingsJson(row.answers_json),
    }))
}

async function readQuizResultRows() {
  const currentDatabase = await getDatabase()

  return currentDatabase
    .prepare(
      `
        SELECT campaign_id, score, total, answers_json, created_at
        FROM quiz_results
        ORDER BY created_at DESC
      `,
    )
    .all()
    .map((row) => ({
      campaignId: row.campaign_id,
      score: Number(row.score),
      total: Number(row.total),
      answers: parseRatingsJson(row.answers_json),
      createdAt: row.created_at,
    }))
}

function buildQuizQuestionBreakdown(rows, quizIndex) {
  const optionCountsByQuestion = new Map()

  for (const row of rows) {
    for (const [questionId, optionIndex] of Object.entries(row.answers)) {
      if (!optionCountsByQuestion.has(questionId)) {
        optionCountsByQuestion.set(questionId, new Map())
      }

      const optionCounts = optionCountsByQuestion.get(questionId)
      optionCounts.set(optionIndex, (optionCounts.get(optionIndex) ?? 0) + 1)
    }
  }

  return quizIndex.questions.map((question) => {
    const optionCounts = optionCountsByQuestion.get(question.id) ?? new Map()
    const totalAnswered = Array.from(optionCounts.values()).reduce(
      (sum, count) => sum + count,
      0,
    )

    return {
      id: question.id,
      risk: question.risk,
      totalAnswered,
      correctCount: optionCounts.get(question.correctOptionIndex) ?? 0,
      options: question.options.map((label, index) => ({
        index,
        label,
        count: optionCounts.get(index) ?? 0,
      })),
    }
  })
}

function buildQuizTrend(rows) {
  const byDate = new Map()

  for (const row of rows) {
    const scorePercent = row.total === 0 ? 0 : Math.round((row.score / row.total) * 100)
    const day = row.createdAt.slice(0, 10)
    const current = byDate.get(day) ?? { sessions: 0, scorePercentSum: 0 }

    current.sessions += 1
    current.scorePercentSum += scorePercent
    byDate.set(day, current)
  }

  return Array.from(byDate.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .slice(-30)
    .map(([date, value]) => ({
      date,
      sessions: value.sessions,
      averageScorePercent: Math.round(value.scorePercentSum / value.sessions),
    }))
}

// Lowest correct rate first: which question the audience actually gets
// wrong most often, i.e. where the underlying content isn't landing.
function buildQuestionPriority(questionBreakdown) {
  return questionBreakdown
    .filter((question) => question.totalAnswered > 0)
    .map((question) => ({
      id: question.id,
      risk: question.risk,
      correctRate: Math.round((question.correctCount / question.totalAnswered) * 100),
      totalAnswered: question.totalAnswered,
    }))
    .sort((a, b) => a.correctRate - b.correctRate)
}

function buildQuizStats(rows, quizIndex) {
  const campaigns = new Map()
  let scorePercentSum = 0

  for (const row of rows) {
    const scorePercent = row.total === 0 ? 0 : Math.round((row.score / row.total) * 100)
    scorePercentSum += scorePercent

    const current = campaigns.get(row.campaignId) ?? {
      campaignId: row.campaignId,
      participants: 0,
      scorePercentSum: 0,
    }

    current.participants += 1
    current.scorePercentSum += scorePercent
    campaigns.set(row.campaignId, current)
  }

  const questionBreakdown = buildQuizQuestionBreakdown(rows, quizIndex)

  return {
    generatedAt: new Date().toISOString(),
    total: rows.length,
    averageScorePercent:
      rows.length === 0 ? 0 : Math.round(scorePercentSum / rows.length),
    campaigns: Array.from(campaigns.values())
      .map((campaign) => ({
        campaignId: campaign.campaignId,
        participants: campaign.participants,
        averageScorePercent:
          campaign.participants === 0
            ? 0
            : Math.round(campaign.scorePercentSum / campaign.participants),
      }))
      .sort((a, b) => b.participants - a.participants),
    questionBreakdown,
    questionPriority: buildQuestionPriority(questionBreakdown),
    trend: buildQuizTrend(rows),
  }
}

async function readVideoProgressRows() {
  const currentDatabase = await getDatabase()

  return currentDatabase
    .prepare(
      `
        SELECT visitor_id, video_id, status, quiz_answered_correctly, updated_at
        FROM video_progress
      `,
    )
    .all()
    .map((row) => ({
      visitorId: row.visitor_id,
      videoId: row.video_id,
      status: row.status,
      quizAnsweredCorrectly: Boolean(row.quiz_answered_correctly),
      updatedAt: row.updated_at,
    }))
}

// video_progress is an upsert table (one row per visitor+video, overwritten
// as they progress), not an append log, so there is no per-day start/finish
// event to trend. updated_at — last time that row changed — is the closest
// available signal and is used as a proxy for daily engagement.
function buildVideoTrend(rows) {
  const byDate = new Map()

  for (const row of rows) {
    const day = row.updatedAt.slice(0, 10)
    byDate.set(day, (byDate.get(day) ?? 0) + 1)
  }

  return Array.from(byDate.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .slice(-30)
    .map(([date, count]) => ({ date, count }))
}

// Lowest completion rate first, among visitors who engaged with that video
// at all — the capsule that loses the most people once they've started it.
function buildVideoPriority(videos) {
  return videos
    .map((video) => {
      const totalEngaged = video.startedCount + video.completedCount

      if (totalEngaged === 0) {
        return null
      }

      return {
        id: video.id,
        completionRate: Math.round((video.completedCount / totalEngaged) * 100),
        totalEngaged,
      }
    })
    .filter((entry) => entry !== null)
    .sort((a, b) => a.completionRate - b.completionRate)
}

function buildVideoProgressStats(rows, videosIndex) {
  const countsByVideo = new Map()
  const participantIds = new Set()

  for (const row of rows) {
    participantIds.add(row.visitorId)

    const current = countsByVideo.get(row.videoId) ?? {
      startedCount: 0,
      completedCount: 0,
      quizCorrectCount: 0,
    }

    if (row.status === 'completed') {
      current.completedCount += 1
    } else {
      current.startedCount += 1
    }

    if (row.quizAnsweredCorrectly) {
      current.quizCorrectCount += 1
    }

    countsByVideo.set(row.videoId, current)
  }

  const videos = videosIndex.videos.map((video) => {
    const counts = countsByVideo.get(video.id) ?? {
      startedCount: 0,
      completedCount: 0,
      quizCorrectCount: 0,
    }

    return {
      id: video.id,
      startedCount: counts.startedCount,
      completedCount: counts.completedCount,
      quizCorrectCount: counts.quizCorrectCount,
    }
  })

  return {
    generatedAt: new Date().toISOString(),
    totalParticipants: participantIds.size,
    videos,
    videoPriority: buildVideoPriority(videos),
    trend: buildVideoTrend(rows),
  }
}

async function readScenarioResultRows() {
  const currentDatabase = await getDatabase()

  return currentDatabase
    .prepare(
      `
        SELECT created_at, scenario_id, choices_json
        FROM scenario_results
      `,
    )
    .all()
    .map((row) => ({
      createdAt: row.created_at,
      scenarioId: row.scenario_id,
      choices: parseRatingsJson(row.choices_json),
    }))
}

function buildScenarioStepBreakdown(rows, scenario) {
  const optionCountsByStep = new Map()

  for (const row of rows) {
    if (row.scenarioId !== scenario.id) {
      continue
    }

    for (const [stepId, optionId] of Object.entries(row.choices)) {
      if (!optionCountsByStep.has(stepId)) {
        optionCountsByStep.set(stepId, new Map())
      }

      const optionCounts = optionCountsByStep.get(stepId)
      optionCounts.set(optionId, (optionCounts.get(optionId) ?? 0) + 1)
    }
  }

  return scenario.steps.map((step) => {
    const optionCounts = optionCountsByStep.get(step.id) ?? new Map()

    return {
      id: step.id,
      options: step.options.map((option) => ({
        id: option.id,
        label: option.label,
        score: option.score,
        count: optionCounts.get(option.id) ?? 0,
      })),
    }
  })
}

function buildScenarioTrend(rows) {
  const byDate = new Map()

  for (const row of rows) {
    const day = row.createdAt.slice(0, 10)
    byDate.set(day, (byDate.get(day) ?? 0) + 1)
  }

  return Array.from(byDate.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .slice(-30)
    .map(([date, count]) => ({ date, count }))
}

// Lowest average chosen score first, across every scenario's steps — the
// decision point respondents get wrong most often, wherever it happens to
// live. Steps nobody answered are skipped rather than shown as a false 0.
function buildStepPriority(scenarios) {
  return scenarios
    .flatMap((scenario) =>
      scenario.stepBreakdown.map((step) => {
        const totalResponses = step.options.reduce((sum, option) => sum + option.count, 0)

        if (totalResponses === 0) {
          return null
        }

        const scoreSum = step.options.reduce(
          (sum, option) => sum + option.score * option.count,
          0,
        )

        return {
          scenarioId: scenario.id,
          stepId: step.id,
          averageScore: Math.round(scoreSum / totalResponses),
          totalResponses,
        }
      }),
    )
    .filter((entry) => entry !== null)
    .sort((a, b) => a.averageScore - b.averageScore)
}

function buildScenarioStats(rows, scenariosIndex) {
  const sessionsByScenario = new Map()

  for (const row of rows) {
    sessionsByScenario.set(row.scenarioId, (sessionsByScenario.get(row.scenarioId) ?? 0) + 1)
  }

  const scenarios = scenariosIndex.scenarios.map((scenario) => ({
    id: scenario.id,
    sessions: sessionsByScenario.get(scenario.id) ?? 0,
    stepBreakdown: buildScenarioStepBreakdown(rows, scenario),
  }))

  return {
    generatedAt: new Date().toISOString(),
    total: rows.length,
    scenarios,
    stepPriority: buildStepPriority(scenarios),
    trend: buildScenarioTrend(rows),
  }
}

async function readKitProfileRows() {
  const currentDatabase = await getDatabase()

  return currentDatabase
    .prepare(
      `
        SELECT visitor_id, adults, children, elderly, pets, special_needs
        FROM kit_profiles
      `,
    )
    .all()
    .map((row) => ({
      visitorId: row.visitor_id,
      adults: Number(row.adults),
      children: Number(row.children),
      elderly: Number(row.elderly),
      pets: Number(row.pets),
      specialNeeds: Boolean(row.special_needs),
    }))
}

const householdSegments = [
  { key: 'children', label: 'foyers avec enfants', test: (row) => row.children > 0 },
  {
    key: 'elderly',
    label: 'foyers avec personnes agees',
    test: (row) => row.elderly > 0,
  },
  { key: 'pets', label: 'foyers avec animaux', test: (row) => row.pets > 0 },
  {
    key: 'specialNeeds',
    label: 'foyers avec besoins specifiques',
    test: (row) => row.specialNeeds,
  },
]

function averageDomainScores(entries) {
  const sums = {}
  const counts = {}

  for (const { domainScores } of entries) {
    for (const [domain, score] of Object.entries(domainScores)) {
      sums[domain] = (sums[domain] ?? 0) + score
      counts[domain] = (counts[domain] ?? 0) + 1
    }
  }

  const averages = {}

  for (const domain of Object.keys(sums)) {
    averages[domain] = Math.round(sums[domain] / counts[domain])
  }

  return averages
}

// Cross-references household composition with diagnostic domain scores, so a
// segment's weak spot ("families with children score lower on X") can drive
// content priority instead of only the population-wide average.
function buildDomainGapBySegment(kitRows, diagnosticAnswersByVisitor, questionsIndex) {
  const matched = kitRows
    .map((row) => {
      const answers = diagnosticAnswersByVisitor.get(row.visitorId)

      if (!answers) {
        return null
      }

      return {
        row,
        domainScores: calculateDiagnosticScore(answers, questionsIndex.byId).domainScores,
      }
    })
    .filter(Boolean)

  return {
    totalMatched: matched.length,
    segments: householdSegments.map((segment) => {
      const withSegment = matched.filter(({ row }) => segment.test(row))
      const withoutSegment = matched.filter(({ row }) => !segment.test(row))

      return {
        key: segment.key,
        label: segment.label,
        withCount: withSegment.length,
        withoutCount: withoutSegment.length,
        domainAverages: {
          with: averageDomainScores(withSegment),
          without: averageDomainScores(withoutSegment),
        },
      }
    }),
  }
}

function percent(count, total) {
  return total === 0 ? 0 : Math.round((count / total) * 100)
}

function buildKitStats(rows) {
  const total = rows.length
  const householdSizeSum = rows.reduce(
    (sum, row) => sum + row.adults + row.children + row.elderly,
    0,
  )

  return {
    generatedAt: new Date().toISOString(),
    total,
    averageHouseholdSize: total === 0 ? 0 : Math.round((householdSizeSum / total) * 10) / 10,
    withChildrenPercent: percent(rows.filter((row) => row.children > 0).length, total),
    withElderlyPercent: percent(rows.filter((row) => row.elderly > 0).length, total),
    withPetsPercent: percent(rows.filter((row) => row.pets > 0).length, total),
    withSpecialNeedsPercent: percent(rows.filter((row) => row.specialNeeds).length, total),
  }
}

async function readFeedbackRows() {
  const currentDatabase = await getDatabase()

  return currentDatabase
    .prepare(
      `
        SELECT
          created_at,
          device,
          profile,
          assistance,
          duration_minutes,
          completed_journey,
          ratings_json,
          useful_action,
          difficulty,
          priority_improvement,
          concern
        FROM user_feedback
        ORDER BY created_at DESC
      `,
    )
    .all()
    .map((row) => ({
      createdAt: row.created_at,
      device: row.device,
      profile: row.profile,
      assistance: row.assistance,
      durationMinutes: Number(row.duration_minutes),
      completedJourney: Boolean(row.completed_journey),
      ratings: parseRatingsJson(row.ratings_json),
      usefulAction: row.useful_action,
      difficulty: row.difficulty,
      priorityImprovement: row.priority_improvement,
      concern: row.concern,
    }))
}

function average(values) {
  if (values.length === 0) {
    return 0
  }

  return (
    Math.round(
      (values.reduce((sum, value) => sum + value, 0) / values.length) * 10,
    ) / 10
  )
}

function median(values) {
  if (values.length === 0) {
    return 0
  }

  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)

  return sorted.length % 2 === 0
    ? Math.round(((sorted[middle - 1] + sorted[middle]) / 2) * 10) / 10
    : sorted[middle]
}

function countBy(rows, key, allowedValues) {
  const counts = {}

  for (const value of allowedValues) {
    counts[value] = 0
  }

  for (const row of rows) {
    if (Object.prototype.hasOwnProperty.call(counts, row[key])) {
      counts[row[key]] += 1
    }
  }

  return counts
}

function buildFeedbackStats(rows) {
  const total = rows.length
  const durations = rows.map((row) => row.durationMinutes)
  const completedCount = rows.filter((row) => row.completedJourney).length

  const ratingAverages = {}
  const ratingDistribution = {}

  for (const key of ratingKeys) {
    const values = rows
      .map((row) => row.ratings[key])
      .filter((value) => typeof value === 'number')

    ratingAverages[key] = average(values)
    ratingDistribution[key] = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }

    for (const value of values) {
      if (ratingDistribution[key][value] !== undefined) {
        ratingDistribution[key][value] += 1
      }
    }
  }

  const overallValues = rows.flatMap((row) =>
    ratingKeys
      .map((key) => row.ratings[key])
      .filter((value) => typeof value === 'number'),
  )
  const recommendationValues = rows
    .map((row) => row.ratings.recommendation)
    .filter((value) => typeof value === 'number')
  const recommendCount = recommendationValues.filter((value) => value >= 4).length

  const hasComment = (row) =>
    Boolean(
      row.usefulAction || row.difficulty || row.priorityImprovement || row.concern,
    )

  const byDate = {}

  for (const row of rows) {
    const day = row.createdAt.slice(0, 10)
    byDate[day] = (byDate[day] ?? 0) + 1
  }

  return {
    generatedAt: new Date().toISOString(),
    total,
    byDevice: countBy(rows, 'device', allowedDevices),
    byProfile: countBy(rows, 'profile', allowedProfiles),
    byAssistance: countBy(rows, 'assistance', allowedAssistanceLevels),
    completionRate:
      total === 0 ? 0 : Math.round((completedCount / total) * 100),
    averageDurationMinutes: average(durations),
    medianDurationMinutes: median(durations),
    ratingAverages,
    overallRatingAverage: average(overallValues),
    ratingDistribution,
    recommendationRate:
      recommendationValues.length === 0
        ? 0
        : Math.round((recommendCount / recommendationValues.length) * 100),
    commentsCount: rows.filter(hasComment).length,
    byDate: Object.entries(byDate)
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .slice(-14)
      .map(([date, count]) => ({ date, count })),
    recentComments: rows
      .filter(hasComment)
      .slice(0, 10)
      .map((row) => ({
        createdAt: row.createdAt,
        usefulAction: row.usefulAction,
        difficulty: row.difficulty,
        priorityImprovement: row.priorityImprovement,
        concern: row.concern,
      })),
  }
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

function uniqueVisitorIds(events, matchesEvent) {
  return new Set(
    events.filter(matchesEvent).map((event) => event.visitorId),
  )
}

// Graphe en etoile plutot qu'en clique : chaque visiteur (anonyme, deja
// collecte) n'est relie qu'au noeud de sa campagne, jamais aux autres
// visiteurs directement. Une clique par campagne donnerait O(n^2) aretes
// (une campagne de 200 personnes en donnerait ~20 000) et suggererait des
// relations pair-a-pair qui n'existent pas dans la donnee : deux visiteurs
// d'une meme campagne ne sont pas "lies" l'un a l'autre, ils partagent
// seulement une campagne.
async function readLatestDiagnosticAnswersByVisitor() {
  const currentDatabase = await getDatabase()
  const rows = currentDatabase
    .prepare(
      `
        SELECT visitor_id, answers_json
        FROM diagnostic_responses
        ORDER BY created_at DESC
      `,
    )
    .all()

  const byVisitor = new Map()

  for (const row of rows) {
    // Rows are newest-first: the first one seen per visitor is their latest.
    if (!byVisitor.has(row.visitor_id)) {
      byVisitor.set(row.visitor_id, parseRatingsJson(row.answers_json))
    }
  }

  return byVisitor
}

async function readScenarioResultsByVisitor() {
  const currentDatabase = await getDatabase()
  const rows = currentDatabase
    .prepare(`SELECT visitor_id, scenario_id, score FROM scenario_results`)
    .all()

  const byVisitor = new Map()

  for (const row of rows) {
    const list = byVisitor.get(row.visitor_id) ?? []
    list.push({ scenarioId: row.scenario_id, score: Number(row.score) })
    byVisitor.set(row.visitor_id, list)
  }

  return byVisitor
}

// Weakest and strongest domain in a visitor's most recent diagnostic — same
// calculation the diagnostic stats screen already uses, just taking the
// extremes instead of averaging.
function computeDomainExtremes(answers, questionsById) {
  const { domainScores } = calculateDiagnosticScore(answers, questionsById)
  const entries = Object.entries(domainScores)

  if (entries.length === 0) {
    return { weakest: null, strongest: null }
  }

  entries.sort((a, b) => a[1] - b[1])
  return { weakest: entries[0][0], strongest: entries[entries.length - 1][0] }
}

// Weakest and strongest scenario (by score) among everything a visitor has
// completed. If they've only done one, it's trivially both — that's an
// honest reflection of a single data point, not a bug.
function computeScenarioExtremes(results) {
  if (results.length === 0) {
    return { weakest: null, strongest: null }
  }

  let weakest = results[0]
  let strongest = results[0]

  for (const result of results) {
    if (result.score < weakest.score) {
      weakest = result
    }

    if (result.score > strongest.score) {
      strongest = result
    }
  }

  return { weakest: weakest.scenarioId, strongest: strongest.scenarioId }
}

// Shared shape for every visitor -> topic-hub star (campaign is built
// separately since it doesn't need the "skip if no key" branch). Each
// visitor contributes at most one edge per cluster, keeping every cluster
// O(n) rather than reintroducing a visitor-to-visitor clique.
function buildStarCluster(visitorIds, resolveKey, type, extraFields) {
  const counts = new Map()
  const edges = []

  for (const visitorId of visitorIds) {
    const key = resolveKey(visitorId)

    if (!key) {
      continue
    }

    counts.set(key, (counts.get(key) ?? 0) + 1)
    edges.push({ source: `visitor:${visitorId}`, target: `${type}:${key}`, type })
  }

  const nodes = Array.from(counts.entries()).map(([key, visitorCount]) => ({
    id: `${type}:${key}`,
    type,
    visitorCount,
    ...(extraFields ? extraFields(key) : {}),
  }))

  return { nodes, edges, count: counts.size }
}

function buildVisitorGraph(
  events,
  diagnosticAnswersByVisitor,
  questionsIndex,
  scenarioResultsByVisitor,
  scenariosIndex,
) {
  const engagedVisitorIds = uniqueVisitorIds(
    events,
    (event) => event.name === 'diagnostic_started',
  )
  const completedVisitorIds = uniqueVisitorIds(
    events,
    (event) => event.name === 'diagnostic_completed',
  )
  const actionVisitorIds = uniqueVisitorIds(events, (event) =>
    actionEvents.has(event.name),
  )

  const campaignByVisitor = new Map()

  for (const event of events) {
    campaignByVisitor.set(event.visitorId, event.campaignId)
  }

  function statusFor(visitorId) {
    if (completedVisitorIds.has(visitorId)) {
      return 'completed'
    }

    if (actionVisitorIds.has(visitorId)) {
      return 'actioned'
    }

    if (engagedVisitorIds.has(visitorId)) {
      return 'engaged'
    }

    return 'visited'
  }

  const visitorIds = Array.from(campaignByVisitor.keys())
  const campaignCounts = new Map()

  for (const visitorId of visitorIds) {
    const campaignId = campaignByVisitor.get(visitorId)
    campaignCounts.set(campaignId, (campaignCounts.get(campaignId) ?? 0) + 1)
  }

  const campaignNodes = Array.from(campaignCounts.entries()).map(
    ([campaignId, visitorCount]) => ({
      id: `campaign:${campaignId}`,
      type: 'campaign',
      campaignId,
      visitorCount,
    }),
  )

  const visitorNodes = visitorIds.map((visitorId) => ({
    id: `visitor:${visitorId}`,
    type: 'visitor',
    campaignId: campaignByVisitor.get(visitorId),
    status: statusFor(visitorId),
  }))

  const campaignEdges = visitorIds.map((visitorId) => ({
    source: `visitor:${visitorId}`,
    target: `campaign:${campaignByVisitor.get(visitorId)}`,
    type: 'campaign',
  }))

  // Four more independent stars, each one-hop-to-a-hub like the campaign
  // links: weakest/strongest diagnostic domain, weakest/strongest completed
  // scenario. A visitor only gets an edge in a cluster if they have the
  // underlying data for it (a synced diagnostic, or at least one scenario
  // result) — the rest simply have none for that cluster.
  const domainExtremesByVisitor = new Map()

  for (const visitorId of visitorIds) {
    const answers = diagnosticAnswersByVisitor.get(visitorId)

    if (answers) {
      domainExtremesByVisitor.set(visitorId, computeDomainExtremes(answers, questionsIndex.byId))
    }
  }

  const scenarioExtremesByVisitor = new Map()

  for (const visitorId of visitorIds) {
    const results = scenarioResultsByVisitor.get(visitorId)

    if (results && results.length > 0) {
      scenarioExtremesByVisitor.set(visitorId, computeScenarioExtremes(results))
    }
  }

  const scenarioLabel = (scenarioId) => ({
    scenarioId,
    label: scenariosIndex.byId.get(scenarioId)?.title ?? scenarioId,
  })

  const riskCluster = buildStarCluster(
    visitorIds,
    (visitorId) => domainExtremesByVisitor.get(visitorId)?.weakest ?? null,
    'risk',
    (domain) => ({ domain }),
  )
  const strengthCluster = buildStarCluster(
    visitorIds,
    (visitorId) => domainExtremesByVisitor.get(visitorId)?.strongest ?? null,
    'strength',
    (domain) => ({ domain }),
  )
  const scenarioWeakCluster = buildStarCluster(
    visitorIds,
    (visitorId) => scenarioExtremesByVisitor.get(visitorId)?.weakest ?? null,
    'scenario_weak',
    scenarioLabel,
  )
  const scenarioStrongCluster = buildStarCluster(
    visitorIds,
    (visitorId) => scenarioExtremesByVisitor.get(visitorId)?.strongest ?? null,
    'scenario_strong',
    scenarioLabel,
  )

  return {
    generatedAt: new Date().toISOString(),
    totalVisitors: visitorIds.length,
    totalCampaigns: campaignCounts.size,
    totalRiskDomains: riskCluster.count,
    totalStrengthDomains: strengthCluster.count,
    totalScenarioWeakSpots: scenarioWeakCluster.count,
    totalScenarioStrongSpots: scenarioStrongCluster.count,
    nodes: [
      ...campaignNodes,
      ...visitorNodes,
      ...riskCluster.nodes,
      ...strengthCluster.nodes,
      ...scenarioWeakCluster.nodes,
      ...scenarioStrongCluster.nodes,
    ],
    edges: [
      ...campaignEdges,
      ...riskCluster.edges,
      ...strengthCluster.edges,
      ...scenarioWeakCluster.edges,
      ...scenarioStrongCluster.edges,
    ],
  }
}

// Full pull for one visitor id, across every table that keys on it. Still no
// personal data (there is none to pull), but this is a much more granular
// view than any other dashboard screen exposes, hence the id itself has to
// be known/typed in rather than browsable from a list.
async function getVisitorProfile(visitorId) {
  const currentDatabase = await getDatabase()

  const diagnosticResponses = currentDatabase
    .prepare(
      `
        SELECT id, created_at, campaign_id, version, answers_json
        FROM diagnostic_responses
        WHERE visitor_id = ?
        ORDER BY created_at DESC
      `,
    )
    .all(visitorId)
    .map((row) => ({
      id: row.id,
      createdAt: row.created_at,
      campaignId: row.campaign_id,
      version: row.version,
      answers: parseRatingsJson(row.answers_json),
    }))

  const quizResults = currentDatabase
    .prepare(
      `
        SELECT id, created_at, campaign_id, score, total, answers_json
        FROM quiz_results
        WHERE visitor_id = ?
        ORDER BY created_at DESC
      `,
    )
    .all(visitorId)
    .map((row) => ({
      id: row.id,
      createdAt: row.created_at,
      campaignId: row.campaign_id,
      score: Number(row.score),
      total: Number(row.total),
      answers: parseRatingsJson(row.answers_json),
    }))

  const scenarioResults = currentDatabase
    .prepare(
      `
        SELECT id, created_at, campaign_id, scenario_id, score, choices_json
        FROM scenario_results
        WHERE visitor_id = ?
        ORDER BY created_at DESC
      `,
    )
    .all(visitorId)
    .map((row) => ({
      id: row.id,
      createdAt: row.created_at,
      campaignId: row.campaign_id,
      scenarioId: row.scenario_id,
      score: Number(row.score),
      choices: parseRatingsJson(row.choices_json),
    }))

  const videoProgress = currentDatabase
    .prepare(
      `
        SELECT video_id, campaign_id, status, quiz_answered_correctly, updated_at
        FROM video_progress
        WHERE visitor_id = ?
        ORDER BY updated_at DESC
      `,
    )
    .all(visitorId)
    .map((row) => ({
      videoId: row.video_id,
      campaignId: row.campaign_id,
      status: row.status,
      quizAnsweredCorrectly: Boolean(row.quiz_answered_correctly),
      updatedAt: row.updated_at,
    }))

  const kitProfileRow = currentDatabase
    .prepare(
      `
        SELECT campaign_id, adults, children, elderly, pets, special_needs, updated_at
        FROM kit_profiles
        WHERE visitor_id = ?
      `,
    )
    .get(visitorId)
  const kitProfile = kitProfileRow
    ? {
        campaignId: kitProfileRow.campaign_id,
        adults: Number(kitProfileRow.adults),
        children: Number(kitProfileRow.children),
        elderly: Number(kitProfileRow.elderly),
        pets: Number(kitProfileRow.pets),
        specialNeeds: Boolean(kitProfileRow.special_needs),
        updatedAt: kitProfileRow.updated_at,
      }
    : null

  const events = await readEvents()
  const timeline = events
    .filter((event) => event.visitorId === visitorId)
    .map((event) => ({
      name: event.name,
      path: event.path,
      campaignId: event.campaignId,
      createdAt: event.createdAt,
    }))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))

  const found =
    diagnosticResponses.length > 0 ||
    quizResults.length > 0 ||
    scenarioResults.length > 0 ||
    videoProgress.length > 0 ||
    kitProfile !== null ||
    timeline.length > 0

  return {
    visitorId,
    found,
    diagnosticResponses,
    quizResults,
    scenarioResults,
    videoProgress,
    kitProfile,
    timeline,
  }
}

// Raw daily event counts, not unique-visitor dedup like the funnel totals
// below — enough to see whether a day trended up or down without the extra
// cost of re-deriving per-day unique visitor sets.
function buildDashboardTrend(events) {
  const byDate = new Map()

  for (const event of events) {
    const isTracked =
      event.name === 'diagnostic_started' ||
      event.name === 'diagnostic_completed' ||
      actionEvents.has(event.name)

    if (!isTracked) {
      continue
    }

    const day = event.createdAt.slice(0, 10)
    const current = byDate.get(day) ?? { started: 0, completed: 0, actions: 0 }

    if (event.name === 'diagnostic_started') {
      current.started += 1
    } else if (event.name === 'diagnostic_completed') {
      current.completed += 1
    } else {
      current.actions += 1
    }

    byDate.set(day, current)
  }

  return Array.from(byDate.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .slice(-30)
    .map(([date, value]) => ({ date, ...value }))
}

// Aggregate-only projection: extrapolates the recent pace of *new* engaged
// visitors (first diagnostic_started per visitorId, bucketed by day) toward
// the campaign target. Deliberately not per-visitor — a churn/completion
// score for an individual anonymous visitor would contradict the privacy
// policy's promise that the local id "ne permet pas de vous identifier
// personnellement". Returns null when there isn't a single day of
// engagement yet, rather than a divide-by-zero date.
function buildEngagementProjection(events, target, engagedVisitorCount) {
  const firstEngagementByVisitor = new Map()

  for (const event of events) {
    if (event.name !== 'diagnostic_started') {
      continue
    }

    const existing = firstEngagementByVisitor.get(event.visitorId)

    if (!existing || event.createdAt < existing) {
      firstEngagementByVisitor.set(event.visitorId, event.createdAt)
    }
  }

  const dailyNewVisitors = new Map()

  for (const createdAt of firstEngagementByVisitor.values()) {
    const day = createdAt.slice(0, 10)
    dailyNewVisitors.set(day, (dailyNewVisitors.get(day) ?? 0) + 1)
  }

  const days = Array.from(dailyNewVisitors.keys()).sort()

  if (days.length === 0) {
    return null
  }

  // Trailing window capped at 30 days, same as the other trend charts:
  // short enough to reflect the current pace, long enough that a single
  // unusually quiet or busy day doesn't swing the estimate.
  const windowDays = Math.min(30, days.length)
  const recentDays = days.slice(-windowDays)
  const recentTotal = recentDays.reduce(
    (sum, day) => sum + (dailyNewVisitors.get(day) ?? 0),
    0,
  )
  const averageDailyRate = Math.round((recentTotal / windowDays) * 10) / 10
  const remainingVisitors = Math.max(0, target - engagedVisitorCount)

  if (remainingVisitors === 0) {
    return {
      averageDailyRate,
      windowDays,
      remainingVisitors: 0,
      projectedDate: null,
      targetReached: true,
    }
  }

  if (averageDailyRate <= 0) {
    return {
      averageDailyRate: 0,
      windowDays,
      remainingVisitors,
      projectedDate: null,
      targetReached: false,
    }
  }

  const daysToTarget = Math.ceil(remainingVisitors / averageDailyRate)
  const projectedDate = new Date(Date.now() + daysToTarget * 24 * 3600 * 1000)
    .toISOString()
    .slice(0, 10)

  return {
    averageDailyRate,
    windowDays,
    remainingVisitors,
    projectedDate,
    targetReached: false,
  }
}

function buildDashboard(events, updatedAt, feedbackDatabaseCount = 0) {
  // Funnel steps count unique visitors, not raw events: a visitor who
  // resumes, refreshes /resultats, or fires several actionEvents (e.g. a
  // single certificate download fires both certificate_generated and
  // pdf_downloaded) must only ever move a step forward once, not inflate it.
  const engagedVisitorIds = uniqueVisitorIds(
    events,
    (event) => event.name === 'diagnostic_started',
  )
  const completedVisitorIds = uniqueVisitorIds(
    events,
    (event) => event.name === 'diagnostic_completed',
  )
  const resultViewedVisitorIds = uniqueVisitorIds(
    events,
    (event) => event.name === 'result_viewed',
  )
  const actionVisitorIds = uniqueVisitorIds(events, (event) =>
    actionEvents.has(event.name),
  )

  const visitCount = events.filter((event) => event.name === 'page_view').length
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
    target: ENGAGEMENT_TARGET,
    projection: buildEngagementProjection(events, ENGAGEMENT_TARGET, engagedVisitorIds.size),
    totals: {
      visits: visitCount,
      engagedVisitors: engagedVisitorIds.size,
      journeysStarted: engagedVisitorIds.size,
      journeysCompleted: completedVisitorIds.size,
      resultViews: resultViewedVisitorIds.size,
      actionOpens: actionVisitorIds.size,
      pdfDownloads: pdfCount,
      certificatesGenerated: certificateCount,
      checklistProgressEvents: checklistProgressCount,
      sourcesOpened: sourceOpenedCount,
      feedbackSubmitted: totalFeedbackCount,
      technicalErrors: technicalErrorCount,
      completionRate:
        engagedVisitorIds.size === 0
          ? 0
          : Math.round(
              (completedVisitorIds.size / engagedVisitorIds.size) * 100,
            ),
    },
    campaigns: Array.from(campaigns.values()).sort(
      (a, b) => b.engaged - a.engaged,
    ),
    trend: buildDashboardTrend(events),
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

    if (
      request.method === 'POST' &&
      requestUrl.pathname === '/api/diagnostic-responses'
    ) {
      const body = await readBody(request)
      const diagnosticResponse = await sanitizeDiagnosticResponse(body)

      if (Object.keys(diagnosticResponse.answers).length === 0) {
        sendJson(response, 400, { error: 'invalid_answers' }, origin)
        return
      }

      await saveDiagnosticResponse(diagnosticResponse)
      sendJson(response, 201, { ok: true, id: diagnosticResponse.id }, origin)
      return
    }

    if (request.method === 'POST' && requestUrl.pathname === '/api/quiz-results') {
      const body = await readBody(request)
      const quizResult = await sanitizeQuizResult(body)

      if (quizResult.total === 0) {
        sendJson(response, 400, { error: 'invalid_quiz_result' }, origin)
        return
      }

      await saveQuizResult(quizResult)
      sendJson(response, 201, { ok: true, id: quizResult.id }, origin)
      return
    }

    if (request.method === 'GET' && requestUrl.pathname === '/api/quiz-results/stats') {
      const [rows, quizIndex] = await Promise.all([
        readQuizResultRows(),
        getQuizQuestionsIndex(),
      ])

      sendJson(response, 200, buildQuizStats(rows, quizIndex), origin)
      return
    }

    if (request.method === 'POST' && requestUrl.pathname === '/api/video-progress') {
      const body = await readBody(request)
      const videoProgress = await sanitizeVideoProgress(body)

      if (!videoProgress.videoId) {
        sendJson(response, 400, { error: 'invalid_video_progress' }, origin)
        return
      }

      await saveVideoProgress(videoProgress)
      sendJson(response, 201, { ok: true }, origin)
      return
    }

    if (request.method === 'GET' && requestUrl.pathname === '/api/video-progress/stats') {
      const [rows, videosIndexResult] = await Promise.all([
        readVideoProgressRows(),
        getVideosIndex(),
      ])

      sendJson(response, 200, buildVideoProgressStats(rows, videosIndexResult), origin)
      return
    }

    if (request.method === 'POST' && requestUrl.pathname === '/api/scenario-results') {
      const body = await readBody(request)
      const scenarioResult = await sanitizeScenarioResult(body)

      if (!scenarioResult.scenarioId) {
        sendJson(response, 400, { error: 'invalid_scenario_result' }, origin)
        return
      }

      await saveScenarioResult(scenarioResult)
      sendJson(response, 201, { ok: true, id: scenarioResult.id }, origin)
      return
    }

    if (request.method === 'GET' && requestUrl.pathname === '/api/scenario-results/stats') {
      const [rows, scenariosIndexResult] = await Promise.all([
        readScenarioResultRows(),
        getScenariosIndex(),
      ])

      sendJson(response, 200, buildScenarioStats(rows, scenariosIndexResult), origin)
      return
    }

    if (request.method === 'POST' && requestUrl.pathname === '/api/kit-profiles') {
      const body = await readBody(request)
      const kitProfile = sanitizeKitProfile(body)

      await saveKitProfile(kitProfile)
      sendJson(response, 201, { ok: true }, origin)
      return
    }

    if (request.method === 'GET' && requestUrl.pathname === '/api/kit-profiles/stats') {
      const [rows, diagnosticAnswersByVisitor, questionsIndex] = await Promise.all([
        readKitProfileRows(),
        readLatestDiagnosticAnswersByVisitor(),
        getQuestionsIndex(),
      ])

      sendJson(
        response,
        200,
        {
          ...buildKitStats(rows),
          domainGapBySegment: buildDomainGapBySegment(
            rows,
            diagnosticAnswersByVisitor,
            questionsIndex,
          ),
        },
        origin,
      )
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

    if (
      request.method === 'GET' &&
      requestUrl.pathname === '/api/feedback/stats'
    ) {
      const rows = await readFeedbackRows()

      sendJson(response, 200, buildFeedbackStats(rows), origin)
      return
    }

    if (
      request.method === 'GET' &&
      requestUrl.pathname === '/api/diagnostic-responses/stats'
    ) {
      const [rows, index, events] = await Promise.all([
        readDiagnosticResponseRows(),
        getQuestionsIndex(),
        readEvents(),
      ])
      const totalStarted = uniqueVisitorIds(
        events,
        (event) => event.name === 'diagnostic_started',
      ).size

      sendJson(
        response,
        200,
        buildDiagnosticStats(rows, index, totalStarted),
        origin,
      )
      return
    }

    if (request.method === 'GET' && requestUrl.pathname === '/api/visitors/graph') {
      const [
        events,
        diagnosticAnswersByVisitor,
        questionsIndex,
        scenarioResultsByVisitor,
        scenariosIndex,
      ] = await Promise.all([
        readEvents(),
        readLatestDiagnosticAnswersByVisitor(),
        getQuestionsIndex(),
        readScenarioResultsByVisitor(),
        getScenariosIndex(),
      ])

      sendJson(
        response,
        200,
        buildVisitorGraph(
          events,
          diagnosticAnswersByVisitor,
          questionsIndex,
          scenarioResultsByVisitor,
          scenariosIndex,
        ),
        origin,
      )
      return
    }

    if (request.method === 'GET' && requestUrl.pathname === '/api/visitors/profile') {
      const visitorId = requestUrl.searchParams.get('visitorId') ?? ''

      if (!isValidVisitorId(visitorId)) {
        sendJson(response, 400, { error: 'invalid_visitor_id' }, origin)
        return
      }

      const profile = await getVisitorProfile(visitorId)
      sendJson(response, 200, profile, origin)
      return
    }

    if (request.method === 'POST' && requestUrl.pathname === '/api/assistant/ask') {
      const body = await readBody(request)
      const question = sanitizeAssistantQuestion(body.question)

      if (!question) {
        sendJson(response, 400, { error: 'invalid_question' }, origin)
        return
      }

      if (!HF_TOKEN) {
        sendJson(response, 503, { error: 'assistant_unconfigured' }, origin)
        return
      }

      if (!allowAssistantRequest(request)) {
        sendJson(response, 429, { error: 'rate_limited' }, origin)
        return
      }

      try {
        const entriesIndex = await getAssistantEntriesIndex()
        const result = await askHuggingFace(question, entriesIndex)
        sendJson(response, 200, result, origin)
      } catch (error) {
        console.error('[assistant] hugging face request failed', error)
        sendJson(response, 502, { error: 'assistant_upstream_error' }, origin)
      }
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
