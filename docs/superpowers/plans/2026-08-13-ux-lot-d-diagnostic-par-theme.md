# Lot D — Diagnostic par theme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Presenter les vingt-quatre questions du diagnostic en six ecrans thematiques de quatre questions, avec une progression lisible par domaine.

**Architecture:** Une fonction pure `groupQuestionsByDomain` produit les six groupes dans l'ordre fixe des domaines. `DiagnosticView` affiche un groupe par ecran. Le store troque son index de question contre un index de theme, ce qui impose de **monter la version d'etat persiste** pour ne pas reprendre un parcours avec un index qui n'a plus le meme sens.

**Tech Stack:** Vue 3 + TypeScript, Pinia, Vitest, Playwright.

Spec de reference : `docs/superpowers/specs/2026-08-12-refonte-ux-globale-design.md` (lot D).

## Global Constraints

- Aucune dependance npm nouvelle.
- Toute chaine visible passe par `src/shared/i18n/locales/fr.ts`.
- Les libelles visibles doivent etre correctement accentues.
- Les deux themes (clair et sombre) doivent rester lisibles.
- Le calcul du score ne change pas : `calculateAssessment` consomme un objet `answers` plat, indifferent a la mise en page.

## Piege principal : l'etat persiste

`currentIndex` (`src/features/assessment/stores/assessment.store.ts:15`) vaut
aujourd'hui 0 a 23 et **est sauvegarde sur l'appareil du visiteur**. Lui
donner le sens d'un index de theme (0 a 5) sans precaution ferait reprendre
un parcours enregistre a un theme arbitraire, ou hors bornes.

La parade est d'incrementer `ASSESSMENT_VERSION` : `restore()` efface deja
l'etat sauvegarde quand la version ne correspond pas
(`assessment.store.ts:44-47`). Les visiteurs en cours de diagnostic
repartiront de zero — c'est le prix a payer, et il est acceptable pour un
parcours de cinq a dix minutes.

## Repartition retenue

24 questions, 6 domaines, exactement 4 questions chacun.

| Ordre | Domaine | Libelle |
| --- | --- | --- |
| 1 | `household` | Mon foyer |
| 2 | `housing` | Mon logement |
| 3 | `water_food` | Eau et alimentation |
| 4 | `energy_communication` | Energie et communication |
| 5 | `health_documents` | Sante et documents |
| 6 | `behaviors` | Comportements |

---

### Task 1: Regroupement des questions par domaine

**Files:**
- Modify: `src/features/assessment/services/scoring.service.ts`
- Create: `tests/unit/question-groups.spec.ts`

**Interfaces:**
- Produces: `DOMAIN_ORDER: readonly string[]` et
  `groupQuestionsByDomain(questions: Question[]): { domain: string; questions: Question[] }[]`,
  exportes depuis `src/features/assessment/services/scoring.service.ts`.
  Consommes par Task 3.

- [x] **Step 1: Ecrire le test qui echoue**

Creer `tests/unit/question-groups.spec.ts` :

```ts
import { describe, expect, it } from 'vitest'

import questions from '../../src/data/questions.json'
import {
  DOMAIN_ORDER,
  groupQuestionsByDomain,
} from '../../src/features/assessment/services/scoring.service'

describe('groupQuestionsByDomain', () => {
  it('produit un groupe par domaine, dans l ordre fixe', () => {
    const groups = groupQuestionsByDomain(questions)

    expect(groups.map((group) => group.domain)).toEqual([...DOMAIN_ORDER])
  })

  it('ne perd aucune question', () => {
    const groups = groupQuestionsByDomain(questions)
    const total = groups.reduce((sum, group) => sum + group.questions.length, 0)

    expect(total).toBe(questions.length)
  })

  it('place chaque question dans le groupe de son domaine', () => {
    for (const group of groupQuestionsByDomain(questions)) {
      for (const question of group.questions) {
        expect(question.domain).toBe(group.domain)
      }
    }
  })

  // Un domaine ajoute aux donnees sans etre declare dans DOMAIN_ORDER
  // disparaitrait silencieusement du diagnostic.
  it('ignore un domaine absent des donnees plutot que de produire un groupe vide', () => {
    const groups = groupQuestionsByDomain(
      questions.filter((question) => question.domain !== 'behaviors'),
    )

    expect(groups.map((group) => group.domain)).not.toContain('behaviors')
  })
})
```

- [x] **Step 2: Lancer le test pour verifier qu'il echoue**

Run: `npx vitest run tests/unit/question-groups.spec.ts`
Expected: FAIL — `groupQuestionsByDomain` n'est pas exporte.

- [x] **Step 3: Ecrire l'implementation**

Dans `src/features/assessment/services/scoring.service.ts`, ajouter a la fin :

