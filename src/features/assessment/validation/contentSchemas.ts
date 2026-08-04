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

export const kitItemSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  category: z.string().min(1),
  conditions: z.array(kitConditionSchema),
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

export const questionsSchema = z.array(questionSchema).min(1)
export const actionsSchema = z.array(actionSchema).min(1)
export const kitSchema = z.array(kitItemSchema).min(1)
export const sourcesSchema = z.array(sourceSchema).min(1)
export const resourcesSchema = z.array(resourceSchema).min(1)
