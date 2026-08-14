<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { RouterView } from 'vue-router'

import AppFooter from '@/components/ui/AppFooter.vue'
import AppHeader from '@/components/ui/AppHeader.vue'
import LanguageDemoBanner from '@/components/ui/LanguageDemoBanner.vue'
import PublicWarningBanner from '@/components/ui/PublicWarningBanner.vue'
import { useAssessmentStore } from '@/features/assessment/stores/assessment.store'
import { useI18n } from '@/shared/i18n/i18n.service'

import { updateRouteHead } from './router'

const assessmentStore = useAssessmentStore()
const { locale, t } = useI18n()

onMounted(() => {
  assessmentStore.restore()
})

watch(locale, () => {
  updateRouteHead()
})
</script>

<template>
  <a class="skip-link" href="#main-content">Aller au contenu</a>
  <AppHeader />
  <!-- Les vues sont chargees en differe. Sans etat d'attente, la zone de
       contenu principal reste vide le temps que le fragment arrive : le lien
       d'evitement y depose bien le focus, mais la tabulation suivante saute
       tout le contenu et atterrit dans le pied de page. Le repli donne au
       clavier et aux lecteurs d'ecran quelque chose a annoncer. -->
  <main id="main-content" class="app-main" tabindex="-1">
    <RouterView v-slot="{ Component }">
      <Suspense>
        <component :is="Component" />
        <template #fallback>
          <p class="route-loading" role="status">{{ t('common.loading') }}</p>
        </template>
      </Suspense>
    </RouterView>
  </main>
  <AppFooter />
  <PublicWarningBanner />
  <LanguageDemoBanner />
</template>