```ts
// L'ordre des domaines est fixe et volontaire : il va du plus concret
// (« mon foyer ») au plus abstrait (« comportements »), pour que le visiteur
// entre dans le diagnostic par ce qu'il connait le mieux.
export const DOMAIN_ORDER = [
  'household',
  'housing',
  'water_food',
  'energy_communication',
  'health_documents',
  'behaviors',
] as const

export function groupQuestionsByDomain(questions: Question[]) {
  return DOMAIN_ORDER.map((domain) => ({
    domain,
    questions: questions.filter((question) => question.domain === domain),
  })).filter((group) => group.questions.length > 0)
}
```

Ajouter `Question` a l'import de types du fichier s'il n'y figure pas deja.

- [x] **Step 4: Lancer le test pour verifier qu'il passe**

Run: `npx vitest run tests/unit/question-groups.spec.ts`
Expected: PASS (4 tests)

- [x] **Step 5: Commit**

```bash
git add src/features/assessment/services/scoring.service.ts tests/unit/question-groups.spec.ts
git commit -m "feat(diagnostic): regrouper les questions par domaine"
```

---

### Task 2: Index de theme dans le store

**Files:**
- Modify: `src/features/assessment/stores/assessment.store.ts`
- Modify: `src/features/assessment/services/storage.service.ts` (constante de version)

**Interfaces:**
- Produces: `currentIndex` designe desormais un **index de theme** (0 a 5) et non plus un index de question. Consomme par Task 3.

- [x] **Step 1: Monter la version d'etat persiste**

Reperer la constante de version :

Run: `grep -rn "ASSESSMENT_VERSION" src/`

L'incrementer d'une unite. Sans cela, un visiteur ayant un diagnostic en
cours reprendrait a un index qui n'a plus le meme sens : `restore()` efface
l'etat sauvegarde quand la version differe
(`src/features/assessment/stores/assessment.store.ts:44-47`), c'est le
mecanisme prevu pour exactement ce cas.

- [x] **Step 2: Documenter le changement de sens**

Dans `assessment.store.ts`, au-dessus de `currentIndex` dans
`createInitialAssessmentState`, ajouter :

```ts
    // Index du theme affiche (0 a 5), et non plus de la question : le
    // diagnostic presente un domaine par ecran. Tout changement de sens de
    // ce champ impose de monter ASSESSMENT_VERSION, sinon les parcours
    // enregistres reprennent a un index errone.
```

- [x] **Step 3: Verifier**

Run: `npx vitest run tests/unit`
Expected: PASS — aucun test unitaire ne depend du sens de `currentIndex`.
Si l'un d'eux echoue, c'est qu'il testait l'ancien sens : l'adapter et le
signaler dans le rapport.

- [x] **Step 4: Commit**

```bash
git add src/features/assessment/stores/assessment.store.ts src/features/assessment/services/storage.service.ts
git commit -m "refactor(diagnostic): currentIndex designe un theme et non une question"
```

---

### Task 3: Un ecran par theme

**Files:**
- Modify: `src/views/DiagnosticView.vue`
- Modify: `src/shared/i18n/locales/fr.ts`

**Interfaces:**
- Consumes: `groupQuestionsByDomain`, `DOMAIN_ORDER` (Task 1) ; `currentIndex` au sens theme (Task 2).

- [x] **Step 1: Ajouter les chaines**

Dans `fr.ts`, dans le bloc `diagnostic`, ajouter :

```ts
    themeProgress: 'Thème {current} sur {total}',
    themeIncomplete: 'Répondez aux {count} questions de ce thème pour continuer.',
```

- [x] **Step 2: Afficher les quatre questions du theme courant**

Dans `DiagnosticView.vue` :
- remplacer l'affichage d'une question unique par une boucle sur
  `currentGroup.questions` ;
- le titre de l'ecran devient le libelle du domaine (`t('domains.' + domain)`) ;
- « Continuer » n'est actif que si les quatre questions du theme ont une
  reponse ; sinon afficher `diagnostic.themeIncomplete` ;
- « Précédent » revient au theme precedent sans effacer les reponses ;
- au dernier theme, le bouton devient « Voir mes résultats » comme
  aujourd'hui.

Conserver les libelles de boutons existants (`diagnostic.previous`,
`diagnostic.next`, `diagnostic.confirm`, `diagnostic.results`) et leurs
icones posees au lot B : les tests e2e s'appuient dessus.

- [x] **Step 3: Barre de progression segmentee**

Remplacer le pourcentage par six segments, un par theme : plein pour les
themes termines, mis en avant pour le theme courant, neutre pour les
suivants. Le libelle devient
`t('diagnostic.themeProgress', { current, total })` suivi du nom du domaine.

