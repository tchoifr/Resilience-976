import { createRouter, createWebHistory } from 'vue-router'

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
      path: '/mentions-legales',
      component: () => import('@/views/LegalView.vue'),
      meta: {
        seoKey: 'legal',
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
  const seoKey = typeof route.meta.seoKey === 'string' ? route.meta.seoKey : 'home'

  updateHead({
    title: translate(`seo.${seoKey}.title`),
    description: translate(`seo.${seoKey}.description`),
    path: route.path,
  })
}

router.afterEach(() => {
  updateRouteHead()
})

export default router
