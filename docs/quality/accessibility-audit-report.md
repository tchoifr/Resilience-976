# Rapport d'audit accessibilite

> Ce document couvre les controles automatises et manuels du projet.
> L'evaluation par critere RGAA vit desormais dans
> `docs/quality/rgaa-pre-evaluation.md` (14 aout 2026, taux de conformite
> 91,3 %).

Date: 4 aout 2026  
Derniere mise a jour: 7 aout 2026  
Statut: audit automatique OK, controles manuels simulables ajoutes, audit lecteur d'ecran/appareils reels a finaliser

## Automatique

| Controle                                 | Resultat |
| ---------------------------------------- | -------- |
| Axe WCAG accueil desktop                 | OK       |
| Axe WCAG diagnostic desktop              | OK       |
| Axe WCAG ressources desktop              | OK       |
| Axe WCAG mentions legales desktop        | OK       |
| Axe WCAG accueil mobile                  | OK       |
| Axe WCAG diagnostic mobile               | OK       |
| Axe WCAG ressources mobile               | OK       |
| Axe WCAG mentions legales mobile         | OK       |
| Responsive 360 px sans scroll horizontal | OK       |

## Manuel a realiser avant publication

| Controle                           | Statut       | Notes                                      |
| ---------------------------------- | ------------ | ------------------------------------------ |
| Navigation complete au clavier     | Automatise   | Accueil vers diagnostic, radio, CTA        |
| Focus visible sur toutes les pages | Partiel OK   | Couvert par parcours clavier; revue visuelle finale conseillee |
| Zoom 200%                          | Automatise   | Accueil, diagnostic, ressources, mentions legales |
| Lecteur d'ecran                    | A faire      | NVDA ou VoiceOver sur appareil reel        |
| Images desactivees                 | Automatise   | Accueil comprehensible sans assets image   |
| Impression checklist               | Automatise   | Mode print sans debordement horizontal     |
| PDF mobile                         | A faire      | Android et iPhone reels                    |

## Controles ajoutes le 7 aout 2026

Les controles suivants sont couverts par `tests/e2e/accessibility.spec.ts`:

- navigation clavier du parcours principal avec lien d'evitement, entree diagnostic, choix radio et bouton continuer;
- zoom 200% sur les pages publiques critiques sans debordement horizontal;
- accueil comprehensible lorsque les images ne chargent pas;
- checklist consultable en media print sans debordement horizontal.

## Limites restantes

Les tests automatises ne remplacent pas une revue RGAA humaine. Avant publication officielle, il faut encore verifier:

- annonce des titres, formulaires, radios, alertes et changements d'etape avec NVDA ou VoiceOver;
- PDF genere sur Android et iPhone reels;
- lisibilite et ordre de lecture des PDF exportes;
- coherence des libelles traduits avec un relecteur local.

## Anomalie corrigee

- Contraste du bouton danger: le rouge charte `#E63946` avec texte blanc ne passait pas WCAG AA pour du texte 16 px. Une variante `--color-danger-strong: #B4232E` est utilisee pour les boutons destructifs.
