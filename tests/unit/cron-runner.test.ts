import { beforeEach, describe, expect, it, vi } from 'vitest'

// The runCron harness wraps every cron body in a ledger insert + update with
// Sentry capture on failure. These tests nail down the contract so future
// refactors can't silently break the ledger guarantees in `lib/cron/run.ts`.

const captureApiException = vi.hoisted(() => vi.fn())
const adminClient = vi.hoisted(() => {
  // One chainable builder that every from(...) call returns, so a single test
  // can control insert/select/update behavior.
  const state: {
    insertResult: { data: { id: string } | null }
    selectResult: { data: { id: string } | null }
    updateCalls: Array<Record<string, unknown>>
    insertThrows: Error | null
  } = {
    insertResult: { data: { id: 'run-1' } },
    selectResult: { data: { id: 'run-1' } },
    updateCalls: [],
    insertThrows: null,
  }
  const builder = {
    insert: vi.fn((_row: unknown) => {
      if (state.insertThrows) throw state.insertThrows
      return builder
    }),
    select: vi.fn((_cols?: string) => builder),
    single: vi.fn(async () => state.insertResult),
    update: vi.fn((payload: Record<string, unknown>) => {
      state.updateCalls.push(payload)
      return builder
    }),
    eq: vi.fn((_col: string, _val: unknown) => builder),
  }
  const from = vi.fn((_table: string) => builder)
  return {
    state,
    builder,
    from,
    client: { from } as unknown as { from: typeof from },
  }
})

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => adminClient.client,
}))
vi.mock('@/lib/logger', () => {
  const logger = { warn: vi.fn(), info: vi.fn(), error: vi.fn(), debug: vi.fn() }
  return { default: logger, logger }
})
vi.mock('@/lib/sentry/capture', () => ({
  captureApiException,
}))

beforeEach(() => {
  vi.clearAllMocks()
  adminClient.state.insertResult = { data: { id: 'run-1' } }
  adminClient.state.updateCalls = []
  adminClient.state.insertThrows = null
})

describe('lib/cron/run — runCron', () => {
  it('returns ok=true with the body result and writes status=ok to the ledger', async () => {
    const { runCron } = await import('@/lib/cron/run')
    const out = await runCron('cleanup', async () => ({
      status: 'ok' as const,
      rowsAffected: 7,
      metadata: { deleted: 7 },
    }))

    expect(out.ok).toBe(true)
    if (!out.ok) return // type-guard
    expect(out.result.rowsAffected).toBe(7)

    // One insert (start row) + one update (finish row)
    expect(adminClient.builder.insert).toHaveBeenCalledTimes(1)
    expect(adminClient.builder.insert).toHaveBeenCalledWith({ name: 'cleanup' })

    expect(adminClient.state.updateCalls.length).toBe(1)
    const upd = adminClient.state.updateCalls[0]!
    expect(upd['status']).toBe('ok')
    expect(upd['rows_affected']).toBe(7)
    expect(upd['metadata']).toEqual({ deleted: 7 })
  })

  it('passes through status=skipped without logging an error', async () => {
    const { runCron } = await import('@/lib/cron/run')
    const out = await runCron('weekly-digest', async () => ({
      status: 'skipped' as const,
      metadata: { reason: 'not_monday' },
    }))
    expect(out.ok).toBe(true)
    expect(adminClient.state.updateCalls[0]!['status']).toBe('skipped')
    expect(captureApiException).not.toHaveBeenCalled()
  })

  it('records failed status, captures to Sentry, and returns ok=false on throw', async () => {
    const { runCron } = await import('@/lib/cron/run')
    const err = new Error('DB exploded')
    const out = await runCron('cleanup', async () => {
      throw err
    })

    expect(out.ok).toBe(false)
    if (out.ok) return
    expect(out.error).toBe('DB exploded')

    expect(adminClient.state.updateCalls.length).toBe(1)
    const upd = adminClient.state.updateCalls[0]!
    expect(upd['status']).toBe('failed')
    expect(upd['error']).toBe('DB exploded')

    expect(captureApiException).toHaveBeenCalledTimes(1)
    const [[capturedErr, ctx]] = captureApiException.mock.calls as [[unknown, { route: string }]]
    expect(capturedErr).toBe(err)
    expect(ctx.route).toBe('cron:cleanup')
  })

  it('still runs the body even if the ledger start-row insert fails', async () => {
    adminClient.state.insertThrows = new Error('cron_runs write blocked')
    const { runCron } = await import('@/lib/cron/run')
    const body = vi.fn().mockResolvedValue({ status: 'ok' as const, rowsAffected: 3 })

    const out = await runCron('cleanup', body)

    expect(body).toHaveBeenCalledTimes(1)
    expect(out.ok).toBe(true)
    if (!out.ok) return
    expect(out.id).toBeNull()
    expect(out.result.rowsAffected).toBe(3)
    // With no runId, the finish-row update is a no-op.
    expect(adminClient.state.updateCalls.length).toBe(0)
  })

  it('stringifies non-Error throws when writing the ledger failure row', async () => {
    const { runCron } = await import('@/lib/cron/run')
    const out = await runCron('cleanup', async () => {
      // eslint-disable-next-line @typescript-eslint/no-throw-literal
      throw 'bare-string-error'
    })
    expect(out.ok).toBe(false)
    if (out.ok) return
    expect(out.error).toBe('bare-string-error')
    expect(adminClient.state.updateCalls[0]!['error']).toBe('bare-string-error')
  })
})
