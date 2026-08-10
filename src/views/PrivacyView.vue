<script setup lang="ts">
import { RouterLink } from 'vue-router'

import { useI18n } from '@/shared/i18n/i18n.service'

const { t } = useI18n()
</script>

<template>
  <section class="page page--narrow">
    <div class="stack">
      <p class="eyebrow">{{ t('privacy.eyebrow') }}</p>
      <h1>{{ t('privacy.title') }}</h1>
      <p class="muted">{{ t('privacy.intro') }}</p>

      <section class="panel stack">
        <h2 class="section-title">{{ t('privacy.localTitle') }}</h2>
        <p>{{ t('privacy.local') }}</p>
      </section>

      <section class="panel stack">
        <h2 class="section-title">{{ t('privacy.anonymousTitle') }}</h2>
        <p>{{ t('privacy.anonymous') }}</p>
      </section>

      <section class="panel stack">
        <h2 class="section-title">{{ t('privacy.campaignTitle') }}</h2>
        <p>{{ t('privacy.campaign') }}</p>
      </section>

      <section class="panel stack">
        <h2 class="section-title">{{ t('privacy.noCookiesTitle') }}</h2>
        <p>{{ t('privacy.noCookies') }}</p>
      </section>

      <section class="panel stack">
        <h2 class="section-title">{{ t('privacy.retentionTitle') }}</h2>
        <p>{{ t('privacy.retention') }}</p>
      </section>

      <section class="panel stack">
        <h2 class="section-title">{{ t('privacy.rightsTitle') }}</h2>
        <p>{{ t('privacy.rights') }}</p>
        <p class="muted">
          {{ t('privacy.contactNote') }}
          <RouterLink to="/support">{{ t('footer.support') }}</RouterLink>
        </p>
      </section>
    </div>
  </section>
</template>
