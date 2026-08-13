# Vidéo de démonstration du parcours utilisateur

## Principe

`scripts/record-demo.mjs` pilote un navigateur avec Playwright pour enregistrer une
vidéo `.webm` du parcours complet du site : accueil, diagnostic (six écrans
thématiques de quatre questions, puis le récapitulatif des réponses), résultats
(téléchargement du certificat PDF, ouverture et défilement du PDF), checklist
(téléchargement et lecture du PDF), kit, ressources, puis la bibliothèque de vidéos
(ouverture de la première vidéo, scroll, réponse au quiz, validation, retour à la
liste).

Ce n'est pas un test : les scrolls et les pauses entre les actions sont volontaires
et lents, pour que la vidéo reste regardable par un humain. Pour les tests
automatisés du parcours utilisateur, voir `tests/e2e/main-journey.spec.ts`.

Les sélecteurs utilisés (classes CSS, attributs `href`) sont indépendants de la
langue, pour que le script fonctionne à l'identique quelle que soit la locale.

Le script lance **Chrome** (pas le Chromium fourni par Playwright) via
`chromium.launch({ channel: 'chrome' })` : Chrome garde son visualiseur PDF intégré,
alors que le Chromium bundlé par Playwright a le sien désactivé (une navigation vers
un PDF y déclenche systématiquement un téléchargement au lieu d'un rendu inline).
Sans ça, impossible d'afficher le PDF téléchargé dans la même vidéo. Chrome doit
donc être installé sur la machine qui exécute le script.

## Utilisation

Le site doit tourner avant de lancer le script :

```bash
npm run build
npm run preview -- --port 4174
```

Avec `preview`, les appels `/api/*` ne sont pas proxifies : la banniere de
l'accueil affiche donc `000000` pages vues et aucun ordre d'arrivee. Pour une
video destinee a la communication, lancer plutot le serveur de statistiques et
le serveur de developpement, qui proxifie `/api` :

```bash
npm run analytics:server
npm run dev -- --port 5173
node scripts/record-demo.mjs http://127.0.0.1:5173 ./demo-video fr
```

Le port 5173 est la seule origine autorisee par defaut cote serveur
(`ANALYTICS_ALLOWED_ORIGINS`) : sur un autre port, les evenements sont refuses
en 403 et les compteurs restent a zero.

Puis, dans un autre terminal :

```bash
node scripts/record-demo.mjs <baseUrl> <outputDir> [locale]

# Exemples
node scripts/record-demo.mjs http://127.0.0.1:4174 ./demo-video fr
node scripts/record-demo.mjs http://127.0.0.1:4174 ./demo-video swb
```

- `baseUrl` : URL du site à enregistrer (défaut `http://127.0.0.1:4174`).
- `outputDir` : dossier de sortie de la vidéo (défaut `./demo-video`), créé s'il
  n'existe pas. Playwright y écrit un fichier `page@<hash>.webm`.
- `locale` : code de langue à sélectionner avant de démarrer le parcours (`fr` par
  défaut). Toute langue enregistrée dans `src/shared/i18n/i18n.service.ts`
  fonctionne (voir `docs/technical/i18n.md`).

## Adapter le scénario

Les étapes sont enchaînées dans `main()` de `scripts/record-demo.mjs`. Pour ajouter
ou modifier une étape, garder deux règles :

- Utiliser des sélecteurs indépendants de la langue (classes CSS, attributs `href`,
  structure DOM) plutôt que du texte traduit, sinon le script casse dès qu'on change
  de locale.
- Ajouter des `page.waitForTimeout(...)` autour des actions et des scrolls
  (`smoothScrollToBottom`/`scrollToTop`) pour garder un rythme regardable.
