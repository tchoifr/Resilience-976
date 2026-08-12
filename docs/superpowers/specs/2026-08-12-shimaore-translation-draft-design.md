# Outil d'aide à la traduction shimaore — design

Date: 12 août 2026<br>
Statut: design approuvé, prêt pour plan d'implémentation

## Contexte et motivation

`src/shared/i18n/locales/swb.ts` porte déjà l'aveu explicite : "Brouillon non relu par un locuteur natif (comme le reste de ce fichier)". Les traductions shimaore actuelles sont des suppositions best-effort, sans méthode particulière derrière. Le site affiche même un bandeau dédié (`languageDemo`) pour prévenir le visiteur que la traduction n'est pas validée.

Une recherche menée pendant le brainstorm a identifié des travaux académiques récents et concrets sur le comorien (dont le shimaore est un dialecte) :

- **Mwando** (juillet 2026) : assistant IA pour le shiKomori, architecture RAG (corpus + recherche vectorielle + LLM) — valide notre approche existante pour l'assistant documentaire.
- **Harnessing Transfer Learning from Swahili: Advancing Solutions for Comorian Dialects** (Deep Learning Indaba 2024, arXiv:2412.12143) : exploite la proximité lexicale entre swahili et comorien. Résultats mesurés : traduction automatique ROUGE-1 0.68 (correct mais imparfait), reconnaissance vocale WER 39,5% / CER 13,8% (pas fiable pour un usage direct, surtout en contexte sécurité).

Conclusion retenue : la **voix** reste hors de portée pour de la production sur ce projet (confirmé par les chiffres, pas juste par intuition). Le **texte**, via le principe du passage par le swahili comme langue pivot, est exploitable — pas pour remplacer la relecture humaine, mais pour améliorer le premier jet avant relecture.

## Approches écartées

- **Traduction vocale (STT/TTS) en shimaore** : aucune voix de synthèse commerciale n'existe pour cette langue ; la reconnaissance vocale n'atteint pas un niveau fiable même sur le swahili, langue bien mieux dotée. Écarté pour la production.
- **Traduction directe français → shimaore sans passage par le swahili** : plus simple à prompter, mais n'exploite pas la proximité lexicale documentée par la recherche ; qualité attendue moins bonne.
- **Génération entièrement automatique sans relecture humaine** : rejeté d'emblée — le shimaore reste une langue à faibles ressources, aucune sortie de LLM ne doit être publiée sans validation par un locuteur natif.

## Portée retenue

Un outil interne, pas une fonctionnalité visiteur : une page à URL non listée (jamais ajoutée à `AppHeader.vue`), sur le même principe que `/assistant-documentaire`. Aide au **premier jet** de traduction, jamais une publication automatique — le geste de "sauvegarde" reste une édition manuelle de `swb.ts` par un humain après relecture.

## Architecture

**Backend** — nouvel endpoint `POST /api/i18n/draft-shimaore` dans `server/analytics-server.mjs`, calqué sur `/api/assistant/ask` :

- Réutilise `HF_TOKEN`, `HF_CHAT_MODEL`, `HF_ROUTER_URL` déjà configurés pour l'assistant.
- Limite de débit **dédiée**, compteur distinct de celui de l'assistant (même mécanisme qu'`allowAssistantRequest`, dupliqué) : un usage interne en rafale (traduire tout un fichier phrase par phrase) ne doit pas consommer le quota des visiteurs réels de l'assistant public.
- Prompt système imposant la chaîne **français → swahili → shimaore**, en s'appuyant explicitement sur la proximité lexicale swahili-comorien (principe de l'article de recherche), et embarquant 5 à 10 entrées déjà présentes dans `swb.ts` comme glossaire de style/vocabulaire à suivre.
- Demande une réponse structurée en JSON (`{ swahili, shimaore }`) pour un parsing fiable, plutôt qu'un texte libre à découper.

**Frontend** — nouvelle vue `TranslationDraftView.vue`, route non listée `/outils/traduction-shimaore` ajoutée à `router.ts` mais absente de `AppHeader.vue`.

Aucune nouvelle dépendance, aucune nouvelle clé API, aucune nouvelle table en base — le serveur ne persiste rien.

## Interface

Écran unique, sur le modèle visuel de `AssistantView.vue` :

- Zone de texte pour coller le français source, bouton pour lancer la traduction.
- Historique déroulant des traductions de la session (comme le fil de conversation de l'assistant) : chaque entrée affiche trois blocs — français source, swahili intermédiaire, shimaore final.
- Bandeau permanent (`AppAlert variant="warning"`) : "Brouillon non validé — à faire relire par un locuteur natif avant toute publication dans `swb.ts`."
- Bouton "copier" sur le résultat shimaore pour faciliter le collage dans le fichier de traduction.
- Réutilise les composants existants : `AppAlert`, `AppButton`, le style `.assistant-transcript`/`.assistant-message`.

## Flux de données

1. L'utilisateur colle du français, clique sur traduire.
2. Le frontend envoie `{ text }` à `POST /api/i18n/draft-shimaore`.
3. Le serveur valide/sanitize le texte (plafond de longueur, sur le modèle de `sanitizeAssistantQuestion`), vérifie `HF_TOKEN` et la limite de débit.
4. Le serveur construit le prompt (chaîne swahili + glossaire `swb.ts`), appelle Hugging Face.
5. Le serveur parse la réponse JSON, renvoie `{ swahili, shimaore }` au client.
6. Le frontend ajoute l'entrée à l'historique de session (état local, non persisté).
7. La sauvegarde réelle reste un geste humain : copier-coller dans `swb.ts`, relecture par un locuteur natif, commit normal.

## Gestion d'erreurs

Réutilise directement les codes déjà éprouvés par l'assistant existant :

| Cas | Code | Comportement |
| --- | --- | --- |
| Texte vide ou trop long | 400 | Rejeté, message clair, bouton déjà désactivé côté client si vide |
| `HF_TOKEN` non configuré | 503 | Message "outil non configuré" |
| Limite de débit atteinte | 429 | Message "réessayer dans quelques instants" |
| Réponse LLM non parsable ou appel échoué | 502 | Message "échec de la traduction, réessayez" |

Pas de retry automatique, cohérent avec l'assistant existant.

## Tests

- Tests unitaires : construction du prompt (glossaire bien inclus, texte utilisateur bien sanitizé), parsing de la réponse JSON (cas valide, cas malformé géré proprement sans crash serveur).
- Test e2e Playwright : parcours complet dans un vrai navigateur — saisie, soumission, affichage des trois blocs, bouton copier. Isolé des autres specs e2e existantes (page non listée, pas de lien à suivre depuis la nav).

## Hors périmètre (explicitement)

- Toute forme de reconnaissance ou synthèse vocale en shimaore.
- Publication automatique dans `swb.ts` sans intervention humaine.
- Extension au kibushi (deuxième langue de Mayotte, non traitée ici — pourrait faire l'objet d'un design séparé si la même approche s'avère utile).
- Authentification/contrôle d'accès — reste une page à URL non listée, cohérent avec le reste du site (aucun compte nulle part).
