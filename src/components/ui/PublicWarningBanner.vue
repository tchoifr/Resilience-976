<script setup lang="ts">
import { useI18n } from '@/shared/i18n/i18n.service'

const { t } = useI18n()
</script>

<template>
  <div class="public-warning-banner" role="note">
    <p>
      <strong>{{ t('publicWarning.label') }}</strong>
      {{ t('publicWarning.text') }}
    </p>
  </div>
</template>
