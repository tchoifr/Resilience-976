<script setup lang="ts">
import { trackEvent } from '@/shared/analytics/analytics.service'
import { useI18n } from '@/shared/i18n/i18n.service'

const { t } = useI18n()

const linkedinUrl = 'https://www.linkedin.com/in/natam-sa-61474b22b/'
</script>

<template>
  <section class="page page--narrow">
    <div class="stack">
      <p class="eyebrow">{{ t('support.eyebrow') }}</p>
      <h1>{{ t('support.title') }}</h1>
      <p class="muted">{{ t('support.intro') }}</p>

      <section class="panel stack">
        <h2 class="section-title">{{ t('support.channelTitle') }}</h2>
        <p>{{ t('support.channelText') }}</p>
        <div class="cluster">
          <a
            class="link-button link-button--primary"
            :href="linkedinUrl"
            target="_blank"
            rel="noopener noreferrer"
            @click="trackEvent('source_opened')"
          >
            {{ t('support.linkedinLabel') }}
          </a>
        </div>
      </section>
    </div>
  </section>
</template>
