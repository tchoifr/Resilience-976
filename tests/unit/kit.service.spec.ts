import { describe, expect, it } from 'vitest'

import { computeQuantity, getKitItems } from '@/features/assessment/services/kit.service'
import type { Household, KitItem } from '@/features/assessment/types/kit'

const items: KitItem[] = [
  {
    id: 'base',
    label: 'Base',
    category: 'base',
    conditions: [],
    sourceIds: ['source_01'],
    validationStatus: 'to_validate',
  },
  {
    id: 'children',
    label: 'Enfants',
    category: 'household',
    conditions: [{ field: 'children', operator: '>', value: 0 }],
    countField: 'children',
    sourceIds: ['source_01'],
    validationStatus: 'to_validate',
  },
  {
    id: 'special',
    label: 'Besoins particuliers',
    category: 'household',
    conditions: [{ field: 'specialNeeds', operator: '=', value: true }],
    sourceIds: ['source_01'],
    validationStatus: 'to_validate',
  },
  {
    id: 'water',
    label: 'Eau',
    category: 'water_food',
    conditions: [],
    quantityRule: {
      fields: ['adults', 'children', 'elderly'],
      amountPerUnit: 3,
      perDay: true,
      durationDays: 3,
      unit: 'L',
      detail: '3 L / jour / personne x 3 jours',
    },
    sourceIds: ['source_01'],
    validationStatus: 'to_validate',
  },
]

const household: Household = {
  adults: 1,
  children: 1,
  elderly: 0,
  pets: 0,
  specialNeeds: false,
}

describe('getKitItems', () => {
  it('inclut toujours les elements sans condition', () => {
    expect(getKitItems(items, { ...household, children: 0 }).map((item) => item.id)).toContain(
      'base',
    )
  })

  it('inclut les elements conditionnels quand le foyer correspond', () => {
    expect(getKitItems(items, household).map((item) => item.id)).toContain('children')
  })

  it('exclut les elements conditionnels quand le foyer ne correspond pas', () => {
    expect(getKitItems(items, household).map((item) => item.id)).not.toContain('special')
  })

  it('expose le nombre de personnes concernees pour un champ de comptage', () => {
    const result = getKitItems(items, household).find((item) => item.id === 'children')

    expect(result?.affectedCount).toBe(1)
  })

  it('calcule la quantite en fonction de la composition du foyer', () => {
    const result = getKitItems(items, { ...household, adults: 2, elderly: 1 }).find(
      (item) => item.id === 'water',
    )

    // (2 adultes + 1 enfant + 1 personne agee) x 3 L x 3 jours
    expect(result?.computedQuantity).toEqual({
      amount: 36,
      unit: 'L',
      detail: '3 L / jour / personne x 3 jours',
    })
  })
})

describe('computeQuantity', () => {
  it('additionne uniquement les champs listes dans la regle', () => {
    const result = computeQuantity(
      {
        fields: ['pets'],
        amountPerUnit: 1,
        perDay: false,
        unit: 'kg',
        detail: '1 kg par animal',
      },
      { adults: 4, children: 4, elderly: 4, pets: 2, specialNeeds: false },
    )

    expect(result).toEqual({ amount: 2, unit: 'kg', detail: '1 kg par animal' })
  })
})
