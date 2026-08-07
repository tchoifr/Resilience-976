# Resilience 976

Application web publique, mobile-first et sans compte. Elle permet de realiser un diagnostic de preparation, d'obtenir un score, un plan d'actions, une checklist, un kit d'urgence personnalise et un PDF.

Le coeur applicatif fonctionne cote navigateur avec `localStorage`. Un backend analytics Node.js optionnel permet de collecter des evenements minimises pour alimenter un tableau de bord d'impact.

## Prerequis

- Node.js 22.12 ou superieur
- npm

```bash
nvm use
npm ci
npm run dev
```

## Commandes

```bash
npm run dev              # serveur local Vue/Vite
npm run analytics:server # collecteur statistique local
npm run lint             # ESLint
npm run type-check       # TypeScript strict
npm run test:unit        # tests unitaires
npm run test:e2e         # tests fonctionnels Playwright
npm run build            # build production
npm run preview          # verifier dist
npm run quality          # lint + type-check + unit + build
```

## Architecture

```txt
src/                      application Vue 3 + TypeScript
src/data/                 contenus JSON versionnes
src/features/assessment/  diagnostic, scoring, recommandations, PDF
src/shared/analytics/     emission des evenements statistiques
server/                   backend analytics Node.js MVP
docs/                     documentation produit, technique, qualite et preuves
tests/                    tests unitaires et Playwright
```

## Confidentialite

Le MVP ne cree pas de compte. Les reponses, la progression, la checklist et la composition simplifiee du foyer sont conservees uniquement dans `localStorage` sur l'appareil.

Le backend analytics ne reçoit pas les reponses detaillees, le score individuel, le nom, l'adresse, l'email, le telephone ou une donnee medicale. Il stocke uniquement des evenements techniques minimises.

## Analytics et tableau de bord

Lancer le collecteur:

```bash
npm run analytics:server
```

Lancer le front:

```bash
npm run dev
```

En developpement, les evenements sont envoyes par defaut au collecteur local via `/api/events`. En production, l'analytics reste desactivee sauf si `VITE_ANALYTICS_ENABLED=true`.

Le tableau de bord est disponible sur:

```txt
/tableau-de-bord
```

Endpoints backend:

```txt
GET  /api/health
POST /api/events
GET  /api/dashboard
```

Le stockage local des evenements se fait dans:

```txt
server/data/events.jsonl
```

Ce dossier est ignore par git.

Documentation detaillee:

- `docs/technical/analytics-backend.md`
- `docs/product/analytics-plan.md`
- `docs/technical/deployment.md`

## Contenus

Les fichiers JSON dans `src/data` sont versionnes et valides par Zod au chargement. Les questions, actions, sources et quantites doivent etre relues par un referent metier avant publication officielle.

## Deploiement

Le front peut etre publie en hebergement statique. Les fichiers `public/_redirects`, `public/_headers` et `netlify.toml` couvrent le deploiement Netlify avec redirection SPA et headers de securite.

Si le tableau de bord doit afficher des donnees reelles, le collecteur Node doit etre deployee separement ou expose derriere `/api/*` avec HTTPS.
