<script setup lang="ts">
import { useI18n } from '@/shared/i18n/i18n.service'

const { availableLocales, locale, setLocale, t } = useI18n()

function updateLocale(event: Event) {
  const target = event.target as unknown as { value?: string }

  if (target.value) {
    setLocale(target.value)
  }
}
</script>

<template>
  <label class="language-switcher">
    <span class="sr-only">{{ t('language.label') }}</span>
    <select :value="locale" :aria-label="t('language.label')" @change="updateLocale">
      <option
        v-for="availableLocale in availableLocales"
        :key="availableLocale.code"
        :value="availableLocale.code"
      >
        {{ availableLocale.label }}
      </option>
    </select>
  </label>
</template>
