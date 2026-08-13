# Assistant de liens vers le contenu du site — design

Date: 12 août 2026<br>
Statut: design approuvé, prêt pour plan d'implémentation

## Contexte et motivation

Le site a déjà un assistant documentaire (`/assistant-documentaire`) qui répond avec du texte reformulé, strictement ancré sur un petit corpus de fiches validées. La demande initiale ("chatbot IA") a évolué au fil de la discussion vers quelque chose de différent : un outil qui, à partir d'une question libre ("les risques par rapport aux séismes"), renvoie directement les **liens** vers le contenu existant et déjà validé du site (vidéos, mises en situation, ressources, quiz) — pas une réponse rédigée.

Une piste complémentaire a été évoquée : intégrer le serveur MCP officiel de data.gouv.fr (lancé février 2026, expérimental, `https://mcp.data.gouv.fr/mcp`) et/ou l'API Géorisques (données officielles risques naturels/technologiques par territoire) pour enrichir les résultats avec des sources gouvernementales. **Explicitement hors périmètre pour cette V1** : API externe, couverture Mayotte non vérifiée, complexité et risques distincts (dépendance à un service tiers expérimental). À traiter comme un axe séparé une fois cette base validée.

## Pourquoi ce n'est pas un problème de sécurité comme le chatbot "connaissances libres" envisagé un temps

Une version antérieure de l'idée envisageait un LLM répondant avec ses connaissances générales sur les risques, au-delà du corpus validé — écarté en cours de discussion car ça entre en tension directe avec le principe "jamais de conseil non validé" affiché partout sur le site (bandeau permanent, assistant existant, mentions légales). La version retenue ici est fondamentalement différente : le LLM ne génère aucune affirmation nouvelle, il **sélectionne** parmi un index de contenu déjà validé et publié sur le site. Le risque de désinformation est donc largement écarté — au pire, une sélection non pertinente, jamais un fait inventé. C'est ce qui permet de rendre l'outil public dès cette V1 (contrairement à l'outil de traduction shimaore, réservé à l'équipe).

## Portée retenue

- **Types de contenu indexés** : vidéos (`/videos/:slug`), mises en situation (`/mises-en-situation/:id`), ressources (`/ressources`, une seule page — pas de lien profond par fiche, limite des données actuelles), quiz (`/quiz`, lien générique — les questions sont tirées au hasard, pas de garantie de tomber sur le bon risque).
- **Page publique**, nouvelle route `/assistant-liens`, **pas ajoutée à `AppHeader.vue`** pour l'instant (même trajectoire initiale que `/assistant-documentaire` : accessible par lien direct, ajoutée au menu plus tard une fois validée).
- Le LLM ne renvoie jamais une URL directement : il sélectionne des identifiants dans l'index, le serveur résout ces identifiants vers les vraies URLs et rejette silencieusement tout identifiant inconnu (défense en profondeur contre une hallucination du modèle).
- Hors périmètre explicite : intégration data.gouv.fr/Géorisques (voir ci-dessus), authentification, ajout au menu principal.

## Architecture

**Backend** — nouvel endpoint `POST /api/assistant-liens` dans `server/analytics-server.mjs`, même squelette que les deux endpoints précédents (assistant documentaire, brouillon de traduction) :

- Réutilise `HF_TOKEN`, `HF_CHAT_MODEL`, `HF_ROUTER_URL`.
- Limite de débit dédiée (compteur distinct, même mécanisme que les deux autres).
- Nouveau fichier de données `src/data/resources.json` déjà existant, mais pas encore chargé côté serveur : ajouter `RESOURCES_FILE` + `getResourcesIndex()` sur le modèle de `getVideosIndex()`/`getScenariosIndex()`/`getQuizQuestionsIndex()` déjà en place.
- Logique de construction d'index et de validation de la réponse LLM extraite dans un module serveur séparé et testable, `server/content-links.mjs` (même principe que `server/translation-draft.mjs`) : `buildContentIndex(videos, scenarios, resources, quizQuestions)`, `buildContentLinksSystemPrompt(index)`, `parseContentLinksCompletion(rawContent, index)`.

