import { describe, expect, it } from 'vitest'

import {
  buildContentIndex,
  buildContentLinksSystemPrompt,
  parseContentLinksCompletion,
  sanitizeContentLinksQuestion,
} from '../../server/content-links.mjs'

describe('content-links.mjs', () => {
  describe('sanitizeContentLinksQuestion', () => {
    it('trims whitespace', () => {
      expect(sanitizeContentLinksQuestion('  les séismes  ')).toBe('les séismes')
    })

    it('truncates to 300 characters', () => {
      const long = 'a'.repeat(400)
      expect(sanitizeContentLinksQuestion(long)).toHaveLength(300)
    })

    it('returns an empty string for non-string input', () => {
      expect(sanitizeContentLinksQuestion(undefined)).toBe('')
      expect(sanitizeContentLinksQuestion(42)).toBe('')
    })
  })

  const videos = [
    {
      id: 'VID-01',
      slug: 'preparer-son-logement',
      title: 'Préparer son logement',
      risk: 'Cyclone et fortes pluies',
    },
  ]
  const scenarios = [
    { id: 'scenario_cyclone', title: 'Une alerte cyclone est déclenchée', domain: 'behaviors' },
  ]
  const resources = [{ id: 'resource_seisme', title: 'Séisme', domain: 'behaviors' }]
  const quizQuestions = [
    { risk: 'cyclone' },
    { risk: 'cyclone' },
    { risk: 'mouvement_terrain' },
  ]

  describe('buildContentIndex', () => {
    it('builds one entry per video, with the /videos/:slug url', () => {
      const index = buildContentIndex(videos, [], [], [])
      expect(index.entries).toEqual([
        {
          id: 'VID-01',
          type: 'video',
          title: 'Préparer son logement',
          riskOrDomain: 'Cyclone et fortes pluies',
          url: '/videos/preparer-son-logement',
        },
      ])
    })

    it('builds one entry per scenario, with the /mises-en-situation/:id url', () => {
      const index = buildContentIndex([], scenarios, [], [])
      expect(index.entries).toEqual([
        {
          id: 'scenario_cyclone',
          type: 'scenario',
          title: 'Une alerte cyclone est déclenchée',
          riskOrDomain: 'behaviors',
          url: '/mises-en-situation/scenario_cyclone',
        },
      ])
    })

    it('builds one entry per resource, all pointing to /ressources', () => {
      const index = buildContentIndex([], [], resources, [])
      expect(index.entries).toEqual([
        {
          id: 'resource_seisme',
          type: 'resource',
          title: 'Séisme',
          riskOrDomain: 'behaviors',
          url: '/ressources',
        },
      ])
    })

    it('deduplicates quiz questions by risk, one entry per risk pointing to /quiz', () => {
      const index = buildContentIndex([], [], [], quizQuestions)
      expect(index.entries).toEqual([
        {
          id: 'quiz_cyclone',
          type: 'quiz',
          title: 'Quiz : Cyclone',
          riskOrDomain: 'cyclone',
          url: '/quiz',
        },
        {
          id: 'quiz_mouvement_terrain',
          type: 'quiz',
          title: 'Quiz : Mouvement terrain',
          riskOrDomain: 'mouvement_terrain',
          url: '/quiz',
        },
      ])
    })

    it('exposes every entry by id in byId', () => {
      const index = buildContentIndex(videos, scenarios, resources, quizQuestions)
      expect(index.byId.get('VID-01')?.title).toBe('Préparer son logement')
      expect(index.byId.get('scenario_cyclone')?.title).toBe(
        'Une alerte cyclone est déclenchée',
      )
      expect(index.byId.get('resource_seisme')?.title).toBe('Séisme')
      expect(index.byId.get('quiz_cyclone')?.title).toBe('Quiz : Cyclone')
      expect(index.byId.has('unknown_id')).toBe(false)
    })
  })

  describe('buildContentLinksSystemPrompt', () => {
    const index = buildContentIndex(videos, scenarios, resources, quizQuestions)

    it('includes every entry id and title', () => {
      const prompt = buildContentLinksSystemPrompt(index)
      expect(prompt).toContain('[VID-01]')
      expect(prompt).toContain('Préparer son logement')
      expect(prompt).toContain('[scenario_cyclone]')
      expect(prompt).toContain('[resource_seisme]')
      expect(prompt).toContain('[quiz_cyclone]')
    })

    it('requires strict JSON output with matchedIds and refused fields', () => {
      const prompt = buildContentLinksSystemPrompt(index)
      expect(prompt).toContain('"matchedIds"')
      expect(prompt).toContain('"refused"')
    })

    // Sans exemple explicite, le modele recopie la ligne entiere du
    // catalogue ("[VID-01] (video) ...") au lieu du seul identifiant.
    it('shows an example of a bare identifier without the catalogue line', () => {
      const prompt = buildContentLinksSystemPrompt(index)
      expect(prompt).toContain('"matchedIds": ["VID-01"]')
    })
  })

  describe('parseContentLinksCompletion', () => {
    const index = buildContentIndex(videos, scenarios, resources, quizQuestions)

    it('parses a valid completion', () => {
      const raw = JSON.stringify({ matchedIds: ['VID-01', 'quiz_cyclone'], refused: false })
      expect(parseContentLinksCompletion(raw, index)).toEqual({
        matchedIds: ['VID-01', 'quiz_cyclone'],
        refused: false,
      })
    })

    it('returns refused true with an empty list for malformed JSON', () => {
      expect(parseContentLinksCompletion('not json', index)).toEqual({
        matchedIds: [],
        refused: true,
      })
    })

    it('silently drops ids that are not in the index', () => {
      const raw = JSON.stringify({
        matchedIds: ['VID-01', 'this_id_does_not_exist'],
        refused: false,
      })
      expect(parseContentLinksCompletion(raw, index)).toEqual({
        matchedIds: ['VID-01'],
        refused: false,
      })
    })

    it('caps matchedIds at 6 entries', () => {
      const manyVideos = Array.from({ length: 10 }, (_, i) => ({
        id: `VID-${i}`,
        slug: `video-${i}`,
        title: `Vidéo ${i}`,
        risk: 'Cyclone',
      }))
      const bigIndex = buildContentIndex(manyVideos, [], [], [])
      const raw = JSON.stringify({
        matchedIds: manyVideos.map((video) => video.id),
        refused: false,
      })
      const result = parseContentLinksCompletion(raw, bigIndex)
      expect(result.matchedIds).toHaveLength(6)
    })

    it('preserves an explicit refused flag even when matchedIds is missing', () => {
      const raw = JSON.stringify({ refused: true })
      expect(parseContentLinksCompletion(raw, index)).toEqual({
        matchedIds: [],
        refused: true,
      })
    })

    // Le modele renvoie regulierement la ligne complete du catalogue plutot
    // que le seul identifiant : le serveur doit en extraire l'id entre
    // crochets au lieu de rejeter silencieusement la correspondance.
    it('accepts ids returned as a full catalogue line', () => {
      const raw = JSON.stringify({
        matchedIds: [
          '[resource_seisme] (resource) Séisme — behaviors',
          '[quiz_cyclone] (quiz) Quiz : Cyclone — cyclone',
        ],
        refused: false,
      })
      expect(parseContentLinksCompletion(raw, index)).toEqual({
        matchedIds: ['resource_seisme', 'quiz_cyclone'],
        refused: false,
      })
    })

    it('deduplicates an entry returned in both bare and catalogue-line form', () => {
      const raw = JSON.stringify({
        matchedIds: ['VID-01', '[VID-01] (video) Préparer son logement — Cyclone'],
        refused: false,
      })
      expect(parseContentLinksCompletion(raw, index)).toEqual({
        matchedIds: ['VID-01'],
        refused: false,
      })
    })

    it('treats a non-boolean refused as false', () => {
      const raw = JSON.stringify({ matchedIds: ['VID-01'] })
      expect(parseContentLinksCompletion(raw, index)).toEqual({
        matchedIds: ['VID-01'],
        refused: false,
      })
    })
  })
})
