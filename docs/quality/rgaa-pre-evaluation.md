# Pré-évaluation RGAA 4.1.2

Date : 14 août 2026<br>
Référentiel : RGAA 4.1.2, 106 critères répartis en 13 thématiques<br>
Portée : pré-évaluation interne, **ce n'est pas un audit de conformité formel**

## Ce que ce document est, et ce qu'il n'est pas

Une pré-évaluation mesure l'état d'accessibilité pour piloter les corrections.
Elle ne remplace pas l'audit de conformité exigé pour publier une déclaration
de conformité : celui-ci suppose un échantillon arrêté avec le porteur du
service, la totalité des tests de chaque critère et des essais sur lecteur
d'écran réel. Il peut être mené **en interne** aussi bien que par un
prestataire : le référentiel ne l'impose pas.

Un critère reste marqué « non évalué » plutôt que deviné — le compter comme
conforme gonflerait artificiellement le résultat.

## Résultat

| | Nombre |
| --- | ---: |
| Conformes | 73 |
| Non conformes | 1 |
| Non applicables | 31 |
| Non évalués | 1 |
| **Total** | **106** |

**Taux de conformité : 98,6 %** (73 conformes sur 74 critères applicables et
évalués). Le taux exclut les critères non applicables, conformément à la
méthode RGAA, et exclut aussi le critère non évalué.

La première passe, avant corrections, relevait **6 non-conformités sur
69 critères applicables**, soit 91,3 %.

## Méthode

Échantillon de 18 pages, couvrant tous les types d'écran du site : accueil,
diagnostic, résultats, checklist, kit, ressources, liste et détail de capsule
vidéo, quiz, liste et détail de mise en situation, assistant de liens,
formulaire d'avis, mentions légales, politique de confidentialité, déclaration
d'accessibilité, support, tableau de bord.

Outils et vérifications :

- **axe-core** (via `@axe-core/playwright`), règles WCAG 2.0 A/AA et 2.1 A/AA,
  sur les 18 pages en desktop (1280 px) et en mobile (360 px) : **aucune
  violation**.
- **Relevé mécanique du DOM** sur les 18 pages : alternatives d'images,
  intitulés de liens, étiquettes de champs, regroupements de champs, titres et
  hiérarchie, régions, pistes de sous-titres, lien d'évitement.
- **Validateur du W3C** sur le DOM rendu de 5 pages (critère 8.2).
- **Navigation clavier réelle** : 22 tabulations relevées une à une, avec le
  style de focus effectif — `:focus-visible` ne s'applique pas à un `focus()`
  déclenché par script, une mesure programmatique aurait conclu à tort à une
  non-conformité.
- **Reflow et zoom** : 320 × 256 px, texte à 200 %, espacement du texte
  redéfini (interligne 1,5, lettres 0,12 em, mots 0,16 em).
- **Relevé image par image de la capsule vidéo**, pour lire les sous-titres
  incrustés et en établir la transcription.
- **Revue de code** pour les critères que le rendu ne montrait pas, notamment
  le tableau alternatif des courbes du tableau de bord, absent du rendu faute
  de données dans le jeu d'essai.

Le référentiel a été lu depuis sa source officielle
(`RGAA/4.1/criteres.json`, dépôt DISIC) et non de mémoire : la numérotation et
les intitulés de la grille en sont extraits automatiquement. C'est ce qui a
permis d'écarter un faux constat de ma première passe : les liens externes
ouvrant un nouvel onglet sont **conformes** au critère 13.2, qui exige
seulement que l'ouverture soit déclenchée par l'utilisateur.

La grille est construite sur `criteres.json` du dépôt DISIC, publié pour la
version 4.1. La version en vigueur, **4.1.2**, regroupe deux errata qui ne
touchent ni au nombre de critères, ni à leur numérotation, ni à leurs
intitulés : ils portent sur les tests, la méthodologie et le glossaire, et
n'invalident pas les audits déjà réalisés. Les verdicts ci-dessous valent
donc pour 4.1.2.

## La non-conformité restante

### 8.7 — Changements de langue non signalés

En version shimaoré, **89 chaînes sur 704 restent en français** : entrées de
menu « Mon plan » et « Se former », libellés du compteur de l'accueil, pages
réglementaires. La page est déclarée `lang="swb"` et aucun de ces passages ne
porte d'attribut `lang="fr"` : un lecteur d'écran les prononce avec les règles
du shimaoré.

