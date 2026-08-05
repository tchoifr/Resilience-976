import actionsJson from '@/data/actions.json'
import kitJson from '@/data/kit.json'
import questionsJson from '@/data/questions.json'
import resourcesJson from '@/data/resources.json'
import sourcesJson from '@/data/sources.json'
import videosJson from '@/data/videos.json'

import type { KitItem } from '../types/kit'
import type { Question } from '../types/question'
import type { RecommendationAction } from '../types/recommendation'
import type { Resource, Source } from '../types/source'
import type { VideoCapsule } from '../types/video'
import {
  actionsSchema,
  kitSchema,
  questionsSchema,
  resourcesSchema,
  sourcesSchema,
  videosSchema,
} from '../validation/contentSchemas'

export const questions: Question[] = questionsSchema.parse(questionsJson)
export const actions: RecommendationAction[] = actionsSchema.parse(actionsJson)
export const kitItems: KitItem[] = kitSchema.parse(kitJson)
export const resources: Resource[] = resourcesSchema.parse(resourcesJson)
export const sources: Source[] = sourcesSchema.parse(sourcesJson)
export const videos: VideoCapsule[] = videosSchema
  .parse(videosJson)
  .slice()
  .sort((first: VideoCapsule, second: VideoCapsule) => first.order - second.order)

export const sourcesById = new Map(sources.map((source) => [source.id, source]))
export const actionsById = new Map(actions.map((action) => [action.id, action]))
export const resourcesById = new Map(resources.map((resource) => [resource.id, resource]))
export const videosBySlug = new Map(videos.map((video) => [video.slug, video]))
