<script setup lang="ts">
import { computed, onMounted } from 'vue'

import AppButton from '@/components/ui/AppButton.vue'
import { kitItems } from '@/features/assessment/services/content.service'
import { getKitItems } from '@/features/assessment/services/kit.service'
import { useAssessmentStore } from '@/features/assessment/stores/assessment.store'
import type { HouseholdField, KitItem } from '@/features/assessment/types/kit'
import { trackEvent } from '@/shared/analytics/analytics.service'
import { getKitCategoryLabel, useI18n } from '@/shared/i18n/i18n.service'

const assessmentStore = useAssessmentStore()
const { t } = useI18n()
type NumberHouseholdField = Exclude<HouseholdField, 'specialNeeds'>

const numberFields = computed<Array<{ field: NumberHouseholdField; label: string }>>(() => [
  { field: 'adults', label: t('kit.fields.adults') },
  { field: 'children', label: t('kit.fields.children') },
  { field: 'elderly', label: t('kit.fields.elderly') },
  { field: 'pets', label: t('kit.fields.pets') },
])

const personalizedKit = computed(() => getKitItems(kitItems, assessmentStore.household))
const kitByCategory = computed(() => {
  return personalizedKit.value.reduce<Record<string, KitItem[]>>((groups, item) => {
    groups[item.category] = [...(groups[item.category] ?? []), item]
    return groups
  }, {})
})

onMounted(() => {
  trackEvent('kit_opened')
})

function updateNumber(field: NumberHouseholdField, delta: number) {
  assessmentStore.setHouseholdField(field, assessmentStore.household[field] + delta)
}

function updateSpecialNeeds(event: Event) {
  assessmentStore.setHouseholdField('specialNeeds', (event.target as HTMLInputElement).checked)
}
</script>

<template>
  <section class="page">
    <div class="stack">
      <p class="eyebrow">{{ t('kit.eyebrow') }}</p>
      <h1>{{ t('kit.title') }}</h1>
      <p class="muted">{{ t('kit.intro') }}</p>

      <section class="household-grid" :aria-label="t('kit.householdAria')">
        <div v-for="entry in numberFields" :key="entry.field" class="stepper">
          <strong>{{ entry.label }}</strong>
          <div class="stepper__controls">
            <AppButton variant="secondary" @click="updateNumber(entry.field, -1)">-</AppButton>
            <span class="stepper__value">{{ assessmentStore.household[entry.field] }}</span>
            <AppButton variant="secondary" @click="updateNumber(entry.field, 1)">+</AppButton>
          </div>
        </div>

        <label class="stepper">
          <strong>{{ t('kit.fields.specialNeeds') }}</strong>
          <span class="cluster">
            <input
              type="checkbox"
              :checked="assessmentStore.household.specialNeeds"
              @change="updateSpecialNeeds"
            />
            {{ t('common.yes') }}
          </span>
        </label>
      </section>

      <section class="grid grid--2">
        <article v-for="(items, category) in kitByCategory" :key="category" class="panel">
          <h2 class="section-title">{{ getKitCategoryLabel(String(category)) }}</h2>
          <ul>
            <li v-for="item in items" :key="item.id">
              {{ item.label }}
              <span v-if="item.validationStatus !== 'validated'" class="pill pill--warning">
                {{ t('common.validationToDo') }}
              </span>
            </li>
          </ul>
        </article>
      </section>
    </div>
  </section>
</template>
