import { describe, it, expect, beforeEach, afterEach } from 'vitest'

const ENV_KEYS = ['FF_ADAPTIVE_DASHBOARD', 'FF_ADAPTIVE_DASHBOARD_USERS']

async function loadFlags() {
  // featureFlags reads process.env at call-time (inside the function), so we
  // can mutate process.env between tests, but must reset module cache to
  // re-evaluate any module-level state. Belt and suspenders.
  const mod = await import('@/lib/featureFlags')
  return mod.FLAGS
}

describe('FLAGS.ADAPTIVE_DASHBOARD', () => {
  const savedEnv: Record<string, string | undefined> = {}

  beforeEach(() => {
    for (const k of ENV_KEYS) {
      savedEnv[k] = process.env[k]
      delete process.env[k]
    }
  })

  afterEach(() => {
    for (const k of ENV_KEYS) {
      if (savedEnv[k] === undefined) delete process.env[k]
      else process.env[k] = savedEnv[k]
    }
  })

  it('returns true for any user when global flag is true', async () => {
    process.env.FF_ADAPTIVE_DASHBOARD = 'true'
    const FLAGS = await loadFlags()
    expect(FLAGS.ADAPTIVE_DASHBOARD('user-a')).toBe(true)
    expect(FLAGS.ADAPTIVE_DASHBOARD('user-b')).toBe(true)
    expect(FLAGS.ADAPTIVE_DASHBOARD()).toBe(true)
  })

  it('returns true only for userId in the allowlist', async () => {
    process.env.FF_ADAPTIVE_DASHBOARD_USERS = 'alice, bob ,carol'
    const FLAGS = await loadFlags()
    expect(FLAGS.ADAPTIVE_DASHBOARD('alice')).toBe(true)
    expect(FLAGS.ADAPTIVE_DASHBOARD('bob')).toBe(true)
    expect(FLAGS.ADAPTIVE_DASHBOARD('carol')).toBe(true)
  })

  it('returns false for userId not in allowlist', async () => {
    process.env.FF_ADAPTIVE_DASHBOARD_USERS = 'alice,bob'
    const FLAGS = await loadFlags()
    expect(FLAGS.ADAPTIVE_DASHBOARD('eve')).toBe(false)
  })

  it('returns false with no env vars set', async () => {
    const FLAGS = await loadFlags()
    expect(FLAGS.ADAPTIVE_DASHBOARD('alice')).toBe(false)
    expect(FLAGS.ADAPTIVE_DASHBOARD()).toBe(false)
  })

  it('returns false when called without userId and only allowlist is set', async () => {
    process.env.FF_ADAPTIVE_DASHBOARD_USERS = 'alice'
    const FLAGS = await loadFlags()
    expect(FLAGS.ADAPTIVE_DASHBOARD()).toBe(false)
  })
})
