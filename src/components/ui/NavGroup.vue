<script setup lang="ts">
/* global Node */
import { computed, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'
import { useRoute } from 'vue-router'

const props = defineProps<{
  label: string
  links: { to: string; label: string }[]
}>()

const route = useRoute()
const isOpen = ref(false)
const root = ref<HTMLElement | null>(null)
// Deux NavGroup coexistent dans l'en-tete : aria-controls doit designer un
// identifiant distinct pour chacun.
const panelId = `nav-group-${useId()}`

// L'entree parente doit rester signalee comme active tant qu'une de ses
// pages est ouverte, sinon le visiteur perd tout repere une fois le
// sous-menu referme.
const isActive = computed(() => props.links.some((link) => route.path === link.to))

function close() {
  isOpen.value = false
}

function toggle() {
  isOpen.value = !isOpen.value
}

// Un sous-menu qui ne se ferme pas au clic exterieur reste ouvert par-dessus
// le reste de la page et masque le contenu.
function onDocumentClick(event: MouseEvent) {
  if (root.value && !root.value.contains(event.target as Node)) {
    close()
  }
}

onMounted(() => document.addEventListener('click', onDocumentClick))
onBeforeUnmount(() => document.removeEventListener('click', onDocumentClick))

watch(() => route.fullPath, close)
</script>

<template>
  <div ref="root" class="nav-group" @keydown.escape="close">
    <button
      type="button"
      class="nav-group__toggle"
      :class="{ 'nav-group__toggle--active': isActive }"
      :aria-expanded="isOpen"
      :aria-controls="panelId"
      @click="toggle"
    >
      {{ label }}
      <span class="nav-group__chevron" aria-hidden="true"></span>
    </button>

    <div v-show="isOpen" :id="panelId" class="nav-group__panel">
      <RouterLink v-for="link in links" :key="link.to" :to="link.to" @click="close">
        {{ link.label }}
      </RouterLink>
    </div>
  </div>
</template>
