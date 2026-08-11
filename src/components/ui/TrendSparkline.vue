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

const VIEW_WIDTH = 300
const VIEW_HEIGHT = 100
const PADDING_Y = 8

// Domain always includes 0 so a flat line at the bottom still reads as
// "zero", not as an arbitrary minimum — otherwise two very close values
// (e.g. 4 and 5) would produce as dramatic a swing as 0 and 100.
const domain = computed(() => {
  const values = props.points.map((point) => point.value)
  const max = Math.max(1, ...values)
  return { min: 0, max }
})

function xFor(index: number): number {
  return props.points.length <= 1
    ? VIEW_WIDTH / 2
    : (index / (props.points.length - 1)) * VIEW_WIDTH
}

function yFor(value: number): number {
  const { min, max } = domain.value
  const ratio = (value - min) / (max - min)
  return VIEW_HEIGHT - PADDING_Y - ratio * (VIEW_HEIGHT - PADDING_Y * 2)
}

const hasLine = computed(() => props.points.length > 1)

const linePath = computed(() =>
  props.points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${xFor(index)} ${yFor(point.value)}`)
    .join(' '),
)

const areaPath = computed(() => {
  if (!hasLine.value) {
    return ''
  }

  const lastIndex = props.points.length - 1
  return `M ${xFor(0)} ${VIEW_HEIGHT} ${linePath.value.slice(2)} L ${xFor(lastIndex)} ${VIEW_HEIGHT} Z`
})

function formatDate(date: string): string {
  const [, month, day] = date.split('-')
  return `${day}/${month}`
}
</script>

<template>
  <div class="trend-sparkline">
    <p class="trend-sparkline__label">{{ label }}</p>
    <svg
      class="trend-sparkline__chart"
      :viewBox="`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path v-if="hasLine" :d="areaPath" class="trend-sparkline__area" :style="{ fill: color }" />
      <path
        v-if="hasLine"
        :d="linePath"
        class="trend-sparkline__line"
        :style="{ stroke: color }"
      />
      <circle
        v-for="(point, index) in points"
        :key="point.date"
        :cx="xFor(index)"
        :cy="yFor(point.value)"
        r="1.8"
        class="trend-sparkline__point"
        :style="{ fill: color }"
      >
        <title>{{ formatDate(point.date) }} : {{ point.value }}{{ suffix }}</title>
      </circle>
    </svg>
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
