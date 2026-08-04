import { describe, expect, it } from 'vitest'

import { getKitItems } from '@/features/assessment/services/kit.service'
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
})
