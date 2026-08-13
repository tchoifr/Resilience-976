# Refonte UX globale — Design

Date : 12 aout 2026
Statut : valide avec le porteur, a implementer

## Objectif

Corriger les points de friction releves sur l'ensemble du site public, de la
navigation aux ecrans de restitution. Le fil conducteur : rendre lisible ce
qui est aujourd'hui devinable — ou l'on peut cliquer, ou l'on en est dans le
parcours, ce que vaut son resultat.

Le travail est decoupe en cinq lots independants, du plus mecanique au plus
structurant. Chaque lot peut etre livre seul.

## Perimetre

Concerne : accueil (banniere retro), navigation (menu et pied de page),
diagnostic, resultats, ressources, videos, mises en situation, page
experimentation, et le systeme de boutons.

Hors perimetre : le contenu editorial lui-meme (questions, textes des
ressources), le back-office analytique, l'authentification des tableaux de
bord.

## Contraintes transverses

- Le ton editorial defini dans `docs/product/ux-research.md` reste la
  reference : simple, positif, oriente action, non culpabilisant, sans
  jargon.
- Aucune dependance npm nouvelle : la CSP du site (`deploy/nginx.conf`)
  interdit tout script ou style externe.
- Les quatre niveaux de score existants font foi et ne changent pas :
  `insufficient` (0-39), `fragile` (40-59), `good` (60-79), `very_good`
  (80-100).
- Toute chaine visible passe par `src/shared/i18n/locales/fr.ts`.

---

## Lot A — Corrections ponctuelles

Sept corrections sans dependance entre elles.

### A1. Identifiant visiteur reutilisable

`RetroStatsBanner.vue` affiche un identifiant tronque a douze caracteres,
en majuscules et sans tirets (`E1E0A14E4989`). Cet identifiant ne permet pas
de retrouver son parcours sur `/tableau-de-bord/visiteur`, dont la
validation exige les trente-six caracteres avec tirets — le visiteur recopie
ce qu'il voit et la recherche echoue.

La banniere affiche desormais l'identifiant complet, avec un bouton de copie.
L'affichage reste compact (police monospace, retour a la ligne autorise) pour
ne pas desequilibrer le bloc.

### A2. Couleurs de la banniere en theme sombre

En theme sombre, le fond de la banniere (`--color-primary-dark`) est trop
proche du fond de page : le bloc perd son relief alors qu'il ressort
nettement en theme clair. Lui donner un fond et une bordure propres au theme
sombre, en conservant le contraste AA sur tous ses textes.

### A3. Chevron superflu sur les cartes de resultats

Un chevron apparait sur chaque carte de la page resultats sans etre porteur
de sens. Origine identifiee : `src/app/styles.css:1725`, une regle
`.action-card::after { content: ">" }`.

La carte est un `<article>` sans lien : ce chevron annonce une navigation qui
n'existe pas. C'est une fausse affordance, a supprimer avec le
`padding-right: 40px` (ligne 1722) qui lui reservait sa place.

### A4. Alignement des colonnes de resultats

Les deux colonnes de `.action-plan-grid` s'etirent a la meme hauteur, et
`.stack` etant une grille (`src/app/styles.css:248`), ses lignes se dilatent
pour occuper cette hauteur : la colonne la moins remplie voit ses cartes
s'ecarter, laissant un vide de plusieurs centaines de pixels entre le titre
et la premiere carte.

Corriger par `align-items: start` sur `.action-plan-grid`, pour que chaque
colonne reprenne sa hauteur naturelle.

### A5. Code couleur des jauges

Les barres de progression des scores par domaine sont monochromes. Leur
appliquer la couleur du niveau atteint, en reprenant les quatre niveaux
existants : rouge (`insufficient`), orange (`fragile`), turquoise (`good`),
vert (`very_good`).

La palette du projet ne contient pas de jaune. Plutot que d'en introduire un,
le niveau `good` reprend `--color-teal`, couleur actuelle de la jauge :
rouge → orange → turquoise → vert se distingue mieux qu'un degrade
orange/jaune et reste dans les couleurs de la marque.

La couleur ne doit pas etre le seul vecteur d'information : le libelle du
niveau reste affiche a cote de la jauge (critere WCAG 1.4.1).

### A6. Mises en situation : niveau plutot que score

`ScenarioPlayView.vue` affiche un score brut (`{{ score }}/100`) que rien ne
permet d'interpreter. Le remplacer par un niveau qualitatif, en conservant le
score en information secondaire :

| Score | Niveau affiche |
| ----- | -------------- |
| 0-49  | A renforcer    |
| 50-79 | Bien           |
| 80-100| Excellent      |

