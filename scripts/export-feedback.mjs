/* global console */
import { randomUUID } from 'node:crypto'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { DatabaseSync } from 'node:sqlite'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const databasePath = path.resolve(
  process.env.RESILIENCE_DATABASE_FILE ??
    process.env.FEEDBACK_DATABASE_FILE ??
    path.join(rootDir, 'server/data/resilience.sqlite'),
)
const outputDir = path.resolve(
  process.env.FEEDBACK_EXPORT_DIR ?? path.join(rootDir, 'server/data'),
)
const jsonPath = path.join(outputDir, 'feedback-export.json')
const csvPath = path.join(outputDir, 'feedback-export.csv')

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

function toCsvValue(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`
}

function parseRatings(value) {
  try {
    return JSON.parse(value)
  } catch {
    return {}
  }
}

function serializeRow(row) {
  return {
    id: row.id,
    createdAt: row.created_at,
    clientCreatedAt: row.client_created_at,
    participantCode: row.participant_code,
    device: row.device,
    browser: row.browser,
    profile: row.profile,
    assistance: row.assistance,
    durationMinutes: Number(row.duration_minutes),
    completedJourney: Boolean(row.completed_journey),
    ratings: parseRatings(row.ratings_json),
    usefulAction: row.useful_action,
    difficulty: row.difficulty,
    priorityImprovement: row.priority_improvement,
    concern: row.concern,
  }
}

async function databaseExists() {
  try {
    await fs.stat(databasePath)
    return true
  } catch (error) {
    if (error.code === 'ENOENT') {
      return false
    }

    throw error
  }
}

function readFeedbackRows() {
  const database = new DatabaseSync(databasePath)

  try {
    return database
      .prepare(
        `
          SELECT
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
          FROM user_feedback
          ORDER BY created_at DESC
        `,
      )
      .all()
      .map(serializeRow)
  } catch (error) {
    if (String(error.message).includes('no such table')) {
      return []
    }

    throw error
  } finally {
    database.close()
  }
}

const rows = (await databaseExists()) ? readFeedbackRows() : []
const headers = [
  'id',
  'createdAt',
  'clientCreatedAt',
  'participantCode',
  'device',
  'browser',
  'profile',
  'assistance',
  'durationMinutes',
  'completedJourney',
  ...ratingKeys,
  'usefulAction',
  'difficulty',
  'priorityImprovement',
  'concern',
]
const csvRows = rows.map((row) =>
  [
    row.id,
    row.createdAt,
    row.clientCreatedAt,
    row.participantCode,
    row.device,
    row.browser,
    row.profile,
    row.assistance,
    row.durationMinutes,
    row.completedJourney,
    ...ratingKeys.map((key) => row.ratings[key] ?? ''),
    row.usefulAction,
    row.difficulty,
    row.priorityImprovement,
    row.concern,
  ]
    .map(toCsvValue)
    .join(','),
)

await fs.mkdir(outputDir, { recursive: true })
await fs.writeFile(jsonPath, `${JSON.stringify(rows, null, 2)}\n`)
await fs.writeFile(csvPath, [headers.join(','), ...csvRows].join('\n'))

console.log(
  JSON.stringify(
    {
      ok: true,
      exportId: randomUUID(),
      count: rows.length,
      json: path.relative(rootDir, jsonPath),
      csv: path.relative(rootDir, csvPath),
    },
    null,
    2,
  ),
)
