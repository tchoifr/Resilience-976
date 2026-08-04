<script setup lang="ts">
import SourceLink from '@/components/ui/SourceLink.vue'
import { resources, sourcesById } from '@/features/assessment/services/content.service'
import type { Source } from '@/features/assessment/types/source'
import { getDomainLabel, useI18n } from '@/shared/i18n/i18n.service'

const { t } = useI18n()

function getSources(sourceIds: string[]): Source[] {
  return sourceIds
    .map((sourceId) => sourcesById.get(sourceId))
    .filter((source): source is Source => source !== undefined)
}
</script>

<template>
  <section class="page">
    <div class="stack">
      <p class="eyebrow">{{ t('resources.eyebrow') }}</p>
      <h1>{{ t('resources.title') }}</h1>

      <div class="grid grid--2">
        <article v-for="resource in resources" :key="resource.id" class="panel stack">
          <div>
            <span class="pill">{{ getDomainLabel(resource.domain) }}</span>
            <span v-if="resource.validationStatus !== 'validated'" class="pill pill--warning">
              {{ t('common.validationToDo') }}
            </span>
          </div>
          <h2 class="section-title">{{ resource.title }}</h2>
          <p>{{ resource.description }}</p>
          <ul class="source-list" :aria-label="t('common.sources')">
            <li v-for="source in getSources(resource.sourceIds)" :key="source.id">
              <SourceLink :source="source" />
            </li>
          </ul>
        </article>
      </div>
    </div>
  </section>
</template>
