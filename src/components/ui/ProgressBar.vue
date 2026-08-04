<script setup lang="ts">
import { computed } from 'vue'

import { useI18n } from '@/shared/i18n/i18n.service'

const props = defineProps<{
  value: number
  label?: string
}>()
const { t } = useI18n()
const progressLabel = computed(() => props.label ?? t('common.progress'))

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)))
}
</script>

<template>
  <div class="progress">
    <div class="progress__meta">
      <span>{{ progressLabel }}</span>
      <span>{{ clamp(props.value) }}%</span>
    </div>
    <div
      class="progress__track"
      role="progressbar"
      :aria-valuenow="clamp(props.value)"
      aria-valuemin="0"
      aria-valuemax="100"
      :aria-label="progressLabel"
    >
      <div class="progress__bar" :style="{ width: `${clamp(props.value)}%` }"></div>
    </div>
  </div>
</template>
