# Rapport d'audit accessibilite

Date: 4 aout 2026  
Statut: audit automatique OK, audit manuel a completer

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

| Controle                           | Statut  | Notes                               |
| ---------------------------------- | ------- | ----------------------------------- |
| Navigation complete au clavier     | A faire | Tab, Maj+Tab, Entree, Espace        |
| Focus visible sur toutes les pages | A faire | Verifier parcours complet           |
| Zoom 200%                          | A faire | Accueil, diagnostic, resultats, PDF |
| Lecteur d'ecran                    | A faire | NVDA ou VoiceOver                   |
| Images desactivees                 | A faire | Compréhension maintenue             |
| Impression checklist               | A faire | Noir et blanc                       |
| PDF mobile                         | A faire | Android et iPhone reels             |

## Anomalie corrigee

- Contraste du bouton danger: le rouge charte `#E63946` avec texte blanc ne passait pas WCAG AA pour du texte 16 px. Une variante `--color-danger-strong: #B4232E` est utilisee pour les boutons destructifs.
