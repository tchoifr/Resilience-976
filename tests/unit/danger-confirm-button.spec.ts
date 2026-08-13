import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import DangerConfirmButton from '../../src/components/ui/DangerConfirmButton.vue'

const props = {
  label: 'Effacer mes données',
  question: 'Effacer vos réponses ? Cette action est définitive.',
}

describe('DangerConfirmButton', () => {
  it('n emet rien au premier clic', async () => {
    const wrapper = mount(DangerConfirmButton, { props })

    await wrapper.find('button').trigger('click')

    expect(wrapper.emitted('confirm')).toBeUndefined()
    expect(wrapper.text()).toContain('Cette action est définitive.')
  })

  it('emet confirm au second clic', async () => {
    const wrapper = mount(DangerConfirmButton, { props })

    await wrapper.find('button').trigger('click')
    await wrapper.findAll('button')[0]?.trigger('click')

    expect(wrapper.emitted('confirm')).toHaveLength(1)
  })

  // Annuler doit ramener le bouton initial, sans rien effacer.
  it('revient au bouton initial quand on annule', async () => {
    const wrapper = mount(DangerConfirmButton, { props })

    await wrapper.find('button').trigger('click')
    await wrapper.findAll('button')[1]?.trigger('click')

    expect(wrapper.emitted('confirm')).toBeUndefined()
    expect(wrapper.findAll('button')).toHaveLength(1)
    expect(wrapper.text()).toContain('Effacer mes données')
  })

  it('annule aussi avec la touche Echap', async () => {
    const wrapper = mount(DangerConfirmButton, { props })

    await wrapper.find('button').trigger('click')
    await wrapper.trigger('keydown', { key: 'Escape' })

    expect(wrapper.findAll('button')).toHaveLength(1)
    expect(wrapper.emitted('confirm')).toBeUndefined()
  })
})
