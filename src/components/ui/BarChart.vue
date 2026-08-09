<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    items: Array<{ key: string; label: string; value: number }>
    color?: string
    max?: number
    suffix?: string
  }>(),
  {
    color: 'var(--color-teal)',
    max: undefined,
    suffix: '',
  },
)

const maxValue = computed(
  () => props.max ?? Math.max(1, ...props.items.map((item) => item.value)),
)

function widthPercent(value: number): number {
  return Math.max(0, Math.min(100, Math.round((value / maxValue.value) * 100)))
}
</script>

<template>
  <div class="bar-chart">
    <div v-for="item in items" :key="item.key" class="bar-chart__row">
      <span class="bar-chart__label">{{ item.label }}</span>
      <span class="bar-chart__track" aria-hidden="true">
        <span
          class="bar-chart__fill"
          :style="{ width: `${widthPercent(item.value)}%`, background: color }"
        ></span>
      </span>
      <span class="bar-chart__value">{{ item.value }}{{ suffix }}</span>
    </div>
  </div>
</template>
