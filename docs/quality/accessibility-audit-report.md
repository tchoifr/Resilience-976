# Rapport d'audit accessibilité — archivé

> **Document historique, conservé pour mémoire. Ne pas l'utiliser comme
> rapport d'accessibilité.**
>
> Le rapport de référence est
> [`docs/quality/rgaa-pre-evaluation.md`](./rgaa-pre-evaluation.md) :
> pré-évaluation RGAA 4.1.2 du 14 août 2026, sur un échantillon de 18 pages,
> 73 critères conformes sur 74 applicables et évalués.
>
> Ce qui suit décrit l'état des vérifications au 7 août 2026, avant la refonte
> de l'interface et avant la pré-évaluation par critère. Plusieurs de ses
> constats sont périmés : les contrôles qu'il annonçait « à faire » ont depuis
> été menés, et les défauts qu'il ne voyait pas — lien d'évitement menant à une
> zone vide, `aria-label` invalides, page de mise en situation sans `<h1>` —
> ont été trouvés et corrigés depuis.

Date : 4 août 2026<br>
Dernière mise à jour : 7 août 2026<br>
Statut : **archivé le 14 août 2026**

## Ce que ce document apportait

Une liste de contrôles automatisés (axe sur quatre pages, en desktop et en
mobile) et une liste de contrôles manuels à réaliser avant publication. Il ne
comportait pas de grille par critère, ni de taux de conformité, ni d'échantillon
de pages arrêté — trois éléments qu'un rapport RGAA doit porter.

## Contrôles automatisés d'alors

| Contrôle | Résultat |
| --- | --- |
| Axe WCAG accueil, diagnostic, ressources, mentions légales (desktop) | OK |
| Axe WCAG mêmes pages (mobile) | OK |
| Responsive 360 px sans défilement horizontal | OK |

La pré-évaluation du 14 août a étendu ce périmètre à 18 pages, en desktop et en
mobile, sans violation axe — et a surtout ajouté ce qu'axe ne couvre pas :
validité du code, navigation clavier relevée tabulation par tabulation,
espacement du texte, reflow à 320 × 256 px, contraste des composants
d'interface, transcription et sous-titres des médias.

## Anomalie corrigée à l'époque, toujours valable

Contraste du bouton danger : le rouge charte `#E63946` avec texte blanc ne
passait pas WCAG AA pour du texte de 16 px. La variante
`--color-danger-strong: #B4232E` est utilisée pour les boutons destructifs.
