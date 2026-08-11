<script setup lang="ts">
import { useI18n } from '@/shared/i18n/i18n.service'

const { t, locale } = useI18n()
</script>

<template>
  <div v-if="locale === 'swb'" class="language-demo-banner" role="note">
    <p>{{ t('languageDemo.text') }}</p>
    <!-- French reference kept alongside the translation: the whole point of
         this banner is that the shimaore text above isn't validated yet, so
         a reader needs the source to cross-check it. -->
    <p class="language-demo-banner__source">
      En cours de traduction et de validation — version de démonstration linguistique –
      traduction non validée.
    </p>
  </div>
</template>
