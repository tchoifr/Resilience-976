# Lot B — Systeme d'icones Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Donner une icone aux boutons du site pour accelerer la reconnaissance des actions recurrentes, sans ajouter la moindre dependance.

**Architecture:** Un composant `AppIcon.vue` rend un `<svg>` inline a partir d'un dictionnaire de traces interne au projet. `AppButton.vue` gagne une prop optionnelle `icon` qui place l'icone avant le libelle. Les vues se contentent ensuite de passer `icon="..."`.

**Tech Stack:** Vue 3 + TypeScript, CSS natif, Vitest.

Spec de reference : `docs/superpowers/specs/2026-08-12-refonte-ux-globale-design.md` (lot B).

## Global Constraints

- Aucune dependance npm nouvelle : la CSP du site interdit tout script ou style externe. Les traces SVG sont ecrites dans le projet.
- L'icone est toujours **decorative** : `aria-hidden="true"` et `focusable="false"`. Le libelle textuel du bouton porte seul le sens. Un bouton sans texte reste interdit.
- L'icone herite de la couleur du texte (`stroke: currentColor`) pour suivre les deux themes sans regle supplementaire.
- Le jeu se limite aux actions reellement presentes a l'ecran. On n'ajoute pas d'icone « au cas ou ».
- Toute chaine visible passe par les fichiers de locales ; ce lot n'ajoute aucune chaine.
- Les deux themes (clair et sombre) doivent rester lisibles.

## Jeu d'icones retenu

Recense a partir des usages reels de `AppButton` dans `src/views/` :

| Nom | Actions couvertes |
| --- | --- |
| `arrow-left` | Question precedente |
| `arrow-right` | Question suivante, voir les resultats |
| `check` | Confirmer, valider une reponse, enregistrer un retour |
| `plus` | Ajouter une action a la checklist |
| `printer` | Imprimer la page, imprimer le certificat |
| `download` | Telecharger un PDF, une attestation, un certificat |
| `trash` | Effacer mes donnees |
| `search` | Rechercher (assistant de liens, profil visiteur) |
| `play` | Demarrer le quiz |
| `refresh` | Recommencer un quiz ou un scenario |

---

### Task 1: Composant `AppIcon.vue`

**Files:**
- Create: `src/components/ui/icons.ts`
- Create: `src/components/ui/AppIcon.vue`
- Create: `tests/unit/app-icon.spec.ts`

**Interfaces:**
- Produces: `IconName` (union des dix noms du tableau ci-dessus) et `iconPaths: Record<IconName, string[]>`, exportes depuis `src/components/ui/icons.ts` ; composant `AppIcon` acceptant `name: IconName`. Consommes par Task 2.

Le dictionnaire vit dans un fichier `.ts` separe parce qu'un bloc
`<script setup>` de Vue 3 n'autorise aucune instruction `export` : le type
`IconName` n'y serait pas exportable vers `AppButton`.

- [ ] **Step 1: Ecrire le test qui echoue**

Creer `tests/unit/app-icon.spec.ts` :

```ts
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import AppIcon from '../../src/components/ui/AppIcon.vue'

describe('AppIcon', () => {
  it('rend un svg pour chaque nom du jeu d icones', () => {
    const names = [
      'arrow-left',
      'arrow-right',
      'check',
      'plus',
      'printer',
      'download',
      'trash',
      'search',
      'play',
      'refresh',
    ] as const

    for (const name of names) {
      const wrapper = mount(AppIcon, { props: { name } })
      expect(wrapper.find('svg').exists()).toBe(true)
      expect(wrapper.find('path').exists()).toBe(true)
    }
  })

  // L'icone double le libelle du bouton : annoncee par un lecteur d'ecran,
  // elle le repeterait ou le parasiterait.
  it('est purement decorative', () => {
    const wrapper = mount(AppIcon, { props: { name: 'check' } })
    const svg = wrapper.find('svg')
    expect(svg.attributes('aria-hidden')).toBe('true')
    expect(svg.attributes('focusable')).toBe('false')
  })

  it('herite de la couleur du texte pour suivre les deux themes', () => {
    const wrapper = mount(AppIcon, { props: { name: 'check' } })
    expect(wrapper.find('svg').attributes('stroke')).toBe('currentColor')
  })

  it('ne rend rien pour un nom inconnu', () => {
    const wrapper = mount(AppIcon, { props: { name: 'inconnu' as 'check' } })
    expect(wrapper.find('svg').exists()).toBe(false)
  })
})
```

