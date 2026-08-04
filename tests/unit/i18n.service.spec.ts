import { afterEach, describe, expect, it } from 'vitest'

import {
  registerLocale,
  setLocale,
  translate,
  type LocaleDefinition,
} from '@/shared/i18n/i18n.service'

describe('i18n.service', () => {
  afterEach(() => {
    setLocale('fr')
  })

  it('retourne les textes français par défaut', () => {
    expect(translate('results.downloadCertificate')).toBe('Télécharger le certificat')
  })

  it('interpole les variables dans un libellé', () => {
    expect(translate('diagnostic.questionCount', { current: 2, total: 24 })).toBe('Question 2 / 24')
  })

  it('permet d’enregistrer une autre langue avec repli français', () => {
    const locale: LocaleDefinition = {
      code: 'test',
      label: 'Test',
      messages: {
        navigation: {
          home: 'Home',
        },
      },
    }

    registerLocale(locale)
    setLocale('test')

    expect(translate('navigation.home')).toBe('Home')
    expect(translate('results.downloadCertificate')).toBe('Télécharger le certificat')
  })
})
