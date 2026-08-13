<script setup lang="ts">
import LinkButton from '@/components/ui/LinkButton.vue'
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
        <LinkButton to="/" icon="arrow-left">{{ t('notFound.home') }}</LinkButton>
        <LinkButton to="/diagnostic" variant="secondary">
          {{ t('notFound.diagnostic') }}
        </LinkButton>
      </div>
    </div>
  </section>
</template>
