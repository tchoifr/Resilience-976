<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'

import AppAlert from '@/components/ui/AppAlert.vue'
import AppButton from '@/components/ui/AppButton.vue'
import SourceLink from '@/components/ui/SourceLink.vue'
import {
  actionsById,
  resourcesById,
  sourcesById,
  videos,
  videosBySlug,
} from '@/features/assessment/services/content.service'
import {
  getVideoProgress,
  updateVideoProgress,
} from '@/features/assessment/services/video-progress.service'
import type { Source } from '@/features/assessment/types/source'
import type { VideoProgressEntry } from '@/features/assessment/types/video'
import { getDomainLabel, useI18n } from '@/shared/i18n/i18n.service'

const route = useRoute()
const { t } = useI18n()
const video = computed(() => videosBySlug.get(String(route.params.slug)))
const selectedAnswer = ref<number | null>(null)
const hasAnswered = ref(false)
const progress = ref<VideoProgressEntry | null>(
  video.value ? getVideoProgress(video.value.id) : null,
)

const currentIndex = computed(() =>
  video.value ? videos.findIndex((candidate) => candidate.id === video.value?.id) : -1,
)
const previousVideo = computed(() => videos[currentIndex.value - 1])
const nextVideo = computed(() => videos[currentIndex.value + 1])
const linkedAction = computed(() =>
  video.value ? actionsById.get(video.value.recommendedActionId) : undefined,
)
const linkedResource = computed(() => (video.value ? resourcesById.get(video.value.resourceId) : undefined))
const sources = computed<Source[]>(() => {
  if (!video.value) {
    return []
  }

  return video.value.sourceIds
    .map((sourceId) => sourcesById.get(sourceId))
    .filter((source): source is Source => source !== undefined)
})
const isCorrect = computed(
  () => selectedAnswer.value !== null && selectedAnswer.value === video.value?.quiz.correctOptionIndex,
)
const isCompleted = computed(() => progress.value?.status === 'completed')

function markStarted() {
  if (!video.value || progress.value?.status === 'completed') {
    return
  }

  progress.value = updateVideoProgress(video.value.id, 'started')
}

function submitAnswer() {
  if (!video.value || selectedAnswer.value === null) {
    return
  }

  hasAnswered.value = true

  if (isCorrect.value) {
    progress.value = updateVideoProgress(video.value.id, 'completed', true)
  } else {
    progress.value = updateVideoProgress(video.value.id, 'started')
  }
}

function markCompleted() {
  if (!video.value) {
    return
  }

  progress.value = updateVideoProgress(video.value.id, 'completed', progress.value?.quizAnsweredCorrectly)
}
</script>

