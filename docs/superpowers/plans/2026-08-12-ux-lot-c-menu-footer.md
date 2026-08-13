# Lot C — Menu et pied de page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ramener le menu de dix liens plats a quatre entrees groupees par intention, et donner au pied de page une structure en colonnes lisible.

**Architecture:** Un composant `NavGroup.vue` encapsule une entree a sous-menu (bouton + panneau), avec la meme interaction sur tous les ecrans : ouverture au clic, fermeture a `Echap` ou au clic exterieur. Seul le positionnement du panneau change selon la largeur (absolu au-dessus de 900px, dans le flux en dessous). `AppHeader` compose deux `NavGroup` et deux liens directs. `AppFooter` passe a quatre colonnes titrees plus une barre basse.

**Tech Stack:** Vue 3 + TypeScript, vue-router, CSS natif, Vitest.

Spec de reference : `docs/superpowers/specs/2026-08-12-refonte-ux-globale-design.md` (lot C).

## Global Constraints

- Aucune dependance npm nouvelle : la CSP interdit tout script ou style externe.
- Toute chaine visible passe par `src/shared/i18n/locales/fr.ts`. Ajouter une cle au seul `fr.ts` est accepte (l'i18n retombe sur le francais) ; **supprimer** une cle impose de la supprimer aussi dans `swb.ts`.
- Les deux themes (clair et sombre) doivent rester lisibles.
- Le point de rupture mobile du projet est **900px** (`src/app/styles.css:1936`).
- Interaction au clic, jamais au survol seul : le survol est inutilisable au tactile et au clavier.
- Les libelles visibles doivent etre correctement accentues.

## Regroupement retenu

| Entree | Type | Contenu |
| --- | --- | --- |
| Accueil | lien direct | `/` |
| Mon plan | groupe | Diagnostic, Resultats, Checklist, Kit d'urgence |
| Se former | groupe | Videos, Quiz, Mises en situation |
| Ressources | lien direct | `/ressources` |

« Experimentation » quitte le menu : c'est un formulaire de retour, pas une destination. Il rejoint le pied de page sous le libelle « Donner mon avis ».

---

### Task 1: Composant `NavGroup.vue`

**Files:**
- Create: `src/components/ui/NavGroup.vue`
- Create: `tests/unit/nav-group.spec.ts`

**Interfaces:**
- Produces: composant `NavGroup` acceptant `label: string` et `links: { to: string; label: string }[]`. Consomme par Task 2.

- [ ] **Step 1: Ecrire le test qui echoue**

Creer `tests/unit/nav-group.spec.ts` :

```ts
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import NavGroup from '../../src/components/ui/NavGroup.vue'

const links = [
  { to: '/diagnostic', label: 'Diagnostic' },
  { to: '/resultats', label: 'Résultats' },
]

function mountGroup() {
  return mount(NavGroup, {
    props: { label: 'Mon plan', links },
    global: { stubs: { RouterLink: { template: '<a><slot /></a>' } } },
  })
}

describe('NavGroup', () => {
  it('est replie au depart', () => {
    const wrapper = mountGroup()
    expect(wrapper.get('button').attributes('aria-expanded')).toBe('false')
  })

  it('ouvre le panneau au clic et annonce son etat', async () => {
    const wrapper = mountGroup()
    await wrapper.get('button').trigger('click')

    expect(wrapper.get('button').attributes('aria-expanded')).toBe('true')
    expect(wrapper.findAll('a')).toHaveLength(2)
  })

  it('referme le panneau au second clic', async () => {
    const wrapper = mountGroup()
    await wrapper.get('button').trigger('click')
    await wrapper.get('button').trigger('click')

    expect(wrapper.get('button').attributes('aria-expanded')).toBe('false')
  })

  // Sans cela, le sous-menu resterait ouvert au clavier sans moyen d'en
  // sortir autrement qu'en le traversant entierement.
  it('referme le panneau sur Echap', async () => {
    const wrapper = mountGroup()
    await wrapper.get('button').trigger('click')
    await wrapper.get('button').trigger('keydown', { key: 'Escape' })

    expect(wrapper.get('button').attributes('aria-expanded')).toBe('false')
  })

  it('relie le bouton a son panneau', async () => {
    const wrapper = mountGroup()
    await wrapper.get('button').trigger('click')
    const controls = wrapper.get('button').attributes('aria-controls')

    expect(controls).toBeTruthy()
    expect(wrapper.find(`#${controls}`).exists()).toBe(true)
  })
})
```

- [ ] **Step 2: Lancer le test pour verifier qu'il echoue**

Run: `npx vitest run tests/unit/nav-group.spec.ts`
Expected: FAIL — le module `NavGroup.vue` n'existe pas.

- [ ] **Step 3: Ecrire l'implementation**

Creer `src/components/ui/NavGroup.vue` :

```vue
<script setup lang="ts">
/* global document */
import { computed, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'
import { useRoute } from 'vue-router'

const props = defineProps<{
  label: string
  links: { to: string; label: string }[]
}>()

const route = useRoute()
const isOpen = ref(false)
const root = ref<HTMLElement | null>(null)
const panelId = `nav-group-${useId()}`

// L'entree parente doit rester signalee comme active tant qu'une de ses
// pages est ouverte, sinon le visiteur perd tout repere une fois le
// sous-menu referme.
const isActive = computed(() =>
  props.links.some((link) => route.path === link.to),
)

function close() {
  isOpen.value = false
}

function toggle() {
  isOpen.value = !isOpen.value
}

// Un sous-menu qui ne se ferme pas au clic exterieur reste ouvert par-dessus
// le reste de la page et masque le contenu.
function onDocumentClick(event: MouseEvent) {
  if (root.value && !root.value.contains(event.target as Node)) {
    close()
  }
}

onMounted(() => document.addEventListener('click', onDocumentClick))
onBeforeUnmount(() => document.removeEventListener('click', onDocumentClick))

watch(() => route.fullPath, close)
</script>

<template>
  <div ref="root" class="nav-group" @keydown.escape="close">
    <button
      type="button"
      class="nav-group__toggle"
      :class="{ 'nav-group__toggle--active': isActive }"
      :aria-expanded="isOpen"
      :aria-controls="panelId"
      @click="toggle"
    >
      {{ label }}
      <span class="nav-group__chevron" aria-hidden="true"></span>
    </button>

    <div v-show="isOpen" :id="panelId" class="nav-group__panel">
      <RouterLink v-for="link in links" :key="link.to" :to="link.to" @click="close">
        {{ link.label }}
      </RouterLink>
    </div>
  </div>
</template>
```

`useId` est disponible : le projet est sur Vue 3.5.40, qui l'a introduit.
Il garantit un identifiant unique par instance, indispensable puisque deux
`NavGroup` coexistent dans l'en-tete et que `aria-controls` doit designer
un identifiant distinct pour chacun.

- [ ] **Step 4: Lancer le test pour verifier qu'il passe**

Run: `npx vitest run tests/unit/nav-group.spec.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/NavGroup.vue tests/unit/nav-group.spec.ts
git commit -m "feat(navigation): composant NavGroup pour les entrees a sous-menu"
```

---

### Task 2: Menu regroupe dans `AppHeader`

**Files:**
- Modify: `src/components/ui/AppHeader.vue`
- Modify: `src/shared/i18n/locales/fr.ts`
- Modify: `src/app/styles.css`

**Interfaces:**
- Consumes: `NavGroup` (Task 1).

- [ ] **Step 1: Ajouter les libelles de groupe**

Dans `src/shared/i18n/locales/fr.ts`, dans le bloc `navigation`, ajouter apres `menu` :

```ts
    myPlan: 'Mon plan',
    learn: 'Se former',
```

- [ ] **Step 2: Recomposer la navigation**

Dans `src/components/ui/AppHeader.vue`, remplacer la constante `navLinks` par :

```ts
const directLinks = [
  { to: '/', labelKey: 'navigation.home' },
  { to: '/ressources', labelKey: 'navigation.resources' },
]

// Regroupe par intention plutot que par page : « ou en suis-je » d'un cote,
// « qu'ai-je a apprendre » de l'autre. L'experimentation quitte le menu,
// c'est un formulaire de retour et non une destination : elle vit desormais
// dans le pied de page.
const planLinks = computed(() => [
  { to: '/diagnostic', label: t('navigation.diagnostic') },
  { to: '/resultats', label: t('navigation.results') },
  { to: '/checklist', label: t('navigation.checklist') },
  { to: '/kit', label: t('navigation.kit') },
])

const learnLinks = computed(() => [
  { to: '/videos', label: t('navigation.videos') },
  { to: '/quiz', label: t('navigation.quiz') },
  { to: '/mises-en-situation', label: t('navigation.scenarios') },
])
```

Ajouter `computed` a l'import de `vue` et importer `NavGroup` :

```ts
import { computed, ref, watch } from 'vue'
```
```ts
import NavGroup from './NavGroup.vue'
```

- [ ] **Step 3: Adapter le gabarit**

Remplacer le contenu de `<nav>` (la boucle `v-for` sur `navLinks`) par :

```vue
        <RouterLink to="/" @click="closeMenu">{{ t('navigation.home') }}</RouterLink>
        <NavGroup :label="t('navigation.myPlan')" :links="planLinks" />
        <NavGroup :label="t('navigation.learn')" :links="learnLinks" />
        <RouterLink to="/ressources" @click="closeMenu">
          {{ t('navigation.resources') }}
        </RouterLink>
```

La constante `directLinks` de l'etape 2 n'est alors plus utilisee : la
supprimer plutot que de la laisser en place.

- [ ] **Step 4: Ajouter les styles**

Dans `src/app/styles.css`, apres la regle `.nav a.router-link-active`, ajouter :

```css
.nav-group {
  position: relative;
}

.nav-group__toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 0;
  background: transparent;
  padding: 8px 0;
  color: var(--color-text);
  font-family: inherit;
  font-size: 0.82rem;
  font-weight: 800;
  cursor: pointer;
}

