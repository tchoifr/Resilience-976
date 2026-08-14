# Rapport performance et qualité (Lighthouse)

Date : 14 août 2026<br>
Outil : Lighthouse 13.4.1 (`npx lighthouse`), Chrome sans interface<br>
Portée : **les 31 routes publiques**, en mobile et en desktop, soit 62 mesures,
jouées en local **et sur `https://resilience-976.fr`**<br>
Statut : quatre défauts trouvés et corrigés, dont deux que seule la mesure en
production pouvait révéler

## Résultats sur la production

Mesures du 14 août au soir, après correctifs, sur le site réel.

### Mobile (émulation par défaut : 412 × 823, 4G lent, processeur ÷4)

| Catégorie | Minimum | Médiane | Maximum | Pages à 100 |
| --- | ---: | ---: | ---: | ---: |
| Performance | 93 | 95 | 97 | 0/31 |
| Accessibilité | **100** | 100 | 100 | **31/31** |
| Bonnes pratiques | 96 | 100 | 100 | 29/31 |
| SEO | **100** | 100 | 100 | **31/31** |

LCP de 2,3 s à 2,9 s, médiane 2,8 s. **Aucune page au-dessus du seuil CLS.**

### Desktop (`--preset=desktop`)

| Catégorie | Minimum | Médiane | Maximum | Pages à 100 |
| --- | ---: | ---: | ---: | ---: |
| Performance | 99 | 100 | 100 | 30/31 |
| Accessibilité | **100** | 100 | 100 | **31/31** |
| Bonnes pratiques | 96 | 100 | 100 | 29/31 |
| SEO | **100** | 100 | 100 | **31/31** |

LCP de 0,6 s à 0,7 s.

### Les quatre mesures restantes en dessous de 100

`/videos` et `/videos/preparer-son-logement`, dans les deux profils, à **96 en
bonnes pratiques**. L'audit en cause est `inspector-issues`, et son détail tient
en une ligne : un **cookie tiers** posé par le serveur qui héberge la vidéo
DREAL (`webissimo.developpement-durable.gouv.fr`). Rien à corriger côté produit,
sauf à héberger la vidéo nous-mêmes.

## L'écart entre le local et la production

C'est le tableau le plus utile du rapport : il montre ce qu'une mesure locale ne
peut pas dire.

| Mesure (mobile) | Local | Production, avant | Production, après |
| --- | ---: | ---: | ---: |
| Performance, médiane | 97 | **83** | 95 |
| Performance, minimum | 96 | **82** | 93 |
| LCP médian | 2,4 s | **4,2 s** | 2,8 s |
| Poids transféré, accueil | 189 Ko | **432 Ko** | 199 Ko |
| Bonnes pratiques, pages à 100 | 29/31 | **7/31** | 29/31 |
| Accessibilité | 100 partout | 100 partout | 100 partout |
| SEO | 100 partout | 100 partout | 100 partout |

Accessibilité et SEO n'ont jamais bougé : 100 sur les 31 pages, dans les trois
campagnes. La performance et les bonnes pratiques, elles, se sont effondrées sur
le site réel — pour deux raisons distinctes, dont aucune n'était visible en
local.

Il reste un écart résiduel de 2 points en performance mobile (95 contre 97) et
de 0,4 s sur le LCP : c'est la latence réseau et le TLS, incompressibles depuis
un poste métropolitain vers un serveur à Roubaix.

## Défauts trouvés et corrigés

### 1. Décalage de mise en page sur toutes les pages (CLS 0,0996)

Lighthouse signalait un décalage unique, de score identique au dix-millième sur
toutes les pages, attribué à `<footer class="app-footer">`.

Cause : les vues sont chargées en différé. Tant que la vue n'est pas arrivée,
la coquille de l'application — en-tête et pied de page — tient dans l'écran,
donc le pied de page est visible ; quand le contenu arrive, il est chassé vers
le bas. `.app-main` réservait `calc(100vh - 164px)`, une hauteur de pied de page
supposée qui ne suffisait pas.