- [ ] **Step 2: Lancer le test pour verifier qu'il echoue**

Run: `npx vitest run tests/unit/app-icon.spec.ts`
Expected: FAIL — le module `AppIcon.vue` n'existe pas.

- [ ] **Step 3: Ecrire l'implementation**

Creer d'abord `src/components/ui/icons.ts` :

```ts
export type IconName =
  | 'arrow-left'
  | 'arrow-right'
  | 'check'
  | 'plus'
  | 'printer'
  | 'download'
  | 'trash'
  | 'search'
  | 'play'
  | 'refresh'

// Traces ecrites dans le projet plutot qu'importees d'une bibliotheque :
// la CSP interdit toute ressource externe, et dix icones ne justifient pas
// une dependance. Toutes sont dessinees sur une grille 24x24, en traits
// (pas en aplats) pour rester lisibles a petite taille dans les deux themes.
export const iconPaths: Record<IconName, string[]> = {
  'arrow-left': ['M19 12H5', 'M12 19l-7-7 7-7'],
  'arrow-right': ['M5 12h14', 'M12 5l7 7-7 7'],
  check: ['M20 6L9 17l-5-5'],
  plus: ['M12 5v14', 'M5 12h14'],
  printer: ['M6 9V3h12v6', 'M6 18H4v-7h16v7h-2', 'M6 14h12v7H6z'],
  download: ['M3 15v4a2 2 0 002 2h14a2 2 0 002-2v-4', 'M7 10l5 5 5-5', 'M12 15V3'],
  trash: ['M3 6h18', 'M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2', 'M19 6l-1 15H6L5 6'],
  search: ['M11 19a8 8 0 100-16 8 8 0 000 16z', 'M21 21l-4.3-4.3'],
  play: ['M7 4l12 8-12 8V4z'],
  refresh: ['M21 12a9 9 0 11-2.6-6.4', 'M21 3v6h-6'],
}
```

Puis `src/components/ui/AppIcon.vue` :

```vue
<script setup lang="ts">
import { computed } from 'vue'

import { iconPaths, type IconName } from './icons'

const props = defineProps<{ name: IconName }>()

const shapes = computed(() => iconPaths[props.name])
</script>

<template>
  <svg
    v-if="shapes"
    class="app-icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path v-for="shape in shapes" :key="shape" :d="shape" />
  </svg>
</template>

<style scoped>
.app-icon {
  width: 1em;
  height: 1em;
  flex-shrink: 0;
}
</style>
```

- [ ] **Step 4: Lancer le test pour verifier qu'il passe**

Run: `npx vitest run tests/unit/app-icon.spec.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/icons.ts src/components/ui/AppIcon.vue tests/unit/app-icon.spec.ts
git commit -m "feat(ui): composant AppIcon avec un jeu de dix icones internes"
```

---

### Task 2: Prop `icon` sur `AppButton`

**Files:**
- Modify: `src/components/ui/AppButton.vue`
- Modify: `src/app/styles.css` (regle `.button`)
- Test: `tests/unit/app-button.spec.ts` (creation)

**Interfaces:**
- Consumes: `AppIcon` et le type `IconName` (Task 1).
- Produces: `AppButton` accepte une prop optionnelle `icon?: IconName`. Consomme par Tasks 3 et 4.

- [ ] **Step 1: Ecrire le test qui echoue**

Creer `tests/unit/app-button.spec.ts` :

```ts
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import AppButton from '../../src/components/ui/AppButton.vue'

describe('AppButton', () => {
  it('n affiche aucune icone quand la prop icon est absente', () => {
    const wrapper = mount(AppButton, { slots: { default: 'Continuer' } })
    expect(wrapper.find('svg').exists()).toBe(false)
    expect(wrapper.text()).toContain('Continuer')
  })

  it('affiche l icone demandee avant le libelle', () => {
    const wrapper = mount(AppButton, {
      props: { icon: 'check' },
      slots: { default: 'Confirmer' },
    })
    expect(wrapper.find('svg').exists()).toBe(true)
    expect(wrapper.text()).toContain('Confirmer')
  })

  // Le libelle doit rester le seul porteur de sens pour un lecteur d'ecran.
  it('garde l icone decorative', () => {
    const wrapper = mount(AppButton, {
      props: { icon: 'check' },
      slots: { default: 'Confirmer' },
    })
    expect(wrapper.find('svg').attributes('aria-hidden')).toBe('true')
  })
})
```

