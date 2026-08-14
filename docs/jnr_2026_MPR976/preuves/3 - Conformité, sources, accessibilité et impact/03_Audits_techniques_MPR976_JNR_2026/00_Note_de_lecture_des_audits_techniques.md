# Audits techniques — note de lecture

Mon Plan Résilience 976 — GT SAS — dossier JNR 2026<br>
Pièce complémentaire au document 03 « Conformité, sources, accessibilité et impact »<br>
Mesures du 14 août 2026, **sur le site en production**

Ce dossier réunit les fichiers produits par les outils eux-mêmes, sans
retraitement. Il couvre deux des trois axes d’audit : la performance et la
qualité web mesurées par Lighthouse, la sécurité applicative scannée par
OWASP ZAP. Le troisième axe, l’accessibilité, fait l’objet d’un document
distinct — la pré-évaluation RGAA 4.1.2, grille des 106 critères.

**Les deux campagnes portent sur `https://resilience-976.fr`**, le site réel, et
non sur un environnement de test. Ce choix n’est pas cosmétique : il a révélé
quatre défauts qu’aucune mesure locale n’aurait pu montrer. Ils sont décrits
plus bas, avec leur correction et la mesure d’après.

## Ce que contient le dossier

| Dossier | Contenu | Portée |
| --- | --- | --- |
| `01_Performance_Lighthouse` | 16 rapports HTML + le détail chiffré des 62 mesures | 8 pages sur 31, deux profils |
| `02_Securite_OWASP_ZAP` | Rapport HTML et JSON du scan | Site de production entier |

Les 16 rapports HTML sont un **échantillon** : un type d’écran par famille —
accueil, diagnostic, résultats, ressources, capsules vidéo, quiz,
expérimentation utilisateurs, plan du site. Les pages de capsules et de
scénarios reposent sur un même gabarit, une seule suffit à en juger.

La campagne complète, elle, a couvert **les 31 routes publiques dans les deux
profils, soit 62 mesures**. Aucune n’est perdue : le fichier
`Detail_des_62_mesures_Lighthouse.csv` les porte toutes, et le tableau en fin
de note les reprend page par page. Les 124 fichiers HTML de la campagne
représentent 81 Mo, d’où l’échantillon.

## Axe 1 — Performance et qualité web

Lighthouse 13.4.1, Chrome sans interface, contre https://resilience-976.fr.

### Mobile (émulation par défaut : 412 × 823, 4G lent, processeur divisé par 4)

| Catégorie | Minimum | Médiane | Maximum | Pages à 100 |
| --- | ---: | ---: | ---: | ---: |
| Performance | 93 | 95 | 97 | 0/31 |
| Accessibilité | **100** | 100 | 100 | **31/31** |
| Bonnes pratiques | 96 | 100 | 100 | 29/31 |
| SEO | **100** | 100 | 100 | **31/31** |

### Ordinateur de bureau

| Catégorie | Minimum | Médiane | Maximum | Pages à 100 |
| --- | ---: | ---: | ---: | ---: |
| Performance | 99 | 100 | 100 | 30/31 |
| Accessibilité | **100** | 100 | 100 | **31/31** |
| Bonnes pratiques | 96 | 100 | 100 | 29/31 |
| SEO | **100** | 100 | 100 | **31/31** |

**Accessibilité et SEO : 100 sur les 31 pages, dans les deux profils.** Aucune
page ne dépasse le seuil de décalage visuel (CLS).

Les quatre mesures à 96 en « bonnes pratiques » concernent les deux pages qui
affichent une vidéo. La cause est unique et extérieure au site : un cookie
tiers posé par le serveur de la DREAL qui héberge la capsule
(`webissimo.developpement-durable.gouv.fr`). La supprimer supposerait
d’héberger la vidéo nous-mêmes.

### Ce que la mesure en production a changé

| Mesure (mobile) | En local | Production, avant | Production, après |
| --- | ---: | ---: | ---: |
| Performance, médiane | 97 | **83** | 95 |
| LCP médian | 2,4 s | **4,2 s** | 2,8 s |
| Poids transféré, accueil | 189 Ko | **432 Ko** | 199 Ko |
| Bonnes pratiques, pages à 100 | 29/31 | **7/31** | 29/31 |

