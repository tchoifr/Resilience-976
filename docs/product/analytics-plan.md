# Plan analytics

## Decision MVP

Par defaut, aucun traceur n'est actif. La variable `VITE_ANALYTICS_ENABLED=false` garde la couche analytics en no-op.

## Tableau de bord MVP

Une page de pilotage est disponible dans l'application sur `/tableau-de-bord`.

Elle matérialise la pièce de preuve n°09 avec:

- objectif principal de 5 000 visiteurs engagés uniques;
- entonnoir visites, parcours commencés, résultats consultés et passage à l'action;
- registre de campagnes à alimenter;
- suivi qualité: disponibilité, erreurs, retours et date d'extraction;
- catalogue des événements à instrumenter;
- recette minimale avant ouverture publique.

Les valeurs réelles restent volontairement à `—` tant que l'instrumentation, l'outil de mesure et la recette réseau ne sont pas activés. Aucune audience ou donnée d'impact n'est inventée.

## Collecteur Node MVP

Un collecteur minimal sans dependance externe est disponible dans `server/analytics-server.mjs`.

Commandes locales:

```bash
npm run analytics:server
VITE_ANALYTICS_ENABLED=true npm run dev
```

Endpoints:

- `POST /api/events`: collecte un evenement autorise;
- `POST /api/feedback`: enregistre un retour d'experimentation en BDD SQLite;
- `GET /api/dashboard`: renvoie les agrégats pour `/tableau-de-bord`;
- `GET /api/health`: controle de disponibilite.

Stockage local:

- fichier JSONL `server/data/events.jsonl`;
- base SQLite `server/data/resilience.sqlite` pour les evenements et les retours du formulaire;
- dossier ignore par git;
- aucun nom, courriel, adresse, reponse detaillee, score individuel ou donnee medicale.

Champs conserves:

- nom d'evenement autorise;
- identifiant visiteur anonyme local;
- version applicative;
- chemin public normalise;
- identifiant de campagne non nominatif;
- horodatage serveur.

## Evenements prepares

| Evenement               | Finalite                              | Donnees exclues                |
| ----------------------- | ------------------------------------- | ------------------------------ |
| `diagnostic_started`    | Comprendre le lancement du parcours   | Reponses utilisateur           |
| `diagnostic_completed`  | Mesurer la completion                 | Score individuel, reponses     |
| `result_viewed`         | Comprendre l'acces aux resultats      | Score individuel               |
| `action_plan_opened`    | Mesurer l'ouverture du plan d'actions | Detail des reponses            |
| `checklist_opened`      | Mesurer l'usage checklist             | Cases cochees                  |
| `checklist_progress`    | Mesurer les seuils de progression     | Liste des actions cochees      |
| `kit_opened`            | Mesurer l'usage kit                   | Composition detaillee du foyer |
| `certificate_generated` | Mesurer la generation d'attestation   | Nom, score individuel          |
| `pdf_downloaded`        | Mesurer l'usage du PDF                | Contenu du PDF                 |
| `source_opened`         | Mesurer la consultation des sources   | Identite utilisateur           |
| `feedback_submitted`    | Mesurer les retours d'experimentation | Identite, donnees sensibles    |
| `technical_error`       | Suivre les erreurs bloquantes         | Reponses utilisateur           |

## Regle de mise en production

Avant d'activer une solution analytics, valider:

- outil sans cookie ou consentement explicite;
- politique de confidentialite mise a jour;
- inspection reseau prouvant l'absence de reponses dans les payloads;
- finalites et durees de conservation documentees.