- [ ] **Step 2: Lancer le test pour verifier qu'il echoue**

Run: `npx vitest run tests/unit/app-button.spec.ts`
Expected: FAIL — le bouton ne rend pas de `svg`.

- [ ] **Step 3: Ecrire l'implementation**

Remplacer `src/components/ui/AppButton.vue` par :

```vue
<script setup lang="ts">
import AppIcon from './AppIcon.vue'
import type { IconName } from './icons'

withDefaults(
  defineProps<{
    type?: 'button' | 'submit' | 'reset'
    variant?: 'primary' | 'secondary' | 'danger'
    disabled?: boolean
    icon?: IconName
  }>(),
  {
    type: 'button',
    variant: 'primary',
    disabled: false,
    icon: undefined,
  },
)

defineEmits<{
  click: [event: MouseEvent]
}>()
</script>

<template>
  <button
    class="button"
    :class="`button--${variant}`"
    :type="type"
    :disabled="disabled"
    @click="$emit('click', $event)"
  >
    <AppIcon v-if="icon" :name="icon" />
    <slot />
  </button>
</template>
```

- [ ] **Step 4: Aligner l'icone et le libelle**

Dans `src/app/styles.css`, ajouter a la regle `.button` existante les proprietes d'alignement, sans toucher au reste de la regle :

```css
  display: inline-flex;
  align-items: center;
  gap: 0.5em;
  justify-content: center;
```

Reperer la regle avec :

Run: `grep -n "^\.button {" -A 12 src/app/styles.css`

Si `.button` declare deja un `display`, remplacer cette valeur par `inline-flex` plutot que d'en ajouter une seconde.

- [ ] **Step 5: Lancer les tests**

Run: `npx vitest run tests/unit/app-button.spec.ts`
Expected: PASS (3 tests)

Run: `npm run type-check`
Expected: aucune erreur.

- [ ] **Step 6: Commit**

```bash
git add src/components/ui/AppButton.vue src/app/styles.css tests/unit/app-button.spec.ts
git commit -m "feat(ui): prop icon sur AppButton"
```

---

### Task 3: Icones du parcours principal

**Files:**
- Modify: `src/views/DiagnosticView.vue`
- Modify: `src/views/ResultsView.vue`
- Modify: `src/views/ChecklistView.vue`
- Modify: `src/views/KitView.vue`

**Interfaces:**
- Consumes: prop `icon` de `AppButton` (Task 2).

- [ ] **Step 1: Appliquer les icones**

Ajouter l'attribut `icon` aux `AppButton` existants, sans rien changer d'autre :

| Fichier | Bouton (libelle i18n) | `icon` |
| --- | --- | --- |
| `DiagnosticView.vue` | `diagnostic.previous` | `arrow-left` |
| `DiagnosticView.vue` | `diagnostic.next` | `arrow-right` |
| `DiagnosticView.vue` | `diagnostic.confirm` | `check` |
| `DiagnosticView.vue` | `diagnostic.results` | `arrow-right` |
| `ResultsView.vue` | `results.printCertificate` | `printer` |
| `ResultsView.vue` | `common.resetData` | `trash` |
| `ChecklistView.vue` | `checklist.add` | `plus` |
| `ChecklistView.vue` | `checklist.printPage` | `printer` |
| `ChecklistView.vue` | `checklist.downloadPdf` | `download` |
| `ChecklistView.vue` | `common.resetData` | `trash` |
| `KitView.vue` | `kit.downloadPdf` | `download` |

Si un bouton du tableau n'existe pas dans le fichier (libelle deplace depuis la redaction du plan), le signaler dans le rapport plutot que d'inventer un emplacement. Si `ResultsView.vue` ou `ChecklistView.vue` contient un bouton de telechargement PDF non liste ci-dessus, lui donner `download`.

- [ ] **Step 2: Verifier le typage et le lint**

Run: `npm run type-check`
Expected: aucune erreur — un nom d'icone invalide serait rejete ici.

