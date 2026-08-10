<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import { useI18n } from '@/shared/i18n/i18n.service'

import LanguageSwitcher from './LanguageSwitcher.vue'
import ThemeSwitcher from './ThemeSwitcher.vue'

const route = useRoute()
const isMenuOpen = ref(false)
const { t } = useI18n()

const navLinks = [
  { to: '/', labelKey: 'navigation.home' },
  { to: '/diagnostic', labelKey: 'navigation.diagnostic' },
  { to: '/resultats', labelKey: 'navigation.results' },
  { to: '/checklist', labelKey: 'navigation.checklist' },
  { to: '/kit', labelKey: 'navigation.kit' },
  { to: '/ressources', labelKey: 'navigation.resources' },
  { to: '/videos', labelKey: 'navigation.videos' },
  { to: '/quiz', labelKey: 'navigation.quiz' },
  { to: '/mises-en-situation', labelKey: 'navigation.scenarios' },
  { to: '/assistant-documentaire', labelKey: 'navigation.assistant' },
  { to: '/experimentation-utilisateurs', labelKey: 'navigation.experiment' },
]

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
        <RouterLink v-for="link in navLinks" :key="link.to" :to="link.to" @click="closeMenu">
          {{ t(link.labelKey) }}
        </RouterLink>
        <LanguageSwitcher />
        <ThemeSwitcher />
      </nav>
    </div>
  </header>
</template>
