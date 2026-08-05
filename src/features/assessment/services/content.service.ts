import { computed } from 'vue'

import actionsJson from '@/data/actions.json'
import kitJson from '@/data/kit.json'
import questionsJson from '@/data/questions.json'
import resourcesJson from '@/data/resources.json'
import sourcesJson from '@/data/sources.json'
import videosJson from '@/data/videos.json'
import swbActionsJson from '@/data/swb/actions.json'
import swbKitJson from '@/data/swb/kit.json'
import swbQuestionsJson from '@/data/swb/questions.json'
import swbResourcesJson from '@/data/swb/resources.json'
import swbSourcesJson from '@/data/swb/sources.json'
import swbVideosJson from '@/data/swb/videos.json'
import { useI18n } from '@/shared/i18n/i18n.service'

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

const { locale } = useI18n()

type ContentLocale = 'fr' | 'swb'

const questionsByLocale: Record<ContentLocale, Question[]> = {
  fr: questionsSchema.parse(questionsJson),
  swb: questionsSchema.parse(swbQuestionsJson),
}
const actionsByLocale: Record<ContentLocale, RecommendationAction[]> = {
  fr: actionsSchema.parse(actionsJson),
  swb: actionsSchema.parse(swbActionsJson),
}
const kitItemsByLocale: Record<ContentLocale, KitItem[]> = {
  fr: kitSchema.parse(kitJson),
  swb: kitSchema.parse(swbKitJson),
}
const resourcesByLocale: Record<ContentLocale, Resource[]> = {
  fr: resourcesSchema.parse(resourcesJson),
  swb: resourcesSchema.parse(swbResourcesJson),
}
const sourcesByLocale: Record<ContentLocale, Source[]> = {
  fr: sourcesSchema.parse(sourcesJson),
  swb: sourcesSchema.parse(swbSourcesJson),
}

function sortVideos(list: VideoCapsule[]): VideoCapsule[] {
  return list.slice().sort((first, second) => first.order - second.order)
}

const videosByLocale: Record<ContentLocale, VideoCapsule[]> = {
  fr: sortVideos(videosSchema.parse(videosJson)),
  swb: sortVideos(videosSchema.parse(swbVideosJson)),
}

function forLocale<T>(byLocale: Record<ContentLocale, T>, fallback: T): T {
  return byLocale[locale.value as ContentLocale] ?? fallback
}

export const questions = computed(() => forLocale(questionsByLocale, questionsByLocale.fr))
export const actions = computed(() => forLocale(actionsByLocale, actionsByLocale.fr))
export const kitItems = computed(() => forLocale(kitItemsByLocale, kitItemsByLocale.fr))
export const resources = computed(() => forLocale(resourcesByLocale, resourcesByLocale.fr))
export const sources = computed(() => forLocale(sourcesByLocale, sourcesByLocale.fr))
export const videos = computed(() => forLocale(videosByLocale, videosByLocale.fr))

export const sourcesById = computed(
  () => new Map(sources.value.map((source) => [source.id, source])),
)
export const actionsById = computed(
  () => new Map(actions.value.map((action) => [action.id, action])),
)
export const resourcesById = computed(
  () => new Map(resources.value.map((resource) => [resource.id, resource])),
)
export const videosBySlug = computed(
  () => new Map(videos.value.map((video) => [video.slug, video])),
)
