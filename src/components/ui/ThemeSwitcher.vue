<script setup lang="ts">
import { useI18n } from '@/shared/i18n/i18n.service'
import { useTheme } from '@/shared/theme/theme.service'

const { t } = useI18n()
const { theme, toggleTheme } = useTheme()
</script>

<template>
  <button
    type="button"
    class="theme-switcher"
    :aria-pressed="theme === 'dark'"
    :aria-label="theme === 'dark' ? t('theme.switchToLight') : t('theme.switchToDark')"
    @click="toggleTheme"
  >
    <span aria-hidden="true">{{ theme === 'dark' ? '☀' : '☾' }}</span>
  </button>
</template>

<style scoped>
.theme-switcher {
  width: 40px;
  height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text-strong);
  font-size: 1.1rem;
  cursor: pointer;
}
</style>
