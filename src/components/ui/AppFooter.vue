<script setup lang="ts">
import { useI18n } from '@/shared/i18n/i18n.service'

const { t } = useI18n()

const legalLinks = [
  { to: '/mentions-legales', labelKey: 'footer.legal' },
  { to: '/politique-de-confidentialite', labelKey: 'footer.privacy' },
  { to: '/declaration-accessibilite', labelKey: 'footer.accessibility' },
  { to: '/support', labelKey: 'footer.support' },
]
</script>

<template>
  <footer class="app-footer">
    <div class="app-footer__inner">
      <RouterLink class="footer-brand" to="/">
        <img src="/icons/logo-resilience.svg" alt="" aria-hidden="true" />
        <strong
          >{{ t('brand.name') }} <span>{{ t('brand.tagline') }}</span></strong
        >
      </RouterLink>
      <div class="footer-badges">
        <span>{{ t('footer.publicService') }}</span>
        <span>{{ t('footer.noPersonalData') }}</span>
      </div>
      <p>{{ t('footer.slogan') }}</p>
      <nav class="footer-legal-nav" :aria-label="t('footer.ariaLabel')">
        <RouterLink v-for="link in legalLinks" :key="link.to" :to="link.to">
          {{ t(link.labelKey) }}
        </RouterLink>
      </nav>
    </div>
  </footer>
</template>
