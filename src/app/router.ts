import { createRouter, createWebHistory } from 'vue-router'

import { trackEvent } from '@/shared/analytics/analytics.service'
import { translate } from '@/shared/i18n/i18n.service'
import { updateHead } from '@/shared/seo/head.service'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: () => import('@/views/HomeView.vue'),
      meta: {
        seoKey: 'home',
      },
    },
    {
      path: '/diagnostic',
      component: () => import('@/views/DiagnosticView.vue'),
      meta: {
        seoKey: 'diagnostic',
      },
    },
    {
      path: '/resultats',
      component: () => import('@/views/ResultsView.vue'),
      meta: {
        seoKey: 'results',
      },
    },
    {
      path: '/checklist',
      component: () => import('@/views/ChecklistView.vue'),
      meta: {
        seoKey: 'checklist',
      },
    },
    {
      path: '/kit',
      component: () => import('@/views/KitView.vue'),
      meta: {
        seoKey: 'kit',
      },
    },
    {
      path: '/ressources',
      component: () => import('@/views/ResourcesView.vue'),
      meta: {
        seoKey: 'resources',
      },
    },
    {
      path: '/videos',
      component: () => import('@/views/VideosView.vue'),
      meta: {
        seoKey: 'videos',
      },
    },
    {
      path: '/videos/:slug',
      component: () => import('@/views/VideoDetailView.vue'),
      meta: {
        seoKey: 'videoDetail',
      },
    },
    {
      path: '/quiz',
      component: () => import('@/views/QuizView.vue'),
      meta: {
        seoKey: 'quiz',
      },
    },
    {
      path: '/mises-en-situation',
      component: () => import('@/views/ScenariosView.vue'),
      meta: {
        seoKey: 'scenarios',
      },
    },
    {
      path: '/mises-en-situation/:id',
      component: () => import('@/views/ScenarioPlayView.vue'),
      meta: {
        seoKey: 'scenarioPlay',
      },
    },
    {
      path: '/tableau-de-bord',
      component: () => import('@/views/DashboardView.vue'),
      meta: {
        seoKey: 'dashboard',
      },
    },
    {
      path: '/experimentation-utilisateurs',
      component: () => import('@/views/UserExperimentView.vue'),
      meta: {
        seoKey: 'experiment',
      },
    },
    {
      path: '/tableau-de-bord/experimentation',
      component: () => import('@/views/ExperimentStatsView.vue'),
      meta: {
        seoKey: 'experimentStats',
      },
    },
    {
      path: '/tableau-de-bord/diagnostics',
      component: () => import('@/views/DiagnosticStatsView.vue'),
      meta: {
        seoKey: 'diagnosticStats',
      },
    },
    {
      path: '/tableau-de-bord/quiz',
      component: () => import('@/views/QuizStatsView.vue'),
      meta: {
        seoKey: 'quizStats',
      },
    },
    {
      path: '/tableau-de-bord/formations',
      component: () => import('@/views/VideoStatsView.vue'),
      meta: {
        seoKey: 'videoStats',
      },
    },
    {
      path: '/tableau-de-bord/mises-en-situation',
      component: () => import('@/views/ScenarioStatsView.vue'),
      meta: {
        seoKey: 'scenarioStats',
      },
    },
    {
      path: '/tableau-de-bord/kit',
      component: () => import('@/views/KitStatsView.vue'),
      meta: {
        seoKey: 'kitStats',
      },
    },
    {
      path: '/tableau-de-bord/graphe-visiteurs',
      component: () => import('@/views/VisitorGraphView.vue'),
      meta: {
        seoKey: 'visitorGraph',
      },
    },
    {
      path: '/tableau-de-bord/visiteur/:id?',
      component: () => import('@/views/VisitorProfileView.vue'),
      meta: {
        seoKey: 'visitorProfile',
      },
    },
    {
      path: '/mentions-legales',
      component: () => import('@/views/LegalView.vue'),
      meta: {
        seoKey: 'legal',
      },
    },
    {
      path: '/politique-de-confidentialite',
      component: () => import('@/views/PrivacyView.vue'),
      meta: {
        seoKey: 'privacy',
      },
    },
    {
      path: '/declaration-accessibilite',
      component: () => import('@/views/AccessibilityView.vue'),
      meta: {
        seoKey: 'accessibility',
      },
    },
    {
      path: '/support',
      component: () => import('@/views/SupportView.vue'),
      meta: {
        seoKey: 'support',
      },
    },
    {
      path: '/:pathMatch(.*)*',
      component: () => import('@/views/NotFoundView.vue'),
      meta: {
        seoKey: 'notFound',
      },
    },
  ],
  scrollBehavior: () => ({ top: 0 }),
})

export function updateRouteHead(): void {
  const route = router.currentRoute.value
  const seoKey =
    typeof route.meta.seoKey === 'string' ? route.meta.seoKey : 'home'

  updateHead({
    title: translate(`seo.${seoKey}.title`),
    description: translate(`seo.${seoKey}.description`),
    path: route.path,
  })
}

router.afterEach(() => {
  updateRouteHead()
  trackEvent('page_view')
})

export default router
