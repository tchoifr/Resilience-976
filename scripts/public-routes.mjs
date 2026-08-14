// Source unique des routes publiques du site.
//
// Le sitemap et la campagne Lighthouse s'appuient tous deux dessus : deux
// listes tenues separement finiraient par diverger, et le bordereau annoncerait
// une couverture qui n'est plus la vraie.
//
// Les vues du tableau de bord n'y figurent pas : ce sont des pages
// d'exploitation, desormais protegees par authentification.
import { readFileSync } from 'node:fs'

const readJson = (file) => JSON.parse(readFileSync(file, 'utf8'))

export function getPublicRoutes() {
  const videos = readJson('src/data/videos.json')
  const scenarios = readJson('src/data/scenarios.json')

  const routes = [
    { name: 'accueil', path: '/' },
    { name: 'diagnostic', path: '/diagnostic' },
    { name: 'resultats', path: '/resultats' },
    { name: 'checklist', path: '/checklist' },
    { name: 'kit', path: '/kit' },
    { name: 'ressources', path: '/ressources' },
    { name: 'videos', path: '/videos' },
    ...videos.map((video) => ({
      name: `video-${video.slug}`,
      path: `/videos/${video.slug}`,
    })),
    { name: 'quiz', path: '/quiz' },
    { name: 'mises-en-situation', path: '/mises-en-situation' },
    ...scenarios.map((scenario) => ({
      name: `scenario-${scenario.id}`,
      path: `/mises-en-situation/${scenario.id}`,
    })),
    { name: 'assistant-liens', path: '/assistant-liens' },
    { name: 'experimentation', path: '/experimentation-utilisateurs' },
    { name: 'mentions-legales', path: '/mentions-legales' },
    { name: 'confidentialite', path: '/politique-de-confidentialite' },
    { name: 'accessibilite', path: '/declaration-accessibilite' },
    { name: 'support', path: '/support' },
    { name: 'plan-du-site', path: '/plan-du-site' },
  ]

  const paths = routes.map((route) => route.path)
  const duplicates = paths.filter((path, index) => paths.indexOf(path) !== index)

  if (duplicates.length > 0) {
    throw new Error(`Routes en double : ${duplicates.join(', ')}`)
  }

  return routes
}

// Sous-ensemble representatif : un type d'ecran par famille, pour une passe
// rapide. Les pages de capsules et de scenarios sont bati sur un meme gabarit,
// une seule suffit a en juger.
export const SAMPLE_NAMES = [
  'accueil',
  'diagnostic',
  'resultats',
  'ressources',
  'videos',
  'quiz',
  'experimentation',
  'plan-du-site',
]

export function getSampleRoutes() {
  return getPublicRoutes().filter((route) => SAMPLE_NAMES.includes(route.name))
}
