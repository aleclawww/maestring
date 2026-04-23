import { beforeEach, describe, expect, it, vi } from 'vitest'

// Each test owns its own module graph so the cached `redis` singleton inside
// lib/redis/cache.ts doesn't bleed between cases.
beforeEach(() => {
  vi.resetModules()
  delete process.env['UPSTASH_REDIS_REST_URL']
  delete process.env['UPSTASH_REDIS_REST_TOKEN']
})

describe('lib/redis/cache — without Upstash env (degraded mode)', () => {
  it('cacheGet returns null', async () => {
    const mod = await import('@/lib/redis/cache')
    await expect(mod.cacheGet('k')).resolves.toBeNull()
  })

  it('cacheGetOrSet calls fetcher and returns its value', async () => {
    const mod = await import('@/lib/redis/cache')
    const fetcher = vi.fn().mockResolvedValue({ v: 1 })
    const out = await mod.cacheGetOrSet('k', fetcher)
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(out).toEqual({ v: 1 })
  })

  it('cacheSet / cacheDelete / cacheDeletePattern are no-ops', async () => {
    const mod = await import('@/lib/redis/cache')
    await expect(mod.cacheSet('k', 1)).resolves.toBeUndefined()
    await expect(mod.cacheDelete('k')).resolves.toBeUndefined()
    await expect(mod.cacheDeletePattern('k:*')).resolves.toBeUndefined()
  })
})

describe('lib/redis/cache — happy path with a working Redis client', () => {
  beforeEach(() => {
    process.env['UPSTASH_REDIS_REST_URL'] = 'https://fake.upstash.io'
    process.env['UPSTASH_REDIS_REST_TOKEN'] = 'fake-token'
  })

  it('cacheGet returns the cached value', async () => {
    vi.doMock('@upstash/redis', () => ({
      Redis: class {
        get = vi.fn().mockResolvedValue('hit')
        setex = vi.fn()
        del = vi.fn()
        scan = vi.fn()
      },
    }))
    const mod = await import('@/lib/redis/cache')
    await expect(mod.cacheGet<string>('k')).resolves.toBe('hit')
  })

  it('cacheGetOrSet returns cached value without calling fetcher on hit', async () => {
    vi.doMock('@upstash/redis', () => ({
      Redis: class {
        get = vi.fn().mockResolvedValue({ cached: true })
        setex = vi.fn()
      },
    }))
    const mod = await import('@/lib/redis/cache')
    const fetcher = vi.fn()
    const out = await mod.cacheGetOrSet('k', fetcher)
    expect(fetcher).not.toHaveBeenCalled()
    expect(out).toEqual({ cached: true })
  })

  it('cacheGetOrSet calls fetcher and writes-through on miss', async () => {
    const setex = vi.fn().mockResolvedValue('OK')
    vi.doMock('@upstash/redis', () => ({
      Redis: class {
        get = vi.fn().mockResolvedValue(null)
        setex = setex
      },
    }))
    const mod = await import('@/lib/redis/cache')
    const fetcher = vi.fn().mockResolvedValue({ v: 42 })
    const out = await mod.cacheGetOrSet('k', fetcher, 60)
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(setex).toHaveBeenCalledWith('k', 60, JSON.stringify({ v: 42 }))
    expect(out).toEqual({ v: 42 })
  })

  it('cacheDeletePattern walks the cursor until 0', async () => {
    const scan = vi
      .fn()
      .mockResolvedValueOnce([1, ['k:a', 'k:b']])
      .mockResolvedValueOnce([0, ['k:c']])
    const del = vi.fn().mockResolvedValue(1)
    vi.doMock('@upstash/redis', () => ({
      Redis: class {
        scan = scan
        del = del
      },
    }))
    const mod = await import('@/lib/redis/cache')
    await mod.cacheDeletePattern('k:*')
    expect(scan).toHaveBeenCalledTimes(2)
    expect(del).toHaveBeenCalledTimes(2)
    expect(del).toHaveBeenNthCalledWith(1, 'k:a', 'k:b')
    expect(del).toHaveBeenNthCalledWith(2, 'k:c')
  })
})

