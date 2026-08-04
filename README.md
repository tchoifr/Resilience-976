# Resilience 976

Application web publique, mobile-first, sans compte et sans base de donnees. Elle permet de realiser un diagnostic de preparation, d'obtenir un score, un plan d'actions, une checklist, un kit d'urgence personnalise et un PDF.

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
npm run dev          # serveur local
npm run lint         # ESLint
npm run type-check   # TypeScript strict
npm run test:unit    # tests unitaires
npm run test:e2e     # tests fonctionnels Playwright
npm run build        # build production
npm run preview      # verifier dist
npm run quality      # lint + type-check + unit + build
```

## Confidentialite

Le MVP ne cree pas de compte et n'utilise pas de backend. Les reponses, la progression, la checklist et la composition simplifiee du foyer sont conservees uniquement dans `localStorage` sur l'appareil.

## Contenus

Les fichiers JSON dans `src/data` sont versionnes et valides par Zod au chargement. Les questions, actions, sources et quantites doivent etre relues par un referent metier avant publication officielle.

## Deploiement

Le projet est prevu pour un hebergement statique. Les fichiers `public/_redirects`, `public/_headers` et `netlify.toml` couvrent le deploiement Netlify avec redirection SPA et headers de securite.
