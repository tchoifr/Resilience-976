# Rapport performance et qualité (Lighthouse)

Date : 14 août 2026<br>
Outil : Lighthouse 13.4.1 (`npx lighthouse`), Chrome headless<br>
Portée : **les 31 routes publiques du site**, en mobile et en desktop, soit
62 mesures<br>
Statut : deux défauts trouvés et corrigés. Campagne locale ; à rejouer sur
`https://resilience-976.fr`.

## Résultats

### Mobile (émulation Lighthouse par défaut : 412 × 823, 4G lent, CPU ÷4)

| Catégorie | Minimum | Médiane | Maximum | Pages à 100 |
| --- | ---: | ---: | ---: | ---: |
| Performance | 96 | 97 | 99 | 0/31 |
| Accessibilité | **100** | 100 | 100 | **31/31** |
| Bonnes pratiques | 96 | 100 | 100 | 29/31 |
| SEO | **100** | 100 | 100 | **31/31** |

LCP de 1,8 s à 2,6 s, médiane 2,4 s. **Aucune page au-dessus du seuil CLS**
(0,1) : 30 pages sur 31 sont exactement à 0, la trente-et-unième
(`/assistant-liens`) à 0,012.

### Desktop (`--preset=desktop`)

| Catégorie | Minimum | Médiane | Maximum | Pages à 100 |
| --- | ---: | ---: | ---: | ---: |
| Performance | **100** | 100 | 100 | **31/31** |
| Accessibilité | **100** | 100 | 100 | **31/31** |
| Bonnes pratiques | 96 | 100 | 100 | 29/31 |
| SEO | **100** | 100 | 100 | **31/31** |

LCP de 0,4 s à 0,6 s, TBT nul sur les 31 pages, même profil CLS qu'en mobile
(30 pages à 0, `/assistant-liens` à 0,007).

### Les quatre mesures en dessous de 100

`/videos` et `/videos/preparer-son-logement`, dans les deux profils, à **96 en
bonnes pratiques**. L'audit en cause est `inspector-issues`, et son détail
tient en une ligne : un **cookie tiers** posé par le serveur qui héberge la
vidéo DREAL.

```txt
Cookie → https://webissimo.developpement-durable.gouv.fr/IMG/mp4/dreal_…mp4
```

Rien à corriger côté produit. La seule façon de passer ces quatre mesures à 100
serait d'héberger la vidéo nous-mêmes, ce qui déplacerait le problème vers la
bande passante du VPS.

### Page la plus lente

`/videos/preparer-son-logement` en mobile : performance 96, LCP 2,6 s. C'est la
seule page qui charge un fichier vidéo.

## Méthode

L'audit tourne sur le **build de production**, servi par `vite preview`, avec
le collecteur analytics joignable derrière `/api` — c'est-à-dire la même
topologie que le nginx du VPS.

```bash
npm run analytics:server
npm run build
npm run preview -- --port 4174

# Dans un autre terminal
npm run audit:lighthouse
```

`scripts/run-lighthouse.mjs` enchaîne les 31 routes publiques en mobile puis en
desktop, écrit un rapport HTML et un rapport JSON par page et par profil, et
imprime la synthèse. `--sample` limite la passe à huit pages, un écran par
famille, pour une vérification rapide pendant le développement. Le script
accepte aussi une URL et un dossier de sortie :

```bash
npm run audit:lighthouse -- https://resilience-976.fr ./lighthouse-report
```

La liste des routes vient de `scripts/public-routes.mjs`, **partagée avec le
générateur de `sitemap.xml`** : deux listes tenues séparément finiraient par
diverger, et le rapport annoncerait une couverture qui n'est plus la vraie.

Les rapports bruts ne sont pas versionnés — environ 650 Ko par page et par
profil, 81 Mo pour la campagne complète. `lighthouse-report/` est dans
`.gitignore` ; c'est là que la dernière campagne a été déposée, un fichier
`mobile-<page>.report.html` et `desktop-<page>.report.html` par route.

## Quatre pièges de mesure, tous rencontrés

Ils sont consignés parce qu'aucun ne se voit dans les scores : à chaque fois,
Lighthouse rend un chiffre parfaitement plausible et parfaitement faux.

**Une requête dont le corps n'est jamais lu.** Les six points d'envoi vers le
collecteur postaient sans lire la réponse. Or une requête dont le corps n'est
pas consommé reste ouverte du point de vue de Chrome : `loadingFinished` n'est
jamais émis. Le navigateur s'en accommode, mais tout ce qui attend un réseau au
repos attend pour rien — Lighthouse patientait jusqu'à son plafond de 45 s puis
rendait ses mesures avec **« The page loaded too slowly to finish within the
time limit. Results may be incomplete. »**, sur les 62 rapports sans exception.

Les données de trace disaient pourtant l'inverse : page peinte en 225 ms,
aucune tâche de plus de 50 ms, 133 ms de calcul cumulé — et une trace de
45 017 ms. Une seule requête sur dix était marquée `finished: false`. Une sonde
sur quatre variantes du même appel a isolé la cause : c'est la lecture du
corps qui compte, pas `keepalive`, conservé pour que l'envoi survive à la
navigation sortante.

| | avant | après |
| --- | ---: | ---: |
| Avertissements | 1 par rapport | **aucun** |
| Durée de la mesure | 53 078 ms | **6 388 ms** |
| Fin de trace | 45 017 ms | **2 547 ms** |
| Requêtes non closes | 1 | **aucune** |

