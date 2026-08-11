<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    points: Array<{ date: string; value: number }>
    label: string
    color?: string
    suffix?: string
  }>(),
  {
    color: 'var(--color-teal)',
    suffix: '',
  },
)

const maxValue = computed(() => Math.max(1, ...props.points.map((point) => point.value)))

function heightPercent(value: number): number {
  return value === 0 ? 0 : Math.max(4, Math.round((value / maxValue.value) * 100))
}

function formatDate(date: string): string {
  const [, month, day] = date.split('-')
  return `${day}/${month}`
}
</script>

<template>
  <div class="trend-sparkline">
    <p class="trend-sparkline__label">{{ label }}</p>
    <div class="trend-sparkline__bars" aria-hidden="true">
      <span
        v-for="point in points"
        :key="point.date"
        class="trend-sparkline__bar"
        :style="{ height: `${heightPercent(point.value)}%`, background: color }"
        :title="`${formatDate(point.date)} : ${point.value}${suffix}`"
      ></span>
    </div>
    <table class="sr-only">
      <caption>{{ label }}</caption>
      <thead>
        <tr>
          <th scope="col">Date</th>
          <th scope="col">Valeur</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="point in points" :key="point.date">
          <td>{{ point.date }}</td>
          <td>{{ point.value }}{{ suffix }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
