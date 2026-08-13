<script setup lang="ts">
import { useI18n } from '@/shared/i18n/i18n.service'

const { t } = useI18n()

const journeyLinks = [
  { to: '/diagnostic', labelKey: 'navigation.diagnostic' },
  { to: '/resultats', labelKey: 'navigation.results' },
  { to: '/checklist', labelKey: 'navigation.checklist' },
  { to: '/kit', labelKey: 'navigation.kit' },
]

const learnLinks = [
  { to: '/videos', labelKey: 'navigation.videos' },
  { to: '/quiz', labelKey: 'navigation.quiz' },
  { to: '/mises-en-situation', labelKey: 'navigation.scenarios' },
  { to: '/ressources', labelKey: 'navigation.resources' },
]

// « Donner mon avis » remplace « Experimentation » : le visiteur ne sait pas
// ce qu'est une experimentation, il sait ce qu'est donner son avis.
const aboutLinks = [
  { to: '/mentions-legales', labelKey: 'footer.legal' },
  { to: '/politique-de-confidentialite', labelKey: 'footer.privacy' },
  { to: '/declaration-accessibilite', labelKey: 'footer.accessibility' },
  { to: '/support', labelKey: 'footer.support' },
  { to: '/tableau-de-bord', labelKey: 'footer.stats' },
  { to: '/experimentation-utilisateurs', labelKey: 'footer.giveFeedback' },
]
</script>

<template>
  <footer class="app-footer">
    <div class="app-footer__columns">
      <div class="footer-column footer-column--brand">
        <RouterLink class="footer-brand" to="/">
          <img src="/icons/logo-resilience.svg" alt="" aria-hidden="true" />
          <strong
            >{{ t('brand.name') }} <span>{{ t('brand.tagline') }}</span></strong
          >
        </RouterLink>
        <p class="footer-slogan">{{ t('footer.slogan') }}</p>
        <p class="footer-mission">{{ t('footer.mission') }}</p>
      </div>

      <nav class="footer-column" :aria-label="t('footer.columnJourney')">
        <h2 class="footer-column__title">{{ t('footer.columnJourney') }}</h2>
        <RouterLink v-for="link in journeyLinks" :key="link.to" :to="link.to">
          {{ t(link.labelKey) }}
        </RouterLink>
      </nav>

      <nav class="footer-column" :aria-label="t('footer.columnLearn')">
        <h2 class="footer-column__title">{{ t('footer.columnLearn') }}</h2>
        <RouterLink v-for="link in learnLinks" :key="link.to" :to="link.to">
          {{ t(link.labelKey) }}
        </RouterLink>
      </nav>

      <nav class="footer-column" :aria-label="t('footer.columnAbout')">
        <h2 class="footer-column__title">{{ t('footer.columnAbout') }}</h2>
        <RouterLink v-for="link in aboutLinks" :key="link.to" :to="link.to">
          {{ t(link.labelKey) }}
        </RouterLink>
      </nav>
    </div>
  </footer>
</template>
