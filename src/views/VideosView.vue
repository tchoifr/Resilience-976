<script setup lang="ts">
import { computed, ref } from 'vue'

import AppButton from '@/components/ui/AppButton.vue'
import ProgressBar from '@/components/ui/ProgressBar.vue'
import { videos } from '@/features/assessment/services/content.service'
import {
  clearVideoProgress,
  loadVideoProgress,
} from '@/features/assessment/services/video-progress.service'
import type { VideoProgressState } from '@/features/assessment/types/video'
import { getDomainLabel, useI18n } from '@/shared/i18n/i18n.service'

const { t } = useI18n()
const progressState = ref<VideoProgressState>(loadVideoProgress())

const completedCount = computed(
  () => videos.filter((video) => progressState.value[video.id]?.status === 'completed').length,
)
const progressPercent = computed(() =>
  videos.length === 0 ? 0 : Math.round((completedCount.value / videos.length) * 100),
)

function progressLabel(videoId: string): string {
  const status = progressState.value[videoId]?.status ?? 'not_started'

  return t(`videos.status.${status}`)
}

function resetProgress() {
  clearVideoProgress()
  progressState.value = {}
}
</script>

<template>
  <section class="page">
    <div class="stack">
      <p class="eyebrow">{{ t('videos.eyebrow') }}</p>
      <div class="page-heading">
        <div>
          <h1>{{ t('videos.title') }}</h1>
          <p class="muted">{{ t('videos.intro') }}</p>
        </div>
        <AppButton v-if="completedCount > 0" variant="secondary" @click="resetProgress">
          {{ t('videos.resetProgress') }}
        </AppButton>
      </div>

      <section class="panel video-progress-panel" :aria-label="t('videos.progressAria')">
        <ProgressBar :value="progressPercent" :label="t('videos.globalProgress')" />
        <p class="muted">
          {{ t('videos.completedCount', { completed: completedCount, total: videos.length }) }}
        </p>
      </section>

      <div class="grid grid--3 video-grid">
        <article v-for="video in videos" :key="video.id" class="panel video-card">
          <div class="video-card__preview">
            <video
              v-if="video.videoUrl"
              class="video-card__media"
              preload="metadata"
              muted
              playsinline
              :aria-label="video.title"
            >
              <source :src="video.videoUrl" />
            </video>
            <div v-else class="video-card__external">
              <img class="video-card__thumbnail" :src="video.thumbnailUrl" alt="" loading="lazy" />
              <span>{{ t('videos.officialExternal') }}</span>
            </div>
          </div>
          <div class="video-card__body">
            <div class="video-card__meta">
              <span class="pill">{{ video.duration }}</span>
              <span class="pill">{{ getDomainLabel(video.domain) }}</span>
              <span v-if="video.videoUrl" class="pill pill--success">
                {{ t('videos.integratedVideo') }}
              </span>
              <span v-if="video.status !== 'validated' && video.status !== 'published'" class="pill pill--warning">
                {{ t('common.validationToDo') }}
              </span>
            </div>
            <h2 class="section-title">{{ video.title }}</h2>
            <p>{{ video.summary }}</p>
            <dl class="compact-definitions">
              <div>
                <dt>{{ t('videos.risk') }}</dt>
                <dd>{{ video.risk }}</dd>
              </div>
              <div>
                <dt>{{ t('videos.level') }}</dt>
                <dd>{{ video.level }}</dd>
              </div>
              <div>
                <dt>{{ t('common.progress') }}</dt>
                <dd>{{ progressLabel(video.id) }}</dd>
              </div>
            </dl>
          </div>
          <RouterLink class="link-button link-button--primary" :to="`/videos/${video.slug}`">
            {{ t('videos.watch') }}
          </RouterLink>
        </article>
      </div>
    </div>
  </section>
</template>
