<script setup lang="ts">
withDefaults(
  defineProps<{
    title: string
    variant?: 'info' | 'warning' | 'danger' | 'success'
  }>(),
  {
    variant: 'info',
  },
)
</script>

<template>
  <div class="alert" :class="`alert--${variant}`" role="status">
    <strong>{{ title }}</strong>
    <div>
      <slot />
    </div>
  </div>
</template>