Le seuil bas est formule sans jugement (« A renforcer » plutot que
« Mauvais ») conformement au principe de non-culpabilisation du cadrage UX.

### A7. Retrait des exports CSV et JSON

`UserExperimentView.vue` propose deux boutons d'export destines a
l'exploitation interne, sans utilite pour le visiteur qui remplit le
formulaire. Les retirer, ainsi que le code d'export devenu mort.

---

## Lot B — Systeme d'icones

Les boutons du site sont uniquement textuels. Leur ajouter une icone accelere
la reconnaissance des actions recurrentes (telecharger, imprimer, recommencer,
continuer).

### Approche

Un composant `AppIcon.vue` rendant un `<svg>` inline a partir d'un
dictionnaire de traces internes au projet. Aucune dependance, aucun appel
reseau, compatible avec la CSP stricte.

```
<AppIcon name="download" />
```

`AppButton.vue` gagne une prop optionnelle `icon`, qui place l'icone avant le
libelle.

### Regles

- L'icone est toujours decorative : `aria-hidden="true"` et `focusable="false"`.
  Le libelle textuel du bouton porte seul le sens. Un bouton sans texte reste
  interdit.
- L'icone herite de la couleur du texte (`fill: currentColor`) pour suivre les
  deux themes sans regle supplementaire.
- Le jeu initial se limite aux actions reellement presentes a l'ecran. On
  n'ajoute pas d'icone « au cas ou ».

---

## Lot C — Menu et pied de page

### Menu : dix entrees ramenees a quatre

Les dix liens actuels sont alignes sans hierarchie : le visiteur ne distingue
pas son parcours personnel des contenus de formation.

| Entree        | Contenu                                                 |
| ------------- | ------------------------------------------------------- |
| Accueil       | —                                                       |
| Mon plan      | Diagnostic, Resultats, Checklist, Kit d'urgence          |
| Se former     | Videos, Quiz, Mises en situation                        |
| Ressources    | —                                                       |

« Experimentation » quitte le menu principal : c'est un formulaire de retour,
pas une destination. Il rejoint le pied de page.

Les deux entrees a sous-menu s'ouvrent au clic (pas au survol seul, pour
rester utilisable au tactile et au clavier), portent `aria-expanded`, et se
ferment sur `Echap` comme sur un clic exterieur. L'entree parente reste
signalee comme active quand une de ses pages est ouverte.

Sur mobile, la navigation reste un menu deroulant unique, les familles
apparaissant comme des groupes titres.

### Pied de page : quatre colonnes et une barre basse

Le pied de page empile aujourd'hui marque, pastilles, slogan, icone sociale
et liens legaux sans structure lisible.

```
Resilience 976        Le parcours      Se former         A propos
Mon Plan Resilience   Diagnostic       Videos            Mentions legales
« Ensemble, soyons    Resultats        Quiz              Confidentialite
prets face aux        Checklist        Mises en situation Accessibilite
risques. »            Kit d'urgence    Ressources        Support
[Publique et gratuite]                                   Statistiques
[Sans donnee perso]                                      Donner mon avis
──────────────────────────────────────────────────────────────────────
in    Outil de sensibilisation : ne remplace ni les alertes officielles…
```

Chaque colonne est une `<nav>` titree par un `<h2>` visuellement discret mais
lisible par les lecteurs d'ecran. Les colonnes se replient en accordeon sur
mobile plutot qu'en une longue liste.

« Ressources » figure a la fois en entree de menu et dans la colonne « Se
former » du pied de page : c'est deliberé. Le menu repond a « ou vais-je »,
le pied de page a « qu'y a-t-il sur ce site », et la redondance entre les
deux est la norme sur un site de service public.

---

## Lot D — Diagnostic par theme

### Probleme

Les vingt-quatre questions defilent une par une sans regroupement visible. Le
visiteur ne sait ni ou il en est thematiquement, ni combien il lui reste.

### Structure retenue

Un ecran par domaine, soit six ecrans de quatre questions — le decoupage
existant s'y prete exactement.

| Ordre | Domaine                | Libelle                  |
| ----- | ---------------------- | ------------------------ |
| 1     | `household`            | Mon foyer                |
| 2     | `housing`              | Mon logement             |
| 3     | `water_food`           | Eau et alimentation      |
| 4     | `energy_communication` | Energie et communication |
| 5     | `health_documents`     | Sante et documents       |
| 6     | `behaviors`            | Comportements            |

### Barre de progression

Le pourcentage abstrait est remplace par six segments, un par theme : plein
pour les themes termines, mis en avant pour celui en cours, neutre pour les
suivants. Le libelle devient « Theme 2 sur 6 — Mon logement ».