**Correction** : traduire les 89 chaînes — la liste est prête dans
`docs/product/i18n-shimaore-a-traduire.md`, générée par `npm run i18n:check`.
Tant qu'elles ne le sont pas, le repli devrait porter un `lang="fr"`, ce qui
lèverait le critère sans rien traduire.

## Le critère non évalué

- **4.13** — compatibilité des médias avec les technologies d'assistance :
  demande un essai sur lecteur d'écran réel, qui reste à faire.

Les deux autres critères laissés en suspens lors de la première passe ont été
tranchés depuis :

- **3.3** — mesuré. Les bordures de champs de saisie et d'options de réponse
  étaient à 1,25:1 en thème clair, très en dessous du seuil de 3:1 : un jeton
  dédié aux contrôles les porte à 3,45:1 en clair et 3,41:1 en sombre. La
  bordure du bouton de pause du bandeau, turquoise sur fond turquoise, était à
  1,53:1 : elle suit désormais la couleur du texte, à 4,79:1. Pour les segments
  de progression, la distinction qui porte l'information — thème fait contre
  thème à faire — va de 3,13:1 à 4,71:1 selon la position dans le dégradé.
- **4.5** — tranché grâce au relevé image par image : les textes à l'écran
  reprennent le commentaire, l'animation illustre sans rien ajouter. Aucune
  information n'est portée par la seule image, une audiodescription n'est donc
  pas nécessaire.

## Corrections appliquées

### Défauts trouvés pendant l'évaluation

| Constat | Critère | Correction |
| --- | --- | --- |
| Pages de mise en situation sans `<h1>` | 9.1 | Le titre du scénario devient le `<h1>` de la page |
| `<select value="fr">` invalide, sur toutes les pages | 8.2 | `v-model` sur le sélecteur de langue |
| `aria-label` sur des `<div>` sans rôle — attribut invalide et **ignoré** par les technologies d'assistance | 8.2 | Jauge de score en `role="img"`, rangée de garanties en `<ul>`, groupe d'exemples en `role="group"` |
| Le lien d'évitement menait à une zone de contenu vide | 12.7 | État d'attente affiché pendant le chargement différé de la vue |

Le dernier point est le plus sérieux, et il n'a pas été trouvé par l'audit mais
par un test qui échouait depuis longtemps. Les vues sont chargées à la demande :
tant que le fragment n'était pas arrivé, `<main>` restait vide, le lien
d'évitement y déposait le focus, et **la tabulation suivante sautait la totalité
du contenu pour atterrir dans le pied de page**. Reproduit de façon
déterministe : sans attente après le chargement, le focus part dans le pied de
page ; à partir de 300 ms, il atteint le premier bouton de la page.

### Non-conformités levées

**4.1, 4.2, 4.3, 4.4 — Médias temporels.** La capsule intégrée (« Préparer son
logement », vidéo DREAL) porte des **sous-titres incrustés** : le nom du
fichier source contient `sst`, pour sous-titrage sourds et malentendants, et le
relevé image par image le confirme. Le référentiel définit les sous-titres
comme « affichés de manière synchrone avec le flux », sans exiger de piste
séparée : le critère 4.3 est donc satisfait.

Restait la transcription, dont le texte affiché n'était qu'un résumé de
372 caractères. Elle a été établie en échantillonnant la vidéo toutes les
1,5 à 3 secondes sur ses 2 min 43, en lisant les sous-titres incrustés, puis en
comblant les intervalles manquants par des relevés ciblés. La transcription
fait désormais **16 paragraphes et 2 216 caractères**, et suit le fil du
commentaire. La page de l'éditeur ne propose ni transcription ni fichier de
sous-titres téléchargeable ; ses contenus sont sous licence Etalab 2.0.

Aucune piste `.vtt` n'est ajoutée : elle ferait double emploi avec les
sous-titres incrustés et risquerait de s'en désynchroniser.

**12.1, 12.3, 12.4 — Navigation.** Une page « Plan du site » a été ajoutée
(`/plan-du-site`), listant les 32 pages publiques regroupées en trois sections.
Les capsules et les mises en situation y sont énumérées depuis les données :
un contenu ajouté apparaît sans intervention. Le lien figure dans le pied de
page, donc sur toutes les pages, ce qui satisfait aussi 12.4. Le site dispose
désormais des deux systèmes de navigation exigés par 12.1.

