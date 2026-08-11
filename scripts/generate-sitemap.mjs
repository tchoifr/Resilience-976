import { writeFileSync } from 'node:fs'

const baseUrl = (process.env.VITE_PUBLIC_BASE_URL ?? 'https://exemple.fr').replace(/\/$/, '')
const routes = ['/', '/ressources', '/mentions-legales']

const urls = routes
  .map((route) => {
    return `  <url>
    <loc>${baseUrl}${route === '/' ? '' : route}</loc>
  </url>`
  })
  .join('\n')

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`

writeFileSync('public/sitemap.xml', sitemap)

// robots.txt's Sitemap directive must be an absolute URL per spec (a
// relative one fails Lighthouse's SEO audit), so it's generated here too
// rather than kept as a static file, to stay in sync with the same baseUrl.
const robots = `User-agent: *
Allow: /

Sitemap: ${baseUrl}/sitemap.xml
`

writeFileSync('public/robots.txt', robots)

// llms.txt (https://llmstxt.org/): a curated, LLM-readable summary of the
// site. Generated here too so its links share the same real baseUrl rather
// than a relative path meaningless outside page context.
const llmsTxt = `# Resilience 976 - Mon Plan Resilience

> Outil de sensibilisation et de preparation aux risques naturels a Mayotte (cyclone, fortes pluies et inondation, seisme, mouvement de terrain). Diagnostic gratuit, sans compte : reponses et progression conservees uniquement dans le navigateur, aucune donnee nominative collectee. Ne remplace ni les alertes officielles, ni les consignes des autorites competentes.

Le service propose un diagnostic personnalise, un plan d'actions, une checklist, un kit d'urgence adapte a la composition du foyer, des micro-formations video, un quiz et des mises en situation. Les contenus (questions, actions, quantites, sources) restent a valider par un referent metier avant publication officielle.

## Parcours principal

- [Accueil](${baseUrl}/): presentation du service et du parcours en six etapes.
- [Diagnostic](${baseUrl}/diagnostic): questionnaire de preparation, sans compte.
- [Resultats](${baseUrl}/resultats): score par domaine, priorites immediates et plan d'actions.
- [Checklist](${baseUrl}/checklist): suivi des actions recommandees et actions personnelles.
- [Kit d'urgence](${baseUrl}/kit): liste adaptee a la composition du foyer.
- [Ressources](${baseUrl}/ressources): fiches pratiques et sources officielles.

## Formations et mise en pratique

- [Videos](${baseUrl}/videos): micro-formations courtes par risque.
- [Quiz](${baseUrl}/quiz): quiz interactif avec correction expliquee et attestation.
- [Mises en situation](${baseUrl}/mises-en-situation): scenarios de decision avec debrief.

## Confidentialite et methode

- [Politique de confidentialite](${baseUrl}/politique-de-confidentialite): quelles donnees sont conservees, ou, pourquoi.
- [Mentions legales](${baseUrl}/mentions-legales): nature du service, effacement des donnees locales.
- [Declaration d'accessibilite](${baseUrl}/declaration-accessibilite): etat de conformite RGAA.
- [Support](${baseUrl}/support): signaler une erreur ou proposer une correction.

## Optional

- [Tableau de bord](${baseUrl}/tableau-de-bord): indicateurs de sensibilisation agreges et anonymes.
- [Priorites d'action](${baseUrl}/tableau-de-bord/priorites): synthese des points les plus faibles, tous modules confondus.
- [Experimentation utilisateurs](${baseUrl}/experimentation-utilisateurs): questionnaire anonymise de test utilisateur.
`

writeFileSync('public/llms.txt', llmsTxt)
