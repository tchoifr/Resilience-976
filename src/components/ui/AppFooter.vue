<script setup lang="ts">
import { useI18n } from '@/shared/i18n/i18n.service'

const { t } = useI18n()
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
    </div>
  </footer>
</template>
