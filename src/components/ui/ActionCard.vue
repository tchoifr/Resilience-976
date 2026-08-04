<script setup lang="ts">
import type {
  PrioritizedAction,
  RecommendationAction,
} from '@/features/assessment/types/recommendation'
import type { Source } from '@/features/assessment/types/source'
import { useI18n } from '@/shared/i18n/i18n.service'

import SourceLink from './SourceLink.vue'

defineProps<{
  action: RecommendationAction | PrioritizedAction
  sources: Source[]
}>()

const { t } = useI18n()
</script>

<template>
  <article class="action-card">
    <div class="action-card__meta">
      <span class="pill" :class="{ 'pill--danger': action.priorityBand === 'now' }">
        {{ action.priorityBand === 'now' ? t('status.priorityNow') : t('status.priorityWeek') }}
      </span>
      <span class="pill" :class="{ 'pill--warning': action.validationStatus !== 'validated' }">
        {{
          action.validationStatus === 'validated'
            ? t('common.validationDone')
            : t('common.validationToDo')
        }}
      </span>
    </div>

    <h3>{{ action.title }}</h3>
    <p class="muted">{{ action.why }}</p>

    <ul>
      <li v-for="instruction in action.instructions" :key="instruction">{{ instruction }}</li>
    </ul>

    <ul v-if="sources.length > 0" class="source-list" :aria-label="t('common.sources')">
      <li v-for="source in sources" :key="source.id">
        <SourceLink :source="source" />
      </li>
    </ul>
  </article>
</template>
