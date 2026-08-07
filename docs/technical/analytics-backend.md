# Backend analytics MVP

## Objectif

Le backend analytics sert a produire des statistiques agregees pour le tableau de bord d'impact sans creer de compte utilisateur et sans collecter de donnees nominatives.

Il couvre la piece de preuve n°09:

- compter les visiteurs engages uniques;
- compter les parcours commences et termines;
- mesurer les consultations de resultats;
- mesurer les ouvertures de checklist, kit et telechargements PDF;
- attribuer les usages a une campagne non nominative;
- exposer des agregats au tableau de bord `/tableau-de-bord`.

## Fichier principal

```txt
server/analytics-server.mjs
```

Le serveur utilise uniquement les modules natifs Node.js. Il n'ajoute pas Express, Fastify, base SQL ou dependance externe.

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

## Stockage

Les evenements sont ecrits en JSONL:

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

| Front | Metrique preuve n°09 |
| ----- | -------------------- |
| `page_view` | `page_view` |
| `diagnostic_started` | `journey_started` |
| `diagnostic_completed` | `journey_completed` |
| `result_viewed` | `diagnostic_result_viewed` |
| `checklist_opened` | `checklist_opened` |
| `kit_opened` | `emergency_kit_generated` |
| `pdf_downloaded` | `pdf_downloaded` |
| `technical_error` | `technical_error` |

## Variables serveur

```bash
HOST=127.0.0.1
PORT=8787
ANALYTICS_DATA_FILE=server/data/events.jsonl
ANALYTICS_ALLOWED_ORIGINS=https://domaine-final.fr
```

## Variables front

```bash
VITE_ANALYTICS_ENABLED=true
VITE_ANALYTICS_ENDPOINT=/api/events
VITE_DASHBOARD_ENDPOINT=/api/dashboard
```

## Verification rapide

```bash
curl http://127.0.0.1:8787/api/health
curl -X POST http://127.0.0.1:8787/api/events \
  -H 'content-type: application/json' \
  --data '{"name":"diagnostic_started","version":"1.0.0","path":"/diagnostic","visitorId":"11111111-1111-4111-8111-111111111111","campaignId":"CAMP-TEST"}'
curl http://127.0.0.1:8787/api/dashboard
```

## Limites MVP

- Le stockage JSONL est suffisant pour une preuve et un MVP local, mais une production longue devrait migrer vers PostgreSQL, SQLite gere ou un outil analytics dedie.
- La deduplication repose sur un identifiant anonyme local par navigateur.
- Une suppression du stockage local ou un changement d'appareil peut creer un nouveau visiteur technique.
- L'acces au endpoint dashboard doit etre protege avant une production publique si les volumes reels ne doivent pas etre publics.