**13.8 — Contenu en mouvement.** Le bandeau défilant de l'accueil porte un
bouton « Mettre en pause le défilement », avec `aria-pressed`. Mesure : 1,3 px
de dérive en pause contre 67,8 px en marche sur la même durée. La préférence
système « animations réduites » continue par ailleurs de figer le bandeau.

## Contrôles restant à faire avant un audit formel

- Lecteur d'écran réel (NVDA sous Windows, VoiceOver sous iOS).
- Appareils mobiles réels, y compris le téléchargement des PDF.
- Mesure des contrastes des composants d'interface (critère 3.3).
- Relecture des libellés traduits par un locuteur du shimaoré.

## Conséquence pour la déclaration d'accessibilité

La page `/declaration-accessibilite` annonçait qu'aucun audit RGAA n'avait été
réalisé et que l'état de conformité n'était pas évalué. Elle a été reformulée
le 14 août 2026, puis mise à jour après les corrections ci-dessus. Elle ne peut
pas pour autant annoncer un taux de conformité officiel, qui suppose un audit
formel.

La section « Difficultés connues » a été reprise en même temps : elle affirmait
que contrastes et navigation clavier n'avaient pas été vérifiés, ce qui n'est
plus vrai. Une section « Ce qui a été vérifié » a été ajoutée.


## Grille des 106 critères

Verdicts : **C** conforme, **NC** non conforme, **NA** non applicable, **NE** non évalué.

### 1. Images

| Critère | Intitulé | Verdict | Justification |
| --- | --- | --- | --- |
| 1.1 | Chaque image porteuse d’information a-t-elle une alternative textuelle ? | **C** | Images decoratives (heros, vignettes, icones) portant alt="" ou aria-hidden ; aucun <img> sans alternative sur les 18 pages. |
| 1.2 | Chaque image de décoration est-elle correctement ignorée par les technologies d’assistance ? | **C** | Icones et images d’illustration ignorees par aria-hidden="true". |
| 1.3 | Pour chaque image porteuse d’information ayant une alternative textuelle, cette alternative est-elle pertinente (hors cas particuliers) ? | **C** | Aucune image porteuse d’information : l’information est toujours dans le texte adjacent. |
| 1.4 | Pour chaque image utilisée comme CAPTCHA ou comme image-test, ayant une alternative textuelle, cette alternative permet-elle d’identifier la nature et la fonction de l’image ? | **NA** | Aucun CAPTCHA. |
| 1.5 | Pour chaque image utilisée comme CAPTCHA, une solution d’accès alternatif au contenu ou à la fonction du CAPTCHA est-elle présente ? | **NA** | Aucun CAPTCHA. |
| 1.6 | Chaque image porteuse d’information a-t-elle, si nécessaire, une description détaillée ? | **C** | Le seul graphique (courbe du tableau de bord) est en SVG aria-hidden, double d’un tableau de donnees masque visuellement. |
| 1.7 | Pour chaque image porteuse d’information ayant une description détaillée, cette description est-elle pertinente ? | **C** | Le tableau de donnees associe reprend date et valeur, soit l’integralite de la courbe. |
| 1.8 | Chaque image texte porteuse d’information, en l’absence d’un mécanisme de remplacement, doit si possible être remplacée par du texte stylé. Cette règle est-elle respectée (hors cas particuliers) ? | **NA** | Aucune image texte. |
| 1.9 | Chaque légende d’image est-elle, si nécessaire, correctement reliée à l’image correspondante ? | **NA** | Aucune legende d’image. |

### 2. Cadres

| Critère | Intitulé | Verdict | Justification |
| --- | --- | --- | --- |
| 2.1 | Chaque cadre a-t-il un titre de cadre ? | **NA** | Aucun cadre (0 <iframe> sur l’echantillon). |
| 2.2 | Pour chaque cadre ayant un titre de cadre, ce titre de cadre est-il pertinent ? | **NA** | Aucun cadre. |

### 3. Couleurs

