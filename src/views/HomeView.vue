<script setup lang="ts">
import { RouterLink } from 'vue-router'

import AppAlert from '@/components/ui/AppAlert.vue'
import { useAssessmentStore } from '@/features/assessment/stores/assessment.store'
import { trackEvent } from '@/shared/analytics/analytics.service'
import { useI18n } from '@/shared/i18n/i18n.service'

const assessmentStore = useAssessmentStore()
const { t } = useI18n()

const journeySteps = [
  {
    number: 1,
    color: 'teal',
    labelKey: 'home.steps.diagnostic',
    textKey: 'home.steps.diagnosticText',
  },
  { number: 2, color: 'green', labelKey: 'home.steps.results', textKey: 'home.steps.resultsText' },
  {
    number: 3,
    color: 'orange',
    labelKey: 'home.steps.actionPlan',
    textKey: 'home.steps.actionPlanText',
  },
  {
    number: 4,
    color: 'yellow',
    labelKey: 'home.steps.checklist',
    textKey: 'home.steps.checklistText',
  },
  { number: 5, color: 'teal', labelKey: 'home.steps.kit', textKey: 'home.steps.kitText' },
  { number: 6, color: 'blue', labelKey: 'home.steps.pdf', textKey: 'home.steps.pdfText' },
]
</script>

<template>
  <section class="page">
    <div class="home-screen">
      <div class="hero-card">
        <div class="hero-copy stack">
          <p class="eyebrow">{{ t('home.eyebrow') }}</p>
          <h1>{{ t('home.title') }}</h1>
          <p>{{ t('home.intro') }}</p>

          <div class="cluster hero-actions">
            <RouterLink
              class="link-button link-button--primary"
              to="/diagnostic"
              @click="trackEvent('diagnostic_started')"
            >
              {{ assessmentStore.hasAnswers ? t('home.resume') : t('home.start') }}
            </RouterLink>
            <RouterLink class="link-button link-button--secondary" to="/ressources">
              {{ t('home.resources') }}
            </RouterLink>
          </div>

          <div class="trust-row" :aria-label="t('home.trustAria')">
            <div class="trust-item">
              <span class="trust-item__icon">1</span>
              {{ t('home.free') }}
            </div>
            <div class="trust-item">
              <span class="trust-item__icon">2</span>
              {{ t('home.noAccount') }}
            </div>
            <div class="trust-item">
              <span class="trust-item__icon">3</span>
              {{ t('home.local') }}
            </div>
            <div class="trust-item">
              <span class="trust-item__icon">4</span>
              {{ t('home.officialSources') }}
            </div>
          </div>
        </div>

        <div class="hero-media" aria-hidden="true">
          <picture>
            <source media="(max-width: 600px)" srcset="/images/Mobile.png" />
            <source media="(max-width: 1024px)" srcset="/images/Tablet.png" />
            <img
              src="/images/desktop.png"
              alt=""
              decoding="async"
              fetchpriority="high"
              width="1774"
              height="887"
            />
          </picture>
        </div>
      </div>

      <section class="journey-panel" :aria-label="t('home.journeyAria')">
        <h2>{{ t('home.journeyTitle') }}</h2>
        <ol class="journey-steps">
          <li v-for="step in journeySteps" :key="step.number" class="journey-step">
            <span class="journey-step__dot" :class="`journey-step__dot--${step.color}`">
              {{ step.number }}
            </span>
            <strong>{{ t(step.labelKey) }}</strong>
            <small>{{ t(step.textKey) }}</small>
          </li>
        </ol>
      </section>

      <AppAlert :title="t('home.privacyTitle')" variant="info">
        {{ t('home.privacy') }}
      </AppAlert>
    </div>
  </section>
</template>
