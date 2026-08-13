<script setup lang="ts">
import AppIcon from './AppIcon.vue'
import type { IconName } from './icons'

withDefaults(
  defineProps<{
    to: string
    variant?: 'primary' | 'secondary'
    icon?: IconName
  }>(),
  {
    variant: 'primary',
    icon: undefined,
  },
)
</script>

<template>
  <RouterLink class="link-button" :class="`link-button--${variant}`" :to="to">
    <AppIcon v-if="icon" :name="icon" />
    <slot />
  </RouterLink>
</template>
