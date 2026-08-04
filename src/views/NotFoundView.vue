<script setup lang="ts">
import { useI18n } from '@/shared/i18n/i18n.service'

const { t } = useI18n()
</script>

<template>
  <section class="page page--narrow">
    <div class="panel stack">
      <p class="eyebrow">{{ t('notFound.eyebrow') }}</p>
      <h1>{{ t('notFound.title') }}</h1>
      <p class="muted">{{ t('notFound.text') }}</p>
      <div class="cluster">
        <RouterLink class="link-button link-button--primary" to="/">{{
          t('notFound.home')
        }}</RouterLink>
        <RouterLink class="link-button link-button--secondary" to="/diagnostic">
          {{ t('notFound.diagnostic') }}
        </RouterLink>
      </div>
    </div>
  </section>
</template>