describe('lib/redis/cache — fail-open on Redis error', () => {
  beforeEach(() => {
    process.env['UPSTASH_REDIS_REST_URL'] = 'https://fake.upstash.io'
    process.env['UPSTASH_REDIS_REST_TOKEN'] = 'fake-token'
    vi.doMock('@/lib/redis/outage-alert', () => ({
      notifyRedisOutage: vi.fn(),
    }))
  })

  it('cacheGet returns null and notifies when Redis throws', async () => {
    vi.doMock('@upstash/redis', () => ({
      Redis: class {
        async get() {
          throw new Error('redis down')
        }
      },
    }))
    const mod = await import('@/lib/redis/cache')
    const { notifyRedisOutage } = await import('@/lib/redis/outage-alert')

    await expect(mod.cacheGet('k')).resolves.toBeNull()
    const spy = notifyRedisOutage as unknown as { mock: { calls: unknown[][] } }
    expect(spy.mock.calls.length).toBe(1)
    const [op, , extra] = spy.mock.calls[0] as [string, unknown, Record<string, unknown>]
    expect(op).toBe('cache:get')
    expect(extra).toEqual({ key: 'k' })
  })

  it('cacheGetOrSet falls back to fetcher and notifies when Redis throws', async () => {
    vi.doMock('@upstash/redis', () => ({
      Redis: class {
        async get() {
          throw new Error('redis down')
        }
      },
    }))
    const mod = await import('@/lib/redis/cache')
    const { notifyRedisOutage } = await import('@/lib/redis/outage-alert')

    const fetcher = vi.fn().mockResolvedValue('fresh')
    const out = await mod.cacheGetOrSet('k', fetcher)
    expect(out).toBe('fresh')
    expect(fetcher).toHaveBeenCalledTimes(1)
    const spy = notifyRedisOutage as unknown as { mock: { calls: unknown[][] } }
    expect(spy.mock.calls.length).toBe(1)
    expect(spy.mock.calls[0]?.[0]).toBe('cache:getOrSet')
  })

  it('cacheSet swallows the error and notifies', async () => {
    vi.doMock('@upstash/redis', () => ({
      Redis: class {
        async setex() {
          throw new Error('redis down')
        }
      },
    }))
    const mod = await import('@/lib/redis/cache')
    const { notifyRedisOutage } = await import('@/lib/redis/outage-alert')
    await expect(mod.cacheSet('k', 1)).resolves.toBeUndefined()
    const spy = notifyRedisOutage as unknown as { mock: { calls: unknown[][] } }
    expect(spy.mock.calls[0]?.[0]).toBe('cache:set')
  })

  it('cacheDelete swallows the error and notifies', async () => {
    vi.doMock('@upstash/redis', () => ({
      Redis: class {
        async del() {
          throw new Error('redis down')
        }
      },
    }))
    const mod = await import('@/lib/redis/cache')
    const { notifyRedisOutage } = await import('@/lib/redis/outage-alert')
    await expect(mod.cacheDelete('k')).resolves.toBeUndefined()
    const spy = notifyRedisOutage as unknown as { mock: { calls: unknown[][] } }
    expect(spy.mock.calls[0]?.[0]).toBe('cache:del')
  })

  it('cacheDeletePattern swallows errors from scan and notifies', async () => {
    vi.doMock('@upstash/redis', () => ({
      Redis: class {
        async scan() {
          throw new Error('redis down')
        }
        async del() {
          return 0
        }
      },
    }))
    const mod = await import('@/lib/redis/cache')
    const { notifyRedisOutage } = await import('@/lib/redis/outage-alert')
    await expect(mod.cacheDeletePattern('k:*')).resolves.toBeUndefined()
    const spy = notifyRedisOutage as unknown as { mock: { calls: unknown[][] } }
    expect(spy.mock.calls[0]?.[0]).toBe('cache:delPattern')
  })
})
