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
