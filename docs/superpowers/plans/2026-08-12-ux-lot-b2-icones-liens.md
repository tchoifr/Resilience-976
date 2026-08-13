# Lot B-bis — Icones sur les liens-boutons Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Etendre les icones aux liens stylés en bouton, en commencant par ceux que le visiteur voit le plus, et absorber au passage la repetition des classes dans un composant.

**Architecture:** Un composant `LinkButton.vue` encapsule `RouterLink` + classes + `AppIcon`. Les trente-neuf occurrences ecrites a la main deviennent des balises `<LinkButton>`. Les icones ne sont posees que la ou elles ajoutent du sens.

**Tech Stack:** Vue 3 + TypeScript, vue-router, CSS natif (aucune regle nouvelle), Vitest.

Prolonge le lot B (`docs/superpowers/plans/2026-08-12-ux-lot-b-icones.md`), qui a livre `AppIcon` et la prop `icon` de `AppButton`.

## Global Constraints

- Aucune dependance npm nouvelle ; aucune regle CSS nouvelle (`.link-button` existe deja et partage le style de `.button`, `src/app/styles.css:281`).
- L'icone reste **decorative** : `aria-hidden="true"`, le libelle porte seul le sens.
- Toute chaine visible passe par les fichiers de locales ; ce lot n'ajoute aucune chaine.
- Les deux themes doivent rester lisibles.
- Le jeu d'icones reste celui du lot B (`src/components/ui/icons.ts`). **On n'ajoute aucune icone nouvelle** sans le signaler.

## Principe de pose : une icone seulement si elle ajoute du sens

Poser une fleche sur les trente-neuf liens serait du bruit : une icone repetee
partout cesse d'etre un repere. La regle retenue :

