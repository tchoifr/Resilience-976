# Strategie de tests

## Automatique

| Niveau       | Commande             | Couvre                                               |
| ------------ | -------------------- | ---------------------------------------------------- |
| Lint         | `npm run lint`       | Qualite statique Vue/TypeScript                      |
| Type-check   | `npm run type-check` | Contrats TypeScript stricts                          |
| Unitaires    | `npm run test:unit`  | Scoring, recommandations, kit, stockage              |
| Fonctionnels | `npm run test:e2e`   | Parcours accueil, diagnostic, resultats, PDF, mobile |
| Build        | `npm run build`      | Compilation production                               |

## Manuel avant publication

- Tester Chrome Android, Safari iPhone, Firefox et Edge.
- Tester un viewport 360 px.
- Tester le zoom navigateur a 200%.
- Naviguer uniquement au clavier.
- Telecharger le PDF sur mobile et desktop.
- Verifier les liens de sources.
- Verifier les textes sensibles avec un referent metier.

## Criteres bloquants MVP

- Le diagnostic ne peut pas etre termine.
- Le score n'est pas reproductible.
- Une faiblesse critique ne remonte pas dans les priorites.
- Le PDF ne se telecharge pas.
- Les donnees locales ne peuvent pas etre effacees.
- Le parcours clavier est bloque.
- Une recommandation sensible n'a pas de source.