.nav-group__toggle--active {
  color: var(--color-primary);
}

.nav-group__chevron {
  width: 0;
  height: 0;
  border-left: 4px solid transparent;
  border-right: 4px solid transparent;
  border-top: 5px solid currentColor;
}

.nav-group__panel {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  z-index: 40;
  display: grid;
  gap: 4px;
  min-width: 200px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  box-shadow: var(--shadow-soft);
  padding: var(--space-2);
}
```

Puis, a l'interieur du bloc `@media (max-width: 900px)` existant, apres la
regle `.nav a`, ajouter :

```css
  /* Dans le menu mobile, le panneau se deplie dans le flux plutot que
     par-dessus : il n'y a pas la place pour un survol flottant. */
  .nav-group__panel {
    position: static;
    box-shadow: none;
    min-width: 0;
  }

  .nav-group__toggle {
    min-height: 44px;
    width: 100%;
    justify-content: space-between;
    padding: 10px 12px;
  }
```

- [ ] **Step 5: Verifier**

Run: `npm run type-check`
Expected: aucune erreur.

Run: `npx vitest run tests/unit`
Expected: PASS.

- [ ] **Step 6: Verification manuelle**

Run: `npm run dev`

Verifier : les quatre entrees sont visibles ; « Mon plan » et « Se former »
s'ouvrent au clic et se referment a `Echap` comme au clic exterieur ;
l'entree parente reste signalee active quand une de ses pages est ouverte ;
la navigation au clavier (Tab puis Entree) fonctionne ; le menu mobile en
dessous de 900px deplie les groupes dans le flux. Verifier dans les deux
themes.

Arreter le serveur (Ctrl+C).

- [ ] **Step 7: Commit**

```bash
git add src/components/ui/AppHeader.vue src/shared/i18n/locales/fr.ts src/app/styles.css
git commit -m "feat(navigation): regrouper le menu en quatre entrees"
```

---

### Task 3: Pied de page en colonnes

**Files:**
- Modify: `src/components/ui/AppFooter.vue`
- Modify: `src/shared/i18n/locales/fr.ts`
- Modify: `src/app/styles.css`

- [ ] **Step 1: Ajouter les titres de colonnes**

Dans `src/shared/i18n/locales/fr.ts`, dans le bloc `footer`, ajouter :

```ts
    columnJourney: 'Le parcours',
    columnLearn: 'Se former',
    columnAbout: 'À propos',
    giveFeedback: 'Donner mon avis',
