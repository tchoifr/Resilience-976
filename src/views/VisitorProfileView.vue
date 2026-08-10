<script setup lang="ts">
/* global fetch */
import { onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'

import AppButton from '@/components/ui/AppButton.vue'
import type { VisitorProfileResponse } from '@/features/visitor-graph/types/visitor-graph'
import { useI18n } from '@/shared/i18n/i18n.service'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()

const defaultProfileEndpoint = import.meta.env.PROD
  ? 'https://resilience-976-analytics.onrender.com/api/visitors/profile'
  : '/api/visitors/profile'
const profileEndpoint = import.meta.env.VITE_VISITOR_PROFILE_ENDPOINT ?? defaultProfileEndpoint
const profileEnabled = import.meta.env.DEV
  ? import.meta.env.VITE_ANALYTICS_ENABLED !== 'false'
  : import.meta.env.VITE_ANALYTICS_ENABLED === 'true'

function routeId(): string {
  return typeof route.params.id === 'string' ? route.params.id : ''
}

const inputId = ref(routeId())
const profile = ref<VisitorProfileResponse | null>(null)
const isLoading = ref(false)
const hasSearched = ref(false)
const errorMessage = ref('')

async function search(visitorId: string) {
  const trimmed = visitorId.trim()

  if (!trimmed || !profileEnabled) {
    return
  }

  isLoading.value = true
  hasSearched.value = true
  errorMessage.value = ''
  profile.value = null

  try {
    const response = await fetch(`${profileEndpoint}?visitorId=${encodeURIComponent(trimmed)}`)

    if (response.status === 400) {
      errorMessage.value = t('visitorProfile.invalidId')
      return
    }

    if (!response.ok) {
      errorMessage.value = t('visitorProfile.technicalError')
      return
    }

    profile.value = await response.json()
  } catch {
    errorMessage.value = t('visitorProfile.technicalError')
  } finally {
    isLoading.value = false
  }
}

function submitForm() {
  const trimmed = inputId.value.trim()

  if (!trimmed) {
    return
  }

  // Route-driven rather than only local state, so a visitor profile lookup
  // is a shareable/bookmarkable URL like the rest of the dashboard.
  void router.push(`/tableau-de-bord/visiteur/${trimmed}`)
}

watch(
  () => route.params.id,
  () => {
    const value = routeId()
    inputId.value = value

    if (value) {
      void search(value)
    }
  },
)

onMounted(() => {
  if (routeId()) {
    void search(routeId())
  }
})
</script>

<template>
  <section class="page">
    <div class="dashboard-layout">
      <header class="dashboard-hero">
        <p class="eyebrow">{{ t('visitorProfile.eyebrow') }}</p>
        <h1>{{ t('visitorProfile.title') }}</h1>
        <p>{{ t('visitorProfile.intro') }}</p>
      </header>

      <div class="cluster">
        <RouterLink class="link-button link-button--secondary" to="/tableau-de-bord">
          {{ t('visitorProfile.backToDashboard') }}
        </RouterLink>
        <RouterLink
          class="link-button link-button--secondary"
          to="/tableau-de-bord/graphe-visiteurs"
        >
          {{ t('visitorProfile.backToGraph') }}
        </RouterLink>
      </div>

      <form class="cluster" @submit.prevent="submitForm">
        <label class="sr-only" for="visitor-id-input">{{ t('visitorProfile.inputLabel') }}</label>
        <input
          id="visitor-id-input"
          v-model="inputId"
          class="text-input"
          type="text"
          :placeholder="t('visitorProfile.inputPlaceholder')"
        />
        <AppButton type="submit" :disabled="!inputId.trim()">
          {{ t('visitorProfile.search') }}
        </AppButton>
      </form>

      <p v-if="isLoading" class="muted">{{ t('visitorProfile.loading') }}</p>
      <p v-else-if="errorMessage" class="muted">{{ errorMessage }}</p>
      <p v-else-if="hasSearched && profile && !profile.found" class="muted">
        {{ t('visitorProfile.notFound') }}
      </p>

      <template v-else-if="profile && profile.found">
        <section class="panel dashboard-panel">
          <h2>{{ t('visitorProfile.sections.diagnostic') }}</h2>
          <p v-if="profile.diagnosticResponses.length === 0" class="muted">
            {{ t('visitorProfile.empty') }}
          </p>
          <ul v-else>
            <li v-for="entry in profile.diagnosticResponses" :key="entry.id">
              {{ entry.createdAt }} — {{ t('visitorProfile.campaign') }} {{ entry.campaignId }} —
              {{ Object.keys(entry.answers).length }} {{ t('visitorProfile.answersCount') }}
            </li>
          </ul>
        </section>

        <section class="panel dashboard-panel">
          <h2>{{ t('visitorProfile.sections.quiz') }}</h2>
          <p v-if="profile.quizResults.length === 0" class="muted">
            {{ t('visitorProfile.empty') }}
          </p>
          <ul v-else>
            <li v-for="entry in profile.quizResults" :key="entry.id">
              {{ entry.createdAt }} — {{ t('visitorProfile.campaign') }} {{ entry.campaignId }} —
              {{ entry.score }}/{{ entry.total }}
            </li>
          </ul>
        </section>

        <section class="panel dashboard-panel">
          <h2>{{ t('visitorProfile.sections.scenarios') }}</h2>
          <p v-if="profile.scenarioResults.length === 0" class="muted">
            {{ t('visitorProfile.empty') }}
          </p>
          <ul v-else>
            <li v-for="entry in profile.scenarioResults" :key="entry.id">
              {{ entry.createdAt }} — {{ entry.scenarioId }} — {{ entry.score }}/100
            </li>
          </ul>
        </section>

        <section class="panel dashboard-panel">
          <h2>{{ t('visitorProfile.sections.videos') }}</h2>
          <p v-if="profile.videoProgress.length === 0" class="muted">
            {{ t('visitorProfile.empty') }}
          </p>
          <ul v-else>
            <li v-for="entry in profile.videoProgress" :key="entry.videoId">
              {{ entry.updatedAt }} — {{ entry.videoId }} — {{ entry.status }}
              <span v-if="entry.quizAnsweredCorrectly">
                ({{ t('visitorProfile.quizCorrect') }})</span
              >
            </li>
          </ul>
        </section>

        <section class="panel dashboard-panel">
          <h2>{{ t('visitorProfile.sections.kit') }}</h2>
          <p v-if="!profile.kitProfile" class="muted">{{ t('visitorProfile.empty') }}</p>
          <p v-else>
            {{ profile.kitProfile.adults }} × {{ t('kit.fields.adults') }} ·
            {{ profile.kitProfile.children }} × {{ t('kit.fields.children') }} ·
            {{ profile.kitProfile.elderly }} × {{ t('kit.fields.elderly') }} ·
            {{ profile.kitProfile.pets }} × {{ t('kit.fields.pets') }}
            <span v-if="profile.kitProfile.specialNeeds">
              · {{ t('kit.fields.specialNeeds') }}</span
            >
          </p>
        </section>

        <section class="panel dashboard-panel">
          <h2>{{ t('visitorProfile.sections.timeline') }}</h2>
          <p v-if="profile.timeline.length === 0" class="muted">
            {{ t('visitorProfile.empty') }}
          </p>
          <ul v-else>
            <li v-for="(entry, index) in profile.timeline" :key="index">
              {{ entry.createdAt }} — {{ entry.name }} — {{ entry.path }}
            </li>
          </ul>
        </section>
      </template>
    </div>
  </section>
</template>
