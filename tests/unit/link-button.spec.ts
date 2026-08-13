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
