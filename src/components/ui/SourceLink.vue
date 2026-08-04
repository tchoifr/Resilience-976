<script setup lang="ts">
import type { Source } from '@/features/assessment/types/source'

defineProps<{
  source: Source
}>()
</script>

<template>
  <a class="source-link" :href="source.url" target="_blank" rel="noopener noreferrer">
    {{ source.label }}
  </a>
</template>
