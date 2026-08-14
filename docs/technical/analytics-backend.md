# Backend analytics MVP

## Objectif

Le backend analytics sert a produire des statistiques agregees pour le tableau de bord d'impact sans creer de compte utilisateur et sans collecter de donnees nominatives.

Il couvre la piece de preuve n°09:

- compter les visiteurs engages uniques;
- compter les parcours commences et termines;
- mesurer les consultations de resultats;
- mesurer les ouvertures de plan d'actions, checklist, kit, attestations et telechargements PDF;
- mesurer les seuils de progression checklist, ouvertures de sources et retours utilisateurs;
- attribuer les usages a une campagne non nominative;
- exposer des agregats au tableau de bord `/tableau-de-bord`.

## Fichier principal

```txt
server/analytics-server.mjs
```

Le serveur utilise uniquement les modules natifs Node.js. Il n'ajoute pas Express ou Fastify. Les evenements analytics et les retours du formulaire sont centralises dans une base SQLite via `node:sqlite`. Le fichier JSONL des evenements peut rester comme trace locale compatible.

## Lancement local

Dans un terminal:

```bash
npm run analytics:server
```

Dans un autre terminal:

```bash
npm run dev
```

En developpement, le front envoie les evenements par defaut au collecteur via le proxy Vite `/api`.

Pour desactiver les stats en developpement:

```bash
VITE_ANALYTICS_ENABLED=false npm run dev
```

En production, les stats restent desactivees sauf activation explicite:

```bash
VITE_ANALYTICS_ENABLED=true
```

## Endpoints

### `GET /api/health`

Verifie que le collecteur repond.

Reponse:

```json
{ "ok": true }
```

### `POST /api/events`

Reçoit un evenement autorise.

Exemple:

```json
{
  "name": "diagnostic_started",
  "version": "1.0.0",
  "path": "/diagnostic",
  "visitorId": "11111111-1111-4111-8111-111111111111",
  "campaignId": "CAMP-TEST"
}
```

Reponse:

```json
{
  "ok": true,
  "visitorId": "11111111-1111-4111-8111-111111111111"
}
```

### `POST /api/feedback`

Enregistre un retour anonymise du formulaire `/experimentation-utilisateurs` dans SQLite.

Exemple abrege:

```json
{
  "participantCode": "PTEST",
  "device": "smartphone",
  "profile": "famille",
  "assistance": "aucune",
  "durationMinutes": 12,
  "completedJourney": true,
  "ratings": {
    "objective": 4,
    "questions": 4,
    "autonomy": 4,
    "score": 4,
    "priorities": 4,
    "actions": 4,
    "deliverables": 4,
    "trust": 4,
    "officialWarnings": 4,
    "recommendation": 4
  },
  "usefulAction": "Preparer le kit",
  "difficulty": "",
  "priorityImprovement": "",
  "concern": ""
}
```

Reponse:

```json
{
  "ok": true,
  "id": "11111111-1111-4111-8111-111111111111"
}
```

### `GET /api/dashboard`

Retourne les agregats affiches par le tableau de bord.

Exemple:

```json
{
  "target": 5000,
  "totals": {
    "visits": null,
    "engagedVisitors": 1,
    "journeysStarted": 1,
    "journeysCompleted": 0,
    "resultViews": 0,
    "actionOpens": 0,
    "pdfDownloads": 0,
    "completionRate": 0
  },
  "campaigns": [
    {
      "campaignId": "CAMP-TEST",
      "engaged": 1,
      "completed": 0,
      "actions": 0
    }
  ]
}
```

### `GET /api/public-counters`

Compteurs de la banniere d'accueil. **Route publique**, et la seule que la
page d'accueil consomme : uniquement des agregats, aucune donnee par
visiteur.

```json
{
  "target": 5000,
  "visits": 303,
  "engagedVisitors": 12,
  "journeysCompleted": 8,
  "quizSessions": 9,
  "videoParticipants": 7,
  "scenarioSessions": 17
}
```

### `GET /api/visitors/rank?visitorId=<uuid>`

Ordre d'arrivee d'un visiteur, calcule sur son tout premier evenement.
`rank` vaut `null` tant qu'aucun evenement n'a ete enregistre pour cet
identifiant. Un identifiant mal forme renvoie `400 invalid_visitor_id`.

```json
{ "rank": 72, "total": 72 }
```

### `GET /api/assistant-liens/status`

Indique si une cle Hugging Face est configuree sur le serveur, sans declencher
d'appel au modele. La cle elle-meme n'est jamais renvoyee.

```json
{ "configured": true, "model": "Qwen/Qwen2.5-7B-Instruct" }
```

## Routes protegees

Neuf routes exposent des donnees d'exploitation, dont des donnees par
visiteur : le graphe liste les identifiants, le profil rend les reponses au
diagnostic. Elles exigent une authentification des que la variable
`ANALYTICS_READ_TOKEN` est definie.