| Critère | Intitulé | Verdict | Justification |
| --- | --- | --- | --- |
| 3.1 | Dans chaque page web, l’information ne doit pas être donnée uniquement par la couleur. Cette règle est-elle respectée ? | **C** | Les verdicts sont doubles d’un libelle : « Bon reflexe / A revoir » sur le debrief, coche sur les themes termines, texte d’etat sur l’assistant de liens. |
| 3.2 | Dans chaque page web, le contraste entre la couleur du texte et la couleur de son arrière-plan est-il suffisamment élevé (hors cas particuliers) ? | **C** | axe-core : aucune violation de contraste sur 18 pages en desktop et en mobile. Contrastes de la banniere mesures a la main (4,56:1 au plus bas). |
| 3.3 | Dans chaque page web, les couleurs utilisées dans les composants d’interface ou les éléments graphiques porteurs d’informations sont-elles suffisamment contrastées (hors cas particuliers) ? | **C** | Mesure apres correction : bordures de champs et d’options de reponse a 3,45:1 en clair et 3,41:1 en sombre (jeton dedie, le jeton general tombait a 1,25:1) ; bouton de pause du bandeau a 4,79:1 ; segments de progression, la distinction porteuse d’information (fait contre a faire) va de 3,13:1 a 4,71:1 selon la position dans le degrade. |

### 4. Multimédia

| Critère | Intitulé | Verdict | Justification |
| --- | --- | --- | --- |
| 4.1 | Chaque média temporel pré-enregistré a-t-il, si nécessaire, une transcription textuelle ou une audiodescription (hors cas particuliers) ? | **C** | Transcription complete de la capsule integree, etablie a partir des sous-titres incrustes : 16 paragraphes, 2 216 caracteres. |
| 4.2 | Pour chaque média temporel pré-enregistré ayant une transcription textuelle ou une audiodescription synchronisée, celles-ci sont-elles pertinentes (hors cas particuliers) ? | **C** | La transcription suit le fil de la video, du constat initial aux amenagements puis a la conclusion. |
| 4.3 | Chaque média temporel synchronisé pré-enregistré a-t-il, si nécessaire, des sous-titres synchronisés (hors cas particuliers) ? | **C** | La video porte des sous-titres incrustes (fichier « sst », sous-titrage sourds et malentendants), affiches de maniere synchrone avec le flux, ce que demande la definition du referentiel. |
| 4.4 | Pour chaque média temporel synchronisé pré-enregistré ayant des sous-titres synchronisés, ces sous-titres sont-ils pertinents ? | **C** | Les sous-titres restituent le commentaire, verifie par releve image par image sur toute la duree. |
| 4.5 | Chaque média temporel pré-enregistré a-t-il, si nécessaire, une audiodescription synchronisée (hors cas particuliers) ? | **C** | Releve image par image : les textes a l’ecran (« TYPE DE LOGEMENT », « BUDGET », « LES PISCINES ») reprennent le commentaire, l’animation illustre sans rien ajouter. Aucune information n’est portee par la seule image, une audiodescription n’est donc pas necessaire. |
| 4.6 | Pour chaque média temporel pré-enregistré ayant une audiodescription synchronisée, celle-ci est-elle pertinente ? | **NA** | Aucune audiodescription. |
| 4.7 | Chaque média temporel est-il clairement identifiable (hors cas particuliers) ? | **C** | Les capsules sont identifiees par un titre, une duree et un domaine. |
| 4.8 | Chaque média non temporel a-t-il, si nécessaire, une alternative (hors cas particuliers) ? | **NA** | Aucun media non temporel. |
| 4.9 | Pour chaque média non temporel ayant une alternative, cette alternative est-elle pertinente ? | **NA** | Aucun media non temporel. |
| 4.10 | Chaque son déclenché automatiquement est-il contrôlable par l’utilisateur ? | **NA** | Aucun son declenche automatiquement. |
| 4.11 | La consultation de chaque média temporel est-elle, si nécessaire, contrôlable par le clavier et tout dispositif de pointage ? | **C** | Le lecteur de la page de capsule expose les controles natifs du navigateur. |
| 4.12 | La consultation de chaque média non temporel est-elle contrôlable par le clavier et tout dispositif de pointage ? | **NA** | Aucun media non temporel. |
| 4.13 | Chaque média temporel et non temporel est-il compatible avec les technologies d’assistance (hors cas particuliers) ? | **NE** | Compatibilite avec les technologies d’assistance non testee sur lecteur d’ecran reel. |

### 5. Tableaux

