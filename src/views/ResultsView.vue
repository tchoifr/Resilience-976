<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'

import ActionCard from '@/components/ui/ActionCard.vue'
import AppAlert from '@/components/ui/AppAlert.vue'
import AppButton from '@/components/ui/AppButton.vue'
import ScoreGauge from '@/components/ui/ScoreGauge.vue'
import {
  actions,
  kitItems,
  questions,
  sources,
  sourcesById,
} from '@/features/assessment/services/content.service'
import {
  buildActionPlan,
  getRecommendedActions,
} from '@/features/assessment/services/recommendation.service'
import { calculateAssessment } from '@/features/assessment/services/scoring.service'
import { getKitItems } from '@/features/assessment/services/kit.service'
import { useAssessmentStore } from '@/features/assessment/stores/assessment.store'
import type { ScoreLevel } from '@/features/assessment/types/assessment'
import type { Source } from '@/features/assessment/types/source'
import { trackEvent } from '@/shared/analytics/analytics.service'
import { getDomainLabel, useI18n } from '@/shared/i18n/i18n.service'

const assessmentStore = useAssessmentStore()
const isGeneratingPdf = ref(false)
const { t } = useI18n()

const result = computed(() =>
  calculateAssessment(questions.value, assessmentStore.answers),
)
const translatedLevel = computed<ScoreLevel>(() => ({
  ...result.value.level,
  label: t(`scoreLevels.${result.value.level.id}.label`),
  message: t(`scoreLevels.${result.value.level.id}.message`),
}))
const translatedResult = computed(() => ({
  ...result.value,
  level: translatedLevel.value,
  domainScores: result.value.domainScores.map((domain) => ({
    ...domain,
    label: getDomainLabel(domain.id),
  })),
}))
const recommendedActions = computed(() =>
  getRecommendedActions(
    questions.value,
    actions.value,
    assessmentStore.answers,
  ),
)
const actionPlan = computed(() => buildActionPlan(recommendedActions.value))
const personalizedKit = computed(() =>
  getKitItems(kitItems.value, assessmentStore.household),
)
const pdfChecklistItems = computed(() => [
  ...recommendedActions.value.map((action) => ({
    id: action.id,
    label: action.title,
    completed: Boolean(assessmentStore.checklist[action.id]),
  })),
  ...assessmentStore.customChecklistItems.map((item) => ({
    id: item.id,
    label: item.label,
    completed: item.completed,
  })),
])

onMounted(() => {
  if (assessmentStore.hasAnswers) {
    trackEvent('result_viewed')
    trackEvent('action_plan_opened')
  }
})

function getSources(sourceIds: string[]): Source[] {
  return sourceIds
    .map((sourceId) => sourcesById.value.get(sourceId))
    .filter((source): source is Source => source !== undefined)
}

function buildAssessmentPdfInput() {
  return {
    result: translatedResult.value,
    immediateActions: actionPlan.value.immediate,
    weekActions: actionPlan.value.week,
    checklist: assessmentStore.checklist,
    checklistItems: pdfChecklistItems.value,
    kitItems: personalizedKit.value,
    sources: sources.value,
  }
}

async function exportPdf(mode: 'download' | 'print') {
  if (isGeneratingPdf.value) {
    return
  }

  isGeneratingPdf.value = true

  try {
    const { generateAssessmentPdf } =
      await import('@/features/assessment/services/pdf.service')

    generateAssessmentPdf(buildAssessmentPdfInput(), { mode })
    trackEvent('certificate_generated')

    if (mode === 'download') {
      trackEvent('pdf_downloaded')
    }
  } finally {
    isGeneratingPdf.value = false
  }
}
</script>

<template>
  <section class="page">
    <div class="stack">
      <p class="eyebrow">{{ t('results.eyebrow') }}</p>
      <h1>{{ t('results.title') }}</h1>

      <AppAlert
        v-if="!assessmentStore.hasAnswers"
        :title="t('results.incompleteTitle')"
        variant="warning"
      >
        {{ t('results.incomplete') }}
        <RouterLink to="/diagnostic">{{
          t('results.startDiagnostic')
        }}</RouterLink
        >.
      </AppAlert>

      <div class="grid grid--2 result-overview">
        <section class="panel score-panel">
          <ScoreGauge
            :score="translatedResult.globalScore"
            :level="translatedResult.level"
          />
        </section>

        <section class="panel stack domain-panel">
          <h2 class="section-title">{{ t('results.domainScores') }}</h2>
          <div v-if="result.domainScores.length === 0" class="muted">
            {{ t('results.emptyScores') }}
          </div>
          <div
            v-for="domain in result.domainScores"
            :key="domain.id"
            class="domain-score"
          >
            <div class="domain-score__label">
              <span>{{ getDomainLabel(domain.id) }}</span>
              <span>{{ domain.score }}/100</span>
            </div>
            <div class="domain-score__track">
              <div
                class="domain-score__bar"
                :style="{ width: `${domain.score}%` }"
              ></div>
            </div>
          </div>
        </section>
      </div>

      <section class="grid grid--2 action-plan-grid">
        <div class="stack">
          <h2 class="section-title">{{ t('results.immediatePriorities') }}</h2>
          <ActionCard
            v-for="action in actionPlan.immediate"
            :key="action.id"
            :action="action"
            :sources="getSources(action.sourceIds)"
          />
        </div>

        <div class="stack">
          <h2 class="section-title">{{ t('results.weekActions') }}</h2>
          <ActionCard
            v-for="action in actionPlan.week"
            :key="action.id"
            :action="action"
            :sources="getSources(action.sourceIds)"
          />
        </div>
      </section>

      <AppAlert :title="t('common.important')" variant="info">
        {{ t('results.warning') }}
      </AppAlert>

      <div class="cluster">
        <RouterLink class="link-button link-button--primary" to="/checklist">{{
          t('results.openChecklist')
        }}</RouterLink>
        <RouterLink class="link-button link-button--secondary" to="/kit">{{
          t('results.openKit')
        }}</RouterLink>
        <AppButton :disabled="isGeneratingPdf" @click="exportPdf('download')">
          {{
            isGeneratingPdf
              ? t('results.preparingPdf')
              : t('results.downloadCertificate')
          }}
        </AppButton>
        <AppButton
          variant="secondary"
          :disabled="isGeneratingPdf"
          @click="exportPdf('print')"
        >
          {{ t('results.printCertificate') }}
        </AppButton>
        <AppButton variant="danger" @click="assessmentStore.reset">{{
          t('common.resetData')
        }}</AppButton>
      </div>
    </div>
  </section>
</template>
