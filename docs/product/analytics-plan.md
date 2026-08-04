# Plan analytics

## Decision MVP

Par defaut, aucun traceur n'est actif. La variable `VITE_ANALYTICS_ENABLED=false` garde la couche analytics en no-op.

## Evenements prepares

| Evenement              | Finalite                            | Donnees exclues                |
| ---------------------- | ----------------------------------- | ------------------------------ |
| `diagnostic_started`   | Comprendre le lancement du parcours | Reponses utilisateur           |
| `diagnostic_completed` | Mesurer la completion               | Score individuel, reponses     |
| `result_viewed`        | Comprendre l'acces aux resultats    | Score individuel               |
| `pdf_downloaded`       | Mesurer l'usage du PDF              | Contenu du PDF                 |
| `checklist_opened`     | Mesurer l'usage checklist           | Cases cochees                  |
| `kit_opened`           | Mesurer l'usage kit                 | Composition detaillee du foyer |

## Regle de mise en production

Avant d'activer une solution analytics, valider:

- outil sans cookie ou consentement explicite;
- politique de confidentialite mise a jour;
- inspection reseau prouvant l'absence de reponses dans les payloads;
- finalites et durees de conservation documentees.