| Critère | Intitulé | Verdict | Justification |
| --- | --- | --- | --- |
| 5.1 | Chaque tableau de données complexe a-t-il un résumé ? | **NA** | Aucun tableau de donnees complexe. |
| 5.2 | Pour chaque tableau de données complexe ayant un résumé, celui-ci est-il pertinent ? | **NA** | Aucun tableau de donnees complexe. |
| 5.3 | Pour chaque tableau de mise en forme, le contenu linéarisé reste-t-il compréhensible ? | **NA** | Aucun tableau de mise en forme. |
| 5.4 | Pour chaque tableau de données ayant un titre, le titre est-il correctement associé au tableau de données ? | **C** | Le tableau alternatif de la courbe porte un <caption>. |
| 5.5 | Pour chaque tableau de données ayant un titre, celui-ci est-il pertinent ? | **C** | Le titre reprend le libelle de la courbe. |
| 5.6 | Pour chaque tableau de données, chaque en-tête de colonne et chaque en-tête de ligne sont-ils correctement déclarés ? | **C** | En-tetes declares avec <th scope="col">. |
| 5.7 | Pour chaque tableau de données, la technique appropriée permettant d’associer chaque cellule avec ses en-têtes est-elle utilisée (hors cas particuliers) ? | **C** | Tableau simple : la portee des en-tetes suffit. |
| 5.8 | Chaque tableau de mise en forme ne doit pas utiliser d’éléments propres aux tableaux de données. Cette règle est-elle respectée ? | **NA** | Aucun tableau de mise en forme. |

### 6. Liens

| Critère | Intitulé | Verdict | Justification |
| --- | --- | --- | --- |
| 6.1 | Chaque lien est-il explicite (hors cas particuliers) ? | **C** | Les intitules nomment la destination, y compris pour les liens externes (« Prefecture de Mayotte - Seismes »). |
| 6.2 | Dans chaque page web, chaque lien a-t-il un intitulé ? | **C** | Aucun lien sans intitule sur les 18 pages. |

### 7. Scripts

| Critère | Intitulé | Verdict | Justification |
| --- | --- | --- | --- |
| 7.1 | Chaque script est-il, si nécessaire, compatible avec les technologies d’assistance ? | **C** | Composants bases sur des elements natifs, complete par aria-expanded sur les sous-menus et role="progressbar" sur la progression du diagnostic. |
| 7.2 | Pour chaque script ayant une alternative, cette alternative est-elle pertinente ? | **NA** | Aucun script disposant d’une alternative. |
| 7.3 | Chaque script est-il contrôlable par le clavier et par tout dispositif de pointage (hors cas particuliers) ? | **C** | Parcours clavier verifie : 22 tabulations sur le diagnostic, tous les composants atteignables et actionnables. |
| 7.4 | Pour chaque script qui initie un changement de contexte, l’utilisateur est-il averti ou en a-t-il le contrôle ? | **C** | Le seul changement de contexte automatique est le changement de langue, declenche par l’utilisateur depuis une liste explicitement etiquetee. |
| 7.5 | Dans chaque page web, les messages de statut sont-ils correctement restitués par les technologies d’assistance ? | **C** | Zones aria-live sur le diagnostic, l’assistant de liens, l’etat d’enregistrement du formulaire et l’etat du moteur. |

### 8. Éléments obligatoires

| Critère | Intitulé | Verdict | Justification |
| --- | --- | --- | --- |
| 8.1 | Chaque page web est-elle définie par un type de document ? | **C** | Doctype HTML5 present. |
| 8.2 | Pour chaque page web, le code source généré est-il valide selon le type de document spécifié ? | **C** | Validateur du W3C sur le DOM rendu : 0 erreur sur 5 pages, apres correction de deux erreurs (attribut value sur <select>, aria-label sur des <div> sans role). |
| 8.3 | Dans chaque page web, la langue par défaut est-elle présente ? | **C** | lang="fr" par defaut, lang="swb" en version shimaore. |
| 8.4 | Pour chaque page web ayant une langue par défaut, le code de langue est-il pertinent ? | **C** | fr et swb sont des codes de langue valides (swb = shimaore, ISO 639-3). |
| 8.5 | Chaque page web a-t-elle un titre de page ? | **C** | Chaque route definit son titre. |
| 8.6 | Pour chaque page web ayant un titre de page, ce titre est-il pertinent ? | **C** | Titres distincts et descriptifs, verifies par tests automatises. |
| 8.7 | Dans chaque page web, chaque changement de langue est-il indiqué dans le code source (hors cas particuliers) ? | **NC** | En version shimaore, 89 chaines restent en francais (menu « Mon plan », « Se former », libelles du compteur, pages reglementaires) sans attribut lang : un lecteur d’ecran les annonce en shimaore. |
| 8.8 | Dans chaque page web, le code de langue de chaque changement de langue est-il valide et pertinent ? | **NA** | Aucun changement de langue n’est declare dans le code. |
| 8.9 | Dans chaque page web, les balises ne doivent pas être utilisées uniquement à des fins de présentation. Cette règle est-elle respectée ? | **C** | Aucune balise detournee a des fins de presentation. |
| 8.10 | Dans chaque page web, les changements du sens de lecture sont-ils signalés ? | **NA** | Aucun changement de sens de lecture. |

