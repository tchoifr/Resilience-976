import { beforeEach, describe, expect, it } from 'vitest'

import { updateHead } from '@/shared/seo/head.service'

describe('updateHead', () => {
  beforeEach(() => {
    document.head.innerHTML = `
      <meta name="description" content="">
      <meta property="og:title" content="">
      <meta property="og:description" content="">
      <meta property="og:url" content="">
    `
  })

  it('met a jour le title, les metas et le canonical', () => {
    updateHead({
      title: 'Diagnostic - Resilience 976',
      description: 'Diagnostic sans compte.',
      path: '/diagnostic',
    })

    expect(document.title).toBe('Diagnostic - Resilience 976')
    expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toBe(
      'Diagnostic sans compte.',
    )
    expect(document.querySelector('meta[property="og:title"]')?.getAttribute('content')).toBe(
      'Diagnostic - Resilience 976',
    )
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(
      'https://exemple.fr/diagnostic',
    )
  })
})
