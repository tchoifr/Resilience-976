<script setup lang="ts">
import { RouterLink } from 'vue-router'

import { useI18n } from '@/shared/i18n/i18n.service'

const { t } = useI18n()
</script>

<template>
  <section class="page page--narrow">
    <div class="stack">
      <p class="eyebrow">{{ t('accessibility.eyebrow') }}</p>
      <h1>{{ t('accessibility.title') }}</h1>
      <p class="muted">{{ t('accessibility.intro') }}</p>

      <section class="panel stack">
        <h2 class="section-title">{{ t('accessibility.statusTitle') }}</h2>
        <p>{{ t('accessibility.status') }}</p>
      </section>

      <section class="panel stack">
        <h2 class="section-title">{{ t('accessibility.knownIssuesTitle') }}</h2>
        <p>{{ t('accessibility.knownIssues') }}</p>
      </section>

      <section class="panel stack">
        <h2 class="section-title">{{ t('accessibility.contactTitle') }}</h2>
        <p>
          {{ t('accessibility.contact') }}
          <RouterLink to="/support">{{ t('footer.support') }}</RouterLink>
        </p>
      </section>

      <section class="panel stack">
        <h2 class="section-title">{{ t('accessibility.remedyTitle') }}</h2>
        <p>{{ t('accessibility.remedy') }}</p>
      </section>
    </div>
  </section>
</template>
