<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import AppButton from '@/components/ui/AppButton.vue'
import ProgressBar from '@/components/ui/ProgressBar.vue'
import QuestionCard from '@/components/ui/QuestionCard.vue'
import { questions } from '@/features/assessment/services/content.service'
import { syncDiagnosticResponses } from '@/features/assessment/services/diagnostic-sync.service'
import { useAssessmentStore } from '@/features/assessment/stores/assessment.store'
import type { AssessmentDomain } from '@/features/assessment/types/question'
import { trackEvent } from '@/shared/analytics/analytics.service'
import { getDomainLabel, useI18n } from '@/shared/i18n/i18n.service'

const assessmentStore = useAssessmentStore()
const router = useRouter()
const { t } = useI18n()
const questionRegion = ref<HTMLElement | null>(null)
const firstQuestion = questions.value[0]

if (!firstQuestion) {
  throw new Error(t('diagnostic.noQuestionError'))
}

const currentQuestion = computed(
  () => questions.value[assessmentStore.currentIndex] ?? firstQuestion,
)
const selectedAnswer = computed({
  get: () => assessmentStore.answers[currentQuestion.value.id],
  set: (answerId: string | undefined) => {
    if (answerId) {
      assessmentStore.answer(currentQuestion.value.id, answerId)
    }
  },
})

const domains = computed(() =>
  Array.from(new Set(questions.value.map((question) => question.domain))),
)
const progress = computed(() =>
  Math.round(
    ((assessmentStore.currentIndex + (selectedAnswer.value ? 1 : 0)) / questions.value.length) *
      100,
  ),
)
const isLastQuestion = computed(() => assessmentStore.currentIndex >= questions.value.length - 1)
const canContinue = computed(() => !currentQuestion.value.required || Boolean(selectedAnswer.value))
const isConfirmed = computed(() => isLastQuestion.value && Boolean(assessmentStore.completedAt))

onMounted(() => {
  // Only a genuine first entry counts as a start; resuming an
  // already-in-progress or already-completed diagnostic re-mounts this view
  // without being a new funnel entry.
  if (!assessmentStore.hasAnswers) {
    trackEvent('diagnostic_started')
  }
})

async function focusQuestion() {
  await nextTick()
  questionRegion.value?.focus()
}

function goPrevious() {
  assessmentStore.setCurrentIndex(assessmentStore.currentIndex - 1)
  void focusQuestion()
}

function goNext() {
  if (!canContinue.value || isLastQuestion.value) {
    return
  }

  assessmentStore.setCurrentIndex(assessmentStore.currentIndex + 1)
  void focusQuestion()
}

function confirmDiagnostic() {
  if (!canContinue.value) {
    return
  }

  // Meme logique que le garde sur diagnostic_started : ne compter que la
  // toute premiere completion d'un visiteur, pas chaque repassage sur la
  // derniere question (sinon terminés peut depasser commencés cote stats).
  const isFirstCompletion = !assessmentStore.completedAt
  assessmentStore.complete()
  if (isFirstCompletion) {
    trackEvent('diagnostic_completed')
  }
  syncDiagnosticResponses(assessmentStore.answers)
}

function goToResults() {
  void router.push('/resultats')
}

function domainLabel(domain: AssessmentDomain): string {
  return getDomainLabel(domain)
}
</script>

<template>
  <section class="page">
    <div class="question-layout diagnostic-screen">
      <aside class="diagnostic-sidebar">
        <div class="sidebar-brand">
          <img src="/icons/logo-resilience.svg" alt="" aria-hidden="true" />
          <strong>{{ t('brand.tagline') }}</strong>
        </div>
        <h1>{{ t('diagnostic.title') }}</h1>
        <ProgressBar :value="progress" :label="t('common.progress')" />

        <ol class="domain-list">
          <li
            v-for="domain in domains"
            :key="domain"
            :aria-current="currentQuestion.domain === domain ? 'step' : undefined"
          >
            {{ domainLabel(domain) }}
          </li>
        </ol>
      </aside>

      <div ref="questionRegion" class="stack" tabindex="-1" aria-live="polite">
        <template v-if="!isConfirmed">
          <p class="eyebrow">
            {{
              t('diagnostic.questionCount', {
                current: assessmentStore.currentIndex + 1,
                total: questions.length,
              })
            }}
          </p>

          <QuestionCard v-model="selectedAnswer" :question="currentQuestion" />

          <p v-if="currentQuestion.required && !selectedAnswer" class="muted">
            {{ t('diagnostic.missingAnswer') }}
          </p>
        </template>
        <p v-else class="muted">
          {{ t('diagnostic.confirmedMessage') }}
        </p>

        <div class="cluster">
          <AppButton
            v-if="!isLastQuestion"
            variant="secondary"
            :disabled="assessmentStore.currentIndex === 0"
            @click="goPrevious"
          >
            {{ t('diagnostic.previous') }}
          </AppButton>
          <AppButton v-if="!isLastQuestion" :disabled="!canContinue" @click="goNext">
            {{ t('diagnostic.next') }}
          </AppButton>
          <AppButton
            v-else-if="!assessmentStore.completedAt"
            :disabled="!canContinue"
            @click="confirmDiagnostic"
          >
            {{ t('diagnostic.confirm') }}
          </AppButton>
          <AppButton v-else @click="goToResults">
            {{ t('diagnostic.results') }}
          </AppButton>
        </div>
      </div>
    </div>
  </section>
</template>
