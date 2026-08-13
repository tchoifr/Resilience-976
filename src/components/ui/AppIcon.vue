<script setup lang="ts">
import { computed } from 'vue'

import { iconPaths, type IconName } from './icons'

const props = defineProps<{ name: IconName }>()

const shapes = computed(() => iconPaths[props.name])
</script>

<template>
  <svg
    v-if="shapes"
    class="app-icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path v-for="shape in shapes" :key="shape" :d="shape" />
  </svg>
</template>

<style scoped>
.app-icon {
  width: 1em;
  height: 1em;
  flex-shrink: 0;
}
</style>
