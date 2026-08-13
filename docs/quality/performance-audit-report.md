# Rapport performance et qualité (Lighthouse)

Date : 14 août 2026<br>
Outil : Lighthouse 13.4.1 (`npx lighthouse`), Chrome headless<br>
Statut : deux défauts trouvés et corrigés, mesures avant/après ci-dessous. À rejouer sur l'URL finale avant mise en production.

## Méthode

L'audit tourne sur le **build de production**, servi par `vite preview`, avec le
collecteur analytics joignable derrière `/api` — c'est-à-dire la même topologie
que le nginx du VPS.

```bash
npm run analytics:server
npm run build
npm run preview -- --port 4174

# Dans un autre terminal
npm run audit:lighthouse
```

`scripts/run-lighthouse.mjs` enchaîne les cinq pages suivies en mobile puis en
desktop, écrit les rapports HTML et JSON, et imprime le tableau ci-dessous.
Il accepte une URL et un dossier de sortie :

```bash
npm run audit:lighthouse -- https://domaine-final.fr ./lighthouse-report
```

Deux points de méthode qui changent les résultats :

- **Sans backend derrière `/api`, les mesures sont fausses.** L'audit du
  12 août tournait sur `vite preview` sans collecteur : les appels `/api/events`
  répondaient 403 et le score « Bonnes pratiques » restait bloqué à 96 pour une
  raison qui n'existe pas en production. `vite.config.ts` proxifie désormais
  `/api` en mode `preview` comme il le faisait déjà en mode `dev`.
- **La mesure mobile est bruitée.** Sur l'accueil, cinq exécutions successives
  donnent une performance entre 94 et 96. Les écarts inférieurs à 3 points ne
  doivent pas être interprétés.

## Résultats mesurés

### Mobile (émulation Lighthouse par défaut, 412×823, 4G lent, CPU ÷4)

| Page | Performance | Accessibilité | Bonnes pratiques | SEO | LCP | TBT | CLS |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Accueil | 95 | 100 | 100 | 100 | 2,6 s | 170 ms | 0 |
| Diagnostic | 97 | 100 | 100 | 100 | 2,4 s | 90 ms | 0 |
| Ressources | 97 | 100 | 100 | 100 | 2,4 s | 50 ms | 0 |
| Tableau de bord | 97 | 100 | 100 | 100 | 2,4 s | 80 ms | 0 |
| Expérimentation utilisateurs | 99 | 100 | 100 | 100 | 1,8 s | 40 ms | 0 |

### Desktop (`--preset=desktop`)

| Page | Performance | Accessibilité | Bonnes pratiques | SEO | LCP | TBT | CLS |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Accueil | 100 | 100 | 100 | 100 | 0,6 s | 0 ms | 0 |
| Diagnostic | 100 | 100 | 100 | 100 | 0,6 s | 0 ms | 0 |
| Ressources | 100 | 100 | 100 | 100 | 0,6 s | 0 ms | 0 |
| Tableau de bord | 100 | 100 | 100 | 100 | 0,6 s | 0 ms | 0 |
| Expérimentation utilisateurs | 100 | 100 | 100 | 100 | 0,5 s | 0 ms | 0 |

### Comparaison avec la mesure du 12 août (mobile)

| Page | Perf. avant | Perf. après | A11y | Bonnes pratiques | SEO |
| --- | ---: | ---: | --- | --- | --- |
| Accueil | 95 | 95 | 100 → 100 | 96 → 100 | 100 → 100 |
| Diagnostic | 95 | 97 | 96 → 100 | 96 → 100 | 92 → 100 |
| Ressources | 95 | 97 | 96 → 100 | 96 → 100 | 92 → 100 |
| Tableau de bord | 80 | 97 | 96 → 100 | 96 → 100 | 92 → 100 |
| Expérimentation | 86 | 99 | 96 → 100 | 96 → 100 | 92 → 100 |

Les gains d'accessibilité et de SEO viennent des correctifs du 12 août, qui
n'avaient été mesurés que sur l'accueil. Le gain « Bonnes pratiques » vient de
la correction de méthode décrite plus haut. Les gains de performance du tableau
de bord et de l'expérimentation viennent des correctifs ci-dessous.

## Défauts trouvés et corrigés

### 1. Décalage de mise en page sur toutes les pages (CLS 0,0996)

Lighthouse signalait un décalage unique, de score identique au dix-millième sur
toutes les pages, attribué à `<footer class="app-footer">`.

Cause : les vues sont chargées en différé. Tant que la vue n'est pas arrivée, la
coquille de l'application — en-tête et pied de page — tient dans l'écran, donc le
pied de page est visible ; quand le contenu arrive, il est chassé vers le bas.
`.app-main` réservait `calc(100vh - 164px)`, une hauteur de pied de page supposée
qui ne suffisait pas.

Correction : `.app-main { min-height: 100vh }`, ce qui garantit que le pied de
page démarre sous la ligne de flottaison quelle que soit la hauteur de l'en-tête.

Résultat : CLS 0,0996 → **0** sur toutes les pages. Le seuil de Lighthouse étant
0,1, le site passait à 4 millièmes de la zone rouge.

### 2. Décalage majeur du tableau de bord en desktop (CLS 0,272)

Le panneau « Estimation d'atteinte de l'objectif » était rendu sous condition
(`v-if="stats"`) : il apparaissait à la réponse du collecteur et repoussait tout
le tableau de bord de 380 px. En mobile le décalage passait inaperçu (colonne
unique, panneau sous la ligne de flottaison), d'où un CLS à 0 côté mobile et
0,272 côté desktop — un cas que la seule mesure mobile ne voyait pas.

Correction : le panneau est rendu dès le départ, avec un message d'attente puis
un message d'indisponibilité si le collecteur ne répond pas.

Résultat : tableau de bord desktop, performance 86 → **100**, CLS 0,272 → **0**.

## Ce qui reste à faire

- **Rejouer sur l'URL finale.** Les mesures ci-dessus sont locales : latence
  réseau nulle, pas de TLS, pas de CDN. `VITE_PUBLIC_BASE_URL` doit être défini
  au moment du build, sinon `sitemap.xml` et `robots.txt` gardent le placeholder
  `https://exemple.fr`.
- **LCP mobile à 2,6 s sur l'accueil.** Pour 200 Ko transférés au total,
  Lighthouse ne propose aucune optimisation : la valeur est essentiellement le
  plancher imposé par le bridage 4G lent + CPU ÷4. Un gain supplémentaire
  passerait par un préchargement de l'image du héros, à mesurer avant de
  l'introduire.
- **Appareils réels.** Android et iPhone, réseau mobile réel, téléchargement des
  PDF.
