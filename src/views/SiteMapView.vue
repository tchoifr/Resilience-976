<script setup lang="ts">
import { computed } from 'vue'

import { scenarios, videos } from '@/features/assessment/services/content.service'
import { useI18n } from '@/shared/i18n/i18n.service'

const { t } = useI18n()

// Deuxieme systeme de navigation exige par le RGAA (critere 12.1), a cote du
// menu. Les pages de contenu sont listees depuis les donnees, pour qu'une
// capsule ou un scenario ajoute apparaisse ici sans intervention.
const sections = computed(() => [
  {
    id: 'journey',
    title: t('footer.columnJourney'),
    links: [
      { to: '/', label: t('navigation.home') },
      { to: '/diagnostic', label: t('navigation.diagnostic') },
      { to: '/resultats', label: t('navigation.results') },
      { to: '/checklist', label: t('navigation.checklist') },
      { to: '/kit', label: t('navigation.kit') },
    ],
  },
  {
    id: 'learn',
    title: t('footer.columnLearn'),
    links: [
      { to: '/ressources', label: t('navigation.resources') },
      { to: '/videos', label: t('navigation.videos') },
      ...videos.value.map((video) => ({
        to: `/videos/${video.slug}`,
        label: video.title,
      })),
      { to: '/quiz', label: t('navigation.quiz') },
      { to: '/mises-en-situation', label: t('navigation.scenarios') },
      ...scenarios.value.map((scenario) => ({
        to: `/mises-en-situation/${scenario.id}`,
        label: scenario.title,
      })),
      { to: '/assistant-liens', label: t('contentLinks.title') },
    ],
  },
  {
    id: 'about',
    title: t('footer.columnAbout'),
    links: [
      { to: '/mentions-legales', label: t('footer.legal') },
      { to: '/politique-de-confidentialite', label: t('footer.privacy') },
      { to: '/declaration-accessibilite', label: t('footer.accessibility') },
      { to: '/support', label: t('footer.support') },
      { to: '/plan-du-site', label: t('siteMap.title') },
      { to: '/experimentation-utilisateurs', label: t('footer.giveFeedback') },
      { to: '/tableau-de-bord', label: t('footer.stats') },
    ],
  },
])

const totalPages = computed(() =>
  sections.value.reduce((total, section) => total + section.links.length, 0),
)
</script>

<template>
  <section class="page page--narrow">
    <div class="stack">
      <p class="eyebrow">{{ t('siteMap.eyebrow') }}</p>
      <h1>{{ t('siteMap.title') }}</h1>
      <p class="muted">{{ t('siteMap.intro', { count: totalPages }) }}</p>

      <nav
        v-for="section in sections"
        :key="section.id"
        class="panel stack"
        :aria-label="section.title"
      >
        <h2 class="section-title">{{ section.title }}</h2>
        <ul class="site-map-list">
          <li v-for="link in section.links" :key="link.to">
            <RouterLink :to="link.to">{{ link.label }}</RouterLink>
          </li>
        </ul>
      </nav>
    </div>
  </section>
</template>