Deux défauts, invisibles en local, corrigés le jour même :

**Le serveur ne compressait ni les scripts ni les feuilles de style.** La
directive de compression était bien active, mais la liste des types à
compresser était restée commentée : le réglage par défaut ne couvre que le
HTML. Le fichier principal partait en 181 915 octets au lieu de 66 361.
Corrigé, puis vérifié par relevé direct.

**Une violation de la politique de sécurité de contenu, sur 48 des 62
mesures.** La bibliothèque de validation teste si elle peut compiler ses
règles, par un appel que notre politique interdit. Le test échouait proprement
— rien n’était cassé — mais le navigateur enregistrait un incident sur chaque
page. Corrigé en déclarant explicitement le mode sans compilation, sans
toucher à la politique. Il aurait été plus simple d’autoriser l’appel dans la
politique : c’eût été échanger une ligne de journal contre une vraie
faiblesse.

L’écart résiduel de 2 points entre le local et la production tient à la
latence réseau et au chiffrement TLS, incompressibles.

## Axe 2 — Sécurité applicative

OWASP ZAP 2.17.0, scan de référence (`zap-baseline`) contre
**https://resilience-976.fr**, le 14 août 2026 à 20 h 46.

**Résultat : 0 échec, 62 règles passées, 5 avertissements.**

| Avertissement | Risque | Lecture |
| --- | --- | --- |
| CSP : `style-src 'unsafe-inline'` | Moyen | Réel et connu. Nécessaire tant que des styles sont posés en ligne (jauge de score, largeur des barres de progression). Le reste de la politique est strict : `object-src 'none'`, `frame-ancestors 'none'`, `base-uri 'self'`. |
| `Cross-Origin-Embedder-Policy` absent | Faible | **Volontaire.** `require-corp` bloquerait la capsule vidéo hébergée par la DREAL, qui n’envoie pas l’en-tête correspondant. |
| Modern Web Application | Information | Détection d’une application monopage. Pas un défaut. |
| Re-examine Cache-control Directives | Information | À arbitrer sur les pages HTML. |
| Storable and Cacheable Content | Information | Les fichiers statiques sont cachables, c’est voulu. |

### Ce que le scan a corrigé le jour même

Un premier passage, le même jour à 20 h 25, relevait **9 avertissements pour
58 règles passées**. Quatre défauts réels ont été corrigés dans la foulée,
puis le scan a été rejoué — c’est le rapport joint.

| Défaut | Cause | Correction |
| --- | --- | --- |
| `X-Content-Type-Options` absent des fichiers statiques | Le bloc de configuration des fichiers statiques déclarait un en-tête de cache. Or nginx n’hérite les en-têtes du niveau supérieur que si le bloc courant n’en déclare aucun : les huit en-têtes de sécurité disparaissaient donc en silence. | Les huit en-têtes redéclarés dans ce bloc. |
| `Strict-Transport-Security` absent des fichiers statiques | Même cause. | Idem. |
| `Permissions-Policy` absent des fichiers statiques | Même cause. | Idem. |
| Version exacte du serveur annoncée | Réglage par défaut du système | Désactivé. |

Ce défaut n’apparaissait **que** sur le site réel. Un scan mené en local,
contre un serveur d’audit qui rejoue les en-têtes de la configuration, ne le
voyait pas : il ne reproduisait pas le bloc des fichiers statiques.

## Reproduire ces mesures

```bash
# Performance — 31 routes, deux profils, sur la production
npm run audit:lighthouse -- https://resilience-976.fr ./lighthouse-report-prod

# Sécurité — scan de référence sur la production
docker volume create zapwrk
docker run --rm -v zapwrk:/data alpine chown -R 1000:1000 /data
docker run --rm -v zapwrk:/zap/wrk:rw ghcr.io/zaproxy/zaproxy:stable \
  zap-baseline.py -t https://resilience-976.fr \
  -r zap-report-production.html -J zap-report-production.json -I
```

