<script setup lang="ts">
import { useI18n } from '@/shared/i18n/i18n.service'

const { locale } = useI18n()
</script>

<template>
  <!-- Deliberately hardcoded in French, not translate()'d: this message
       warns that the shimaore translation itself isn't validated yet, so
       it can't rely on that same translation to say so. -->
  <div v-if="locale === 'swb'" class="language-demo-banner" role="note">
    <p>
      En cours de traduction et de validation — version de démonstration linguistique –
      traduction non validée.
    </p>
  </div>
</template>
