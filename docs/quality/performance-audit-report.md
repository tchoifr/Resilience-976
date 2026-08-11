# Rapport performance et qualite

Date: 12 aout 2026<br>
Statut: constats corriges (images hero, contraste, robots.txt), mesures avant/apres ci-dessous. A rejouer sur l'URL finale avant mise en production, notamment pour les appels `/api/*` qui dependent du vrai backend et pour `VITE_PUBLIC_BASE_URL` (sitemap/robots.txt utilisent encore le placeholder `https://exemple.fr` en local).

## Commandes projet

```bash
npm run quality
npm run test:e2e
npm audit --audit-level=critical
```

## Lighthouse a produire

Executer Lighthouse sur l'URL finale ou une preview stable:

- `/`;
- `/diagnostic`;
- `/ressources`;
- `/tableau-de-bord`;
- `/experimentation-utilisateurs`.

Conserver pour chaque page:

- performance;
- accessibilite;
- bonnes pratiques;
- SEO;
- capture ou export HTML/JSON du rapport;
- date, navigateur, viewport et URL testee.

## Resultats mesures (local, build production, emulation mobile Lighthouse par defaut)

| Page                          | Performance | Accessibilite | Bonnes pratiques | SEO | LCP    | TBT    | Statut |
| ------------------------------ | ----------: | -------------: | ----------------: | --: | -----: | -----: | ------ |
| Accueil                       |          62 |             96 |                96 |  92 | 11.9 s | 430 ms | Avant  |
| Accueil                       |      **95** |         **100** |                96 | **100** | **2.4 s** | **60 ms** | Apres  |
| Diagnostic                    |          95 |             96 |                96 |  92 |  2.3 s |  70 ms | OK     |
| Ressources                    |          95 |             96 |                96 |  92 |  2.2 s | 100 ms | OK     |
| Tableau de bord               |          80 |             96 |                96 |  92 |  2.7 s | 500 ms | OK     |
| Experimentation utilisateurs  |          86 |             96 |                96 |  92 |  2.3 s | 380 ms | OK     |

`npm run quality` (lint, type-check, tests unitaires, build) : passe.<br>
`npm audit --audit-level=critical` : 0 vulnerabilite.

## Constats et corrections

1. **Corrige — images hero surdimensionnees.** `public/images/{Mobile,Tablet,desktop}.png` et leurs variantes theme sombre pesaient chacune entre 1,8 Mo et 2,6 Mo (PNG non compresses), cause quasi exclusive du score Performance de l'accueil (62/100, LCP 11,9 s — Lighthouse en emulation mobile chargeait `Mobile.png`, 1,98 Mo, comme element LCP). Converties en WebP qualite 82 (`sharp-cli`) : 79-147 Ko par fichier, soit environ -95%. Verification visuelle faite (pas d'artefact de compression visible). Resultat : Performance 62 -> 95, LCP 11,9 s -> 2,4 s.
2. **Corrige — contraste insuffisant (accessibilite).** Le teal `#00a1ad` en texte sur fond fonce n'atteignait pas 4.5:1 (WCAG AA) sur deux elements :
   - `.retro-id-badge__value` (ID visiteur, accueil) : ratio 3.53 sur fond `#004250`.
   - `.public-warning-banner strong` (bandeau "Outil de sensibilisation", present sur toutes les pages) : ratio 3.97 sur fond `#00394b`.
   Nouveau token `--color-teal-on-dark: #1cb8c4` (meme teinte, eclaircie) applique aux deux, verifie a 5.16:1 et 4.59:1. Resultat : Accessibilite 96 -> 100.
3. **Corrige — SEO, robots.txt invalide.** `public/robots.txt` declarait `Sitemap: /sitemap.xml` en URL relative ; la specification exige une URL absolue. `scripts/generate-sitemap.mjs` genere maintenant aussi `robots.txt` avec `${VITE_PUBLIC_BASE_URL}/sitemap.xml`, memes source de verite que le sitemap. Resultat : SEO 92 -> 100.
4. **A rejouer en conditions reelles.** Une erreur console 403 sur `/api/events` est apparue en local (pas de backend derriere `vite preview`) — Bonnes pratiques reste a 96 a cause de ca ; probablement un artefact de test (aucun backend analytics n'ecoute derriere le preview), a revalider une fois le backend accessible depuis l'URL testee. `VITE_PUBLIC_BASE_URL` doit aussi etre defini au moment du build de production (sinon sitemap.xml et robots.txt utilisent le placeholder `https://exemple.fr`).

## Controles manuels restants

- lecteur d'ecran NVDA ou VoiceOver;
- mobile Android reel;
- iPhone Safari reel;
- telechargement PDF sur mobile;
- lisibilite des exports PDF imprimes.
