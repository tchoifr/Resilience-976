<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import AppAlert from '@/components/ui/AppAlert.vue'
import AppButton from '@/components/ui/AppButton.vue'
import DangerConfirmButton from '@/components/ui/DangerConfirmButton.vue'
import QuestionCard from '@/components/ui/QuestionCard.vue'
import { buildAnswerSummary } from '@/features/assessment/services/answer-summary.service'
import { questions } from '@/features/assessment/services/content.service'
import { syncDiagnosticResponses } from '@/features/assessment/services/diagnostic-sync.service'
import { groupQuestionsByDomain } from '@/features/assessment/services/scoring.service'
import { useAssessmentStore } from '@/features/assessment/stores/assessment.store'
import type { AssessmentDomain, Question } from '@/features/assessment/types/question'
import { trackEvent } from '@/shared/analytics/analytics.service'
import { getDomainLabel, useI18n } from '@/shared/i18n/i18n.service'

const assessmentStore = useAssessmentStore()
const router = useRouter()
const { t } = useI18n()
const questionRegion = ref<HTMLElement | null>(null)

const groups = computed(() => groupQuestionsByDomain(questions.value))
const firstGroup = groups.value[0]

if (!firstGroup) {
  throw new Error(t('diagnostic.noQuestionError'))
}

// L'index enregistre peut depasser le nombre de themes si les donnees
// changent : on le ramene dans les bornes plutot que d'afficher un ecran vide.
const currentThemeIndex = computed(() =>
  Math.min(Math.max(assessmentStore.currentIndex, 0), groups.value.length - 1),
)
const currentGroup = computed(() => groups.value[currentThemeIndex.value] ?? firstGroup)

function isAnswered(question: Question): boolean {
  return Boolean(assessmentStore.answers[question.id])
}

function isGroupComplete(questionsOfGroup: Question[]): boolean {
  return questionsOfGroup.every((question) => !question.required || isAnswered(question))
}

const missingCount = computed(
  () =>
    currentGroup.value.questions.filter((question) => question.required && !isAnswered(question))
      .length,
)
const canContinue = computed(() => isGroupComplete(currentGroup.value.questions))
const summary = computed(() => buildAnswerSummary(questions.value, assessmentStore.answers))
const answeredCount = computed(() =>
  summary.value.reduce((total, group) => total + group.answeredCount, 0),
)
const isLastTheme = computed(() => currentThemeIndex.value >= groups.value.length - 1)
const progressLabel = computed(
  () =>
    `${t('diagnostic.themeProgress', {
      current: currentThemeIndex.value + 1,
      total: groups.value.length,
    })} - ${domainLabel(currentGroup.value.domain)}`,
)

onMounted(() => {
  // Only a genuine first entry counts as a start; resuming an
  // already-in-progress or already-completed diagnostic re-mounts this view
  // without being a new funnel entry.
  if (!assessmentStore.hasAnswers) {
    trackEvent('diagnostic_started')
  }
})

async function focusTheme() {
  await nextTick()
  questionRegion.value?.focus()
}

function goPrevious() {
  assessmentStore.setCurrentIndex(currentThemeIndex.value - 1)
  void focusTheme()
}

function goNext() {
  if (!canContinue.value || isLastTheme.value) {
    return
  }

  assessmentStore.setCurrentIndex(currentThemeIndex.value + 1)
  void focusTheme()
}

