import { describe, expect, it } from 'vitest'

// @ts-expect-error module serveur en JavaScript, sans declaration de types
import { computeVisitorArrival } from '../../server/visitor-rank.mjs'

interface Event {
  visitorId: string
  createdAt: string
}

const events: Event[] = [
  { visitorId: 'alice', createdAt: '2026-08-01T10:00:00.000Z' },
  { visitorId: 'bob', createdAt: '2026-08-02T10:00:00.000Z' },
  { visitorId: 'alice', createdAt: '2026-08-03T10:00:00.000Z' },
  { visitorId: 'carla', createdAt: '2026-08-04T10:00:00.000Z' },
]

describe('computeVisitorArrival', () => {
  it('classe les visiteurs par leur tout premier evenement', () => {
    expect(computeVisitorArrival(events, 'alice')).toEqual({ rank: 1, total: 3 })
    expect(computeVisitorArrival(events, 'bob')).toEqual({ rank: 2, total: 3 })
    expect(computeVisitorArrival(events, 'carla')).toEqual({ rank: 3, total: 3 })
  })

  // Un visiteur qui revient ne recule pas dans le classement : c'est sa
  // premiere venue qui compte, pas la derniere.
  it('ignore les evenements suivants d un visiteur deja connu', () => {
    const withReturn = [...events, { visitorId: 'alice', createdAt: '2026-08-09T10:00:00.000Z' }]

    expect(computeVisitorArrival(withReturn, 'alice').rank).toBe(1)
  })

  it('renvoie un rang nul pour un visiteur inconnu', () => {
    expect(computeVisitorArrival(events, 'inconnu')).toEqual({ rank: null, total: 3 })
  })

  it('renvoie un total nul sans evenement', () => {
    expect(computeVisitorArrival([], 'alice')).toEqual({ rank: null, total: 0 })
  })

  // Deux visiteurs enregistres au meme horodatage doivent recevoir deux rangs
  // distincts et stables, sinon le compteur change a chaque rechargement.
  it('departage deux visiteurs au meme horodatage par l ordre de lecture', () => {
    const sameInstant: Event[] = [
      { visitorId: 'premier', createdAt: '2026-08-01T10:00:00.000Z' },
      { visitorId: 'second', createdAt: '2026-08-01T10:00:00.000Z' },
    ]

    expect(computeVisitorArrival(sameInstant, 'premier')).toEqual({ rank: 1, total: 2 })
    expect(computeVisitorArrival(sameInstant, 'second')).toEqual({ rank: 2, total: 2 })
  })

  it('tolere un evenement sans identifiant de visiteur', () => {
    const withNoise = [{ visitorId: '', createdAt: '2026-07-01T10:00:00.000Z' }, ...events]

    expect(computeVisitorArrival(withNoise, 'alice')).toEqual({ rank: 1, total: 3 })
  })
})
