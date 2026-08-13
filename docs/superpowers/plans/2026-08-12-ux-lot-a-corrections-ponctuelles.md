# Lot A — Corrections ponctuelles UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corriger sept defauts ponctuels de l'interface — fausse affordance, desalignement, information illisible et boutons hors sujet — sans toucher a l'architecture du site.

**Architecture:** Cinq taches independantes, chacune limitee a un ecran. Trois sont du CSS ou du template pur ; deux ajoutent une fonction pure testee unitairement (`getScenarioLevel`, `getDomainLevelId`). Aucune dependance entre les taches : elles peuvent etre livrees et relues separement.

**Tech Stack:** Vue 3 + TypeScript, CSS natif (`src/app/styles.css`), Vitest, Playwright.

Spec de reference : `docs/superpowers/specs/2026-08-12-refonte-ux-globale-design.md` (lot A).

## Global Constraints

- Aucune dependance npm nouvelle : la CSP du site interdit tout script ou style externe.
- Toute chaine visible passe par `src/shared/i18n/locales/fr.ts`.
- Le site est bilingue : `fr.ts` et `swb.ts` (shimaore-bushi). Le service i18n
  retombe sur le francais quand une cle manque dans la locale active
  (`src/shared/i18n/i18n.service.ts:136-137`) : ajouter une cle au seul
  `fr.ts` ne casse donc rien, la chaine s'affiche en francais en attendant sa
  traduction. Les nouvelles cles de ce lot sont a faire traduire ensuite ;
  ce n'est pas un prerequis a la livraison. En revanche, **supprimer** une cle
  impose de la supprimer dans les deux fichiers.
- Les quatre niveaux de score existants font foi : `insufficient` (0-39), `fragile` (40-59), `good` (60-79), `very_good` (80-100).
- La couleur ne doit jamais porter seule une information (WCAG 1.4.1) : un libelle texte accompagne toujours un code couleur.
- Ton editorial non culpabilisant : aucun libelle negatif du type « Mauvais ».
- Les deux themes (clair et sombre) doivent rester lisibles apres chaque modification.

---

### Task 1: Page resultats — chevron trompeur et colonnes desalignees