Correction : `.app-main { min-height: 100vh }`. Résultat : CLS 0,0996 → **0**.
Le seuil de Lighthouse étant 0,1, le site passait à quatre millièmes de la zone
rouge.

### 2. Décalage majeur du tableau de bord en desktop (CLS 0,272)

Le panneau « Estimation d'atteinte de l'objectif » était rendu sous condition
(`v-if="stats"`) : il apparaissait à la réponse du collecteur et repoussait tout
le tableau de bord de 380 px. En mobile le décalage passait inaperçu — colonne
unique, panneau sous la ligne de flottaison — d'où un CLS à 0 côté mobile et
0,272 côté desktop. Un cas que la seule mesure mobile ne voyait pas.

Correction : le panneau est rendu dès le départ, avec un message d'attente puis
un message d'indisponibilité si le collecteur ne répond pas. Résultat :
performance 86 → **100**, CLS 0,272 → **0**.

### 3. nginx ne compressait ni les scripts ni les feuilles de style

**Visible uniquement en production.** 432 Ko transférés sur l'accueil, contre
189 Ko en local. Le bundle principal partait en **181 915 octets bruts** — et la
réponse était identique avec `Accept-Encoding: gzip`.

Dans `/etc/nginx/nginx.conf`, `gzip on;` était bien actif, mais `gzip_types`
était resté commenté. Le défaut de nginx est alors `text/html` seul : le HTML
était compressé, le JavaScript non.

Correction sur le serveur : les six directives `gzip_*` décommentées, plus
`image/svg+xml` ajouté à la liste — absent du fichier livré par Ubuntu alors que
le logo est servi sur chaque page. Le bundle passe à **66 361 octets**, la taille
exacte annoncée par le build.

Résultat : performance mobile de 83 à **95** de médiane, LCP de 4,2 s à 2,8 s.

**Ce réglage ne se trouve pas dans `deploy/nginx.conf`.** La compression se règle
au niveau `http`, dans `nginx.conf`, hors du fichier du site. Qui ne lit que le
dépôt ne peut pas savoir si elle est active.

### 4. Une violation de CSP sur 48 des 62 mesures

**Visible uniquement en production**, parce que `vite preview` n'envoie aucune
politique de sécurité de contenu, là où nginx en pose une stricte.

Relevée par CDP plutôt que devinée :

```txt
ContentSecurityPolicyIssue  violatedDirective: script-src  type: kEvalViolation
  content.service-uNkNi7l-.js
```

zod 4.4.3 compile ses validateurs quand il le peut, et teste cette capacité par
un `new Function("")` sous `try`/`catch`. La CSP `script-src 'self'` interdit
eval : la sonde échoue proprement, zod bascule sur son chemin sans compilation,
et **rien ne casse** — mais Chrome journalise une violation sur chaque page.

Correction : `z.config({ jitless: true })` dans `contentSchemas.ts`, ce qui
supprime la sonde plutôt que d'assouplir la politique. Vérifié par sonde CDP
après déploiement : aucun incident sur trois pages, là où il y en avait un par
page.

Résultat : bonnes pratiques, de 7 pages à 100 sur 31 à **29 sur 31**.

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

Les données de trace disaient pourtant l'inverse : page peinte en 225 ms, aucune
tâche de plus de 50 ms, 133 ms de calcul cumulé — et une trace de 45 017 ms. Une
seule requête sur dix était marquée `finished: false`. Une sonde sur quatre
variantes du même appel a isolé la cause : c'est la lecture du corps qui compte,
pas `keepalive`, conservé pour que l'envoi survive à la navigation sortante.

| | avant | après |
| --- | ---: | ---: |
| Avertissements | 1 par rapport | **aucun** |
| Durée de la mesure | 53 078 ms | **6 388 ms** |
| Fin de trace | 45 017 ms | **2 547 ms** |
| Requêtes non closes | 1 | **aucune** |

