<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  label: string
  segments: Array<{ key: string; label: string; count: number; color: string }>
}>()

const total = computed(() =>
  props.segments.reduce((sum, segment) => sum + segment.count, 0),
)

function widthPercent(count: number): number {
  return total.value === 0 ? 0 : (count / total.value) * 100
}
</script>

<template>
  <div class="stacked-bar">
    <p class="stacked-bar__label">{{ label }}</p>
    <div class="stacked-bar__track" aria-hidden="true">
      <span
        v-for="segment in segments"
        :key="segment.key"
        class="stacked-bar__segment"
        :style="{ width: `${widthPercent(segment.count)}%`, background: segment.color }"
      ></span>
    </div>
    <p class="stacked-bar__legend">
      <span v-for="segment in segments" :key="segment.key">
        {{ segment.count }} {{ segment.label }}
      </span>
    </p>
  </div>
</template>
