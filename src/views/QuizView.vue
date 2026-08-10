<script setup lang="ts">
import { computed, ref } from 'vue'

import AppAlert from '@/components/ui/AppAlert.vue'
import AppButton from '@/components/ui/AppButton.vue'
import ProgressBar from '@/components/ui/ProgressBar.vue'
import SourceLink from '@/components/ui/SourceLink.vue'
import { quizQuestions, sourcesById } from '@/features/assessment/services/content.service'
import type { Source } from '@/features/assessment/types/source'
import { syncQuizResult } from '@/features/quiz/services/quiz-sync.service'
import { useQuizStore } from '@/features/quiz/stores/quiz.store'
import { getCampaignId, trackEvent } from '@/shared/analytics/analytics.service'
import { useI18n } from '@/shared/i18n/i18n.service'

const quizStore = useQuizStore()
const { t } = useI18n()

const isGeneratingPdf = ref(false)
const isSavingScore = ref(false)
const hasSavedScore = ref(false)

const campaignId = computed(() => {
  const id = getCampaignId()
  return id === 'DIRECT' ? null : id
})
const progressPercent = computed(() =>
  quizStore.total === 0 ? 0 : Math.round((quizStore.currentIndex / quizStore.total) * 100),
)
const currentSources = computed<Source[]>(() => {
  const item = quizStore.currentItem

  if (!item) {
    return []
  }

  return item.question.sourceIds
    .map((sourceId) => sourcesById.value.get(sourceId))
    .filter((source): source is Source => source !== undefined)
})

function startQuiz() {
  quizStore.start(quizQuestions.value)
  hasSavedScore.value = false
  trackEvent('quiz_started')
}

function nextQuestion() {
  const wasLastQuestion = quizStore.isLastQuestion
  quizStore.nextQuestion()

  if (wasLastQuestion) {
    trackEvent('quiz_completed')
  }
}

function updatePseudonym(event: Event) {
  quizStore.setPseudonym((event.target as HTMLInputElement).value)
}

async function saveScore() {
  if (isSavingScore.value || hasSavedScore.value) {
    return
  }

  isSavingScore.value = true

  try {
    syncQuizResult({
      score: quizStore.score,
      total: quizStore.total,
      pseudonym: quizStore.pseudonym,
    })
    hasSavedScore.value = true
  } finally {
    isSavingScore.value = false
  }
}

async function downloadAttestation() {
  if (isGeneratingPdf.value) {
    return
  }

  isGeneratingPdf.value = true

  try {
    const { generateQuizAttestationPdf } = await import(
      '@/features/assessment/services/pdf.service'
    )

    generateQuizAttestationPdf({
      score: quizStore.score,
      total: quizStore.total,
      pseudonym: quizStore.pseudonym,
    })
    trackEvent('quiz_attestation_generated')
    trackEvent('pdf_downloaded')
  } finally {
    isGeneratingPdf.value = false
  }
}
</script>

<template>
  <section class="page">
    <div class="stack">
      <p class="eyebrow">{{ t('quiz.eyebrow') }}</p>
      <h1>{{ t('quiz.title') }}</h1>

      <template v-if="quizStore.status === 'idle'">
        <p class="muted">{{ t('quiz.intro') }}</p>
        <AppAlert v-if="campaignId" :title="t('common.important')" variant="info">
          {{ t('quiz.campaignNotice', { campaignId }) }}
        </AppAlert>
        <div class="cluster">
          <AppButton @click="startQuiz">{{ t('quiz.start') }}</AppButton>
        </div>
      </template>

      <template v-else-if="quizStore.status === 'playing' && quizStore.currentItem">
        <p class="muted" aria-live="polite">
          {{ t('quiz.scoreLabel') }} : <strong>{{ quizStore.score }}/{{ quizStore.answeredCount }}</strong>
        </p>

        <ProgressBar
          :value="progressPercent"
          :label="
            t('quiz.questionCount', {
              current: quizStore.currentIndex + 1,
              total: quizStore.total,
            })
          "
        />

        <section class="panel stack">
          <p class="eyebrow">{{ t(`quiz.riskLabels.${quizStore.currentItem.question.risk}`) }}</p>
          <fieldset class="video-quiz">
            <legend>{{ quizStore.currentItem.question.text }}</legend>
            <label
              v-for="(option, index) in quizStore.currentItem.options"
              :key="option"
              class="answer-option"
            >
              <input
                type="radio"
                name="quiz-answer"
                :value="index"
                :checked="quizStore.selectedIndex === index"
                :disabled="quizStore.isAnswered"
                @change="quizStore.select(index)"
              />
              <span>{{ option }}</span>
            </label>
          </fieldset>

          <div class="cluster">
            <AppButton
              v-if="!quizStore.isAnswered"
              :disabled="quizStore.selectedIndex === null"
              @click="quizStore.submit"
            >
              {{ t('quiz.submit') }}
            </AppButton>
            <AppButton v-else @click="nextQuestion">
              {{ quizStore.isLastQuestion ? t('quiz.seeResults') : t('quiz.next') }}
            </AppButton>
          </div>

          <AppAlert
            v-if="quizStore.isAnswered"
            :title="quizStore.lastAnswerCorrect ? t('quiz.correct') : t('quiz.incorrect')"
            :variant="quizStore.lastAnswerCorrect ? 'success' : 'warning'"
          >
            <p>{{ quizStore.currentItem.question.explanation }}</p>
            <ul v-if="currentSources.length > 0" class="source-list">
              <li v-for="source in currentSources" :key="source.id">
                <SourceLink :source="source" />
              </li>
            </ul>
          </AppAlert>
        </section>
      </template>

      <template v-else-if="quizStore.status === 'finished'">
        <section class="panel stack">
          <h2 class="section-title">{{ t('quiz.results.title') }}</h2>
          <p>{{ t('quiz.results.summary', { score: quizStore.score, total: quizStore.total }) }}</p>

          <label class="form-row" for="quiz-pseudonym">
            <span>{{ t('quiz.results.pseudonymLabel') }}</span>
            <input
              id="quiz-pseudonym"
              class="text-input"
              type="text"
              maxlength="40"
              :placeholder="t('quiz.results.pseudonymPlaceholder')"
              :value="quizStore.pseudonym"
              @input="updatePseudonym"
            />
          </label>

          <div class="cluster">
            <AppButton :disabled="isSavingScore || hasSavedScore" @click="saveScore">
              {{
                hasSavedScore
                  ? t('quiz.results.scoreSaved')
                  : isSavingScore
                    ? t('quiz.results.savingScore')
                    : t('quiz.results.saveScore')
              }}
            </AppButton>
            <AppButton variant="secondary" :disabled="isGeneratingPdf" @click="downloadAttestation">
              {{ isGeneratingPdf ? t('quiz.results.preparingPdf') : t('quiz.results.downloadAttestation') }}
            </AppButton>
            <AppButton variant="secondary" @click="startQuiz">{{ t('quiz.restart') }}</AppButton>
          </div>

          <p class="muted">{{ t('quiz.results.disclaimer') }}</p>
        </section>
      </template>
    </div>
  </section>
</template>
