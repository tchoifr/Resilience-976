# Search Console et QR codes

## Pre-requis

- Domaine final en HTTPS.
- Version de production publiee.
- `VITE_PUBLIC_BASE_URL` renseigne avec le domaine final.
- Validation porteur pour Google Analytics ou autre outil de mesure.

## Sitemap

```bash
VITE_PUBLIC_BASE_URL=https://domaine-final.fr npm run seo:sitemap
npm run build
```

Verifier ensuite:

```txt
https://domaine-final.fr/sitemap.xml
https://domaine-final.fr/robots.txt
https://domaine-final.fr/llms.txt
```

`npm run seo:sitemap` genere les trois fichiers a partir du meme `VITE_PUBLIC_BASE_URL` (`public/sitemap.xml`, `public/robots.txt`, `public/llms.txt` — ce dernier suit https://llmstxt.org/).

## Google Search Console

1. Ajouter la propriete du domaine final.
2. Valider la propriete par DNS ou fichier HTML.
3. Soumettre `https://domaine-final.fr/sitemap.xml`.
4. Demander l'indexation des pages publiques prioritaires:
   - `/`;
   - `/diagnostic`;
   - `/ressources`;
   - `/videos`;
   - `/mentions-legales`.
5. Conserver les captures de validation et de soumission.

## Google Analytics

L'integration front est inactive par defaut. Pour l'activer explicitement:

```bash
VITE_ANALYTICS_ENABLED=true
VITE_GOOGLE_ANALYTICS_ENABLED=true
VITE_GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX
```

Avant activation publique, verifier la base legale, le bandeau ou l'information requise, et l'absence de reponses detaillees dans les payloads reseau.

## Liens de campagne pour QR codes

Generer la table des liens:

```bash
VITE_PUBLIC_BASE_URL=https://domaine-final.fr npm run seo:campaign-links
```

Sorties:

```txt
docs/communication/campaign-links.csv
docs/communication/campaign-links.md
```

Chaque URL contient un `campaign_id` non nominatif pour alimenter le tableau de bord. Les images QR finales doivent etre generees depuis la colonne `url` apres validation du domaine final.