La barre reste accessible : porter la progression sur un element
`role="progressbar"` avec `aria-valuenow`, `aria-valuemin` et
`aria-valuemax`, la couleur des segments ne devant pas etre le seul vecteur
d'information.

- [x] **Step 4: Verifier**

Run: `npm run type-check`
Run: `npm run lint`
Expected: 0 error.

- [x] **Step 5: Verification manuelle**

Run: `npm run dev`

Parcourir `/diagnostic` : six ecrans, quatre questions chacun, impossible
d'avancer sans avoir tout repondu, retour en arriere sans perte, reprise
apres rechargement au bon theme. Verifier dans les deux themes et au clavier.

Arreter le serveur (Ctrl+C).

- [x] **Step 6: Commit**

```bash
git add src/views/DiagnosticView.vue src/shared/i18n/locales/fr.ts
git commit -m "feat(diagnostic): un ecran par theme et progression segmentee"
```

---

### Task 4: Adapter les tests e2e

**Files:**
- Modify: `tests/e2e/main-journey.spec.ts`

- [x] **Step 1: Reecrire l'utilitaire de parcours**

`completeDiagnosticWithLowestScores` (`tests/e2e/main-journey.spec.ts:3`)
boucle aujourd'hui vingt-quatre fois en cochant **une** reponse puis en
cliquant « Continuer ». Avec quatre questions par ecran, il doit cocher les
quatre reponses de l'ecran avant de continuer, sur six ecrans.

Remplacer la boucle par :

```ts
async function completeDiagnosticWithLowestScores(
  page: import('@playwright/test').Page,
) {
  await page.goto('/diagnostic')

  for (let theme = 0; theme < 6; theme += 1) {
    const cards = page.locator('.question-card')
    const count = await cards.count()

    for (let index = 0; index < count; index += 1) {
      await cards.nth(index).locator('input[type="radio"]').first().check()
    }

    const finalButton = page.getByRole('button', { name: 'Voir mes résultats' })

    if (await finalButton.isVisible()) {
      await finalButton.click()
      return
    }

    await page.getByRole('button', { name: 'Continuer' }).click()
  }
}
```

- [x] **Step 2: Lancer les tests concernes**

Run: `npx playwright test tests/e2e/main-journey.spec.ts`

Deux tests de ce fichier (`parcours accueil diagnostic résultats et PDF` et
`checklist et kit restent accessibles sans compte`) echouent de maniere
intermittente **avant** ce lot : ils dependent du parcours de diagnostic. Si
ce lot les fait passer, tant mieux ; s'ils echouent encore, comparer le
message d'erreur a celui d'avant le lot pour distinguer l'echec preexistant
d'une regression nouvelle.

- [x] **Step 3: Commit**

```bash
git add tests/e2e/main-journey.spec.ts
git commit -m "test(e2e): parcourir le diagnostic theme par theme"
```

---

### Task 5: Mettre le cadrage UX en accord avec le produit

**Files:**
- Modify: `docs/product/ux-research.md`

- [x] **Step 1: Corriger la regle devenue fausse**

`docs/product/ux-research.md:29` prescrit « Une question principale par
ecran ». Cette regle n'est plus celle du produit. La remplacer par :

```
- Un theme par ecran, soit quatre questions par ecran.
```

Ajouter sous la section « Objectif temps » :

```
Le regroupement par theme remplace l'affichage question par question : il
donne au visiteur un repere sur ce qu'il lui reste (six themes) plutot qu'un
pourcentage abstrait, sans allonger le temps de passation.
```

Laisser coexister les deux versions creerait une contradiction dans les
pieces du dossier JNR 2026, ou ce document est fourni comme cadrage.

- [x] **Step 2: Commit**

```bash
git add docs/product/ux-research.md
git commit -m "docs(ux): aligner le cadrage sur le diagnostic par theme"
```

---

### Task 6: Verification finale du lot

- [x] **Step 1: Lancer la suite complete**

Run: `npm run quality`
Expected: PASS.

- [x] **Step 2: Lancer la suite e2e**

Run: `npm run test:e2e`

Etat de reference avant ce lot : **sept echecs** dans
`main-journey.spec.ts` et `accessibility.spec.ts`, dont l'identite varie
d'une execution a l'autre (tests instables en parallele). Comparer le nombre
d'echecs, pas seulement leur liste.

- [x] **Step 3: Verifier la reprise de parcours**

Ouvrir `/diagnostic`, repondre a deux themes, recharger la page : le
diagnostic doit rouvrir sur le troisieme theme avec les reponses
precedentes conservees. C'est ce que la montee de `ASSESSMENT_VERSION`
protege ; le verifier explicitement.
