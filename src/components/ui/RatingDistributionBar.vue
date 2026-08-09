<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  label: string
  distribution: Record<'1' | '2' | '3' | '4' | '5', number>
  disagreeLabel: string
  neutralLabel: string
  agreeLabel: string
}>()

const total = computed(() =>
  Object.values(props.distribution).reduce((sum, value) => sum + value, 0),
)
const disagreeCount = computed(
  () => props.distribution['1'] + props.distribution['2'],
)
const neutralCount = computed(() => props.distribution['3'])
const agreeCount = computed(
  () => props.distribution['4'] + props.distribution['5'],
)

function share(count: number): number {
  return total.value === 0 ? 0 : (count / total.value) * 100
}

const rawDisagreePct = computed(() => share(disagreeCount.value))
const rawNeutralPct = computed(() => share(neutralCount.value))
const rawAgreePct = computed(() => share(agreeCount.value))

// Each arm (disagree-side / agree-side) grows from the center, so an
// unbalanced split can push the wider arm past the 50% it's allotted.
// Scale every segment down by the same factor so the wider arm exactly
// reaches its edge instead of overflowing and getting clipped.
const scale = computed(() => {
  const leftArm = rawDisagreePct.value + rawNeutralPct.value / 2
  const rightArm = rawAgreePct.value + rawNeutralPct.value / 2
  const widestArm = Math.max(leftArm, rightArm)

  return widestArm > 50 ? 50 / widestArm : 1
})

const disagreePct = computed(() => rawDisagreePct.value * scale.value)
const neutralPct = computed(() => rawNeutralPct.value * scale.value)
const agreePct = computed(() => rawAgreePct.value * scale.value)

const neutralLeft = computed(() => 50 - neutralPct.value / 2)
const disagreeLeft = computed(() => neutralLeft.value - disagreePct.value)
const agreeLeft = computed(() => 50 + neutralPct.value / 2)
</script>

<template>
  <div class="rating-bar">
    <p class="rating-bar__label">{{ label }}</p>
    <div class="rating-bar__track" aria-hidden="true">
      <span class="rating-bar__center"></span>
      <span
        v-if="disagreePct > 0"
        class="rating-bar__segment rating-bar__segment--disagree"
        :style="{ left: `${disagreeLeft}%`, width: `${disagreePct}%` }"
      ></span>
      <span
        v-if="neutralPct > 0"
        class="rating-bar__segment rating-bar__segment--neutral"
        :style="{ left: `${neutralLeft}%`, width: `${neutralPct}%` }"
      ></span>
      <span
        v-if="agreePct > 0"
        class="rating-bar__segment rating-bar__segment--agree"
        :style="{ left: `${agreeLeft}%`, width: `${agreePct}%` }"
      ></span>
    </div>
    <p class="rating-bar__legend">
      <span>{{ disagreeCount }} {{ disagreeLabel }}</span>
      <span>{{ neutralCount }} {{ neutralLabel }}</span>
      <span>{{ agreeCount }} {{ agreeLabel }}</span>
    </p>
  </div>
</template>