<template>
  <section v-if="video" class="page">
    <div class="stack">
      <RouterLink class="back-link" to="/videos">{{ t('videos.backToLibrary') }}</RouterLink>

      <div class="video-detail-layout">
        <article class="stack">
          <div>
            <p class="eyebrow">{{ t('videos.detailEyebrow') }}</p>
            <h1>{{ video.title }}</h1>
            <p class="muted">{{ video.summary }}</p>
          </div>

          <div class="video-player panel">
            <video
              v-if="video.videoUrl"
              controls
              preload="metadata"
              @play="markStarted"
              @ended="markCompleted"
            >
              <source :src="video.videoUrl" />
              <track
                v-for="subtitle in video.subtitles"
                :key="subtitle.url"
                kind="subtitles"
                :srclang="subtitle.language"
                :label="subtitle.label"
                :src="subtitle.url"
              />
            </video>
            <div v-else class="video-placeholder" role="status">
              <img :src="video.thumbnailUrl" alt="" />
              <div class="video-placeholder__content">
                <p>
                  {{ video.externalVideoUrl ? t('videos.externalVideoAvailable') : t('videos.videoPending') }}
                </p>
                <a
                  v-if="video.externalVideoUrl"
                  class="link-button link-button--primary"
                  :href="video.externalVideoUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {{ video.externalVideoLabel ?? t('videos.openOfficialVideo') }}
                </a>
              </div>
            </div>
          </div>

          <section class="panel stack">
            <h2 class="section-title">{{ t('videos.quizTitle') }}</h2>
            <fieldset class="video-quiz">
              <legend>{{ video.quiz.question }}</legend>
              <label v-for="(option, index) in video.quiz.options" :key="option" class="answer-option">
                <input v-model="selectedAnswer" type="radio" name="video-answer" :value="index" />
                <span>{{ option }}</span>
              </label>
            </fieldset>
            <div class="cluster">
              <AppButton :disabled="selectedAnswer === null" @click="submitAnswer">
                {{ t('videos.validateAnswer') }}
              </AppButton>
              <AppButton
                v-if="video.externalVideoUrl && !video.videoUrl"
                variant="secondary"
                :disabled="isCompleted"
                @click="markCompleted"
              >
                {{ isCompleted ? t('videos.externalCompleted') : t('videos.markExternalCompleted') }}
              </AppButton>
            </div>
            <p v-if="isCompleted" class="completion-note" role="status">
              <span aria-hidden="true">✓</span>
              {{ t('videos.completionSaved') }}
            </p>
            <AppAlert
              v-if="hasAnswered"
              :title="isCorrect ? t('videos.correct') : t('videos.toReview')"
              :variant="isCorrect ? 'success' : 'warning'"
            >
              {{ video.quiz.explanation }}
            </AppAlert>
          </section>

          <section class="panel stack">
            <h2 class="section-title">{{ t('videos.transcript') }}</h2>
            <p v-for="paragraph in video.transcript" :key="paragraph">{{ paragraph }}</p>
          </section>
        </article>

        <aside class="stack">
          <section class="panel stack">
            <h2 class="section-title">{{ t('videos.infoTitle') }}</h2>
            <dl class="compact-definitions">
              <div>
                <dt>{{ t('videos.duration') }}</dt>
                <dd>{{ video.duration }}</dd>
              </div>
              <div>
                <dt>{{ t('videos.level') }}</dt>
                <dd>{{ video.level }}</dd>
              </div>
              <div>
                <dt>{{ t('videos.risk') }}</dt>
                <dd>{{ video.risk }}</dd>
              </div>
              <div>
                <dt>{{ t('videos.audience') }}</dt>
                <dd>{{ video.audience }}</dd>
              </div>
              <div>
                <dt>{{ t('videos.domain') }}</dt>
                <dd>{{ getDomainLabel(video.domain) }}</dd>
              </div>
              <div>
                <dt>{{ t('videos.revisionDate') }}</dt>
                <dd>{{ video.revisionDate }}</dd>
              </div>
              <div>
                <dt>{{ t('common.progress') }}</dt>
                <dd>{{ t(`videos.status.${progress?.status ?? 'not_started'}`) }}</dd>
              </div>
            </dl>
          </section>

          <section v-if="linkedAction || linkedResource" class="panel stack">
            <h2 class="section-title">{{ t('videos.nextActionTitle') }}</h2>
            <p v-if="linkedAction">
              <strong>{{ linkedAction.title }}</strong>
              <span class="muted"> - {{ linkedAction.why }}</span>
            </p>
            <p v-if="linkedResource">
              <strong>{{ t('videos.linkedResource') }}</strong>
              {{ linkedResource.title }}
            </p>
            <div class="cluster">
              <RouterLink class="link-button link-button--secondary" to="/checklist">
                {{ t('videos.openPlan') }}
              </RouterLink>
              <RouterLink class="link-button link-button--secondary" to="/ressources">
                {{ t('videos.openResources') }}
              </RouterLink>
            </div>
          </section>

          <section class="panel stack">
            <h2 class="section-title">{{ t('common.sources') }}</h2>
            <ul class="source-list">
              <li v-for="source in sources" :key="source.id">
                <SourceLink :source="source" />
              </li>
            </ul>
          </section>

          <nav class="video-navigation" :aria-label="t('videos.sequenceNavigation')">
            <RouterLink
              v-if="previousVideo"
              class="link-button link-button--secondary"
              :to="`/videos/${previousVideo.slug}`"
            >
              {{ t('videos.previous') }}
            </RouterLink>
            <RouterLink
              v-if="nextVideo"
              class="link-button link-button--primary"
              :to="`/videos/${nextVideo.slug}`"
            >
              {{ t('videos.next') }}
            </RouterLink>
          </nav>
        </aside>
      </div>
    </div>
  </section>
  <section v-else class="page page--narrow">
    <div class="panel stack">
      <p class="eyebrow">{{ t('notFound.eyebrow') }}</p>
      <h1>{{ t('notFound.title') }}</h1>
      <RouterLink class="link-button link-button--primary" to="/videos">
        {{ t('videos.backToLibrary') }}
      </RouterLink>
    </div>
  </section>
</template>
