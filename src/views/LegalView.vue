<script setup lang="ts">
import AppButton from '@/components/ui/AppButton.vue'
import { useI18n } from '@/shared/i18n/i18n.service'

const { t } = useI18n()

// Full wipe, not just the assessment store: also clears video progress,
// the anonymous visitor/campaign id, and theme/language preference. The
// reload re-initializes every store/service from the now-empty storage.
// Confirmed first: unlike the previous assessment-only reset, this can no
// longer be undone by simply redoing the diagnostic.
function clearAllLocalData() {
  if (!window.confirm(t('legal.resetLocalConfirm'))) {
    return
  }

  window.localStorage.clear()
  window.location.reload()
}
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
        <AppButton variant="danger" @click="clearAllLocalData">
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