```

- [ ] **Step 2: Restructurer le gabarit**

Remplacer le contenu de `src/components/ui/AppFooter.vue` par :

```vue
<script setup lang="ts">
import { trackEvent } from '@/shared/analytics/analytics.service'
import { useI18n } from '@/shared/i18n/i18n.service'

const { t } = useI18n()

const journeyLinks = [
  { to: '/diagnostic', labelKey: 'navigation.diagnostic' },
  { to: '/resultats', labelKey: 'navigation.results' },
  { to: '/checklist', labelKey: 'navigation.checklist' },
  { to: '/kit', labelKey: 'navigation.kit' },
]

const learnLinks = [
  { to: '/videos', labelKey: 'navigation.videos' },
  { to: '/quiz', labelKey: 'navigation.quiz' },
  { to: '/mises-en-situation', labelKey: 'navigation.scenarios' },
  { to: '/ressources', labelKey: 'navigation.resources' },
]

// « Donner mon avis » remplace « Experimentation » : le visiteur ne sait pas
// ce qu'est une experimentation, il sait ce qu'est donner son avis.
const aboutLinks = [
  { to: '/mentions-legales', labelKey: 'footer.legal' },
  { to: '/politique-de-confidentialite', labelKey: 'footer.privacy' },
  { to: '/declaration-accessibilite', labelKey: 'footer.accessibility' },
  { to: '/support', labelKey: 'footer.support' },
  { to: '/tableau-de-bord', labelKey: 'footer.stats' },
  { to: '/experimentation-utilisateurs', labelKey: 'footer.giveFeedback' },
]

