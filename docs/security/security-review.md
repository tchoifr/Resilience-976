# Revue securite MVP

Date: 4 aout 2026

## Decisions

- Aucun compte utilisateur.
- Aucun backend.
- Aucune base de donnees.
- Reponses stockees uniquement dans `localStorage`.
- Pas d'adresse complete, pas d'email, pas de donnees medicales detaillees.
- Analytics desactive par defaut.
- Aucun secret dans les variables `VITE_`.

## Mesures implementees

- Cle `localStorage` versionnee.
- Bouton d'effacement local.
- Validation Zod des JSON.
- Pas de `v-html` pour les contenus metier.
- Liens externes avec `rel="noopener noreferrer"`.
- Headers Netlify: CSP, nosniff, Referrer-Policy, Permissions-Policy, X-Frame-Options.
- Audit npm critique a 0 vulnerabilite connu au 4 aout 2026.

## Risques restants

- Les contenus de securite civile doivent etre valides par un referent metier.
- Les quantites du kit ne doivent pas etre publiees sans source officielle validee.
- La CSP devra etre retestee chez l'hebergeur final.
- Une PWA future devra gerer l'invalidation du cache pour eviter les contenus obsoletes.
