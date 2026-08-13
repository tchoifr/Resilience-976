import { describe, expect, it } from 'vitest'

import {
  formatVisitorIdForDisplay,
  normalizeVisitorId,
} from '@/shared/analytics/visitor-id.service'

const canonical = '35c25916-c945-4cbb-913e-018ca2e11eda'
const compact = '35c25916c9454cbb913e018ca2e11eda'

describe('formatVisitorIdForDisplay', () => {
  it('retire les tirets', () => {
    expect(formatVisitorIdForDisplay(canonical)).toBe(compact)
  })

  it('laisse intact un identifiant deja sans tirets', () => {
    expect(formatVisitorIdForDisplay(compact)).toBe(compact)
  })
})

describe('normalizeVisitorId', () => {
  // C'est le cas d'usage : le visiteur recopie ce qu'affiche la banniere.
  it('remet les tirets sur les 32 caracteres affiches', () => {
    expect(normalizeVisitorId(compact)).toBe(canonical)
  })

  it('accepte l identifiant canonique tel quel', () => {
    expect(normalizeVisitorId(canonical)).toBe(canonical)
  })

  it('ignore les espaces autour', () => {
    expect(normalizeVisitorId(`  ${compact}  `)).toBe(canonical)
  })

  it('accepte les majuscules', () => {
    expect(normalizeVisitorId(compact.toUpperCase())).toBe(canonical)
  })

  // Une saisie partielle ne doit pas etre transformee en un identifiant
  // plausible mais faux.
  it('renvoie tel quel ce qui n est pas un identifiant de 32 caracteres', () => {
    expect(normalizeVisitorId('35c25916')).toBe('35c25916')
    expect(normalizeVisitorId('visiteur-de-test')).toBe('visiteur-de-test')
  })
})
