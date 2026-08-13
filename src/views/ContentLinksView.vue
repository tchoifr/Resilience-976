<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'

import AppAlert from '@/components/ui/AppAlert.vue'
import AppButton from '@/components/ui/AppButton.vue'
import LinkButton from '@/components/ui/LinkButton.vue'
import {
  askContentLinks,
  fetchContentLinksStatus,
} from '@/features/content-links/services/content-links.service'
import type { ContentLinkMatch } from '@/features/content-links/types/content-links'
import { useI18n } from '@/shared/i18n/i18n.service'

interface ContentLinksMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  matches: ContentLinkMatch[]
  refused: boolean
}

const { t } = useI18n()

const inputText = ref('')
const messages = ref<ContentLinksMessage[]>([])
const isLoading = ref(false)
const transcript = ref<HTMLElement | null>(null)

// « checking » tant que la reponse n'est pas arrivee, « off » aussi bien
// quand la cle manque que quand le serveur ne repond pas : dans les deux cas
// la recherche ne rendra rien, autant l'annoncer d'une seule facon.
const engineState = ref<'checking' | 'on' | 'off'>('checking')
const engineStatusLabel = computed(() => {
  if (engineState.value === 'checking') {
    return t('contentLinks.statusChecking')
  }

  return engineState.value === 'on'
    ? t('contentLinks.statusConnected')
    : t('contentLinks.statusDisconnected')
})

onMounted(async () => {
  engineState.value = (await fetchContentLinksStatus()) === true ? 'on' : 'off'
})

function typeLabel(type: ContentLinkMatch['type']): string {
  return t(`contentLinks.type.${type}`)
}

async function scrollToEnd() {
  await nextTick()
  if (transcript.value) {
    transcript.value.scrollTop = transcript.value.scrollHeight
  }
}

async function ask(question: string) {
  const trimmed = question.trim()

  if (!trimmed || isLoading.value) {
    return
  }

  messages.value.push({
    id: window.crypto.randomUUID(),
    role: 'user',
    text: trimmed,
    matches: [],
    refused: false,
  })
  inputText.value = ''
  isLoading.value = true
  void scrollToEnd()

  const result = await askContentLinks(trimmed)
  const matches = result?.matches ?? []
  const refused = result === null || result.refused || matches.length === 0

  messages.value.push({
    id: window.crypto.randomUUID(),
    role: 'assistant',
    text: '',
    matches: refused ? [] : matches,
    refused,
  })

  isLoading.value = false
  void scrollToEnd()
}

function submitForm() {
  void ask(inputText.value)
}
</script>

<template>
  <section class="page">
    <div class="stack">
      <p class="eyebrow">{{ t('contentLinks.eyebrow') }}</p>
      <div class="page-heading">
        <h1>{{ t('contentLinks.title') }}</h1>
        <span class="pill pill--warning">{{ t('contentLinks.alphaBadge') }}</span>
      </div>
      <p class="muted">{{ t('contentLinks.intro') }}</p>

      <!-- Le point colore est double d'un libelle : l'etat de la connexion ne
           doit pas dependre de la seule couleur. -->
      <p class="engine-status" :class="`engine-status--${engineState}`" aria-live="polite">
        <span class="engine-status__dot" aria-hidden="true"></span>
        {{ engineStatusLabel }}
      </p>

      <AppAlert :title="t('contentLinks.alphaBadge')" variant="warning">
        {{ t('contentLinks.alphaNote') }}
        <template v-if="engineState === 'off'">
          {{ t('contentLinks.statusDisconnectedHelp') }}
        </template>
      </AppAlert>

      <section class="panel stack">
        <div ref="transcript" class="assistant-transcript" aria-live="polite">
          <div
            v-for="message in messages"
            :key="message.id"
            class="assistant-message"
            :class="`assistant-message--${message.role}`"
          >
            <p v-if="message.role === 'user'">{{ message.text }}</p>
            <ul v-if="message.matches.length > 0" class="content-links-list">
              <li v-for="match in message.matches" :key="match.url + match.title">
                <RouterLink :to="match.url" class="content-link-card">
                  <span class="content-link-type">{{ typeLabel(match.type) }}</span>
                  <span class="content-link-title">{{ match.title }}</span>
                </RouterLink>
              </li>
            </ul>
            <AppAlert v-if="message.refused" :title="t('common.important')" variant="info">
              {{ t('contentLinks.fallbackText') }}
              <div class="cluster">
                <LinkButton to="/ressources" variant="secondary">
                  {{ t('contentLinks.openResources') }}
                </LinkButton>
              </div>
            </AppAlert>
          </div>
          <p v-if="messages.length === 0" class="muted">{{ t('contentLinks.emptyState') }}</p>
        </div>

        <form class="cluster" @submit.prevent="submitForm">
          <label class="sr-only" for="content-links-input">
            {{ t('contentLinks.inputLabel') }}
          </label>
          <input
            id="content-links-input"
            v-model="inputText"
            class="text-input"
            type="text"
            :placeholder="t('contentLinks.inputPlaceholder')"
          />
          <AppButton type="submit" icon="search" :disabled="!inputText.trim() || isLoading">
            {{ t('contentLinks.submit') }}
          </AppButton>
        </form>
      </section>
    </div>
  </section>
</template>

<style scoped>
.engine-status {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  margin: 0;
  font-weight: 700;
}

.engine-status__dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: var(--color-text-muted);
}

.engine-status--on .engine-status__dot {
  background: var(--color-success-fg);
}

.engine-status--off .engine-status__dot {
  background: var(--color-danger-fg);
}

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
  max-width: 100%;
}

.content-links-list {
  display: grid;
  gap: var(--space-2);
  list-style: none;
  padding: 0;
  margin: 0;
}

.content-link-card {
  display: grid;
  gap: var(--space-1);
  padding: var(--space-2);
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  text-decoration: none;
  color: inherit;
}

.content-link-type {
  font-size: 0.8em;
  text-transform: uppercase;
}

.content-link-title {
  font-weight: 600;
}
</style>