Run: `npm run lint`
Expected: 0 error.

- [ ] **Step 3: Verification manuelle**

Run: `npm run dev`

Parcourir `/diagnostic`, `/resultats`, `/checklist` et `/kit`. Verifier que chaque bouton porte son icone, alignee avec le libelle, dans les deux themes.

Arreter le serveur (Ctrl+C).

- [ ] **Step 4: Commit**

```bash
git add src/views/DiagnosticView.vue src/views/ResultsView.vue src/views/ChecklistView.vue src/views/KitView.vue
git commit -m "feat(ui): icones sur les boutons du parcours principal"
```

---

### Task 4: Icones des autres ecrans

**Files:**
- Modify: `src/views/QuizView.vue`
- Modify: `src/views/VideoDetailView.vue`
- Modify: `src/views/ScenarioPlayView.vue`
- Modify: `src/views/ContentLinksView.vue`
- Modify: `src/views/UserExperimentView.vue`
- Modify: `src/views/VisitorProfileView.vue`
- Modify: `src/views/LegalView.vue`

**Interfaces:**
- Consumes: prop `icon` de `AppButton` (Task 2).

- [ ] **Step 1: Appliquer les icones**

| Fichier | Bouton (libelle i18n) | `icon` |
| --- | --- | --- |
| `QuizView.vue` | `quiz.start` | `play` |
| `QuizView.vue` | `quiz.submit` | `check` |
| `QuizView.vue` | `quiz.restart` | `refresh` |
| `VideoDetailView.vue` | `videos.validateAnswer` | `check` |
| `ScenarioPlayView.vue` | `scenarioPlay.debrief.restart` | `refresh` |
| `ContentLinksView.vue` | `contentLinks.submit` | `search` |
| `UserExperimentView.vue` | `userExperiment.actions.submit` | `check` |
| `VisitorProfileView.vue` | `visitorProfile.search` | `search` |
| `LegalView.vue` | `legal.resetLocal` | `trash` |

Si l'un de ces ecrans porte un bouton de telechargement d'attestation non liste, lui donner `download`.

- [ ] **Step 2: Verifier qu'aucun AppButton n'a ete oublie**

Run: `grep -rn "<AppButton" src/views/ | wc -l`

Comparer au nombre de `AppButton` portant desormais une prop `icon` :

Run: `grep -rn "<AppButton" -A 3 src/views/ | grep -c "icon="`

Tout ecart doit etre justifie dans le rapport : un bouton peut legitimement rester sans icone si aucune des dix ne correspond a son action. Ne pas creer d'icone supplementaire pour combler l'ecart sans le signaler.

- [ ] **Step 3: Verifier le typage et le lint**

Run: `npm run type-check`
Expected: aucune erreur.

Run: `npm run lint`
Expected: 0 error.

- [ ] **Step 4: Commit**

```bash
git add src/views/
git commit -m "feat(ui): icones sur les boutons des ecrans quiz, videos, scenarios et formulaires"
```

---

### Task 5: Verification finale du lot

- [ ] **Step 1: Lancer la suite complete**

Run: `npm run quality`
Expected: PASS — lint 0 error, type-check sans erreur, tests unitaires au vert, build reussi.

- [ ] **Step 2: Lancer la suite e2e**

Run: `npm run test:e2e`

Attendu : aucune regression par rapport a l'etat d'avant le lot. Sept tests de
`main-journey.spec.ts` et `accessibility.spec.ts` echouent de maniere
intermittente independamment de ce lot ; tout autre echec est une regression.

**Point de vigilance** : les selecteurs Playwright reposent sur
`getByRole('button', { name: '...' })`. Une icone decorative
(`aria-hidden="true"`) ne modifie pas le nom accessible du bouton et ne doit
donc rien casser. Si un test de nom de bouton echoue, c'est que l'icone n'est
pas correctement masquee aux technologies d'assistance : corriger `AppIcon`,
pas le test.

- [ ] **Step 3: Verification visuelle des deux themes**

Run: `npm run dev`

Verifier sur deux ecrans au moins que les icones heritent bien de la couleur
du libelle en theme clair comme en theme sombre, y compris sur les variantes
`secondary` et `danger`.

Arreter le serveur (Ctrl+C).
