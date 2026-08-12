import { describe, expect, it } from 'vitest'

import {
  buildTranslationSystemPrompt,
  parseTranslationCompletion,
  sanitizeTranslationText,
} from '../../server/translation-draft.mjs'

describe('translation-draft.mjs', () => {
  describe('sanitizeTranslationText', () => {
    it('trims whitespace', () => {
      expect(sanitizeTranslationText('  bonjour  ')).toBe('bonjour')
    })

    it('truncates to 2000 characters', () => {
      const long = 'a'.repeat(2500)
      expect(sanitizeTranslationText(long)).toHaveLength(2000)
    })

    it('returns an empty string for non-string input', () => {
      expect(sanitizeTranslationText(undefined)).toBe('')
      expect(sanitizeTranslationText(42)).toBe('')
    })
  })

  describe('buildTranslationSystemPrompt', () => {
    const glossary = [
      { french: 'Accueil', shimaore: 'agoni' },
      { french: 'Sans compte', shimaore: 'tsi ha si siau' },
    ]

    it('includes every glossary entry', () => {
      const prompt = buildTranslationSystemPrompt(glossary)
      expect(prompt).toContain('Accueil')
      expect(prompt).toContain('agoni')
      expect(prompt).toContain('Sans compte')
      expect(prompt).toContain('tsi ha si siau')
    })

    it('instructs the french -> swahili -> shimaore chain', () => {
      const prompt = buildTranslationSystemPrompt(glossary)
      expect(prompt).toContain('swahili')
      expect(prompt).toContain('shimaore')
    })

    it('requires strict JSON output with swahili and shimaore fields', () => {
      const prompt = buildTranslationSystemPrompt(glossary)
      expect(prompt).toContain('"swahili"')
      expect(prompt).toContain('"shimaore"')
    })
  })

  describe('parseTranslationCompletion', () => {
    it('parses a valid completion', () => {
      const raw = JSON.stringify({ swahili: 'Karibu', shimaore: 'Karibuni' })
      expect(parseTranslationCompletion(raw)).toEqual({
        swahili: 'Karibu',
        shimaore: 'Karibuni',
      })
    })

    it('returns null for malformed JSON', () => {
      expect(parseTranslationCompletion('not json')).toBeNull()
    })

    it('returns null when swahili is missing', () => {
      const raw = JSON.stringify({ shimaore: 'Karibuni' })
      expect(parseTranslationCompletion(raw)).toBeNull()
    })

    it('returns null when shimaore is missing', () => {
      const raw = JSON.stringify({ swahili: 'Karibu' })
      expect(parseTranslationCompletion(raw)).toBeNull()
    })

    it('returns null when either field is an empty string', () => {
      const raw = JSON.stringify({ swahili: '', shimaore: 'Karibuni' })
      expect(parseTranslationCompletion(raw)).toBeNull()
    })

    it('truncates overly long fields to 2000 characters', () => {
      const raw = JSON.stringify({
        swahili: 'a'.repeat(2500),
        shimaore: 'b'.repeat(2500),
      })
      const result = parseTranslationCompletion(raw)
      expect(result?.swahili).toHaveLength(2000)
      expect(result?.shimaore).toHaveLength(2000)
    })
  })
})