**Files:**
- Modify: `src/app/styles.css:1718-1733` (regles `.action-card`)
- Modify: `src/app/styles.css` (ajout d'une regle `.action-plan-grid`)

**Interfaces:**
- Consumes: rien.
- Produces: rien (CSS uniquement).

- [ ] **Step 1: Supprimer le chevron et le retrait qui lui etait reserve**

Dans `src/app/styles.css`, remplacer le bloc actuel :

```css
.action-card {
  position: relative;
  border-radius: 12px;
  box-shadow: 0 10px 24px rgba(16, 42, 67, 0.08);
  padding-right: 40px;
}

.action-card::after {
  position: absolute;
  right: 14px;
  top: 50%;
  color: var(--color-primary);
  font-weight: 900;
  content: ">";
  transform: translateY(-50%);
}
```

par :

```css
.action-card {
  border-radius: 12px;
  box-shadow: 0 10px 24px rgba(16, 42, 67, 0.08);
}
```

`position: relative` disparait avec le `::after` qu'il positionnait, et `padding-right: 40px` avec l'espace qu'il lui reservait.

- [ ] **Step 2: Aligner les colonnes du plan d'action en haut**

Toujours dans `src/app/styles.css`, juste avant la regle `.action-card` reecrite a l'etape 1, ajouter :

```css
/* Sans cela, les deux colonnes s'etirent a la meme hauteur et .stack,
   qui est une grille, dilate ses lignes pour l'occuper : la colonne la
   moins remplie voit ses cartes s'ecarter de plusieurs centaines de
   pixels. */
.action-plan-grid {
  align-items: start;
}
```

- [ ] **Step 3: Verification manuelle**

Run: `npm run dev`

Ouvrir `http://localhost:5173/resultats` apres avoir complete un diagnostic (ou avec des reponses deja enregistrees sur l'appareil).

Attendu :
- plus aucun `>` a droite des cartes d'action ;
- le titre « Vos 3 priorites immediates » et sa premiere carte sont colles, comme dans la colonne de droite ;
- aucune bande vide entre le titre d'une colonne et sa premiere carte.

Verifier dans les deux themes (bouton lune/soleil de l'en-tete).

Arreter le serveur (Ctrl+C).

- [ ] **Step 4: Commit**

```bash
git add src/app/styles.css
git commit -m "fix(resultats): retirer le chevron trompeur et aligner les colonnes en haut"
```

---

### Task 2: Page resultats — code couleur des jauges par domaine

**Files:**
- Create: `tests/unit/domain-level.spec.ts`
- Modify: `src/features/assessment/services/scoring.service.ts`
- Modify: `src/views/ResultsView.vue:146-167`
- Modify: `src/app/styles.css:1118-1122`

**Interfaces:**
- Consumes: `getScoreLevel(score: number): ScoreLevel` (existant, `src/features/assessment/services/scoring.service.ts:17`).
- Produces: `getDomainLevelId(score: number): 'insufficient' | 'fragile' | 'good' | 'very_good'` exporte depuis `src/features/assessment/services/scoring.service.ts`.

- [ ] **Step 1: Ecrire le test qui echoue**

Creer `tests/unit/domain-level.spec.ts` :

```ts
import { describe, expect, it } from 'vitest'

import { getDomainLevelId } from '../../src/features/assessment/services/scoring.service'

describe('getDomainLevelId', () => {
  it('classe un score tres bas en insufficient', () => {
    expect(getDomainLevelId(0)).toBe('insufficient')
    expect(getDomainLevelId(39)).toBe('insufficient')
  })

  it('classe un score intermediaire bas en fragile', () => {
    expect(getDomainLevelId(40)).toBe('fragile')
    expect(getDomainLevelId(59)).toBe('fragile')
  })

  it('classe un score intermediaire haut en good', () => {
    expect(getDomainLevelId(60)).toBe('good')
    expect(getDomainLevelId(79)).toBe('good')
  })

  it('classe un score haut en very_good', () => {
    expect(getDomainLevelId(80)).toBe('very_good')
    expect(getDomainLevelId(100)).toBe('very_good')
  })
})
```

- [ ] **Step 2: Lancer le test pour verifier qu'il echoue**

Run: `npx vitest run tests/unit/domain-level.spec.ts`
Expected: FAIL — `getDomainLevelId` n'est pas exporte.

- [ ] **Step 3: Ecrire l'implementation**

Dans `src/features/assessment/services/scoring.service.ts`, juste apres la fonction `getScoreLevel` (qui se termine avant `export function calculateAssessment`), ajouter :

```ts
// Reprend les memes seuils que getScoreLevel, mais ne renvoie que
// l'identifiant : la jauge d'un domaine a besoin d'une classe CSS, pas du
// libelle ni du message associes au niveau global.
export function getDomainLevelId(
  score: number,
): 'insufficient' | 'fragile' | 'good' | 'very_good' {
  if (score <= 39) {
    return 'insufficient'
  }

  if (score <= 59) {
    return 'fragile'
  }

  if (score <= 79) {
    return 'good'
  }

  return 'very_good'
}
```

- [ ] **Step 4: Lancer le test pour verifier qu'il passe**

Run: `npx vitest run tests/unit/domain-level.spec.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Ajouter les libelles de niveau court dans l'i18n**

Dans `src/shared/i18n/locales/fr.ts`, a l'interieur du bloc `results: { ... }`, ajouter :

```ts
    domainLevels: {
      insufficient: 'À renforcer',
      fragile: 'Fragile',
      good: 'Correct',
      very_good: 'Solide',
    },
```

- [ ] **Step 6: Colorer la jauge et afficher le libelle**

Dans `src/views/ResultsView.vue`, ajouter l'import a la suite des imports existants du service de scoring :

```ts
import { getDomainLevelId } from '@/features/assessment/services/scoring.service'
```

Puis remplacer le bloc `v-for` des domaines (lignes 151-166) par :

```vue
          <div
            v-for="domain in result.domainScores"
            :key="domain.id"
            class="domain-score"
          >
            <div class="domain-score__label">
              <span>{{ getDomainLabel(domain.id) }}</span>
              <span>
                {{ t(`results.domainLevels.${getDomainLevelId(domain.score)}`) }}
                — {{ domain.score }}/100
              </span>
            </div>
            <div class="domain-score__track">
              <div
                class="domain-score__bar"
                :class="`domain-score__bar--${getDomainLevelId(domain.score)}`"
                :style="{ width: `${domain.score}%` }"
              ></div>
            </div>
          </div>
```

Le libelle textuel est ce qui rend l'information accessible sans la couleur.

- [ ] **Step 7: Ajouter les couleurs de niveau**

Dans `src/app/styles.css`, remplacer :

```css
.domain-score__bar {
  height: 100%;
  border-radius: inherit;
  background: var(--color-teal);
}
```

par :

```css
.domain-score__bar {
  height: 100%;
  border-radius: inherit;
  background: var(--color-teal);
}

/* La couleur double le libelle affiche a cote de la jauge, elle ne le
   remplace pas : seule, elle serait inaccessible (WCAG 1.4.1). */
.domain-score__bar--insufficient {
  background: var(--color-danger);
}

.domain-score__bar--fragile {
  background: var(--color-warning);
}

.domain-score__bar--good {
  background: var(--color-teal);
}

.domain-score__bar--very_good {
  background: var(--color-success);
}
```

La palette du projet ne contient pas de jaune : `--color-teal` (la couleur
actuelle de la jauge) tient le niveau intermediaire haut. Rouge → orange →
turquoise → vert se distingue mieux qu'un degrade orange/jaune, et reste
dans les couleurs de la marque. Les quatre variables utilisees sont toutes
definies dans `:root` (`src/app/styles.css:19-26`).

- [ ] **Step 8: Verifier la suite unitaire**

Run: `npx vitest run tests/unit`
Expected: PASS (toute la suite, y compris les 4 nouveaux tests)

- [ ] **Step 9: Verification manuelle**

Run: `npm run dev`

Sur `http://localhost:5173/resultats`, verifier que chaque jauge porte la couleur de son niveau et que le libelle correspondant s'affiche a cote du score. Verifier la lisibilite dans les deux themes.

Arreter le serveur (Ctrl+C).

- [ ] **Step 10: Commit**

```bash
git add src/features/assessment/services/scoring.service.ts tests/unit/domain-level.spec.ts src/views/ResultsView.vue src/app/styles.css src/shared/i18n/locales/fr.ts
git commit -m "feat(resultats): code couleur et libelle de niveau sur les jauges par domaine"
```

---

### Task 3: Mises en situation — niveau plutot que score brut

**Files:**
- Create: `tests/unit/scenario-level.spec.ts`
- Modify: `src/features/scenarios/services/scenario.service.ts`
- Modify: `src/views/ScenarioPlayView.vue:135-136`
- Modify: `src/shared/i18n/locales/fr.ts`

**Interfaces:**
- Consumes: `scenarioStore.score` (nombre de 0 a 100, existant).
- Produces: `getScenarioLevel(score: number): 'toImprove' | 'good' | 'excellent'` exporte depuis `src/features/scenarios/services/scenario.service.ts`.

- [ ] **Step 1: Ecrire le test qui echoue**

Creer `tests/unit/scenario-level.spec.ts` :

```ts
import { describe, expect, it } from 'vitest'

import { getScenarioLevel } from '../../src/features/scenarios/services/scenario.service'

describe('getScenarioLevel', () => {
  it('classe un score bas en toImprove', () => {
    expect(getScenarioLevel(0)).toBe('toImprove')
    expect(getScenarioLevel(49)).toBe('toImprove')
  })

  it('classe un score intermediaire en good', () => {
    expect(getScenarioLevel(50)).toBe('good')
    expect(getScenarioLevel(79)).toBe('good')
  })

  it('classe un score haut en excellent', () => {
    expect(getScenarioLevel(80)).toBe('excellent')
    expect(getScenarioLevel(100)).toBe('excellent')
  })
})
```

- [ ] **Step 2: Lancer le test pour verifier qu'il echoue**

Run: `npx vitest run tests/unit/scenario-level.spec.ts`
Expected: FAIL — `getScenarioLevel` n'est pas exporte.

- [ ] **Step 3: Ecrire l'implementation**

Dans `src/features/scenarios/services/scenario.service.ts`, ajouter a la fin du fichier :

```ts
// Un score sur 100 ne dit rien a qui vient de terminer une mise en
// situation : le niveau qualitatif est ce qu'il retient. Le seuil bas est
// formule sans jugement, conformement au ton editorial du site.
export function getScenarioLevel(
  score: number,
): 'toImprove' | 'good' | 'excellent' {
  if (score <= 49) {
    return 'toImprove'
  }

  if (score <= 79) {
    return 'good'
  }

  return 'excellent'
}
```

- [ ] **Step 4: Lancer le test pour verifier qu'il passe**

Run: `npx vitest run tests/unit/scenario-level.spec.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Ajouter les libelles de niveau dans l'i18n**

Dans `src/shared/i18n/locales/fr.ts`, a l'interieur du bloc `scenarioPlay: { debrief: { ... } }`, juste apres la ligne `scoreLabel:`, ajouter :

```ts
      levels: {
        toImprove: 'À renforcer',
        good: 'Bien',
        excellent: 'Excellent',
      },
```

- [ ] **Step 6: Afficher le niveau dans le debrief**

Dans `src/views/ScenarioPlayView.vue`, ajouter l'import a la suite des imports existants :

```ts
import { getScenarioLevel } from '@/features/scenarios/services/scenario.service'
```

Puis remplacer :

```vue
            {{ t('scenarioPlay.debrief.scoreLabel') }} :
            <strong>{{ scenarioStore.score }}/100</strong>
```

par :

```vue
            {{ t('scenarioPlay.debrief.scoreLabel') }} :
            <strong>
              {{ t(`scenarioPlay.debrief.levels.${getScenarioLevel(scenarioStore.score)}`) }}
            </strong>
            <span class="muted">({{ scenarioStore.score }}/100)</span>
```

Le score chiffre reste visible en information secondaire.

- [ ] **Step 7: Verifier la suite unitaire**

Run: `npx vitest run tests/unit`
Expected: PASS

- [ ] **Step 8: Verification manuelle**

Run: `npm run dev`

Ouvrir `http://localhost:5173/mises-en-situation`, jouer un scenario jusqu'au debrief et verifier que le niveau s'affiche en premier, le score entre parentheses ensuite.

Arreter le serveur (Ctrl+C).

- [ ] **Step 9: Commit**

```bash
git add src/features/scenarios/services/scenario.service.ts tests/unit/scenario-level.spec.ts src/views/ScenarioPlayView.vue src/shared/i18n/locales/fr.ts
git commit -m "feat(mises-en-situation): afficher un niveau qualitatif plutot qu'un score brut"
```

---

### Task 4: Page experimentation — retrait des exports CSV et JSON

**Files:**
- Modify: `src/views/UserExperimentView.vue` (template lignes 413-429, script lignes 189-260 environ)
- Modify: `src/shared/i18n/locales/fr.ts:607-608`

**Interfaces:**
- Consumes: rien.
- Produces: rien.

- [ ] **Step 1: Retirer les deux boutons du formulaire**

Dans `src/views/UserExperimentView.vue`, remplacer :

```vue
        <div class="cluster">
          <AppButton type="submit">{{ t('userExperiment.actions.submit') }}</AppButton>
          <AppButton
            variant="secondary"
            :disabled="submissionsCount === 0"
            @click="exportCsv"
          >
            {{ t('userExperiment.actions.exportCsv') }}
          </AppButton>
          <AppButton
            variant="secondary"
            :disabled="submissionsCount === 0"
            @click="exportJson"
          >
            {{ t('userExperiment.actions.exportJson') }}
          </AppButton>
        </div>
```

par :

```vue
        <div class="cluster">
          <AppButton type="submit">{{ t('userExperiment.actions.submit') }}</AppButton>
        </div>
```

- [ ] **Step 2: Supprimer le code d'export devenu mort**

Toujours dans `src/views/UserExperimentView.vue`, supprimer integralement les quatre fonctions `downloadTextFile`, `exportJson`, `toCsvValue` et `exportCsv` (a partir de la ligne 189 environ jusqu'a la fin de `exportCsv`).

Ces fonctions n'ont aucun autre appelant : le verifier avant suppression avec

Run: `grep -n "downloadTextFile\|exportJson\|toCsvValue\|exportCsv" src/views/UserExperimentView.vue`

Attendu apres suppression : aucune sortie.

- [ ] **Step 3: Supprimer les cles i18n inutilisees**

Dans `src/shared/i18n/locales/fr.ts`, supprimer les deux lignes :

```ts
      exportCsv: 'Export CSV',
      exportJson: 'Export JSON',
```

- [ ] **Step 4: Verifier qu'il ne reste aucune reference**

Run: `grep -rn "exportCsv\|exportJson\|toCsvValue\|downloadTextFile" src/`
Expected: aucune sortie.

- [ ] **Step 5: Verifier le typage et le lint**

Run: `npm run type-check`
Expected: aucune erreur.

Run: `npm run lint`
Expected: 0 error (les warnings de fin de ligne preexistants sont attendus).

- [ ] **Step 6: Commit**

```bash
git add src/views/UserExperimentView.vue src/shared/i18n/locales/fr.ts
git commit -m "refactor(experimentation): retirer les exports CSV et JSON destines a l'usage interne"
```

---

### Task 5: Banniere retro — identifiant reutilisable et couleurs en theme sombre

**Files:**
- Modify: `src/components/ui/RetroStatsBanner.vue`
- Modify: `src/shared/i18n/locales/fr.ts`

**Interfaces:**
- Consumes: `getVisitorId(): string` (existant, `src/shared/analytics/analytics.service`), renvoie un UUID de 36 caracteres avec tirets.
- Produces: rien.

- [ ] **Step 1: Afficher l'identifiant complet et le rendre copiable**

Dans `src/components/ui/RetroStatsBanner.vue`, supprimer le calcul de l'identifiant tronque :

```ts
const visitorId = getVisitorId()
const parts = visitorId.split('-')

const shortVisitorId = (
  (parts[0] ?? '').slice(0, 4) +
  (parts[1] ?? '').slice(0, 4) +
  (parts[2] ?? '').slice(0, 4)
).toUpperCase()
```

et le remplacer par :

```ts
// L'identifiant tronque affiche jusqu'ici ne permettait pas de retrouver
// son parcours sur /tableau-de-bord/visiteur, dont la recherche exige les
// 36 caracteres avec tirets : le visiteur recopiait ce qu'il voyait et la
// recherche echouait.
const visitorId = getVisitorId()
const copied = ref(false)

async function copyVisitorId() {
  try {
    await navigator.clipboard.writeText(visitorId)
    copied.value = true
    window.setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch {
    copied.value = false
  }
}
```

Ajouter `navigator` et `window` a la directive globale en tete de fichier :

```ts
/* global fetch, navigator, window */
```

- [ ] **Step 2: Adapter le gabarit du badge**

Toujours dans `RetroStatsBanner.vue`, remplacer le bloc du badge :

```vue
    <div
      class="retro-id-badge"
      role="img"
      :aria-label="t('retroStats.idBadgeAria', { id: visitorId })"
    >
      <span class="retro-id-badge__label">{{ t('retroStats.idBadgeLabel') }}</span>
      <span class="retro-id-badge__value">{{ shortVisitorId }}</span>
    </div>
```

par :

```vue
    <div class="retro-id-badge">
      <span class="retro-id-badge__label">{{ t('retroStats.idBadgeLabel') }}</span>
      <span class="retro-id-badge__value">{{ visitorId }}</span>
      <button type="button" class="retro-id-badge__copy" @click="copyVisitorId">
        {{ copied ? t('retroStats.idCopied') : t('retroStats.idCopy') }}
      </button>
    </div>
```

Le `role="img"` disparait : le badge contient desormais un bouton, et un
element `img` ne peut pas contenir de commande interactive.

- [ ] **Step 3: Ajouter les cles i18n et retirer celle devenue morte**

Dans `src/shared/i18n/locales/fr.ts`, dans le bloc `retroStats: { ... }`, juste apres `idBadgeLabel`, ajouter :

```ts
    idCopy: 'Copier',
    idCopied: 'Copié',
```

La cle `idBadgeAria` n'a plus d'appelant depuis l'etape 2 : la supprimer dans
les deux locales, `src/shared/i18n/locales/fr.ts:235` et
`src/shared/i18n/locales/swb.ts:612`.

Verifier qu'il n'en reste aucune trace :

Run: `grep -rn "idBadgeAria" src/`
Expected: aucune sortie.

- [ ] **Step 4: Adapter le style du badge et corriger le theme sombre**

Dans le bloc `<style scoped>` de `RetroStatsBanner.vue`, remplacer la regle `.retro-id-badge__value` par :

```css
.retro-id-badge__value {
  font-family: ui-monospace, "SF Mono", Consolas, "Courier New", monospace;
  font-weight: 700;
  font-size: 0.78rem;
  letter-spacing: 0.04em;
  color: var(--color-teal-on-dark);
  text-shadow: 0 0 8px rgba(0, 161, 173, 0.85);
  overflow-wrap: anywhere;
  max-width: 22ch;
  text-align: center;
}

.retro-id-badge__copy {
  border: 1px solid var(--color-teal);
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-teal-on-dark);
  font-size: 0.68rem;
  font-weight: 700;
  padding: 2px 10px;
  cursor: pointer;
}

.retro-id-badge__copy:hover,
.retro-id-badge__copy:focus-visible {
  background: rgba(255, 255, 255, 0.12);
}
```

Puis, a la fin du bloc `<style scoped>`, ajouter la correction du theme sombre :

```css
/* En theme sombre, le fond --color-primary-dark de la banniere se detache
   mal du fond de page (#060f18) : elle perd le relief qu'elle a en theme
   clair. Une bordure turquoise lui redonne son contour sans changer sa
   couleur de fond, deja porteuse de l'identite du bloc. */
:global(:root[data-theme="dark"]) .retro-banner {
  border: 1px solid var(--color-teal);
}
```

- [ ] **Step 5: Verifier le typage**

Run: `npm run type-check`
Expected: aucune erreur.

- [ ] **Step 6: Verification manuelle**

Run: `npm run dev`

Sur `http://localhost:5173/`, en bas de page :
- l'identifiant complet (36 caracteres, avec tirets) s'affiche sans deborder du bloc ;
- le bouton « Copier » place bien l'identifiant dans le presse-papier et affiche « Copié » pendant deux secondes ;
- l'identifiant colle dans le champ de `http://localhost:5173/tableau-de-bord/visiteur` est accepte ;
- en theme sombre, la banniere se detache nettement du fond de page.

Arreter le serveur (Ctrl+C).

- [ ] **Step 7: Commit**

```bash
git add src/components/ui/RetroStatsBanner.vue src/shared/i18n/locales/fr.ts
git commit -m "feat(accueil): identifiant visiteur complet et copiable, banniere lisible en theme sombre"
```

---

### Task 6: Verification finale du lot

- [ ] **Step 1: Lancer la suite complete**

Run: `npm run quality`
Expected: PASS — lint 0 error, type-check sans erreur, tests unitaires au vert, build reussi.

- [ ] **Step 2: Lancer la suite e2e**

Run: `npm run test:e2e`

Attendu : aucune regression par rapport a l'etat d'avant le lot. Plusieurs
tests de `main-journey.spec.ts` et `accessibility.spec.ts` echouent de
maniere intermittente independamment de ce lot (constate sur le commit
`bcccff1`, avant toute modification) : leur echec n'est pas imputable a ces
taches. Tout autre test qui echouerait est en revanche une regression a
corriger.

- [ ] **Step 3: Verifier que la spec est entierement couverte**

Relire la section « Lot A » de
`docs/superpowers/specs/2026-08-12-refonte-ux-globale-design.md` et cocher
les sept points : A1 (Task 5), A2 (Task 5), A3 (Task 1), A4 (Task 1),
A5 (Task 2), A6 (Task 3), A7 (Task 4).