function confirmDiagnostic() {
  if (!canContinue.value) {
    return
  }

  // Meme logique que le garde sur diagnostic_started : ne compter que la
  // toute premiere completion d'un visiteur, pas chaque repassage sur le
  // dernier theme (sinon terminés peut depasser commencés cote stats).
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

        <div class="theme-progress">
          <!-- La couleur des segments n'est pas le seul vecteur : le libelle
               annonce le theme courant et son rang, et les themes termines
               portent une coche. -->
          <div
            class="theme-progress__segments"
            role="progressbar"
            :aria-label="t('common.progress')"
            aria-valuemin="1"
            :aria-valuemax="groups.length"
            :aria-valuenow="currentThemeIndex + 1"
            :aria-valuetext="progressLabel"
          >
            <span
              v-for="(group, index) in groups"
              :key="group.domain"
              class="theme-progress__segment"
              :class="{
                'theme-progress__segment--done': isGroupComplete(group.questions),
                'theme-progress__segment--current': index === currentThemeIndex,
              }"
              aria-hidden="true"
            >
              <span v-if="isGroupComplete(group.questions)">✓</span>
            </span>
          </div>
          <p class="theme-progress__label">{{ progressLabel }}</p>
        </div>

        <ol class="domain-list">
          <li
            v-for="(group, index) in groups"
            :key="group.domain"
            :aria-current="index === currentThemeIndex ? 'step' : undefined"
          >
            {{ domainLabel(group.domain) }}
            <span v-if="isGroupComplete(group.questions)" class="sr-only">
              {{ t('diagnostic.themeDone') }}
            </span>
          </li>
        </ol>
      </aside>

      <div ref="questionRegion" class="stack" tabindex="-1" aria-live="polite">
        <!-- Diagnostic confirme : le formulaire cede la place aux reponses
             enregistrees. Plus rien a saisir ni a naviguer, seulement a
             relire ; recommencer passe par l'effacement. -->
        <template v-if="assessmentStore.completedAt">
          <AppAlert :title="t('diagnostic.confirmedTitle')" variant="success">
            {{ t('diagnostic.confirmedMessage') }}
          </AppAlert>

          <h2 class="section-title">{{ t('answers.title') }}</h2>
          <p class="muted">
            {{ t('answers.intro', { answered: answeredCount, total: questions.length }) }}
          </p>

          <section v-for="group in summary" :key="group.domain" class="stack">
            <h3 class="answer-recap__theme">{{ domainLabel(group.domain) }}</h3>
            <dl class="answer-recap">
              <div v-for="item in group.items" :key="item.questionId">
                <dt>{{ item.question }}</dt>
                <dd :class="{ 'answer-recap__missing': item.answerLabel === null }">
                  {{ item.answerLabel ?? t('answers.missing') }}
                </dd>
              </div>
            </dl>
          </section>

          <div class="cluster">
            <AppButton icon="arrow-right" @click="goToResults">
              {{ t('diagnostic.results') }}
            </AppButton>
          </div>
        </template>

        <template v-else>
          <p class="eyebrow">{{ progressLabel }}</p>
          <h2 class="section-title">{{ domainLabel(currentGroup.domain) }}</h2>

          <div class="theme-questions">
            <QuestionCard
              v-for="question in currentGroup.questions"
              :key="question.id"
              :model-value="assessmentStore.answers[question.id]"
              :question="question"
              @update:model-value="assessmentStore.answer(question.id, $event)"
            />
          </div>

          <p v-if="missingCount > 0" class="muted">
            {{ t('diagnostic.themeIncomplete', { count: missingCount }) }}
          </p>

          <div class="cluster">
            <AppButton
              variant="secondary"
              icon="arrow-left"
              :disabled="currentThemeIndex === 0"
              @click="goPrevious"
            >
              {{ t('diagnostic.previous') }}
            </AppButton>
            <AppButton
              v-if="!isLastTheme"
              icon="arrow-right"
              :disabled="!canContinue"
              @click="goNext"
            >
              {{ t('diagnostic.next') }}
            </AppButton>
            <AppButton v-else icon="check" :disabled="!canContinue" @click="confirmDiagnostic">
              {{ t('diagnostic.confirm') }}
            </AppButton>
          </div>
        </template>

        <!-- Reserve au diagnostic confirme : en cours de saisie, le bouton
             n'offre rien qu'une reponse corrigee ne fasse deja, et expose au
             clic par erreur. -->
        <div v-if="assessmentStore.completedAt" class="cluster danger-zone">
          <DangerConfirmButton
            :label="t('common.resetData')"
            :question="t('common.resetDataConfirm')"
            @confirm="assessmentStore.reset"
          />
          <p class="muted">{{ t('diagnostic.resetHint') }}</p>
        </div>
      </div>
    </div>
  </section>
</template>