Les scores, eux, n'avaient pas bougé — ce qui est le plus instructif : un rapport
peut annoncer 97 en performance et se déclarer incomplet dans la même page.

**Sans backend derrière `/api`.** Les appels échouent, la console enregistre des
erreurs, et « bonnes pratiques » plafonne à 96 pour une raison qui n'existe pas
en production. C'était le cas de l'audit du 12 août. `vite.config.ts` proxifie
désormais `/api` en mode `preview` comme il le faisait déjà en mode `dev`.

**Avec un collecteur qui n'autorise pas l'origine testée.** Même effet, cause
différente : le serveur répond `403 origin_not_allowed` sur `/api/events`, la
console enregistre l'erreur, et les 31 pages tombent à 96. Vérifier que
`ANALYTICS_ALLOWED_ORIGINS` contient le port servi.

**Sur un serveur statique sans compression.** `scripts/serve-audit.mjs`, écrit
pour le scan ZAP, ne compresse pas : 432 Ko transférés là où `vite preview` en
envoie 189. La performance mobile tombe alors à **83** au lieu de 97 — le même
chiffre, exactement, que la production avant correction de `gzip_types`. Ce
serveur porte désormais un avertissement en tête de fichier.

Dernier point de méthode : **la mesure mobile est bruitée**. Sur l'accueil, cinq
exécutions successives donnent une performance entre 94 et 97. Les écarts
inférieurs à 3 points ne doivent pas être interprétés.

## Méthode

L'audit tourne sur le **build de production**. En local, servi par
`vite preview` avec le collecteur joignable derrière `/api` — la même topologie
que le nginx du VPS.

```bash
# Local
npm run analytics:server
npm run build
npm run preview -- --port 4174
npm run audit:lighthouse

# Production
npm run audit:lighthouse -- https://resilience-976.fr ./lighthouse-report-prod
```

`scripts/run-lighthouse.mjs` enchaîne les 31 routes publiques en mobile puis en
desktop, écrit un rapport HTML et un rapport JSON par page et par profil, et
imprime la synthèse. `--sample` limite la passe à huit pages, un écran par
famille, pour une vérification rapide pendant le développement.

La liste des routes vient de `scripts/public-routes.mjs`, **partagée avec le
générateur de `sitemap.xml`** : deux listes tenues séparément finiraient par
diverger, et le rapport annoncerait une couverture qui n'est plus la vraie. Le
tableau de bord n'y figure pas : c'est une page d'exploitation, protégée par
authentification depuis le 14 août.

Les rapports bruts ne sont pas versionnés — 81 Mo par campagne.
`lighthouse-report/` et `lighthouse-report-prod/` sont dans `.gitignore`. Un
échantillon de seize rapports et le détail chiffré des 62 mesures sont déposés
dans le dossier de preuves, sous
`docs/jnr_2026_MPR976/preuves/3 - …/03_Audits_techniques_MPR976_JNR_2026/`.

**Une campagne de production crée 62 visiteurs synthétiques** dans le
collecteur, chaque exécution partant d'un profil Chrome neuf. Les compteurs de
la bannière d'accueil s'en trouvent gonflés d'autant.

## Ce qui reste à faire

- **Purger les visiteurs synthétiques** des trois campagnes de production.
- **Appareils réels.** Android et iPhone, réseau mobile réel, téléchargement des
  PDF.
- **LCP mobile à 2,8 s de médiane.** Pour 199 Ko transférés, Lighthouse ne
  propose plus d'optimisation de poids ; la valeur est le plancher du bridage
  4G lent + CPU ÷4, plus la latence réelle. Un gain passerait par un
  préchargement de l'image du héros, à mesurer avant de l'introduire.
- **Vidéo hébergée localement**, si l'on veut supprimer le cookie tiers et
  passer les quatre dernières mesures à 100.