Les rapports Lighthouse ne sont pas conservés dans le dépôt : 81 Mo par
campagne. Le scan ZAP écrit dans un volume Docker, un montage de dossier
Windows étant refusé en écriture par le conteneur.

Une campagne de production crée 62 visiteurs synthétiques dans le collecteur,
chaque exécution partant d’un profil de navigateur neuf.

## Détail des 62 mesures

Poids en kilo-octets transférés. Colonne « Avert. » : nombre d’avertissements
d’exécution émis par Lighthouse — zéro partout, ce qui atteste que chaque
mesure est allée à son terme.

| Page | Profil | Perf. | Access. | Bonnes pratiques | SEO | FCP | LCP | TBT | CLS | Speed Index | Poids | Avert. |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| accessibilite | desktop | 100 | 100 | 100 | 100 | 0,5 s | 0,6 s | 0 ms | 0,000 | 0,5 s | 81 Ko | 0 |
| accessibilite | mobile | 97 | 100 | 100 | 100 | 1,7 s | 2,3 s | 19 ms | 0,000 | 1,7 s | 81 Ko | 0 |
| accueil | desktop | 100 | 100 | 100 | 100 | 0,5 s | 0,7 s | 0 ms | 0,000 | 0,7 s | 182 Ko | 0 |
| accueil | mobile | 96 | 100 | 100 | 100 | 1,9 s | 2,6 s | 80 ms | 0,000 | 1,9 s | 199 Ko | 0 |
| assistant-liens | desktop | 100 | 100 | 100 | 100 | 0,5 s | 0,7 s | 0 ms | 0,007 | 0,5 s | 92 Ko | 0 |
| assistant-liens | mobile | 96 | 100 | 100 | 100 | 1,9 s | 2,5 s | 23 ms | 0,012 | 1,9 s | 92 Ko | 0 |
| checklist | desktop | 100 | 100 | 100 | 100 | 0,5 s | 0,7 s | 0 ms | 0,000 | 0,5 s | 143 Ko | 0 |
| checklist | mobile | 95 | 100 | 100 | 100 | 1,8 s | 2,7 s | 42 ms | 0,000 | 1,8 s | 143 Ko | 0 |
| confidentialite | desktop | 100 | 100 | 100 | 100 | 0,5 s | 0,6 s | 0 ms | 0,000 | 0,5 s | 81 Ko | 0 |
| confidentialite | mobile | 97 | 100 | 100 | 100 | 1,7 s | 2,3 s | 16 ms | 0,000 | 1,7 s | 81 Ko | 0 |
| diagnostic | desktop | 100 | 100 | 100 | 100 | 0,5 s | 0,7 s | 0 ms | 0,000 | 0,6 s | 142 Ko | 0 |
| diagnostic | mobile | 94 | 100 | 100 | 100 | 1,8 s | 2,9 s | 46 ms | 0,000 | 1,8 s | 142 Ko | 0 |
| experimentation | desktop | 100 | 100 | 100 | 100 | 0,5 s | 0,6 s | 0 ms | 0,000 | 0,5 s | 87 Ko | 0 |
| experimentation | mobile | 97 | 100 | 100 | 100 | 1,8 s | 2,3 s | 43 ms | 0,000 | 1,8 s | 87 Ko | 0 |
| kit | desktop | 100 | 100 | 100 | 100 | 0,5 s | 0,7 s | 0 ms | 0,000 | 0,6 s | 138 Ko | 0 |
| kit | mobile | 95 | 100 | 100 | 100 | 1,9 s | 2,8 s | 44 ms | 0,000 | 1,9 s | 138 Ko | 0 |
| mentions-legales | desktop | 100 | 100 | 100 | 100 | 0,5 s | 0,6 s | 0 ms | 0,000 | 0,5 s | 87 Ko | 0 |
| mentions-legales | mobile | 97 | 100 | 100 | 100 | 1,9 s | 2,3 s | 21 ms | 0,000 | 1,9 s | 87 Ko | 0 |
| mises-en-situation | desktop | 100 | 100 | 100 | 100 | 0,5 s | 0,7 s | 0 ms | 0,000 | 0,6 s | 134 Ko | 0 |
| mises-en-situation | mobile | 95 | 100 | 100 | 100 | 1,9 s | 2,7 s | 23 ms | 0,000 | 1,9 s | 134 Ko | 0 |
| plan-du-site | desktop | 100 | 100 | 100 | 100 | 0,5 s | 0,7 s | 0 ms | 0,000 | 0,5 s | 131 Ko | 0 |
| plan-du-site | mobile | 96 | 100 | 100 | 100 | 1,7 s | 2,7 s | 22 ms | 0,000 | 1,7 s | 131 Ko | 0 |
| quiz | desktop | 100 | 100 | 100 | 100 | 0,5 s | 0,7 s | 0 ms | 0,000 | 0,6 s | 140 Ko | 0 |
| quiz | mobile | 95 | 100 | 100 | 100 | 1,9 s | 2,7 s | 58 ms | 0,000 | 1,9 s | 140 Ko | 0 |
| ressources | desktop | 100 | 100 | 100 | 100 | 0,5 s | 0,7 s | 0 ms | 0,000 | 0,6 s | 134 Ko | 0 |
| ressources | mobile | 95 | 100 | 100 | 100 | 1,9 s | 2,8 s | 55 ms | 0,000 | 1,9 s | 134 Ko | 0 |
| resultats | desktop | 100 | 100 | 100 | 100 | 0,5 s | 0,7 s | 0 ms | 0,000 | 0,6 s | 146 Ko | 0 |
| resultats | mobile | 94 | 100 | 100 | 100 | 1,9 s | 2,8 s | 24 ms | 0,000 | 1,9 s | 146 Ko | 0 |
| scenario-scenario_aide_vulnerable | desktop | 100 | 100 | 100 | 100 | 0,5 s | 0,7 s | 0 ms | 0,000 | 0,6 s | 142 Ko | 0 |
| scenario-scenario_aide_vulnerable | mobile | 95 | 100 | 100 | 100 | 1,9 s | 2,8 s | 29 ms | 0,000 | 1,9 s | 142 Ko | 0 |
| scenario-scenario_coupure_eau | desktop | 99 | 100 | 100 | 100 | 0,5 s | 0,7 s | 0 ms | 0,000 | 0,6 s | 142 Ko | 0 |
| scenario-scenario_coupure_eau | mobile | 95 | 100 | 100 | 100 | 1,8 s | 2,7 s | 32 ms | 0,000 | 1,8 s | 142 Ko | 0 |
| scenario-scenario_coupure_electricite | desktop | 100 | 100 | 100 | 100 | 0,5 s | 0,7 s | 0 ms | 0,000 | 0,5 s | 142 Ko | 0 |
| scenario-scenario_coupure_electricite | mobile | 93 | 100 | 100 | 100 | 1,9 s | 2,9 s | 112 ms | 0,000 | 1,9 s | 142 Ko | 0 |
| scenario-scenario_cyclone | desktop | 100 | 100 | 100 | 100 | 0,5 s | 0,7 s | 0 ms | 0,000 | 0,5 s | 142 Ko | 0 |
| scenario-scenario_cyclone | mobile | 95 | 100 | 100 | 100 | 1,8 s | 2,7 s | 23 ms | 0,000 | 1,8 s | 142 Ko | 0 |
| scenario-scenario_documents | desktop | 100 | 100 | 100 | 100 | 0,5 s | 0,7 s | 0 ms | 0,000 | 0,6 s | 142 Ko | 0 |
| scenario-scenario_documents | mobile | 94 | 100 | 100 | 100 | 1,9 s | 2,8 s | 52 ms | 0,000 | 1,9 s | 142 Ko | 0 |
| support | desktop | 100 | 100 | 100 | 100 | 0,5 s | 0,6 s | 0 ms | 0,000 | 0,5 s | 81 Ko | 0 |
| support | mobile | 97 | 100 | 100 | 100 | 1,7 s | 2,3 s | 25 ms | 0,000 | 1,7 s | 81 Ko | 0 |
| video-aider-personne-vulnerable | desktop | 100 | 100 | 100 | 100 | 0,5 s | 0,7 s | 0 ms | 0,000 | 0,6 s | 143 Ko | 0 |
| video-aider-personne-vulnerable | mobile | 95 | 100 | 100 | 100 | 1,9 s | 2,7 s | 28 ms | 0,000 | 1,9 s | 143 Ko | 0 |
| video-composer-son-kit-urgence | desktop | 100 | 100 | 100 | 100 | 0,5 s | 0,7 s | 0 ms | 0,000 | 0,6 s | 143 Ko | 0 |
| video-composer-son-kit-urgence | mobile | 94 | 100 | 100 | 100 | 1,8 s | 2,9 s | 35 ms | 0,000 | 1,8 s | 143 Ko | 0 |
| video-premieres-actions-apres-evenement | desktop | 100 | 100 | 100 | 100 | 0,5 s | 0,7 s | 0 ms | 0,000 | 0,6 s | 143 Ko | 0 |
| video-premieres-actions-apres-evenement | mobile | 94 | 100 | 100 | 100 | 1,8 s | 2,9 s | 28 ms | 0,000 | 1,8 s | 143 Ko | 0 |
| video-preparer-les-enfants | desktop | 100 | 100 | 100 | 100 | 0,5 s | 0,7 s | 0 ms | 0,000 | 0,6 s | 143 Ko | 0 |
| video-preparer-les-enfants | mobile | 95 | 100 | 100 | 100 | 1,9 s | 2,8 s | 29 ms | 0,000 | 1,9 s | 143 Ko | 0 |
| video-preparer-son-logement | desktop | 100 | 100 | 96 | 100 | 0,5 s | 0,7 s | 0 ms | 0,000 | 0,8 s | 429 Ko | 0 |
| video-preparer-son-logement | mobile | 94 | 100 | 96 | 100 | 1,8 s | 2,9 s | 45 ms | 0,000 | 1,8 s | 423 Ko | 0 |
| video-prevoir-eau-alimentation | desktop | 100 | 100 | 100 | 100 | 0,5 s | 0,7 s | 0 ms | 0,000 | 0,6 s | 143 Ko | 0 |
| video-prevoir-eau-alimentation | mobile | 94 | 100 | 100 | 100 | 1,8 s | 2,9 s | 27 ms | 0,000 | 1,8 s | 143 Ko | 0 |
| video-proteger-ses-documents | desktop | 100 | 100 | 100 | 100 | 0,5 s | 0,7 s | 0 ms | 0,000 | 0,6 s | 143 Ko | 0 |
| video-proteger-ses-documents | mobile | 94 | 100 | 100 | 100 | 1,8 s | 2,9 s | 85 ms | 0,000 | 1,8 s | 143 Ko | 0 |
| video-reagir-coupure-eau | desktop | 100 | 100 | 100 | 100 | 0,5 s | 0,7 s | 0 ms | 0,000 | 0,6 s | 143 Ko | 0 |
| video-reagir-coupure-eau | mobile | 94 | 100 | 100 | 100 | 1,8 s | 2,9 s | 33 ms | 0,000 | 1,8 s | 143 Ko | 0 |
| video-reagir-coupure-electricite | desktop | 100 | 100 | 100 | 100 | 0,5 s | 0,7 s | 0 ms | 0,000 | 0,6 s | 143 Ko | 0 |
| video-reagir-coupure-electricite | mobile | 94 | 100 | 100 | 100 | 1,8 s | 2,9 s | 48 ms | 0,000 | 1,8 s | 143 Ko | 0 |
| video-reflexes-pendant-cyclone | desktop | 100 | 100 | 100 | 100 | 0,5 s | 0,7 s | 0 ms | 0,000 | 0,6 s | 143 Ko | 0 |
| video-reflexes-pendant-cyclone | mobile | 94 | 100 | 100 | 100 | 1,8 s | 2,9 s | 30 ms | 0,000 | 1,8 s | 143 Ko | 0 |
| videos | desktop | 100 | 100 | 96 | 100 | 0,5 s | 0,7 s | 0 ms | 0,000 | 0,6 s | 434 Ko | 0 |
| videos | mobile | 94 | 100 | 96 | 100 | 1,9 s | 2,8 s | 98 ms | 0,000 | 2,0 s | 424 Ko | 0 |