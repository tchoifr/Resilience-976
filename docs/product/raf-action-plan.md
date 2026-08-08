# Plan d'action RAF

Date: 8 aout 2026<br>
Source: `docs/product/RAF.pdf`

## Synthese

Le RAF demande de finaliser quatre axes avant les preuves finales:

- completer les ressources sur les 4 risques promis: cyclone, tempete/inondation, seisme et mouvement de terrain;
- finaliser le dispositif statistique et son tableau de bord pour la preuve 09;
- conduire et documenter une experimentation utilisateurs pour la preuve 11;
- produire ensuite les rapports qualite, activer le referencement et preparer les QR codes.

## Mise en place projet

<section style="background:#ecfdf5; border:1px solid #bbf7d0; border-left:6px solid #16a34a; border-radius:8px; padding:16px; margin:18px 0;">

### Ressources

**Statut dev: termine**

La page `/ressources` s'appuie sur les JSON versionnes:

- `src/data/resources.json`;
- `src/data/sources.json`;
- `src/data/swb/resources.json`;
- `src/data/swb/sources.json`.

Les fiches `resource_seisme` et `resource_mouvement_terrain` ont ete ajoutees avec sources officielles Prefecture de Mayotte et Georisques. Les libelles Shimaore restent marques `to_validate` et doivent etre relus par un referent local.

</section>

<section style="background:#ecfdf5; border:1px solid #bbf7d0; border-left:6px solid #16a34a; border-radius:8px; padding:16px; margin:18px 0;">

### Preuve 09

**Statut dev: termine**

Le collecteur `server/analytics-server.mjs` accepte les evenements attendus:

- `diagnostic_started`;
- `diagnostic_completed`;
- `result_viewed`;
- `action_plan_opened`;
- `checklist_opened`;
- `checklist_progress`;
- `kit_opened`;
- `certificate_generated`;
- `pdf_downloaded`;
- `source_opened`;
- `feedback_submitted`;
- `technical_error`.

**Detail de collecte des donnees**

La collecte est inactive en production par defaut. Elle ne demarre que si la variable `VITE_ANALYTICS_ENABLED=true` est configuree. En developpement, elle peut etre coupee avec `VITE_ANALYTICS_ENABLED=false`.

Chaque evenement est declenche cote front par la fonction `trackEvent` de `src/shared/analytics/analytics.service.ts`. Le navigateur envoie une requete `POST /api/events` vers le collecteur Node avec uniquement:

- le nom de l'evenement;
- la version applicative;
- le chemin public de la page;
- un identifiant visiteur anonyme genere aleatoirement dans le navigateur;
- un identifiant de campagne non nominatif si l'URL contient `campaign_id` ou `utm_campaign`.

Aucune reponse detaillee du diagnostic, aucun score individuel, aucun nom, email, telephone, adresse ou donnee medicale n'est envoye dans les evenements.

Le serveur `server/analytics-server.mjs` verifie que l'evenement fait partie de la liste autorisee, nettoie le chemin de page, limite l'identifiant de campagne, ajoute un identifiant technique et l'horodatage serveur. Les donnees normalisees sont ensuite enregistrees dans la BDD SQLite `server/data/resilience.sqlite`, table `analytics_events`. Une trace compatible reste aussi ajoutee dans `server/data/events.jsonl`.

Les declencheurs principaux sont:

- `diagnostic_started`: clic de lancement du diagnostic;
- `diagnostic_completed`: validation de la derniere etape du diagnostic;
- `result_viewed`: affichage de la page de resultats;
- `action_plan_opened`: ouverture du plan d'actions depuis les resultats;
- `checklist_opened`: ouverture de la checklist;
- `checklist_progress`: seuils de progression checklist atteints, 25, 50, 75 ou 100 %;
- `kit_opened`: ouverture du kit d'urgence personnalise;
- `certificate_generated`: generation de l'attestation;
- `pdf_downloaded`: telechargement d'un PDF;
- `source_opened`: clic vers une source officielle;
- `feedback_submitted`: envoi d'un retour d'experimentation utilisateur;
- `technical_error`: erreur front bloquante interceptee par l'application.

Le tableau de bord lit la BDD et calcule des agregats: visites, visiteurs engages uniques, parcours commences, parcours termines, vues resultats, ouvertures d'actions, telechargements PDF, attestations generees, ouvertures de sources, retours utilisateurs et erreurs techniques. Le taux de completion est calcule avec `diagnostic_completed / diagnostic_started`.

Le tableau de bord `/tableau-de-bord` affiche les agregats utiles a la preuve. Les donnees reelles ne doivent etre renseignees qu'apres recette et activation volontaire de l'analytics.

</section>

<section style="background:#ecfdf5; border:1px solid #bbf7d0; border-left:6px solid #16a34a; border-radius:8px; padding:16px; margin:18px 0;">

### Preuve 11

**Statut dev: termine**

La page `/experimentation-utilisateurs` permet de saisir des retours anonymises, de les enregistrer dans la BDD SQLite `server/data/resilience.sqlite` et de les exporter en CSV/JSON. Elle couvre:

- code participant non nominatif;
- appareil, navigateur, profil general et aide recue;
- duree et parcours termine;
- notes de 1 a 5;
- action utile decouverte, difficulte, amelioration prioritaire et reserve.

Les exports servent a alimenter le document de preuve 11. Ils ne remplacent pas la session de test reelle avec 5 a 20 personnes.

</section>

## Restant externe

Ces elements ne peuvent pas etre finalises sans decision ou action hors code:

- dates, participants, verbatims et corrections reels de l'experimentation;
- domaine final;
- acces Google Analytics et Google Search Console;
- generation finale des QR codes apres choix du domaine;
- audit manuel lecteur d'ecran et appareils reels.
