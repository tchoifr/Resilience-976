<script setup lang="ts">
import { RouterLink } from 'vue-router'

import { scenarios } from '@/features/assessment/services/content.service'
import { getDomainLabel, useI18n } from '@/shared/i18n/i18n.service'

const { t } = useI18n()
</script>

<template>
  <section class="page">
    <div class="stack">
      <p class="eyebrow">{{ t('scenarios.eyebrow') }}</p>
      <h1>{{ t('scenarios.title') }}</h1>
      <p class="muted">{{ t('scenarios.intro') }}</p>

      <div class="grid grid--3">
        <article v-for="scenario in scenarios" :key="scenario.id" class="panel stack">
          <span class="pill">{{ getDomainLabel(scenario.domain) }}</span>
          <h2 class="section-title">{{ scenario.title }}</h2>
          <p>{{ scenario.intro }}</p>
          <RouterLink
            class="link-button link-button--primary"
            :to="`/mises-en-situation/${scenario.id}`"
          >
            {{ t('scenarios.start') }}
          </RouterLink>
        </article>
      </div>
    </div>
  </section>
</template>
