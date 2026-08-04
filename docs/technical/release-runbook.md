# Runbook de release

## Avant release

1. Verifier le statut dans `BACKLOG_STATUS.md`.
2. Confirmer que les contenus sensibles sont valides ou explicitement marques `to_validate`.
3. Lancer:

```bash
npm ci
npm run quality
npm run test:e2e
npm audit --audit-level=critical
```

4. Generer le sitemap avec le domaine final:

```bash
VITE_PUBLIC_BASE_URL=https://domaine-final.fr npm run seo:sitemap
```

5. Relancer `npm run build`.

## Publication

- Publier uniquement le dossier `dist`.
- Verifier HTTPS.
- Tester les routes directes:
  - `/`
  - `/diagnostic`
  - `/resultats`
  - `/checklist`
  - `/kit`
  - `/ressources`
  - `/mentions-legales`
- Tester le telechargement PDF.
- Tester l'effacement des donnees locales.

## Rollback

- Revenir a la version precedente depuis l'hebergeur.
- Verifier que le domaine repond en HTTPS.
- Tester accueil, diagnostic et PDF.
- Documenter l'incident et la version restauree.
