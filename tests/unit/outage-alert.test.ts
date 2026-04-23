import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@sentry/nextjs', () => ({
  captureMessage: vi.fn(),
}))
vi.mock('@/lib/logger', () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

beforeEach(async () => {
  vi.clearAllMocks()
  const { __resetRedisOutageDebounce } = await import('@/lib/redis/outage-alert')
  __resetRedisOutageDebounce()
})

describe('lib/redis/outage-alert — notifyRedisOutage', () => {
  it('logs every call but debounces Sentry captures per-operation', async () => {
    const Sentry = await import('@sentry/nextjs')
    const { logger } = await import('@/lib/logger')
    const { notifyRedisOutage } = await import('@/lib/redis/outage-alert')

    notifyRedisOutage('rate-limit:llm', new Error('timeout'))
    notifyRedisOutage('rate-limit:llm', new Error('timeout'))
    notifyRedisOutage('rate-limit:llm', new Error('timeout'))

    const warnMock = logger.warn as unknown as { mock: { calls: unknown[][] } }
    const captureMock = Sentry.captureMessage as unknown as { mock: { calls: unknown[][] } }

    expect(warnMock.mock.calls.length).toBe(3)
    expect(captureMock.mock.calls.length).toBe(1)
  })

  it('captures independently for different operations', async () => {
    const Sentry = await import('@sentry/nextjs')
    const { notifyRedisOutage } = await import('@/lib/redis/outage-alert')

    notifyRedisOutage('rate-limit:llm', new Error('t'))
    notifyRedisOutage('cache:get', new Error('t'))
    notifyRedisOutage('cache:set', new Error('t'))

    const captureMock = Sentry.captureMessage as unknown as { mock: { calls: unknown[][] } }
    expect(captureMock.mock.calls.length).toBe(3)
  })

  it('tags capture with redis_outage_fail_open and includes operation', async () => {
    const Sentry = await import('@sentry/nextjs')
    const { notifyRedisOutage } = await import('@/lib/redis/outage-alert')

    notifyRedisOutage('rate-limit:auth', new Error('redis timed out'))

    const captureMock = Sentry.captureMessage as unknown as { mock: { calls: unknown[][] } }
    const [[message, options]] = captureMock.mock.calls as [[string, Record<string, unknown>]]
    expect(message).toContain('rate-limit:auth')
    const opts = options as { level: string; tags: Record<string, string> }
    expect(opts.level).toBe('warning')
    expect(opts.tags.redis_outage_fail_open).toBe('true')
    expect(opts.tags.operation).toBe('rate-limit:auth')
  })

  it('stringifies non-Error values', async () => {
    const Sentry = await import('@sentry/nextjs')
    const { notifyRedisOutage } = await import('@/lib/redis/outage-alert')

    notifyRedisOutage('cache:get', 'plain-string-error')

    const captureMock = Sentry.captureMessage as unknown as { mock: { calls: unknown[][] } }
    const [[, options]] = captureMock.mock.calls as [[string, Record<string, unknown>]]
    const opts = options as { extra: { error: string } }
    expect(opts.extra.error).toBe('plain-string-error')
  })
})