### 9. Structuration de l’information

| Critère | Intitulé | Verdict | Justification |
| --- | --- | --- | --- |
| 9.1 | Dans chaque page web, l’information est-elle structurée par l’utilisation appropriée de titres ? | **C** | Un <h1> unique par page et aucun saut de niveau sur les 18 pages, apres ajout du titre manquant sur les pages de mise en situation. |
| 9.2 | Dans chaque page web, la structure du document est-elle cohérente (hors cas particuliers) ? | **C** | Regions header, nav, main et footer presentes sur toutes les pages. |
| 9.3 | Dans chaque page web, chaque liste est-elle correctement structurée ? | **C** | Listes de navigation, de ressources et de garanties balisees en <ul>/<li>. |
| 9.4 | Dans chaque page web, chaque citation est-elle correctement indiquée ? | **NA** | Aucune citation. |

### 10. Présentation de l’information

| Critère | Intitulé | Verdict | Justification |
| --- | --- | --- | --- |
| 10.1 | Dans le site web, des feuilles de styles sont-elles utilisées pour contrôler la présentation de l’information ? | **C** | Presentation entierement geree par CSS. |
| 10.2 | Dans chaque page web, le contenu visible porteur d’information reste-t-il présent lorsque les feuilles de styles sont désactivées ? | **C** | Le contenu repose sur des elements semantiques : il reste present sans styles. |
| 10.3 | Dans chaque page web, l’information reste-t-elle compréhensible lorsque les feuilles de styles sont désactivées ? | **C** | L’ordre du DOM suit l’ordre de lecture. |
| 10.4 | Dans chaque page web, le texte reste-t-il lisible lorsque la taille des caractères est augmentée jusqu’à 200%, au moins (hors cas particuliers) ? | **C** | Texte a 200 % : aucun debordement horizontal sur les cinq pages testees. |
| 10.5 | Dans chaque page web, les déclarations CSS de couleurs de fond d’élément et de police sont-elles correctement utilisées ? | **C** | Couleurs de fond et de police declarees ensemble via les jetons de theme. |
| 10.6 | Dans chaque page web, chaque lien dont la nature n’est pas évidente est-il visible par rapport au texte environnant ? | **C** | Les liens de source sont soulignes, les liens de navigation sont dans des zones identifiees. |
| 10.7 | Dans chaque page web, pour chaque élément recevant le focus, la prise de focus est-elle visible ? | **C** | Contour de focus de 3 px sur tous les elements atteints au clavier (22 releves, 0 sans focus visible). |
| 10.8 | Pour chaque page web, les contenus cachés ont-ils vocation à être ignorés par les technologies d’assistance ? | **C** | Contenus caches limites a .sr-only et aux blocs v-if, sans piege. |
| 10.9 | Dans chaque page web, l’information ne doit pas être donnée uniquement par la forme, taille ou position. Cette règle est-elle respectée ? | **C** | Aucune information portee uniquement par la forme ou la position. |
| 10.10 | Dans chaque page web, l’information ne doit pas être donnée par la forme, taille ou position uniquement. Cette règle est-elle implémentée de façon pertinente ? | **C** | Idem. |
| 10.11 | Pour chaque page web, les contenus peuvent-ils être présentés sans avoir recours à un défilement vertical pour une fenêtre ayant une hauteur de 256px ou à un défilement horizontal pour une fenêtre ayant une largeur de 320px (hors cas particuliers) ? | **C** | A 320 px de large et 256 px de haut : aucun defilement horizontal sur les cinq pages testees. |
| 10.12 | Dans chaque page web, les propriétés d’espacement du texte peuvent-elles être redéfinies par l’utilisateur sans perte de contenu ou de fonctionnalité (hors cas particuliers) ? | **C** | Espacement du texte redefini (interligne 1,5, lettres 0,12em, mots 0,16em) : aucun contenu tronque. |
| 10.13 | Dans chaque page web, les contenus additionnels apparaissant à la prise de focus ou au survol d’un composant d’interface sont-ils contrôlables par l’utilisateur (hors cas particuliers) ? | **C** | Les sous-menus s’ouvrent au clic, se ferment par Echap et par clic exterieur. |
| 10.14 | Dans chaque page web, les contenus additionnels apparaissant via les styles CSS uniquement peuvent-ils être rendus visibles au clavier et par tout dispositif de pointage ? | **C** | Aucun contenu additionnel dependant du seul survol CSS. |

