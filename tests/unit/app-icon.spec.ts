import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import AppIcon from '../../src/components/ui/AppIcon.vue'
import { iconPaths, type IconName } from '../../src/components/ui/icons'

describe('AppIcon', () => {
  // La liste est derivee du jeu d icones : une icone ajoutee sans trace
  // valide echouerait ici plutot que de rendre un bouton vide.
  it('rend un svg pour chaque nom du jeu d icones', () => {
    const names = Object.keys(iconPaths) as IconName[]

    expect(names.length).toBeGreaterThan(0)

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