Les scores, eux, n'ont pas bougé — ce qui est le plus instructif : un rapport
peut annoncer 97 en performance et se déclarer incomplet dans la même page.

**Sans backend derrière `/api`.** Les appels échouent, la console enregistre
des erreurs, et « Bonnes pratiques » plafonne à 96 pour une raison qui n'existe
pas en production. C'était le cas de l'audit du 12 août, qui tournait sur
`vite preview` sans collecteur. `vite.config.ts` proxifie désormais `/api` en
mode `preview` comme il le faisait déjà en mode `dev`.

**Avec un collecteur qui n'autorise pas l'origine testée.** Même effet, cause
différente : le serveur répond `403 origin_not_allowed` sur `/api/events`, la
console enregistre l'erreur, et les 31 pages tombent à 96 — c'est exactement ce
qu'a produit la première campagne complète. Vérifier que
`ANALYTICS_ALLOWED_ORIGINS` contient le port servi (4174 ici, pas seulement
4180).

**Sur un serveur statique sans compression.** `scripts/serve-audit.mjs`, écrit
pour le scan ZAP, ne compresse pas : 432 Ko transférés dont 386 Ko de script,
là où `vite preview` et nginx en envoient 189 Ko sur l'accueil. La performance
mobile tombe alors à **83** au lieu de 97 sur les mêmes pages. Ce serveur porte
désormais un avertissement en tête de fichier.

Dernier point de méthode : **la mesure mobile est bruitée**. Sur l'accueil,
cinq exécutions successives donnent une performance entre 94 et 97. Les écarts
inférieurs à 3 points ne doivent pas être interprétés.

## Défauts trouvés et corrigés

### 1. Décalage de mise en page sur toutes les pages (CLS 0,0996)

Lighthouse signalait un décalage unique, de score identique au dix-millième sur
toutes les pages, attribué à `<footer class="app-footer">`.

Cause : les vues sont chargées en différé. Tant que la vue n'est pas arrivée,
la coquille de l'application — en-tête et pied de page — tient dans l'écran,
donc le pied de page est visible ; quand le contenu arrive, il est chassé vers
le bas. `.app-main` réservait `calc(100vh - 164px)`, une hauteur de pied de
page supposée qui ne suffisait pas.

Correction : `.app-main { min-height: 100vh }`, ce qui garantit que le pied de
page démarre sous la ligne de flottaison quelle que soit la hauteur de
l'en-tête.

Résultat : CLS 0,0996 → **0**. Le seuil de Lighthouse étant 0,1, le site
passait à quatre millièmes de la zone rouge.

### 2. Décalage majeur du tableau de bord en desktop (CLS 0,272)

Le panneau « Estimation d'atteinte de l'objectif » était rendu sous condition
(`v-if="stats"`) : il apparaissait à la réponse du collecteur et repoussait
tout le tableau de bord de 380 px. En mobile le décalage passait inaperçu —
colonne unique, panneau sous la ligne de flottaison — d'où un CLS à 0 côté
mobile et 0,272 côté desktop. Un cas que la seule mesure mobile ne voyait pas.

Correction : le panneau est rendu dès le départ, avec un message d'attente puis
un message d'indisponibilité si le collecteur ne répond pas.

Résultat : tableau de bord desktop, performance 86 → **100**, CLS 0,272 → **0**.

## Comparaison avec la mesure du 12 août (mobile)

L'audit du 12 août ne couvrait que cinq pages, sur un `vite preview` sans
collecteur.

| Page | Perf. avant | Perf. après | A11y | Bonnes pratiques | SEO |
| --- | ---: | ---: | --- | --- | --- |
| Accueil | 95 | 97 | 100 → 100 | 96 → 100 | 100 → 100 |
| Diagnostic | 95 | 97 | 96 → 100 | 96 → 100 | 92 → 100 |
| Ressources | 95 | 97 | 96 → 100 | 96 → 100 | 92 → 100 |
| Expérimentation | 86 | 99 | 96 → 100 | 96 → 100 | 92 → 100 |

La cinquième page mesurée le 12 août, le **tableau de bord**, ne figure plus
dans la campagne : c'est une page d'exploitation, protégée par authentification
depuis le 14 août, et `scripts/public-routes.mjs` l'exclut du périmètre public.
Sa dernière mesure connue, après correction du décalage, est 100 en desktop
contre 86 avant.

Les gains d'accessibilité et de SEO viennent des correctifs du 12 août, qui
n'avaient été mesurés que sur l'accueil. Le gain « Bonnes pratiques » vient de
la correction de méthode décrite plus haut. Le gain de performance de la page
d'expérimentation vient des deux correctifs ci-dessus.

## Ce qui reste à faire

- **Rejouer sur `https://resilience-976.fr`.** Les mesures ci-dessus sont
  locales : latence réseau nulle, pas de TLS, pas de cache navigateur froid sur
  un vrai réseau. Le tableau de bord et les pages de statistiques étant
  désormais derrière `auth_basic`, une campagne en production ne couvrira que
  les routes réellement publiques.
- **LCP mobile à 2,4 s de médiane.** Pour 189 Ko transférés sur l'accueil,
  Lighthouse ne propose aucune optimisation : la valeur est essentiellement le
  plancher imposé par le bridage 4G lent + CPU ÷4. Un gain supplémentaire
  passerait par un préchargement de l'image du héros, à mesurer avant de
  l'introduire.
- **Appareils réels.** Android et iPhone, réseau mobile réel, téléchargement
  des PDF.
- **Vidéo hébergée localement**, si l'on veut supprimer le cookie tiers et
  passer les quatre dernières mesures à 100.