const linkedinUrl = 'https://www.linkedin.com/in/natam-sa-61474b22b/'
</script>

<template>
  <footer class="app-footer">
    <div class="app-footer__columns">
      <div class="footer-column footer-column--brand">
        <RouterLink class="footer-brand" to="/">
          <img src="/icons/logo-resilience.svg" alt="" aria-hidden="true" />
          <strong
            >{{ t('brand.name') }} <span>{{ t('brand.tagline') }}</span></strong
          >
        </RouterLink>
        <p class="footer-slogan">{{ t('footer.slogan') }}</p>
        <div class="footer-badges">
          <span>{{ t('footer.publicService') }}</span>
          <span>{{ t('footer.noPersonalData') }}</span>
        </div>
      </div>

      <nav class="footer-column" :aria-label="t('footer.columnJourney')">
        <h2 class="footer-column__title">{{ t('footer.columnJourney') }}</h2>
        <RouterLink v-for="link in journeyLinks" :key="link.to" :to="link.to">
          {{ t(link.labelKey) }}
        </RouterLink>
      </nav>

      <nav class="footer-column" :aria-label="t('footer.columnLearn')">
        <h2 class="footer-column__title">{{ t('footer.columnLearn') }}</h2>
        <RouterLink v-for="link in learnLinks" :key="link.to" :to="link.to">
          {{ t(link.labelKey) }}
        </RouterLink>
      </nav>

      <nav class="footer-column" :aria-label="t('footer.columnAbout')">
        <h2 class="footer-column__title">{{ t('footer.columnAbout') }}</h2>
        <RouterLink v-for="link in aboutLinks" :key="link.to" :to="link.to">
          {{ t(link.labelKey) }}
        </RouterLink>
      </nav>
    </div>

    <div class="app-footer__bottom">
      <a
        class="footer-social-link"
        :href="linkedinUrl"
        target="_blank"
        rel="noopener noreferrer"
        :aria-label="t('footer.linkedin')"
        @click="trackEvent('source_opened')"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path
            d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"
          />
        </svg>
      </a>
      <p class="footer-baseline">{{ t('footer.baseline') }}</p>
    </div>
  </footer>
