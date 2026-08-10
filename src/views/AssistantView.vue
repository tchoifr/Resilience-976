<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'

import AppAlert from '@/components/ui/AppAlert.vue'
import AppButton from '@/components/ui/AppButton.vue'
import SourceLink from '@/components/ui/SourceLink.vue'
import { assistantEntries, sourcesById } from '@/features/assessment/services/content.service'
import { findBestMatch } from '@/features/assistant/services/assistant.service'
import type { AssistantEntry, AssistantMessage } from '@/features/assistant/types/assistant'
import type { Source } from '@/features/assessment/types/source'
import { trackEvent } from '@/shared/analytics/analytics.service'
import { useI18n } from '@/shared/i18n/i18n.service'

const { t } = useI18n()

const inputText = ref('')
const messages = ref<AssistantMessage[]>([])
const transcript = ref<HTMLElement | null>(null)

const suggestedQuestions = computed(() => assistantEntries.value)

function sourcesFor(entry: AssistantEntry): Source[] {
  return entry.sourceIds
    .map((sourceId) => sourcesById.value.get(sourceId))
    .filter((source): source is Source => source !== undefined)
}

async function scrollToEnd() {
  await nextTick()
  if (transcript.value) {
    transcript.value.scrollTop = transcript.value.scrollHeight
  }
}

function ask(question: string) {
  const trimmed = question.trim()

  if (!trimmed) {
    return
  }

  messages.value.push({ id: window.crypto.randomUUID(), role: 'user', text: trimmed })

  const match = findBestMatch(trimmed, assistantEntries.value)

  if (match) {
    messages.value.push({
      id: window.crypto.randomUUID(),
      role: 'assistant',
      text: match.entry.answer,
      matchedEntry: match.entry,
    })
    trackEvent('assistant_answered')
  } else {
    messages.value.push({
      id: window.crypto.randomUUID(),
      role: 'assistant',
      text: t('assistant.refusedText'),
      refused: true,
    })
    trackEvent('assistant_unanswered')
  }

  trackEvent('assistant_question_asked')
  inputText.value = ''
  void scrollToEnd()
}

function submitForm() {
  ask(inputText.value)
}
</script>

<template>
  <section class="page">
    <div class="stack">
      <p class="eyebrow">{{ t('assistant.eyebrow') }}</p>
      <h1>{{ t('assistant.title') }}</h1>
      <p class="muted">{{ t('assistant.intro') }}</p>

      <AppAlert :title="t('common.important')" variant="warning">
        {{ t('assistant.guardrail') }}
      </AppAlert>

      <section class="panel stack">
        <h2 class="section-title">{{ t('assistant.suggestedTitle') }}</h2>
        <div class="cluster">
          <AppButton
            v-for="entry in suggestedQuestions"
            :key="entry.id"
            variant="secondary"
            @click="ask(entry.question)"
          >
            {{ entry.question }}
          </AppButton>
        </div>
      </section>

      <section class="panel stack">
        <div ref="transcript" class="assistant-transcript" aria-live="polite">
          <div
            v-for="message in messages"
            :key="message.id"
            class="assistant-message"
            :class="`assistant-message--${message.role}`"
          >
            <p>{{ message.text }}</p>
            <ul v-if="message.matchedEntry" class="source-list">
              <li v-for="source in sourcesFor(message.matchedEntry)" :key="source.id">
                <SourceLink :source="source" />
              </li>
            </ul>
            <div v-if="message.refused" class="cluster">
              <a
                class="link-button link-button--secondary"
                href="https://www.fr-alert.gouv.fr/"
                target="_blank"
                rel="noopener noreferrer"
                @click="trackEvent('source_opened')"
              >
                FR-Alert
              </a>
              <RouterLink class="link-button link-button--secondary" to="/ressources">
                {{ t('assistant.openResources') }}
              </RouterLink>
            </div>
          </div>
          <p v-if="messages.length === 0" class="muted">{{ t('assistant.emptyState') }}</p>
        </div>

        <form class="cluster" @submit.prevent="submitForm">
          <label class="sr-only" for="assistant-input">{{ t('assistant.inputLabel') }}</label>
          <input
            id="assistant-input"
            v-model="inputText"
            class="text-input"
            type="text"
            :placeholder="t('assistant.inputPlaceholder')"
          />
          <AppButton type="submit" :disabled="!inputText.trim()">
            {{ t('assistant.submit') }}
          </AppButton>
        </form>
      </section>
    </div>
  </section>
</template>

<style scoped>
.assistant-transcript {
  display: grid;
  gap: var(--space-3);
  max-height: 420px;
  overflow-y: auto;
}

.assistant-message {
  display: grid;
  gap: var(--space-2);
  padding: var(--space-3);
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
}

.assistant-message--user {
  background: var(--color-muted);
  justify-self: end;
  max-width: 80%;
}

.assistant-message--assistant {
  background: #ffffff;
  justify-self: start;
  max-width: 80%;
}
</style>
