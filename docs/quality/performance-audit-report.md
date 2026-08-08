# Rapport performance et qualite

Date: 8 aout 2026<br>
Statut: trame prete, mesures finales a executer sur URL de preview ou production

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

## Resultats a renseigner

| Page                         | Performance | Accessibilite | Bonnes pratiques | SEO | Statut    |
| ---------------------------- | ----------: | ------------: | ---------------: | --: | --------- |
| Accueil                      |           — |             — |                — |   — | A mesurer |
| Diagnostic                   |           — |             — |                — |   — | A mesurer |
| Ressources                   |           — |             — |                — |   — | A mesurer |
| Tableau de bord              |           — |             — |                — |   — | A mesurer |
| Experimentation utilisateurs |           — |             — |                — |   — | A mesurer |

## Controles manuels restants

- lecteur d'ecran NVDA ou VoiceOver;
- mobile Android reel;
- iPhone Safari reel;
- telechargement PDF sur mobile;
- lisibilite des exports PDF imprimes.
