import { beforeEach, describe, expect, it, vi } from 'vitest'

// Force fail-open path by stubbing env before import.
beforeEach(() => {
  vi.resetModules()
  delete process.env['UPSTASH_REDIS_REST_URL']
  delete process.env['UPSTASH_REDIS_REST_TOKEN']
})

describe('lib/redis/rate-limit — fail-open', () => {
  it('without Upstash env, all checks allow', async () => {
    const mod = await import('@/lib/redis/rate-limit')
    const llm = await mod.checkLlmRateLimit('u1')
    const gen = await mod.checkGeneralRateLimit('ip1')
    const up = await mod.checkUploadRateLimit('u1')
    const auth = await mod.checkAuthRateLimit('1.1.1.1')
    for (const r of [llm, gen, up, auth]) {
      expect(r.allowed).toBe(true)
      expect(r.remaining).toBe(999)
      expect(r.reset).toBeGreaterThan(Date.now() - 1000)
    }
  })

  it('rateLimitHeaders returns X-RateLimit-*', async () => {
    const mod = await import('@/lib/redis/rate-limit')
    const headers = mod.rateLimitHeaders({ allowed: true, remaining: 42, reset: 1234 })
    expect(headers['X-RateLimit-Remaining']).toBe('42')
    expect(headers['X-RateLimit-Reset']).toBe('1234')
  })
})

describe('lib/redis/rate-limit — fail-open on Redis error', () => {
  it('returns allowed=true when limiter throws', async () => {
    vi.resetModules()
    process.env['UPSTASH_REDIS_REST_URL'] = 'https://fake.upstash.io'
    process.env['UPSTASH_REDIS_REST_TOKEN'] = 'fake-token'

    vi.doMock('@upstash/ratelimit', () => {
      class FakeRatelimit {
        static slidingWindow() {
          return {}
        }
        async limit() {
          throw new Error('redis down')
        }
      }
      return { Ratelimit: FakeRatelimit }
    })
    vi.doMock('@upstash/redis', () => ({ Redis: class {} }))

    const mod = await import('@/lib/redis/rate-limit')
    const r = await mod.checkLlmRateLimit('u1')
    expect(r.allowed).toBe(true)
    expect(r.remaining).toBe(999)
  })
})
