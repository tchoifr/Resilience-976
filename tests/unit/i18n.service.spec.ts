import { afterEach, describe, expect, it } from 'vitest'

import {
  registerLocale,
  setLocale,
  translate,
  type LocaleDefinition,
} from '@/shared/i18n/i18n.service'
import { swbMessages } from '@/shared/i18n/locales/swb'

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

  it('couvre en shimaore les boutons kit/video et les modules quiz et mises en situation', () => {
    const keys = [
      'publicWarning.label',
      'publicWarning.text',
      'kit.downloadPdf',
      'videos.downloadAttestation',
      'quiz.start',
      'quiz.results.downloadAttestation',
      'scenarios.title',
      'scenarioPlay.confirm',
      'scenarioPlay.debrief.title',
      'pdf.quizTitle',
      'pdf.quizScoreLine',
      'pdf.videoTitle',
      'pdf.videoScoreLine',
      'pdf.kitTitle',
      'pdf.kitItemCount',
    ]

    setLocale('fr')
    const frTexts = keys.map((key) => translate(key))

    registerLocale({
      code: 'swb',
      label: swbMessages.language.shimaore,
      messages: swbMessages,
    })
    setLocale('swb')

    keys.forEach((key, index) => {
      expect(translate(key), `${key} retombe sur le francais en shimaore`).not.toBe(
        frTexts[index],
      )
    })
  })
})
