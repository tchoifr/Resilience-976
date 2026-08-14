# Deploiement

## Build

```bash
npm ci
npm run quality
npm run test:e2e
npm run build
npm run preview
```

## VPS (nginx) - hebergement cible

Le site et le backend analytics sont destines a tourner ensemble sur un
VPS, derriere nginx en reverse proxy. Fichiers prets dans `deploy/` :

| Fichier | Role |
| --- | --- |
| `deploy/nginx.conf` | Sert `dist/` et proxifie `/api/*` vers le backend en local (`127.0.0.1:8787`) |
| `deploy/resilience-976-analytics.service` | Service systemd du backend (`server/analytics-server.mjs`), redemarrage auto |
| `deploy/analytics.env.example` | Modele de variables pour le service (a copier vers `/etc/resilience-976/analytics.env`) |
| `deploy/deploy.sh` | `git pull` + `npm ci` + `npm run build` + redemarrage service/nginx. Le fichier n'a pas le bit d'execution : le lancer par `bash deploy/deploy.sh` |

Etapes d'installation initiale sur le VPS :

1. Cloner le repo dans `/var/www/resilience-976`.
2. `cp deploy/analytics.env.example /etc/resilience-976/analytics.env` puis
   remplacer `DOMAINE_A_REMPLACER` par le vrai domaine.
3. `cp deploy/resilience-976-analytics.service /etc/systemd/system/` puis
   `systemctl daemon-reload && systemctl enable --now resilience-976-analytics`.
4. `cp deploy/nginx.conf /etc/nginx/sites-available/resilience-976`, remplacer
   `DOMAINE_A_REMPLACER`, activer le site (`sites-enabled`), `nginx -t`.
5. `certbot --nginx -d DOMAINE_A_REMPLACER` pour le certificat TLS (ajoute le
   bloc HTTPS + redirection automatiquement).
6. `npm ci && npm run build` (utilise `.env.production`, deja versionne : les
   endpoints `/api/*` pointent en meme-origine, plus besoin d'URL externe).
7. Renseigner `ANALYTICS_READ_TOKEN` dans `/etc/resilience-976/analytics.env`
   (`openssl rand -hex 32`) et creer le fichier de mots de passe :
   `htpasswd -c /etc/nginx/.htpasswd-resilience <utilisateur>`
   (paquet `apache2-utils`). Sans ces deux elements, le tableau de bord, le
   graphe des visiteurs et leurs profils repondent **sans authentification**.
8. Pour les mises a jour ensuite : `bash deploy/deploy.sh`.

### La configuration nginx du serveur diverge du depot, volontairement

Une fois `certbot` passe, la configuration active porte le bloc TLS et la
redirection HTTP vers HTTPS, absents de `deploy/nginx.conf`. **La remplacer
par celle du depot casserait le HTTPS.** Les evolutions du depot doivent y
etre reportees a la main : blocs `auth_basic`, en-tetes `Cross-Origin-*`,
directive `Strict-Transport-Security`. Toujours sauvegarder avant, valider
par `nginx -t`, et ne recharger qu'ensuite.

Rappel nginx : un bloc `location` qui declare un seul `add_header` perd tous
ceux du niveau superieur. Les blocs proteges redeclarent donc l'ensemble des
en-tetes de securite.

Comme le front et le backend sont sur le meme domaine, `VITE_ANALYTICS_ENABLED`
et les `VITE_*_ENDPOINT` n'ont plus besoin d'etre reconfigures a chaque
build : `.env.production` les fixe une fois pour toutes en chemins relatifs.

## Netlify (historique)

Le demonstrateur a d'abord tourne sur Netlify (front seul, backend sur
Render). Cette configuration reste documentee au cas ou :

- Build command: `npm run build`
- Publish directory: `dist`
- Node version: 22
- Redirection SPA: `public/_redirects` et `netlify.toml`
- Headers securite: `public/_headers` et `netlify.toml`
- Le CSP de `netlify.toml` autorise `connect-src` vers
  `https://resilience-976-analytics.onrender.com` (backend separe, cross-origin) ;
  sur le VPS ce n'est plus necessaire, tout est meme-origine.

## Variables

```bash
VITE_APP_NAME=Resilience 976
VITE_ASSESSMENT_VERSION=1.0.0
VITE_PUBLIC_BASE_URL=https://exemple.fr
```

Voir `.env.production` pour les variables `VITE_ANALYTICS_*` /
`VITE_*_ENDPOINT` (deja renseignees en chemins relatifs pour le VPS).
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

Pas encore de workflow GitHub Actions dans ce repo (`.github/workflows/`
n'existe pas). A creer si besoin ; il devrait a minima lancer :

- `npm ci`
- `npm run quality`
- installation Chromium Playwright
- `npm run test:e2e`
- `npm audit --audit-level=critical`

## Collecteur statistique optionnel

Le tableau de bord d'impact utilise le collecteur Node seulement si l'analytics est active.

```bash
npm run analytics:server
```

Variables serveur utiles:

```bash
HOST=127.0.0.1
PORT=8787
ANALYTICS_DATA_FILE=server/data/events.jsonl
RESILIENCE_DATABASE_FILE=server/data/resilience.sqlite
ANALYTICS_ALLOWED_ORIGINS=https://domaine-final.fr
```

En production, exposer le collecteur derriere HTTPS sur `/api/*` ou configurer les endpoints publics `VITE_ANALYTICS_ENDPOINT`, `VITE_DASHBOARD_ENDPOINT` et `VITE_FEEDBACK_ENDPOINT`.
