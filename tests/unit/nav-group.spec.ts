import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

// Le composant lit la route via useRoute() : un mock d'instance ($route) ne
// l'atteindrait pas, il faut simuler le module lui-meme.
vi.mock('vue-router', () => ({
  useRoute: () => ({ path: '/', fullPath: '/' }),
}))

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
