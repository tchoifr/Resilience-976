<script setup lang="ts">
import type { ScoreLevel } from '@/features/assessment/types/assessment'
import { useI18n } from '@/shared/i18n/i18n.service'

const props = defineProps<{
  score: number
  level: ScoreLevel
}>()
const { t } = useI18n()
</script>

<template>
  <div class="score-gauge">
    <!-- Le role est indispensable : un aria-label sur un div sans role est
         invalide et purement ignore par les technologies d'assistance. La
         jauge est une representation graphique du score, d'ou role="img". -->
    <div
      class="score-gauge__circle"
      role="img"
      :aria-label="t('scoreGauge.aria', { score, level: level.label })"
      :style="{ '--score': `${props.score}%` }"
    >
      <div class="score-gauge__inner" aria-hidden="true">{{ score }}/100</div>
    </div>
    <div>
      <h2 class="section-title">{{ level.label }}</h2>
      <p class="muted">{{ level.message }}</p>
    </div>
  </div>
</template>
