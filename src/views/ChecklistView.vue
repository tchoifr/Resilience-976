<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import AppButton from '@/components/ui/AppButton.vue'
import ProgressBar from '@/components/ui/ProgressBar.vue'
import { actions, questions, sourcesById } from '@/features/assessment/services/content.service'
import { getRecommendedActions } from '@/features/assessment/services/recommendation.service'
import { useAssessmentStore } from '@/features/assessment/stores/assessment.store'
import type { PrioritizedAction } from '@/features/assessment/types/recommendation'
import { trackEvent } from '@/shared/analytics/analytics.service'
import { useI18n } from '@/shared/i18n/i18n.service'

const assessmentStore = useAssessmentStore()
const customLabel = ref('')
const isGeneratingChecklistPdf = ref(false)
const { t } = useI18n()
const customExamples = computed(() => [
  t('checklist.examples.closePerson'),
  t('checklist.examples.documents'),
  t('checklist.examples.battery'),
])

const checklistActions = computed<PrioritizedAction[]>(() => {
  const recommended = getRecommendedActions(questions, actions, assessmentStore.answers)

  if (recommended.length > 0) {
    return recommended
  }

  return actions.slice(0, 10).map((action, index) => ({
    ...action,
    priority: actions.length - index,
  }))
})

const totalCount = computed(
  () => checklistActions.value.length + assessmentStore.customChecklistItems.length,
)
const doneCount = computed(() => {
  const standardDone = checklistActions.value.filter(
    (action) => assessmentStore.checklist[action.id],
  ).length
  const customDone = assessmentStore.customChecklistItems.filter((item) => item.completed).length
  return standardDone + customDone
})
const progress = computed(() =>
  totalCount.value === 0 ? 0 : Math.round((doneCount.value / totalCount.value) * 100),
)

onMounted(() => {
  trackEvent('checklist_opened')
})

function addCustomItem() {
  assessmentStore.addCustomChecklistItem(customLabel.value)
  customLabel.value = ''
}

function addExample(label: string) {
  assessmentStore.addCustomChecklistItem(label)
}

function printPage() {
  window.print()
}

async function exportChecklistPdf() {
  if (isGeneratingChecklistPdf.value) {
    return
  }

  isGeneratingChecklistPdf.value = true

  try {
    const { generateChecklistPdf } = await import('@/features/assessment/services/pdf.service')

    generateChecklistPdf({
      recommendedItems: checklistActions.value.map((action) => ({
        id: action.id,
        label: action.title,
        completed: Boolean(assessmentStore.checklist[action.id]),
        meta: firstSourceLabel(action.sourceIds),
      })),
      customItems: assessmentStore.customChecklistItems.map((item) => ({
        id: item.id,
        label: item.label,
        completed: item.completed,
      })),
      completedCount: doneCount.value,
      totalCount: totalCount.value,
    })
  } finally {
    isGeneratingChecklistPdf.value = false
  }
}

function firstSourceLabel(sourceIds: string[]): string {
  const source = sourceIds.map((sourceId) => sourcesById.get(sourceId)).find(Boolean)
  return source?.label ?? t('common.sourceToValidate')
}

function customCountLabel(count: number): string {
  if (count === 0) {
    return t('checklist.countZero')
  }

  if (count === 1) {
    return t('checklist.countOne')
  }

  return t('checklist.countMany', { count })
}
</script>

<template>
  <section class="page page--narrow">
    <div class="stack">
      <p class="eyebrow">{{ t('checklist.eyebrow') }}</p>
      <h1>{{ t('checklist.title') }}</h1>
      <ProgressBar :value="progress" :label="t('checklist.progress')" />

      <section class="panel">
        <h2 class="section-title">{{ t('checklist.recommended') }}</h2>
        <label v-for="action in checklistActions" :key="action.id" class="check-row">
          <input
            type="checkbox"
            :checked="Boolean(assessmentStore.checklist[action.id])"
            @change="assessmentStore.toggleChecklistItem(action.id)"
          />
          <span>
            <strong>{{ action.title }}</strong>
            <span class="muted"> - {{ firstSourceLabel(action.sourceIds) }}</span>
          </span>
        </label>
      </section>

      <section class="panel custom-checklist stack">
        <div class="custom-checklist__header">
          <div>
            <span class="pill">{{ t('checklist.optional') }}</span>
            <h2 class="section-title">{{ t('checklist.customTitle') }}</h2>
            <p class="muted">{{ t('checklist.customIntro') }}</p>
          </div>
          <strong class="custom-checklist__count">
            {{ customCountLabel(assessmentStore.customChecklistItems.length) }}
          </strong>
        </div>

        <div class="custom-examples" :aria-label="t('checklist.examplesAria')">
          <button
            v-for="example in customExamples"
            :key="example"
            class="example-chip"
            type="button"
            @click="addExample(example)"
          >
            + {{ example }}
          </button>
        </div>

        <form class="custom-add" @submit.prevent="addCustomItem">
          <label class="form-row custom-add__field" for="custom-checklist-item">
            <span>{{ t('checklist.newAction') }}</span>
            <input
              id="custom-checklist-item"
              v-model="customLabel"
              class="text-input"
              type="text"
              maxlength="120"
              :placeholder="t('checklist.placeholder')"
            />
          </label>
          <AppButton type="submit">{{ t('checklist.add') }}</AppButton>
        </form>

        <div v-if="assessmentStore.customChecklistItems.length > 0" class="custom-items">
          <label
            v-for="item in assessmentStore.customChecklistItems"
            :key="item.id"
            class="check-row custom-check-row"
          >
            <input
              type="checkbox"
              :checked="item.completed"
              @change="assessmentStore.toggleCustomChecklistItem(item.id)"
            />
            <span>
              <strong>{{ item.label }}</strong>
              <small>{{ t('checklist.personalAction') }}</small>
            </span>
          </label>
        </div>
      </section>

      <div class="cluster">
        <AppButton :disabled="isGeneratingChecklistPdf" @click="exportChecklistPdf">
          {{ isGeneratingChecklistPdf ? t('results.preparingPdf') : t('checklist.downloadPdf') }}
        </AppButton>
        <AppButton variant="secondary" @click="printPage">{{ t('checklist.printPage') }}</AppButton>
        <AppButton variant="danger" @click="assessmentStore.reset">{{
          t('common.resetData')
        }}</AppButton>
      </div>
    </div>
  </section>
</template>
