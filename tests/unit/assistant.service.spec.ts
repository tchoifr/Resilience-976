import { describe, expect, it } from 'vitest'

import { findBestMatch } from '@/features/assistant/services/assistant.service'
import type { AssistantEntry } from '@/features/assistant/types/assistant'

const entries: AssistantEntry[] = [
  {
    id: 'water',
    topic: 'water_outage',
    question: 'Que faire en cas de coupure d’eau ?',
    keywords: ['eau', 'coupure', 'robinet', 'potable'],
    answer: 'Utilisez vos reserves d’eau potable.',
    sourceIds: ['source_01'],
    validationStatus: 'to_validate',
    revisionDate: '2026-08-10',
  },
  {
    id: 'power',
    topic: 'power_outage',
    question: 'Que faire en cas de coupure d’electricite ?',
    keywords: ['electricite', 'courant', 'coupure', 'panne'],
    answer: 'Utilisez une lampe a piles.',
    sourceIds: ['source_01'],
    validationStatus: 'to_validate',
    revisionDate: '2026-08-10',
  },
]

describe('findBestMatch', () => {
  it('trouve la meilleure entree meme avec accents et casse differents', () => {
    const match = findBestMatch('Que faire si il y a une COUPURE D\'ÉLECTRICITÉ chez moi ?', entries)

    expect(match?.entry.id).toBe('power')
  })

  it('depart les entrees ambigues sur le nombre de mots-cles touches', () => {
    const match = findBestMatch('coupure', entries)

    // "coupure" seul matche les deux entrees a egalite : la premiere
    // rencontree (ordre stable) l'emporte.
    expect(match?.entry.id).toBe('water')
  })

  it('renvoie null pour une question totalement hors sujet', () => {
    expect(findBestMatch('Quelle est la capitale de la France ?', entries)).toBeNull()
  })

  it('renvoie null pour une question vide ou uniquement des mots vides', () => {
    expect(findBestMatch('', entries)).toBeNull()
    expect(findBestMatch('que faire pour et de la', entries)).toBeNull()
  })
})