</template>
```

- [ ] **Step 3: Ajouter les styles**

Dans `src/app/styles.css`, apres les regles existantes du pied de page,
ajouter :

```css
.app-footer__columns {
  display: grid;
  grid-template-columns: 1.4fr repeat(3, 1fr);
  gap: var(--space-4);
  align-items: start;
}

.footer-column {
  display: grid;
  gap: 8px;
  align-content: start;
}

.footer-column__title {
  margin: 0 0 4px;
  font-size: 0.8rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--color-text-muted);
}

.footer-column a {
  color: var(--color-text);
  font-size: 0.88rem;
  text-decoration: none;
}

.footer-column a:hover,
.footer-column a:focus-visible {
  text-decoration: underline;
}

.footer-slogan {
  margin: 0;
  color: var(--color-text-muted);
}

.app-footer__bottom {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-top: var(--space-4);
  padding-top: var(--space-3);
  border-top: 1px solid var(--color-border);
}

@media (max-width: 900px) {
  .app-footer__columns {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 520px) {
  .app-footer__columns {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 4: Verifier les styles orphelins**

L'ancien gabarit utilisait `.app-footer__inner` et `.footer-legal-nav`. Verifier
s'ils servent encore ailleurs avant de decider de leur sort :

Run: `grep -rn "app-footer__inner\|footer-legal-nav" src/`

S'ils n'apparaissent plus que dans `src/app/styles.css`, supprimer leurs
regles : du CSS mort induit en erreur la prochaine personne qui lit le fichier.

- [ ] **Step 5: Verifier**

Run: `npm run type-check`
Expected: aucune erreur.

Run: `npm run lint`
Expected: 0 error.

- [ ] **Step 6: Verification manuelle**

Run: `npm run dev`

Verifier que le pied de page presente quatre colonnes alignees en haut, que
les titres sont lisibles, que « Donner mon avis » mene bien au formulaire, et
que la mise en page se replie correctement en dessous de 900px puis de 520px.
Verifier dans les deux themes.

Arreter le serveur (Ctrl+C).

- [ ] **Step 7: Commit**

```bash
git add src/components/ui/AppFooter.vue src/shared/i18n/locales/fr.ts src/app/styles.css
git commit -m "feat(navigation): pied de page en quatre colonnes titrees"
```

---

### Task 4: Verification finale du lot

- [ ] **Step 1: Lancer la suite complete**

Run: `npm run quality`
Expected: PASS.

- [ ] **Step 2: Lancer la suite e2e**

Run: `npm run test:e2e`

**Point de vigilance majeur de ce lot** : plusieurs tests naviguent par
`getByRole('link', { name: '...' })` sur des entrees qui vivent desormais
dans un sous-menu ferme, donc invisibles au chargement. Ces tests devront
ouvrir le groupe parent avant de cliquer. C'est une adaptation legitime des
tests au nouveau parcours, pas un contournement — mais toute autre rupture
est une vraie regression.

Inspecter en particulier la fonction utilitaire `openNavigationIfNeeded` de
`tests/e2e/main-journey.spec.ts`, qui gere deja l'ouverture du menu mobile et
devra gerer l'ouverture des groupes.

- [ ] **Step 3: Verifier qu'aucune cle i18n n'est orpheline**

Run: `grep -rn "navigation.experiment" src/`

Si la cle n'a plus d'appelant, la supprimer dans `fr.ts` **et** dans `swb.ts`.
