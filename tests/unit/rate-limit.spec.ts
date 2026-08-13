import { describe, expect, it } from 'vitest'

import { createRateLimiter, getClientIp } from '../../server/rate-limit.mjs'

function fakeRequest(headers = {}, remoteAddress = '198.51.100.4') {
  return { headers, socket: { remoteAddress } }
}

describe('rate-limit.mjs', () => {
  describe('getClientIp', () => {
    it('uses x-real-ip, which nginx sets from the real connection', () => {
      expect(getClientIp(fakeRequest({ 'x-real-ip': '203.0.113.9' }))).toBe('203.0.113.9')
    })

    // X-Forwarded-For est fourni par le client : s'y fier laissait n'importe
    // qui reinitialiser son compteur en changeant simplement l'en-tete.
    it('ignores a client-supplied x-forwarded-for', () => {
      const request = fakeRequest({ 'x-forwarded-for': '10.0.0.99' }, '198.51.100.4')
      expect(getClientIp(request)).toBe('198.51.100.4')
    })

    it('falls back to the socket address when no x-real-ip is present', () => {
      expect(getClientIp(fakeRequest({}, '198.51.100.7'))).toBe('198.51.100.7')
    })

    it('returns unknown when there is no address at all', () => {
      expect(getClientIp({ headers: {}, socket: {} })).toBe('unknown')
    })
  })

  describe('createRateLimiter', () => {
    it('allows requests up to the limit inside the window', () => {
      const limiter = createRateLimiter({ limit: 3, windowMs: 1000 })

      expect(limiter.allow('a', 0)).toBe(true)
      expect(limiter.allow('a', 100)).toBe(true)
      expect(limiter.allow('a', 200)).toBe(true)
    })

    it('blocks once the limit is reached', () => {
      const limiter = createRateLimiter({ limit: 2, windowMs: 1000 })

      limiter.allow('a', 0)
      limiter.allow('a', 10)
      expect(limiter.allow('a', 20)).toBe(false)
    })

    it('allows again once the window has slid past', () => {
      const limiter = createRateLimiter({ limit: 1, windowMs: 1000 })

      expect(limiter.allow('a', 0)).toBe(true)
      expect(limiter.allow('a', 500)).toBe(false)
      expect(limiter.allow('a', 1500)).toBe(true)
    })

    it('counts each key independently', () => {
      const limiter = createRateLimiter({ limit: 1, windowMs: 1000 })

      expect(limiter.allow('a', 0)).toBe(true)
      expect(limiter.allow('a', 10)).toBe(false)
      expect(limiter.allow('b', 10)).toBe(true)
    })

    // Sans purge, la table grandit indefiniment au fil des visiteurs et
    // devient elle-meme un moyen de saturer la memoire du serveur.
    it('drops keys whose window has fully expired', () => {
      const limiter = createRateLimiter({ limit: 5, windowMs: 1000 })

      limiter.allow('a', 0)
      limiter.allow('b', 0)
      expect(limiter.size()).toBe(2)

      limiter.allow('c', 5000)
      expect(limiter.size()).toBe(1)
    })
  })
})
