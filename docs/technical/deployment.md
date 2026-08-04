# Deploiement statique

## Build

```bash
npm ci
npm run quality
npm run test:e2e
npm run build
npm run preview
```

## Netlify

- Build command: `npm run build`
- Publish directory: `dist`
- Node version: 22
- Redirection SPA: `public/_redirects` et `netlify.toml`
- Headers securite: `public/_headers` et `netlify.toml`

## Variables

```bash
VITE_APP_NAME=Resilience 976
VITE_ASSESSMENT_VERSION=1.0.0
VITE_PUBLIC_BASE_URL=https://exemple.fr
VITE_ANALYTICS_ENABLED=false
```

Aucune variable `VITE_` ne doit contenir de secret.

## Checklist preproduction

- Domaine et HTTPS actifs.
- Toutes les routes directes testees.
- PDF teste mobile et desktop.
- Contrastes et clavier testes.
- Sources et mentions legales validees.
- `npm audit --audit-level=critical` a 0 vulnerabilite.
- CSP testee dans le navigateur de production.
- Rollback identifie dans l'hebergeur.

## CI

Le workflow `.github/workflows/ci.yml` lance:

- `npm ci`
- `npm run quality`
- installation Chromium Playwright
- `npm run test:e2e`
- `npm audit --audit-level=critical`
