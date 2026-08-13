<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import { useI18n } from '@/shared/i18n/i18n.service'

import LanguageSwitcher from './LanguageSwitcher.vue'
import NavGroup from './NavGroup.vue'
import ThemeSwitcher from './ThemeSwitcher.vue'

const route = useRoute()
const isMenuOpen = ref(false)
const { t } = useI18n()

// Regroupe par intention plutot que par page : « ou en suis-je » d'un cote,
// « qu'ai-je a apprendre » de l'autre. L'experimentation quitte le menu :
// c'est un formulaire de retour et non une destination, elle vit desormais
// dans le pied de page sous le libelle « Donner mon avis ».
const planLinks = computed(() => [
  { to: '/diagnostic', label: t('navigation.diagnostic') },
  { to: '/resultats', label: t('navigation.results') },
  { to: '/checklist', label: t('navigation.checklist') },
  { to: '/kit', label: t('navigation.kit') },
])

const learnLinks = computed(() => [
  { to: '/videos', label: t('navigation.videos') },
  { to: '/quiz', label: t('navigation.quiz') },
  { to: '/mises-en-situation', label: t('navigation.scenarios') },
])

function toggleMenu() {
  isMenuOpen.value = !isMenuOpen.value
}

function closeMenu() {
  isMenuOpen.value = false
}

watch(
  () => route.fullPath,
  () => {
    closeMenu()
  },
)
</script>

<template>
  <header class="app-header">
    <div class="app-header__inner">
      <RouterLink class="brand" to="/" @click="closeMenu">
        <img src="/icons/logo-resilience.svg" alt="" aria-hidden="true" />
        <strong
          >{{ t('brand.name') }} <span>{{ t('brand.tagline') }}</span></strong
        >
      </RouterLink>

      <button
        class="menu-toggle"
        type="button"
        aria-controls="main-navigation"
        :aria-expanded="isMenuOpen"
        @click="toggleMenu"
      >
        <span class="menu-toggle__bar"></span>
        <span class="menu-toggle__bar"></span>
        <span class="menu-toggle__bar"></span>
        <span class="sr-only">{{ t('navigation.menu') }}</span>
      </button>

      <nav
        id="main-navigation"
        class="nav"
        :class="{ 'nav--open': isMenuOpen }"
        :aria-label="t('navigation.ariaLabel')"
      >
        <RouterLink to="/" @click="closeMenu">{{ t('navigation.home') }}</RouterLink>
        <NavGroup :label="t('navigation.myPlan')" :links="planLinks" />
        <NavGroup :label="t('navigation.learn')" :links="learnLinks" />
        <RouterLink to="/ressources" @click="closeMenu">
          {{ t('navigation.resources') }}
        </RouterLink>
        <LanguageSwitcher />
        <ThemeSwitcher />
      </nav>
    </div>
  </header>
</template>