**Frontend** — nouvelle vue `ContentLinksView.vue`, route `/assistant-liens` dans `router.ts`, absente de `AppHeader.vue`.

## Construction de l'index

Chaque entrée est réduite à `{id, type, title, riskOrDomain, url}` :

| Type | Source | `riskOrDomain` | `url` |
| --- | --- | --- | --- |
| `video` | `videos.json` | `risk` (texte libre, ex. "Cyclone et fortes pluies") | `/videos/{slug}` |
| `scenario` | `scenarios.json` | `domain` | `/mises-en-situation/{id}` |
| `resource` | `resources.json` | `domain` | `/ressources` (identique pour toutes les entrées resource) |
| `quiz` | `quiz-questions.json`, dédupliqué par `risk` (un seul repère par risque, pas un par question) | `risk` (slug, ex. "cyclone") | `/quiz` (identique pour toutes) |

L'index est construit une fois et mis en cache en mémoire (même pattern que `assistantEntriesIndex`), invalidé seulement au redémarrage du serveur — cohérent avec le reste du fichier, aucun contenu n'y change à chaud.

## Flux de données

1. Le visiteur pose une question libre, l'envoie.
2. Le frontend envoie `{ question }` à `POST /api/assistant-liens`.
3. Le serveur valide/sanitize (plafond de longueur, sur le modèle de `sanitizeAssistantQuestion`), vérifie `HF_TOKEN` et la limite de débit dédiée.
4. Le serveur construit (ou récupère du cache) l'index, l'inclut dans le prompt système avec la question, demande une réponse JSON structurée : `{"matchedIds": string[], "refused": boolean}`.
5. Le serveur **valide chaque id retourné contre l'index réel** — tout id inconnu est silencieusement ignoré plutôt que de faire planter la requête ou d'exposer un lien cassé.
6. Le serveur résout les ids valides vers `{title, type, url}`, limite à 6 résultats maximum, renvoie `{ matches: [...], refused: boolean }`.
7. Si `refused` est vrai ou qu'aucun id valide ne subsiste après validation, le frontend affiche un message de repli invitant à consulter `/ressources`.
8. Le frontend affiche la liste sous forme de cartes cliquables (titre, type, lien), dans un historique de session comme les deux assistants précédents.

## Gestion d'erreurs

Mêmes codes que les endpoints existants, réutilisés directement : `400 invalid_question` (texte vide/trop long), `503 assistant_links_unconfigured` (`HF_TOKEN` absent), `429 rate_limited`, `502 assistant_links_upstream_error` (échec d'appel ou JSON illisible). Pas de retry automatique.

## Interface

Même modèle visuel que `/assistant-documentaire` : zone de texte, bouton d'envoi, historique de session déroulant. Chaque réponse s'affiche comme une liste de cartes (une par correspondance) : type (badge — Vidéo / Mise en situation / Ressources / Quiz), titre, lien cliquable vers la page réelle. En l'absence de correspondance : message de repli + lien vers `/ressources`. Réutilise `AppAlert`, `AppButton`, le style `.assistant-transcript`/`.assistant-message` déjà en place.

## Tests

- Tests unitaires (`server/content-links.mjs`) : construction de l'index à partir de jeux de données factices pour chaque type ; validation qui rejette un id inconnu retourné par le LLM ; troncature à 6 résultats maximum.
- Test e2e Playwright : requête mockée sur `/api/assistant-liens`, vérifie l'affichage des cartes de résultat et le cas de repli sans correspondance.

## Hors périmètre (explicitement)

- Intégration MCP data.gouv.fr / API Géorisques / API Vigilance Météo-France — axe séparé, à instruire une fois cette V1 validée (couverture Mayotte à vérifier, dépendance à un service tiers expérimental).
- Lien profond par ressource individuelle (nécessiterait de faire évoluer `ResourcesView.vue`, hors périmètre ici).
- Ajout au menu principal `AppHeader.vue`.
- Authentification.
