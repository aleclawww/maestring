import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockFrom = vi.fn()

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({ from: mockFrom }),
}))
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), info: vi.fn() } }))

type ChainState = {
  existing: { id: string } | null
  insertError: { message: string } | null
}

function mountSupabase(state: ChainState) {
  mockFrom.mockImplementation(() => {
    return {
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: state.existing, error: null }),
        }),
      }),
      insert: async () => ({ data: null, error: state.insertError }),
    }
  })
}

beforeEach(() => {
  mockFrom.mockReset()
  process.env['MAGIC_LINK_SECRET'] = 'test-secret-do-not-use-in-prod-xxxxxxxxxxxxxxxxx'
  process.env['NEXT_PUBLIC_APP_URL'] = 'https://example.test'
})

describe('lib/magic-links — createMagicLink + verifyMagicLink', () => {
  it('round-trips a valid token', async () => {
    mountSupabase({ existing: null, insertError: null })
    const { createMagicLink, verifyMagicLink } = await import('@/lib/magic-links')
    const url = await createMagicLink('user-1', 'a@b.com', 'resume')
    expect(url).toMatch(/^https:\/\/example\.test\/api\/magic\?token=/)
    const token = url.split('token=')[1]!
    const payload = await verifyMagicLink(token)
    expect(payload.userId).toBe('user-1')
    expect(payload.email).toBe('a@b.com')
    expect(payload.intent).toBe('resume')
    expect(payload.jti).toMatch(/[0-9a-f-]{36}/)
  })

  it('rejects reused JTI', async () => {
    mountSupabase({ existing: { id: 'prev' }, insertError: null })
    const { createMagicLink, verifyMagicLink } = await import('@/lib/magic-links')
    const url = await createMagicLink('user-1', 'a@b.com')
    const token = url.split('token=')[1]!
    await expect(verifyMagicLink(token)).rejects.toThrow(/already used/i)
  })

  it('rejects tampered token', async () => {
    mountSupabase({ existing: null, insertError: null })
    const { createMagicLink, verifyMagicLink } = await import('@/lib/magic-links')
    const url = await createMagicLink('user-1', 'a@b.com')
    const token = url.split('token=')[1]!
    const tampered = token.slice(0, -3) + 'AAA'
    await expect(verifyMagicLink(tampered)).rejects.toThrow()
  })

  it('bubbles up insert failure', async () => {
    mountSupabase({ existing: null, insertError: { message: 'db down' } })
    const { createMagicLink, verifyMagicLink } = await import('@/lib/magic-links')
    const url = await createMagicLink('user-1', 'a@b.com')
    const token = url.split('token=')[1]!
    await expect(verifyMagicLink(token)).rejects.toThrow(/validate token/i)
  })
})
