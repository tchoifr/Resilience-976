<script setup lang="ts">
import AppButton from '@/components/ui/AppButton.vue'
import { useAssessmentStore } from '@/features/assessment/stores/assessment.store'
import { useI18n } from '@/shared/i18n/i18n.service'

const assessmentStore = useAssessmentStore()
const { t } = useI18n()
</script>

<template>
  <section class="page page--narrow">
    <div class="stack">
      <p class="eyebrow">{{ t('legal.eyebrow') }}</p>
      <h1>{{ t('legal.title') }}</h1>

      <section class="panel stack">
        <h2 class="section-title">{{ t('legal.serviceTitle') }}</h2>
        <p>{{ t('legal.service') }}</p>
      </section>

      <section class="panel stack">
        <h2 class="section-title">{{ t('legal.dataTitle') }}</h2>
        <p>{{ t('legal.data') }}</p>
        <p>{{ t('legal.privacy') }}</p>
        <AppButton variant="danger" @click="assessmentStore.reset">
          {{ t('legal.resetLocal') }}
        </AppButton>
      </section>

      <section class="panel stack">
        <h2 class="section-title">{{ t('legal.sourcesTitle') }}</h2>
        <p>{{ t('legal.sources') }}</p>
      </section>
    </div>
  </section>
</template>
