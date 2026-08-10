<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { RouterView } from 'vue-router'

import AppFooter from '@/components/ui/AppFooter.vue'
import AppHeader from '@/components/ui/AppHeader.vue'
import PublicWarningBanner from '@/components/ui/PublicWarningBanner.vue'
import { useAssessmentStore } from '@/features/assessment/stores/assessment.store'
import { useI18n } from '@/shared/i18n/i18n.service'

import { updateRouteHead } from './router'

const assessmentStore = useAssessmentStore()
const { locale } = useI18n()

onMounted(() => {
  assessmentStore.restore()
})

watch(locale, () => {
  updateRouteHead()
})
</script>

<template>
  <a class="skip-link" href="#main-content">Aller au contenu</a>
  <PublicWarningBanner />
  <AppHeader />
  <main id="main-content" class="app-main" tabindex="-1">
    <RouterView />
  </main>
  <AppFooter />
</template>
