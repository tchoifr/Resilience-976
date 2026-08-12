<script setup lang="ts">
/* global navigator */
import { ref } from 'vue'

import AppAlert from '@/components/ui/AppAlert.vue'
import AppButton from '@/components/ui/AppButton.vue'
import { requestTranslationDraft } from '@/features/i18n-tools/services/translation-draft.service'
import type { TranslationDraftEntry } from '@/features/i18n-tools/types/translation-draft'
import { useI18n } from '@/shared/i18n/i18n.service'

const { t } = useI18n()

const inputText = ref('')
const entries = ref<TranslationDraftEntry[]>([])
const isTranslating = ref(false)

const errorMessageKeys: Record<string, string> = {
  invalid_text: 'translationDraft.errors.invalidText',
  translation_unconfigured: 'translationDraft.errors.unconfigured',
  rate_limited: 'translationDraft.errors.rateLimited',
  translation_upstream_error: 'translationDraft.errors.upstream',
  malformed_response: 'translationDraft.errors.upstream',
  network_error: 'translationDraft.errors.network',
}

function errorMessageFor(errorCode: string): string {
  return t(errorMessageKeys[errorCode] ?? 'translationDraft.errors.network')
}

async function submitTranslation() {
  const frenchText = inputText.value.trim()

  if (!frenchText || isTranslating.value) {
    return
  }

  const pendingId = window.crypto.randomUUID()
  entries.value = [{ id: pendingId, frenchText, status: 'pending' }, ...entries.value]
  inputText.value = ''
  isTranslating.value = true

  const outcome = await requestTranslationDraft(frenchText)
  const index = entries.value.findIndex((entry) => entry.id === pendingId)

  if (index !== -1) {
    entries.value[index] = outcome.ok
      ? {
          id: pendingId,
          frenchText,
          status: 'success',
          swahili: outcome.result.swahili,
          shimaore: outcome.result.shimaore,
        }
      : {
          id: pendingId,
          frenchText,
          status: 'error',
          errorText: errorMessageFor(outcome.errorCode),
        }
  }

  isTranslating.value = false
}

async function copyShimaore(text: string) {
  await navigator.clipboard.writeText(text)
}
</script>

<template>
  <section class="page">
    <div class="stack">
      <p class="eyebrow">{{ t('translationDraft.eyebrow') }}</p>
      <h1>{{ t('translationDraft.title') }}</h1>
      <p class="muted">{{ t('translationDraft.intro') }}</p>

      <AppAlert :title="t('common.important')" variant="warning">
        {{ t('translationDraft.guardrail') }}
      </AppAlert>

      <section class="panel stack">
        <form class="stack" @submit.prevent="submitTranslation">
          <label class="form-row" for="translation-input">
            <span>{{ t('translationDraft.inputLabel') }}</span>
            <textarea
              id="translation-input"
              v-model="inputText"
              class="text-input textarea"
              :disabled="isTranslating"
              :placeholder="t('translationDraft.inputPlaceholder')"
            />
          </label>
          <div class="cluster">
            <AppButton type="submit" :disabled="!inputText.trim() || isTranslating">
              {{
                isTranslating ? t('translationDraft.translating') : t('translationDraft.submit')
              }}
            </AppButton>
          </div>
        </form>
      </section>

      <section v-if="entries.length > 0" class="stack">
        <article v-for="entry in entries" :key="entry.id" class="panel stack translation-entry">
          <p class="translation-entry__french">{{ entry.frenchText }}</p>

          <p v-if="entry.status === 'pending'" class="muted">
            {{ t('translationDraft.translating') }}
          </p>

          <template v-else-if="entry.status === 'success'">
            <p><strong>{{ t('translationDraft.swahiliLabel') }}</strong> {{ entry.swahili }}</p>
            <p><strong>{{ t('translationDraft.shimaoreLabel') }}</strong> {{ entry.shimaore }}</p>
            <div class="cluster">
              <AppButton
                variant="secondary"
                @click="entry.shimaore && copyShimaore(entry.shimaore)"
              >
                {{ t('translationDraft.copy') }}
              </AppButton>
            </div>
          </template>

          <p v-else class="translation-entry__error">{{ entry.errorText }}</p>
        </article>
      </section>
    </div>
  </section>
</template>

<style scoped>
.translation-entry__french {
  font-weight: 600;
  color: var(--color-text-strong);
}

.translation-entry__error {
  color: var(--color-danger-fg);
}
</style>
