<script setup lang="ts">
import { trackEvent } from '@/shared/analytics/analytics.service'
import { useI18n } from '@/shared/i18n/i18n.service'

const { t } = useI18n()

const legalLinks = [
  { to: '/mentions-legales', labelKey: 'footer.legal' },
  { to: '/politique-de-confidentialite', labelKey: 'footer.privacy' },
  { to: '/declaration-accessibilite', labelKey: 'footer.accessibility' },
  { to: '/support', labelKey: 'footer.support' },
  { to: '/tableau-de-bord', labelKey: 'footer.stats' },
]

const linkedinUrl = 'https://www.linkedin.com/in/natam-sa-61474b22b/'
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
      <a
        class="footer-social-link"
        :href="linkedinUrl"
        target="_blank"
        rel="noopener noreferrer"
        :aria-label="t('footer.linkedin')"
        @click="trackEvent('source_opened')"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path
            d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"
          />
        </svg>
      </a>
      <nav class="footer-legal-nav" :aria-label="t('footer.ariaLabel')">
        <RouterLink v-for="link in legalLinks" :key="link.to" :to="link.to">
          {{ t(link.labelKey) }}
        </RouterLink>
      </nav>
    </div>
  </footer>
</template>