### Regles de navigation

- On passe au theme suivant quand ses quatre questions ont une reponse.
- On peut revenir a un theme precedent sans perdre ses reponses.
- La sauvegarde apres chaque reponse est conservee telle quelle.
- La reprise en cours de parcours rouvre le theme ou l'on s'est arrete.

### Consequence documentaire

`docs/product/ux-research.md` prescrit aujourd'hui « une question principale
par ecran ». Cette regle est remplacee par « un theme par ecran ». Le
document est mis a jour dans le meme lot : laisser les deux versions
coexister creerait une contradiction dans les pieces du dossier JNR 2026.

---

## Lot E — Clarte et wording

### E1. Ressources : rendre les liens visiblement cliquables

Cause identifiee a l'ecran : les liens de source portent **le meme fond en
pastille que les badges de domaine et de statut** (« Comportements »,
« A valider ») places juste au-dessus, qui eux ne sont pas cliquables. Le
meme langage visuel sert donc a du cliquable et a du non-cliquable, et le
soulignement ne suffit pas a les distinguer.

Deux corrections : distinguer nettement le lien du badge (couleur de lien
plutot que fond de pastille, etat au survol et au focus clavier), et signaler
qu'il mene hors du site — toutes ces sources sont externes (prefecture,
Meteo-France, Georisques, Croix-Rouge) et rien ne l'annonce.

### E2. Videos : expliquer la regle de progression

Cause identifiee a l'ecran : deux boutons concurrents cohabitent sous la
question — « Valider ma reponse » (desactive tant qu'aucune option n'est
cochee) et « J'ai regarde la video ». Rien n'indique lequel fait avancer la
progression, et le second permet de contourner la question entierement.

Le lot B a aggrave la confusion en posant la **meme icone `check`** sur les
deux boutons, ce qui les rend visuellement interchangeables. La correction
doit donc aussi differencier leurs icones, ou en retirer une.

La regle doit etre enoncee avant la question, pas apres l'echec : la
progression n'avance que si la bonne reponse est donnee. Apres une mauvaise
reponse, le visiteur peut reessayer, sans formulation culpabilisante.

### E3. Resultats : reorganiser les appels a l'action

Les boutons de bas de page se presentent sur un meme plan alors qu'ils n'ont
pas le meme poids. Etablir une hierarchie : une action principale unique, les
autres en secondaire. L'ordre precis est a arreter a l'implementation (voir
« Points a lever »).

### E4. Experimentation : recentrer le wording

La page se lit comme un espace d'administration alors qu'elle recueille l'avis
des visiteurs. Le texte doit dire clairement : parcourez le site, puis
revenez donner votre avis. Titre, chapeau et libelle du bouton d'envoi sont
reecrits dans ce sens, et l'entree correspondante du pied de page s'intitule
« Donner mon avis ».

---

## Points a lever a l'implementation

Un seul element reste a specifier :

1. **E3** — ce qui cloche dans l'organisation actuelle des CTA de resultats.

Les trois autres points ouverts a la redaction ont depuis ete observes a
l'ecran et leurs causes sont consignees ci-dessus : **A3** (origine du
chevron, lot A livre), **E1** (confusion entre liens et badges) et **E2**
(deux boutons concurrents).

---

## Tests

- **Unitaires (Vitest)** : le calcul du niveau des mises en situation (A6),
  le decoupage des questions par theme et les regles de passage d'un theme au
  suivant (Lot D).
- **Bout en bout (Playwright)** : parcours complet du diagnostic a travers les
  six themes, ouverture des sous-menus au clavier, presence des liens du pied
  de page.
- **Accessibilite** : la suite `tests/e2e/accessibility.spec.ts` couvre deja le
  contraste et le zoom ; les nouveaux composants (sous-menus, accordeon du
  pied de page, jauges colorees) doivent y passer sans regression.
- **Non-regression** : la suite existante doit rester au meme niveau qu'avant
  le lot. Plusieurs tests de `main-journey.spec.ts` et
  `accessibility.spec.ts` echouent de maniere intermittente avant toute
  modification ; ces echecs preexistants sont a distinguer de toute
  regression introduite ici.

## Ordre de livraison recommande

A (rapide, visible immediatement) → B (les icones servent aux lots suivants)
→ C (navigation) → E (clarte et wording) → D (le plus structurant).

Chaque lot fait l'objet de son propre plan d'implementation et de ses propres
commits. Un plan unique couvrant les cinq lots serait trop large pour etre
suivi et relu utilement — et rien n'oblige a les livrer tous.
