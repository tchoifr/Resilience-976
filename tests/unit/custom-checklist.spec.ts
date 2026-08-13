import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'

import { useAssessmentStore } from '@/features/assessment/stores/assessment.store'

describe('actions personnelles de la checklist', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    window.localStorage.clear()
  })

  // Deux ajouts consecutifs tombent dans la meme milliseconde : c'est
  // exactement le cas ou un identifiant fonde sur l'horloge seule collisionne.
  it('donne un identifiant distinct a chaque action', () => {
    const store = useAssessmentStore()
    store.addCustomChecklistItem('Prévenir un proche')
    store.addCustomChecklistItem('Recharger la batterie')

    const [first, second] = store.customChecklistItems

    expect(first?.id).not.toBe(second?.id)
  })

  it('supprime uniquement l action visee', () => {
    const store = useAssessmentStore()
    store.addCustomChecklistItem('Prévenir un proche')
    store.addCustomChecklistItem('Recharger la batterie')

    const [first, second] = store.customChecklistItems
    store.removeCustomChecklistItem(String(first?.id))

    expect(store.customChecklistItems.map((item) => item.label)).toEqual([second?.label])
  })

  // La suppression doit survivre au rechargement : sans persistance, l action
  // effacee reapparaitrait a la visite suivante.
  it('conserve la suppression apres restauration', () => {
    const store = useAssessmentStore()
    store.addCustomChecklistItem('Prévenir un proche')
    store.removeCustomChecklistItem(String(store.customChecklistItems[0]?.id))

    setActivePinia(createPinia())
    const restored = useAssessmentStore()
    restored.restore()

    expect(restored.customChecklistItems).toEqual([])
  })

  it('ignore un identifiant inconnu', () => {
    const store = useAssessmentStore()
    store.addCustomChecklistItem('Prévenir un proche')
    store.removeCustomChecklistItem('custom_inexistant')

    expect(store.customChecklistItems).toHaveLength(1)
  })
})
