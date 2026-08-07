# Matrice de validation contenus

Date de preparation: 4 aout 2026  
Derniere revue interne: 7 aout 2026  
Statut: revue editoriale interne completee, validation metier externe requise avant publication officielle

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

## Revue interne du 7 aout 2026

| Controle                                                                 | Resultat |
| ------------------------------------------------------------------------ | -------- |
| Les 24 questions FR sont rattachees a au moins une source officielle      | OK       |
| Les questions SWB conservent les memes IDs, poids, criticites et sources  | OK       |
| Les actions FR/SWB ont une source et restent marquees `to_validate`       | OK       |
| Les elements du kit FR/SWB ont une source et restent marques `to_validate`| OK       |
| Les ressources FR/SWB ont une source et restent marquees `to_validate`    | OK       |
| Les sources officielles sont marquees `validated` avec date de consultation | OK     |
| Aucune question ne demande nom, adresse, document, pathologie ou donnee medicale detaillee | OK |
| Les textes sensibles evitent les consignes d'alerte temps reel ou de secours | OK    |

Conclusion: le contenu est coherent pour une revue porteur/referent. Les statuts `to_validate` sont conserves pour les questions metier, actions, ressources et kit afin de ne pas confondre revue interne et validation officielle.

## Points a signer avant fermeture definitive

| Point | Responsable attendu | Preuve attendue |
| ----- | ------------------- | --------------- |
| Bareme de scoring, poids et criticites | Porteur + referent risques | Validation datee dans le registre des sources |
| Recommandations et instructions d'actions | Referent risques | Validation datee ou corrections integrees |
| Kit d'urgence et quantites eventuelles | Referent risques | Validation datee, source officielle associee |
| Traduction shimaore / kibushi utilisee dans l'app | Relecteur local | Relecture datee avec corrections integrees |
| Mentions legales et limites du service | Porteur + legal | Accord date ou version approuvee |

## Regle de fermeture des tickets contenus

Un ticket contenu peut passer a "termine" seulement si:

- le texte est relu;
- la source officielle est associee;
- le statut JSON est `validated`;
- le changement de bareme est trace si score ou criticite change;
- la version du questionnaire est mise a jour si necessaire.