```txt
/api/dashboard
/api/visitors/graph
/api/visitors/profile
/api/quiz-results/stats
/api/video-progress/stats
/api/scenario-results/stats
/api/kit-profiles/stats
/api/feedback/stats
/api/diagnostic-responses/stats
```

Deux formes d'en-tete `Authorization` sont acceptees :

| Forme | Usage |
| --- | --- |
| `Bearer <jeton>` | script, supervision, appel en ligne de commande |
| `Basic …` | navigateur, apres authentification par `auth_basic` cote nginx |

Sans en-tete valable : `401 authentication_required`.

**Le defaut reste ouvert** pour ne pas casser un poste de developpement. Le
serveur l'annonce alors a chaque demarrage :

```txt
[securite] ANALYTICS_READ_TOKEN absent : tableau de bord, graphe, profils
et statistiques repondent sans authentification.
```

En production, la protection tient a trois elements : la variable, le fichier
`/etc/nginx/.htpasswd-resilience`, et les blocs `auth_basic` de la
configuration nginx. Deux sur trois ne protegent rien.

## Stockage

Les evenements analytics et les retours du formulaire sont ecrits dans SQLite:

```txt
server/data/resilience.sqlite
```

Tables creees automatiquement:

- `analytics_events`;
- `user_feedback`.

Les evenements sont aussi conserves en JSONL comme trace locale compatible:

```txt
server/data/events.jsonl
```

Le dossier `server/data/` est ignore par git pour eviter de versionner des donnees de test ou d'exploitation.

Chaque ligne contient un evenement normalise:

- identifiant technique d'evenement;
- nom d'evenement autorise;
- nom metrique;
- identifiant visiteur anonyme local;
- version applicative;
- chemin public normalise;
- identifiant de campagne non nominatif;
- horodatage serveur.

## Donnees interdites

Le collecteur ne doit jamais recevoir:

- nom ou prenom;
- telephone;
- email;
- adresse precise;
- reponses detaillees au diagnostic;
- score individuel;
- donnee medicale;
- document personnel;
- geolocalisation fine.

## Evenements actuellement acceptes

| Front                   | Metrique preuve n°09       |
| ----------------------- | -------------------------- |
| `page_view`             | `page_view`                |
| `action_plan_opened`    | `action_plan_opened`       |
| `certificate_generated` | `certificate_generated`    |
| `checklist_progress`    | `checklist_progress`       |
| `diagnostic_started`    | `journey_started`          |
| `diagnostic_completed`  | `journey_completed`        |
| `feedback_submitted`    | `feedback_submitted`       |
| `result_viewed`         | `diagnostic_result_viewed` |
| `checklist_opened`      | `checklist_opened`         |
| `kit_opened`            | `emergency_kit_generated`  |
| `pdf_downloaded`        | `pdf_downloaded`           |
| `source_opened`         | `source_opened`            |
| `technical_error`       | `technical_error`          |

## Variables serveur

```bash
HOST=127.0.0.1
PORT=8787
ANALYTICS_DATA_FILE=server/data/events.jsonl
RESILIENCE_DATABASE_FILE=server/data/resilience.sqlite
ANALYTICS_ALLOWED_ORIGINS=https://domaine-final.fr
# Vide = routes d exploitation ouvertes. A remplir en production.
ANALYTICS_READ_TOKEN=
```

## Variables front

```bash
VITE_ANALYTICS_ENABLED=true
VITE_ANALYTICS_ENDPOINT=/api/events
VITE_DASHBOARD_ENDPOINT=/api/dashboard
VITE_VISITOR_RANK_ENDPOINT=/api/visitors/rank
VITE_PUBLIC_COUNTERS_ENDPOINT=/api/public-counters
VITE_FEEDBACK_DATABASE_ENABLED=true
VITE_FEEDBACK_ENDPOINT=/api/feedback
VITE_GOOGLE_ANALYTICS_ENABLED=false
VITE_GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX
```

## Verification rapide

```bash
curl http://127.0.0.1:8787/api/health
curl -X POST http://127.0.0.1:8787/api/events \
  -H 'content-type: application/json' \
  --data '{"name":"diagnostic_started","version":"1.0.0","path":"/diagnostic","visitorId":"11111111-1111-4111-8111-111111111111","campaignId":"CAMP-TEST"}'
curl http://127.0.0.1:8787/api/dashboard
npm run feedback:export
```

## Limites MVP

- Le stockage JSONL + SQLite est suffisant pour une preuve et un MVP local, mais une production longue devrait migrer vers PostgreSQL, SQLite gere ou un outil analytics dedie.
- La deduplication repose sur un identifiant anonyme local par navigateur.
- Une suppression du stockage local ou un changement d'appareil peut creer un nouveau visiteur technique.
- L'acces au endpoint dashboard doit etre protege avant une production publique si les volumes reels ne doivent pas etre publics.
- Les exports `feedback-export.csv` et `feedback-export.json` restent dans `server/data/` et ne doivent pas etre commites.
