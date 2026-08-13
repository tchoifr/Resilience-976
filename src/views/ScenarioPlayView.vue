<script setup lang="ts">
import { computed, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'

import AppButton from '@/components/ui/AppButton.vue'
import LinkButton from '@/components/ui/LinkButton.vue'
import ProgressBar from '@/components/ui/ProgressBar.vue'
import SourceLink from '@/components/ui/SourceLink.vue'
import {
  scenarios,
  sourcesById,
  videosById,
} from '@/features/assessment/services/content.service'
import type { Source } from '@/features/assessment/types/source'
import { syncScenarioResult } from '@/features/scenarios/services/scenario-sync.service'
import { buildScenarioDebrief } from '@/features/scenarios/services/scenario-debrief.service'
import { getScenarioLevel } from '@/features/scenarios/services/scenario.service'
import { useScenarioStore } from '@/features/scenarios/stores/scenario.store'
import { trackEvent } from '@/shared/analytics/analytics.service'
import { useI18n } from '@/shared/i18n/i18n.service'

const route = useRoute()
const { t } = useI18n()
const scenarioStore = useScenarioStore()

const scenario = computed(() =>
  scenarios.value.find((item) => item.id === String(route.params.id)),
)
const linkedVideo = computed(() =>
  scenario.value ? videosById.value.get(scenario.value.videoId) : undefined,
)
const sources = computed<Source[]>(() => {
  if (!scenario.value) {
    return []
  }

  return scenario.value.sourceIds
    .map((sourceId) => sourcesById.value.get(sourceId))
    .filter((source): source is Source => source !== undefined)
})
const debrief = computed(() => buildScenarioDebrief(scenarioStore.choices))
const scenarioLevel = computed(() => getScenarioLevel(scenarioStore.score))
const levelVariant = computed(() => {
  if (scenarioLevel.value === 'excellent') {
    return 'success'
  }

  return scenarioLevel.value === 'good' ? 'warning' : 'danger'
})
// « 1 bons réflexes » se lisait mal : le singulier a sa propre chaine.
const reflexCountLabel = computed(() => {
  const key =
    debrief.value.goodCount <= 1
      ? 'scenarioPlay.debrief.reflexCountOne'
      : 'scenarioPlay.debrief.reflexCount'

  return t(key, { good: debrief.value.goodCount, total: debrief.value.total })
})
const progressPercent = computed(() =>
  scenarioStore.total === 0
    ? 0
    : Math.round((scenarioStore.currentIndex / scenarioStore.total) * 100),
)

function startScenario() {
  if (!scenario.value) {
    return
  }

  scenarioStore.start(scenario.value)
  trackEvent('scenario_started')
}

function confirmStep() {
  const wasLastStep = scenarioStore.isLastStep
  scenarioStore.confirm()

  if (wasLastStep && scenario.value) {
    trackEvent('scenario_completed')
    syncScenarioResult({
      scenarioId: scenario.value.id,
      score: scenarioStore.score,
      choices: Object.fromEntries(
        scenarioStore.choices.map((choice) => [choice.step.id, choice.selectedOption.id]),
      ),
    })
  }
}

watch(
  scenario,
  (nextScenario) => {
    if (nextScenario) {
      startScenario()
    }
  },
  { immediate: true },
)
</script>

<template>
  <section v-if="scenario" class="page">
    <div class="stack">
      <RouterLink class="back-link" to="/mises-en-situation">
        {{ t('scenarioPlay.backToList') }}
      </RouterLink>
      <p class="eyebrow">{{ scenario.title }}</p>
      <p class="muted">{{ scenario.intro }}</p>

      <template v-if="scenarioStore.status === 'playing' && scenarioStore.currentStep">
        <ProgressBar
          :value="progressPercent"
          :label="
            t('scenarioPlay.stepCount', {
              current: scenarioStore.currentIndex + 1,
              total: scenarioStore.total,
            })
          "
        />

        <section class="panel stack">
          <fieldset class="video-quiz">
            <legend>{{ scenarioStore.currentStep.step.prompt }}</legend>
            <label
              v-for="option in scenarioStore.currentStep.options"
              :key="option.id"
              class="answer-option"
            >
              <input
                type="radio"
                name="scenario-answer"
                :value="option.id"
                :checked="scenarioStore.selectedOptionId === option.id"
                @change="scenarioStore.select(option.id)"
              />
              <span>{{ option.label }}</span>
            </label>
          </fieldset>

          <div class="cluster">
            <AppButton
              icon="check"
              :disabled="scenarioStore.selectedOptionId === null"
              @click="confirmStep"
            >
              {{
                scenarioStore.isLastStep
                  ? t('scenarioPlay.seeDebrief')
                  : t('scenarioPlay.confirm')
              }}
            </AppButton>
          </div>
        </section>
      </template>

      <template v-else-if="scenarioStore.status === 'debrief'">
        <section class="panel stack">
          <h2 class="section-title">{{ t('scenarioPlay.debrief.title') }}</h2>

          <!-- Le niveau et le nombre de bons reflexes d'abord : c'est ce que
               le visiteur cherche en arrivant sur le debrief. -->
          <div class="debrief-summary">
            <span class="pill" :class="`pill--${levelVariant}`">
              {{ t(`scenarioPlay.debrief.levels.${scenarioLevel}`) }}
            </span>
            <p class="muted">{{ reflexCountLabel }}</p>
          </div>

          <ol class="debrief-steps">
            <li
              v-for="(entry, index) in debrief.entries"
              :key="entry.choice.step.id"
              class="debrief-step"
              :class="entry.isBest ? 'debrief-step--good' : 'debrief-step--review'"
            >
              <p class="debrief-step__prompt">
                <span class="debrief-step__number">{{ index + 1 }}</span>
                {{ entry.choice.step.prompt }}
              </p>

              <!-- La pastille est doublee du libelle : le bon reflexe ne doit
                   pas se deviner a la seule couleur. -->
              <p class="debrief-step__verdict">
                <span aria-hidden="true">{{ entry.isBest ? '✓' : '!' }}</span>
                {{
                  entry.isBest
                    ? t('scenarioPlay.debrief.goodReflex')
                    : t('scenarioPlay.debrief.toReview')
                }}
              </p>

              <dl class="debrief-step__detail">
                <div>
                  <dt>{{ t('scenarioPlay.debrief.yourChoice') }}</dt>
                  <dd>{{ entry.choice.selectedOption.label }}</dd>
                </div>
                <div v-if="!entry.isBest">
                  <dt>{{ t('scenarioPlay.debrief.safestOption') }}</dt>
                  <dd>{{ entry.bestOption.label }}</dd>
                </div>
              </dl>

              <p class="muted">
                {{ t('scenarioPlay.debrief.safestBehavior') }} :
                {{ entry.choice.step.explanation }}
              </p>
            </li>
          </ol>

          <ul v-if="sources.length > 0" class="source-list">
            <li v-for="source in sources" :key="source.id">
              <SourceLink :source="source" />
            </li>
          </ul>

          <div class="cluster">
            <LinkButton
              v-if="linkedVideo"
              variant="secondary"
              :to="`/videos/${linkedVideo.slug}`"
            >
              {{ t('scenarioPlay.debrief.watchCapsule') }}
            </LinkButton>
            <AppButton variant="secondary" icon="refresh" @click="startScenario">
              {{ t('scenarioPlay.debrief.restart') }}
            </AppButton>
          </div>
        </section>
      </template>
    </div>
  </section>
  <section v-else class="page page--narrow">
    <div class="panel stack">
      <p class="eyebrow">{{ t('notFound.eyebrow') }}</p>
      <h1>{{ t('notFound.title') }}</h1>
      <LinkButton to="/mises-en-situation" icon="arrow-left">
        {{ t('scenarioPlay.backToList') }}
      </LinkButton>
    </div>
  </section>
</template>