### 11. Formulaires

| Critère | Intitulé | Verdict | Justification |
| --- | --- | --- | --- |
| 11.1 | Chaque champ de formulaire a-t-il une étiquette ? | **C** | Tous les champs des 18 pages portent une etiquette. |
| 11.2 | Chaque étiquette associée à un champ de formulaire est-elle pertinente (hors cas particuliers) ? | **C** | Etiquettes explicites et propres a chaque champ. |
| 11.3 | Dans chaque formulaire, chaque étiquette associée à un champ de formulaire ayant la même fonction et répétée plusieurs fois dans une même page ou dans un ensemble de pages est-elle cohérente ? | **C** | Libelles identiques pour les champs de meme fonction. |
| 11.4 | Dans chaque formulaire, chaque étiquette de champ et son champ associé sont-ils accolés (hors cas particuliers) ? | **C** | Etiquettes accolees a leur champ. |
| 11.5 | Dans chaque formulaire, les champs de même nature sont-ils regroupés, si nécessaire ? | **C** | Les groupes de boutons radio sont dans un <fieldset>. |
| 11.6 | Dans chaque formulaire, chaque regroupement de champs de même nature a-t-il une légende ? | **C** | Chaque <fieldset> porte une <legend> (intitule de la question). |
| 11.7 | Dans chaque formulaire, chaque légende associée à un regroupement de champs de même nature est-elle pertinente ? | **C** | La legende reprend la question posee. |
| 11.8 | Dans chaque formulaire, les items de même nature d’une liste de choix sont-ils regroupés de manière pertinente ? | **NA** | Aucune liste de choix necessitant un regroupement. |
| 11.9 | Dans chaque formulaire, l’intitulé de chaque bouton est-il pertinent (hors cas particuliers) ? | **C** | Intitules de boutons explicites (« Confirmer le diagnostic », « Telecharger le certificat »). |
| 11.10 | Dans chaque formulaire, le contrôle de saisie est-il utilisé de manière pertinente (hors cas particuliers) ? | **C** | Controles natifs (min, max, type) sur les champs numeriques du kit et du formulaire d’avis. |
| 11.11 | Dans chaque formulaire, le contrôle de saisie est-il accompagné, si nécessaire, de suggestions facilitant la correction des erreurs de saisie ? | **NA** | Aucun message d’erreur de saisie : les formulaires n’ont pas de contrainte bloquante. |
| 11.12 | Pour chaque formulaire qui modifie ou supprime des données, ou qui transmet des réponses à un test ou à un examen, ou dont la validation a des conséquences financières ou juridiques, les données saisies peuvent-elles être modifiées, mises à jour ou récupérées par l’utilisateur ? | **NA** | Aucun formulaire a consequence financiere ou juridique. |
| 11.13 | La finalité d’un champ de saisie peut-elle être déduite pour faciliter le remplissage automatique des champs avec les données de l’utilisateur ? | **NA** | Aucun champ ne collecte de donnee personnelle de l’utilisateur. |

### 12. Navigation

