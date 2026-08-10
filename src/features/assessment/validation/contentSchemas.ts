import { z } from 'zod'

const validationStatusSchema = z.enum(['draft', 'to_validate', 'validated'])

export const answerOptionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  score: z.number().min(0).max(100),
})

export const questionSchema = z.object({
  id: z.string().min(1),
  domain: z.enum([
    'household',
    'housing',
    'water_food',
    'energy_communication',
    'health_documents',
    'behaviors',
  ]),
  text: z.string().min(1),
  help: z.string().optional(),
  required: z.boolean(),
  weight: z.number().positive(),
  criticality: z.enum(['low', 'medium', 'high', 'critical']),
  answers: z.array(answerOptionSchema).min(2),
  actionIds: z.array(z.string().min(1)),
  sourceIds: z.array(z.string().min(1)),
})

export const actionSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  priorityBand: z.enum(['now', 'week', 'later']),
  effort: z.enum(['low', 'medium', 'high']),
  why: z.string().min(1),
  instructions: z.array(z.string().min(1)).min(1),
  sourceIds: z.array(z.string().min(1)),
  validationStatus: validationStatusSchema,
})

export const kitConditionSchema = z.object({
  field: z.enum(['adults', 'children', 'elderly', 'pets', 'specialNeeds']),
  operator: z.enum(['>', '>=', '<', '<=', '=', '!=']),
  value: z.union([z.number(), z.boolean()]),
})

export const kitQuantityRuleSchema = z.object({
  fields: z.array(kitConditionSchema.shape.field).min(1),
  amountPerUnit: z.number().positive(),
  perDay: z.boolean(),
  durationDays: z.number().positive().optional(),
  unit: z.string().min(1),
  detail: z.string().min(1),
})

export const kitItemSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  category: z.string().min(1),
  conditions: z.array(kitConditionSchema),
  quantityRule: kitQuantityRuleSchema.optional(),
  countField: kitConditionSchema.shape.field.optional(),
  sourceIds: z.array(z.string().min(1)),
  validationStatus: validationStatusSchema,
})

export const sourceSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  organization: z.string().min(1),
  url: z.string().url(),
  consultedAt: z.string().min(1),
  validationStatus: validationStatusSchema,
})

export const resourceSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  domain: questionSchema.shape.domain,
  description: z.string().min(1),
  sourceIds: z.array(z.string().min(1)),
  validationStatus: validationStatusSchema,
})

export const videoSubtitleSchema = z.object({
  language: z.string().min(2),
  label: z.string().min(1),
  url: z.string().min(1),
})

export const videoQuizSchema = z.object({
  question: z.string().min(1),
  options: z.array(z.string().min(1)).min(2),
  correctOptionIndex: z.number().int().min(0),
  explanation: z.string().min(1),
})

export const videoCapsuleSchema = z
  .object({
    id: z.string().min(1),
    slug: z.string().min(1),
    title: z.string().min(1),
    summary: z.string().min(1),
    duration: z.string().min(1),
    level: z.string().min(1),
    risk: z.string().min(1),
    audience: z.string().min(1),
    domain: questionSchema.shape.domain,
    videoUrl: z.string(),
    externalVideoUrl: z.string().url().optional(),
    externalVideoLabel: z.string().min(1).optional(),
    thumbnailUrl: z.string().min(1),
    subtitles: z.array(videoSubtitleSchema),
    transcript: z.array(z.string().min(1)).min(1),
    quiz: videoQuizSchema,
    recommendedActionId: z.string().min(1),
    resourceId: z.string().min(1),
    sourceIds: z.array(z.string().min(1)),
    revisionDate: z.string().min(1),
    language: z.string().min(2),
    status: z.union([validationStatusSchema, z.enum(['published', 'archived'])]),
    order: z.number().int().positive(),
  })
  .refine((video) => video.quiz.correctOptionIndex < video.quiz.options.length, {
    message: 'correctOptionIndex must point to an existing option',
    path: ['quiz', 'correctOptionIndex'],
  })

export const quizQuestionSchema = z
  .object({
    id: z.string().min(1),
    risk: z.enum(['cyclone', 'inondation', 'seisme', 'mouvement_terrain']),
    text: z.string().min(1),
    options: z.array(z.string().min(1)).min(2),
    correctOptionIndex: z.number().int().min(0),
    explanation: z.string().min(1),
    sourceIds: z.array(z.string().min(1)),
    validationStatus: validationStatusSchema,
    revisionDate: z.string().min(1),
  })
  .refine((question) => question.correctOptionIndex < question.options.length, {
    message: 'correctOptionIndex must point to an existing option',
    path: ['correctOptionIndex'],
  })

export const quizQuestionsSchema = z.array(quizQuestionSchema).min(1)

export const scenarioOptionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  score: z.number().min(0).max(100),
})

export const scenarioStepSchema = z.object({
  id: z.string().min(1),
  prompt: z.string().min(1),
  options: z.array(scenarioOptionSchema).min(2),
  explanation: z.string().min(1),
})

export const scenarioSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  intro: z.string().min(1),
  domain: questionSchema.shape.domain,
  videoId: z.string().min(1),
  steps: z.array(scenarioStepSchema).min(1),
  sourceIds: z.array(z.string().min(1)),
  validationStatus: validationStatusSchema,
  revisionDate: z.string().min(1),
})

export const scenariosSchema = z.array(scenarioSchema).min(1)

export const assistantEntrySchema = z.object({
  id: z.string().min(1),
  topic: z.enum([
    'household_preparation',
    'kit_composition',
    'document_protection',
    'power_outage',
    'water_outage',
    'cyclone_eye_behavior',
    'vulnerable_people_help',
    'return_to_normal',
  ]),
  question: z.string().min(1),
  keywords: z.array(z.string().min(1)).min(1),
  answer: z.string().min(1),
  sourceIds: z.array(z.string().min(1)).min(1),
  validationStatus: validationStatusSchema,
  revisionDate: z.string().min(1),
})

export const assistantEntriesSchema = z.array(assistantEntrySchema).min(1)

export const questionsSchema = z.array(questionSchema).min(1)
export const actionsSchema = z.array(actionSchema).min(1)
export const kitSchema = z.array(kitItemSchema).min(1)
export const sourcesSchema = z.array(sourceSchema).min(1)
export const resourcesSchema = z.array(resourceSchema).min(1)
export const videosSchema = z.array(videoCapsuleSchema).min(1)
