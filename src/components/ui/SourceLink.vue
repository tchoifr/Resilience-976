<script setup lang="ts">
import type { Source } from '@/features/assessment/types/source'
import { trackEvent } from '@/shared/analytics/analytics.service'

import AppIcon from './AppIcon.vue'

defineProps<{
  source: Source
}>()
</script>

<template>
  <a
    class="source-link"
    :href="source.url"
    target="_blank"
    rel="noopener noreferrer"
    @click="trackEvent('source_opened')"
  >
    {{ source.label }}
    <AppIcon name="external-link" />
  </a>
</template>
