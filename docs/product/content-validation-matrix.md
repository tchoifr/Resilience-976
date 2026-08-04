# Matrice de validation contenus

Date de preparation: 4 aout 2026  
Statut: pret pour revue metier

## Sources verifiees

| ID                            | Source                                          | URL                                                                                                                                               | Statut       |
| ----------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| `source_prefecture_mayotte`   | Prefecture de Mayotte - risques meteorologiques | https://www.mayotte.gouv.fr/Actions-de-l-Etat/Prevention-des-risques-et-securite/Prevention-des-risques2/Risques-naturels/Risques-meteorologiques | URL verifiee |
| `source_gouvernement_risques` | Securite civile - kit d'urgence                 | https://www.securite-civile.interieur.gouv.fr/reagir/comment-se-preparer-face-aux-risques/kit-durgence                                            | URL verifiee |
| `source_fr_alert`             | FR-Alert                                        | https://www.fr-alert.gouv.fr/                                                                                                                     | URL verifiee |
| `source_croix_rouge`          | Croix-Rouge francaise - sac d'urgence           | https://www.croix-rouge.fr/faire-face-au-choc-climatique-nos-propositions-pour-une-meilleure/catakit-preparer-son-sac-durgence                    | URL verifiee |

## Decisions editoriales a valider

| Sujet                  | Proposition actuelle                                                                                      | Validation requise         |
| ---------------------- | --------------------------------------------------------------------------------------------------------- | -------------------------- |
| Duree d'autonomie kit  | Mention prudente de kit 72h et quantites non detaillees dans l'app                                        | Referent risques           |
| Questions diagnostic   | 24 questions sur foyer, logement, eau/alimentation, energie/communication, sante/documents, comportements | Referent risques + porteur |
| Poids et criticites    | Bareme initial inspire du guide produit                                                                   | Porteur + referent risques |
| Actions immediates     | Actions derivees des reponses faibles et criticites                                                       | Referent risques           |
| Sante/documents        | Aucune donnee medicale detaillee saisie dans l'application                                                | Porteur + legal            |
| Message responsabilite | Outil de sensibilisation, pas alerte temps reel, pas secours                                              | Porteur + legal            |

## Regle de fermeture des tickets contenus

Un ticket contenu peut passer a "termine" seulement si:

- le texte est relu;
- la source officielle est associee;
- le statut JSON est `validated`;
- le changement de bareme est trace si score ou criticite change;
- la version du questionnaire est mise a jour si necessaire.
