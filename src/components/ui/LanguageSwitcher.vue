<script setup lang="ts">
import { computed } from 'vue'

import { useI18n } from '@/shared/i18n/i18n.service'

const { availableLocales, locale, setLocale, t } = useI18n()

// `v-model` plutot que `:value` : sur un <select>, l'attribut HTML `value`
// n'existe pas et le validateur du W3C le rejette (critere RGAA 8.2). Vue
// positionne ici la propriete, pas l'attribut.
const selectedLocale = computed({
  get: () => locale.value,
  set: (value: string) => setLocale(value),
})
</script>

<template>
  <label class="language-switcher">
    <span class="sr-only">{{ t('language.label') }}</span>
    <select v-model="selectedLocale" :aria-label="t('language.label')">
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
