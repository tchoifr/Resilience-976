# Architecture technique - Resilience 976

## Choix MVP

- Vue 3 + Vite + TypeScript strict.
- SPA statique, sans compte et sans backend.
- Vue Router pour les pages.
- Pinia pour l'etat diagnostic/checklist.
- `localStorage` pour la reprise sur le meme appareil.
- JSON versionnes pour questions, actions, kit, ressources et sources.
- Services purs pour scoring, recommandations, kit et PDF.

## Structure

```text
src/
  app/
  components/ui/
  data/
  features/assessment/
    services/
    stores/
    types/
    validation/
  views/
tests/unit/
docs/
```

## Regles de qualite

- Une responsabilite principale par fichier.
- Pas de logique metier dans les composants Vue.
- Pas de secret dans les variables `VITE_`.
- Pas de rendu HTML non maitrise depuis les contenus JSON.
- Tests unitaires prioritaires sur scoring, recommandations, kit et stockage.
