<script setup lang="ts">
/* global KeyboardEvent */
import { nextTick, ref } from 'vue'

import AppButton from './AppButton.vue'
import { useI18n } from '@/shared/i18n/i18n.service'

withDefaults(
  defineProps<{
    label: string
    question: string
    confirmLabel?: string
  }>(),
  {
    confirmLabel: undefined,
  },
)

const emit = defineEmits<{
  confirm: []
}>()

const { t } = useI18n()
const isConfirming = ref(false)
const confirmButton = ref<InstanceType<typeof AppButton> | null>(null)

// Le focus suit la question : sans cela, un utilisateur au clavier ou au
// lecteur d'ecran resterait sur un bouton qui vient de disparaitre.
async function open() {
  isConfirming.value = true
  await nextTick()
  confirmButton.value?.$el?.focus()
}

function cancel() {
  isConfirming.value = false
}

// Echap ferme la demande de confirmation, comme le ferait une boite de
// dialogue : c'est le reflexe attendu quand on a clique par erreur.
function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    cancel()
  }
}

function confirm() {
  isConfirming.value = false
  emit('confirm')
}
</script>

<template>
  <div class="danger-confirm" @keydown="onKeydown">
    <!-- Confirmation en deux temps plutot qu'une popup du navigateur : elle
         reste dans la page, se style avec le reste du site et n'a pas besoin
         d'un piege a focus. -->
    <AppButton v-if="!isConfirming" variant="danger" icon="trash" @click="open">
      {{ label }}
    </AppButton>

    <div v-else class="danger-confirm__prompt" role="group" :aria-label="question">
      <p class="danger-confirm__question">{{ question }}</p>
      <div class="cluster">
        <AppButton ref="confirmButton" variant="danger" icon="trash" @click="confirm">
          {{ confirmLabel ?? t('common.confirmDelete') }}
        </AppButton>
        <AppButton variant="secondary" @click="cancel">
          {{ t('common.cancel') }}
        </AppButton>
      </div>
    </div>
  </div>
</template>