| Cas | Icone | Pourquoi |
| --- | --- | --- |
| Retour arriere (« Retour au tableau de bord », « Retour a l'accueil ») | `arrow-left` | La direction est l'information. |
| Appel a l'action principal (`variant="primary"`) | `arrow-right` | Signale la marche a suivre, la ou le visiteur doit avancer. |
| Action nommee (telecharger, imprimer, rechercher, recommencer) | l'icone de l'action | Meme logique qu'au lot B. |
| Lien secondaire contextuel (« Voir les ressources », « Voir le kit ») | **aucune** | Une fleche partout cesse d'etre un repere ; on la reserve a l'action principale. |

Regle arbitree avec le porteur : il voulait une fleche sur les appels a
l'action de l'accueil. Elle est donc posee sur tous les liens principaux du
site, pas seulement ceux de l'accueil — une meme forme doit signifier la meme
chose partout.

---

### Task 1: Composant `LinkButton.vue`

**Files:**
- Create: `src/components/ui/LinkButton.vue`
- Create: `tests/unit/link-button.spec.ts`

**Interfaces:**
- Consumes: `AppIcon` et `IconName` (lot B).
- Produces: composant `LinkButton` acceptant `to: string`, `variant?: 'primary' | 'secondary'` (defaut `primary`), `icon?: IconName`. Consomme par Tasks 2 et 3.

- [ ] **Step 1: Ecrire le test qui echoue**

Creer `tests/unit/link-button.spec.ts` :

```ts
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import LinkButton from '../../src/components/ui/LinkButton.vue'

const stubs = { RouterLink: { props: ['to'], template: '<a><slot /></a>' } }

describe('LinkButton', () => {
  it('applique la variante primaire par defaut', () => {
    const wrapper = mount(LinkButton, {
      props: { to: '/kit' },
      slots: { default: 'Voir le kit' },
      global: { stubs },
    })

    expect(wrapper.classes()).toContain('link-button')
    expect(wrapper.classes()).toContain('link-button--primary')
  })

  it('applique la variante demandee', () => {
    const wrapper = mount(LinkButton, {
      props: { to: '/kit', variant: 'secondary' },
      slots: { default: 'Voir le kit' },
      global: { stubs },
    })

    expect(wrapper.classes()).toContain('link-button--secondary')
  })

  it('n affiche aucune icone par defaut', () => {
    const wrapper = mount(LinkButton, {
      props: { to: '/' },
      slots: { default: 'Accueil' },
      global: { stubs },
    })

    expect(wrapper.find('svg').exists()).toBe(false)
  })

  it('affiche l icone demandee, decorative', () => {
    const wrapper = mount(LinkButton, {
      props: { to: '/', icon: 'arrow-left' },
      slots: { default: 'Retour' },
      global: { stubs },
    })

    expect(wrapper.find('svg').exists()).toBe(true)
    expect(wrapper.find('svg').attributes('aria-hidden')).toBe('true')
  })
})
```

- [ ] **Step 2: Lancer le test pour verifier qu'il echoue**

Run: `npx vitest run tests/unit/link-button.spec.ts`
Expected: FAIL — le module `LinkButton.vue` n'existe pas.

- [ ] **Step 3: Ecrire l'implementation**

Creer `src/components/ui/LinkButton.vue` :

```vue
<script setup lang="ts">
import AppIcon from './AppIcon.vue'
import type { IconName } from './icons'

withDefaults(
  defineProps<{
    to: string
    variant?: 'primary' | 'secondary'
    icon?: IconName
  }>(),
  {
    variant: 'primary',
    icon: undefined,
  },
)
</script>

<template>
  <RouterLink class="link-button" :class="`link-button--${variant}`" :to="to">
    <AppIcon v-if="icon" :name="icon" />
    <slot />
  </RouterLink>
</template>
```

Aucune regle CSS n'est ajoutee : `.link-button` partage deja avec `.button`
l'alignement `inline-flex` et le `gap` qui placent l'icone
(`src/app/styles.css:281`).

- [ ] **Step 4: Lancer le test pour verifier qu'il passe**

Run: `npx vitest run tests/unit/link-button.spec.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/LinkButton.vue tests/unit/link-button.spec.ts
git commit -m "feat(ui): composant LinkButton pour les liens stylés en bouton"
```

---

### Task 2: Pages publiques

**Files:**
- Modify: `src/views/HomeView.vue`
- Modify: `src/views/ResultsView.vue`
- Modify: `src/views/NotFoundView.vue`
- Modify: `src/views/ContentLinksView.vue`
- Modify: `src/views/ScenariosView.vue`
- Modify: `src/views/ScenarioPlayView.vue`
- Modify: `src/views/VideoDetailView.vue`
- Modify: `src/views/SupportView.vue`

**Interfaces:**
- Consumes: `LinkButton` (Task 1).

- [ ] **Step 1: Remplacer les liens-boutons**

Dans chacun de ces fichiers, remplacer

```vue
<RouterLink class="link-button link-button--primary" to="/x">…</RouterLink>
```

par

```vue
<LinkButton to="/x">…</LinkButton>
```

et la variante secondaire par `<LinkButton to="/x" variant="secondary">`.
Ajouter l'import dans chaque fichier :

```ts
import LinkButton from '@/components/ui/LinkButton.vue'
```

Poser une icone uniquement dans ces cas :

| Fichier | Lien | `icon` |
| --- | --- | --- |
| `NotFoundView.vue` | retour vers `/` | `arrow-left` |
| `ScenarioPlayView.vue` | retour vers `/mises-en-situation` | `arrow-left` |

Tous les autres liens de ces pages restent sans icone : ce sont des
navigations dont le libelle se suffit.

- [ ] **Step 2: Verifier**

Run: `npm run type-check`
Expected: aucune erreur.

Run: `npm run lint`
Expected: 0 error.

- [ ] **Step 3: Verification manuelle**

Run: `npm run dev`

Verifier `/`, `/resultats`, `/mises-en-situation` et une page inexistante :
les liens gardent exactement leur apparence, et les deux retours portent leur
fleche. Verifier dans les deux themes.

Arreter le serveur (Ctrl+C).

- [ ] **Step 4: Commit**

```bash
git add src/views/
git commit -m "refactor(ui): liens-boutons des pages publiques via LinkButton"
```

---

### Task 3: Pages de tableau de bord

**Files:**
- Modify: `src/views/DashboardView.vue`
- Modify: `src/views/DiagnosticStatsView.vue`
- Modify: `src/views/ExperimentStatsView.vue`
- Modify: `src/views/KitStatsView.vue`
- Modify: `src/views/PrioritiesView.vue`
- Modify: `src/views/QuizStatsView.vue`
- Modify: `src/views/ScenarioStatsView.vue`

**Interfaces:**
- Consumes: `LinkButton` (Task 1).

- [ ] **Step 1: Remplacer les liens-boutons**

Meme substitution qu'en Task 2.

Les neuf liens « Retour au tableau de bord » (`to="/tableau-de-bord"`)
recoivent `icon="arrow-left"` : ce sont exactement le cas ou la direction est
l'information. Les liens de `DashboardView` vers les differentes pages de
statistiques restent sans icone.

Les reperer avec :

Run: `grep -rn 'link-button link-button--secondary" to="/tableau-de-bord"' src/`

- [ ] **Step 2: Verifier qu'aucun lien-bouton ecrit a la main ne subsiste**

Run: `grep -rn "class=\"link-button" src/ --include=*.vue`
Expected: aucune sortie. Toute occurrence restante doit etre justifiee dans le
rapport — un lien externe (`<a href>`) ne peut pas utiliser `LinkButton`, qui
rend un `RouterLink` ; le signaler plutot que de le forcer.

- [ ] **Step 3: Verifier**

Run: `npm run type-check`
Expected: aucune erreur.

Run: `npm run lint`
Expected: 0 error.

- [ ] **Step 4: Commit**

```bash
git add src/views/
git commit -m "refactor(ui): liens-boutons des tableaux de bord via LinkButton"
```

---

### Task 4: Verification finale du lot

- [ ] **Step 1: Lancer la suite complete**

Run: `npm run quality`
Expected: PASS.

- [ ] **Step 2: Lancer la suite e2e**

Run: `npm run test:e2e`

**Point de vigilance** : les tests naviguent par
`getByRole('link', { name: '...' })`. `LinkButton` rend le meme `RouterLink`
qu'avant, et l'icone est `aria-hidden` : le nom accessible ne change pas.
Toute rupture est donc une vraie regression, pas une adaptation attendue.

Etat de reference a ce jour : sept echecs preexistants dans
`main-journey.spec.ts` et `accessibility.spec.ts`, independants de ce lot.