| Critère | Intitulé | Verdict | Justification |
| --- | --- | --- | --- |
| 12.1 | Chaque ensemble de pages dispose-t-il de deux systèmes de navigation différents, au moins (hors cas particuliers) ? | **C** | Deux systemes : le menu et la page « Plan du site », qui liste les 32 pages regroupees par section. |
| 12.2 | Dans chaque ensemble de pages, le menu et les barres de navigation sont-ils toujours à la même place (hors cas particuliers) ? | **C** | Menu et pied de page identiques et au meme endroit sur toutes les pages. |
| 12.3 | La page « plan du site » est-elle pertinente ? | **C** | La page liste toutes les pages publiques, y compris les capsules et les mises en situation, generees depuis les donnees. |
| 12.4 | Dans chaque ensemble de pages, la page « plan du site » est-elle accessible à partir d’une fonctionnalité identique ? | **C** | Lien « Plan du site » dans le pied de page, present sur toutes les pages. |
| 12.5 | Dans chaque ensemble de pages, le moteur de recherche est-il atteignable de manière identique ? | **NA** | Aucun moteur de recherche interne. |
| 12.6 | Les zones de regroupement de contenus présentes dans plusieurs pages web (zones d’en-tête, de navigation principale, de contenu principal, de pied de page et de moteur de recherche) peuvent-elles être atteintes ou évitées ? | **C** | Regions de regroupement atteignables et evitables. |
| 12.7 | Dans chaque page web, un lien d’évitement ou d’accès rapide à la zone de contenu principal est-il présent (hors cas particuliers) ? | **C** | Lien d’evitement present et fonctionnel : il depose le focus sur la zone de contenu principal. |
| 12.8 | Dans chaque page web, l’ordre de tabulation est-il cohérent ? | **C** | Ordre de tabulation conforme a l’ordre visuel sur les parcours testes. |
| 12.9 | Dans chaque page web, la navigation ne doit pas contenir de piège au clavier. Cette règle est-elle respectée ? | **C** | Aucun piege au clavier releve sur 22 tabulations. |
| 12.10 | Dans chaque page web, les raccourcis clavier n’utilisant qu’une seule touche (lettre minuscule ou majuscule, ponctuation, chiffre ou symbole) sont-ils contrôlables par l’utilisateur ? | **NA** | Aucun raccourci clavier a une seule touche. |
| 12.11 | Dans chaque page web, les contenus additionnels apparaissant au survol, à la prise de focus ou à l’activation d’un composant d’interface sont-ils si nécessaire atteignables au clavier ? | **C** | Les sous-menus sont atteignables et refermables au clavier. |

### 13. Consultation

| Critère | Intitulé | Verdict | Justification |
| --- | --- | --- | --- |
| 13.1 | Pour chaque page web, l’utilisateur a-t-il le contrôle de chaque limite de temps modifiant le contenu (hors cas particuliers) ? | **NA** | Aucune limite de temps modifiant le contenu. |
| 13.2 | Dans chaque page web, l’ouverture d’une nouvelle fenêtre ne doit pas être déclenchée sans action de l’utilisateur. Cette règle est-elle respectée ? | **C** | Les nouvelles fenetres ne s’ouvrent que sur activation d’un lien par l’utilisateur. |
| 13.3 | Dans chaque page web, chaque document bureautique en téléchargement possède-t-il, si nécessaire, une version accessible (hors cas particuliers) ? | **C** | Chaque PDF genere (certificat, checklist, kit, attestation) reprend un contenu integralement disponible en HTML sur le site. |
| 13.4 | Pour chaque document bureautique ayant une version accessible, cette version offre-t-elle la même information ? | **C** | La version HTML porte la meme information que le PDF. |
| 13.5 | Dans chaque page web, chaque contenu cryptique (art ASCII, émoticône, syntaxe cryptique) a-t-il une alternative ? | **NA** | Aucun contenu cryptique. |
| 13.6 | Dans chaque page web, pour chaque contenu cryptique (art ASCII, émoticône, syntaxe cryptique) ayant une alternative, cette alternative est-elle pertinente ? | **NA** | Aucun contenu cryptique. |
| 13.7 | Dans chaque page web, les changements brusques de luminosité ou les effets de flash sont-ils correctement utilisés ? | **NA** | Aucun effet de flash ni changement brusque de luminosite. |
| 13.8 | Dans chaque page web, chaque contenu en mouvement ou clignotant est-il contrôlable par l’utilisateur ? | **C** | Bouton « Mettre en pause le defilement » sur le bandeau, avec aria-pressed. Mesure : 1,3 px de derive en pause contre 67,8 px en marche sur la meme duree. |
| 13.9 | Dans chaque page web, le contenu proposé est-il consultable quelle que soit l’orientation de l’écran (portrait ou paysage) (hors cas particuliers) ? | **C** | Mise en page fluide, aucune orientation imposee. |
| 13.10 | Dans chaque page web, les fonctionnalités utilisables ou disponibles au moyen d’un geste complexe peuvent-elles être également disponibles au moyen d’un geste simple (hors cas particuliers) ? | **NA** | Aucun geste complexe. |
| 13.11 | Dans chaque page web, les actions déclenchées au moyen d’un dispositif de pointage sur un point unique de l’écran peuvent-elles faire l’objet d’une annulation (hors cas particuliers) ? | **C** | Actions declenchees au relachement, annulables en deplacant le pointeur. |
| 13.12 | Dans chaque page web, les fonctionnalités qui impliquent un mouvement de l’appareil ou vers l’appareil peuvent-elles être satisfaites de manière alternative (hors cas particuliers) ? | **NA** | Aucune fonctionnalite fondee sur un mouvement de l’appareil. |
