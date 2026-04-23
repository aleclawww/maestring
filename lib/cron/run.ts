import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'
import { captureApiException } from '@/lib/sentry/capture'

type CronOutcome = {
  status: 'ok' | 'skipped'
  rowsAffected?: number
  metadata?: Record<string, unknown>
}

/**
 * Wrap a cron job's body so each invocation is recorded in `cron_runs`.
 *
 * Usage:
 *   return runCron('weekly-digest', async () => {
 *     if (!isMonday()) return { status: 'skipped', metadata: { reason: 'not_monday' } }
 *     const sent = await doTheWork()
 *     return { status: 'ok', rowsAffected: sent }
 *   })
 *
 * Guarantees:
 *   • A row is inserted at start with status='running'.
 *   • On success: status set to the handler's return ('ok' or 'skipped').
 *   • On throw: status='failed', error=err.message, Sentry capture, 500 response.
 *   • The ledger write never throws into the cron body.
 */
export async function runCron<T extends CronOutcome>(
  name: string,
  body: () => Promise<T>,
): Promise<{ ok: true; id: string | null; result: T } | { ok: false; id: string | null; error: string }> {
  const supabase = createAdminClient()

  // Start row. Best-effort: if the insert fails, still run the body so a DB
  // blip doesn't block payroll-critical crons.
  let runId: string | null = null
  try {
    // PostgREST returns { data, error } rather than throwing on DB errors, so
    // we must destructure the error explicitly — the surrounding try/catch
    // only catches thrown exceptions (network, serialization), not RLS or
    // constraint failures. Without this, a misconfigured cron_runs policy
    // would silently hide every "stuck cron" alert source.
    const { data, error: insertErr } = await supabase
      .from('cron_runs')
      .insert({ name })
      .select('id')
      .single()
    if (insertErr) {
      logger.warn(
        { err: insertErr, name },
        'cron_runs insert returned error — proceeding without ledger row'
      )
    }
    runId = data?.id ?? null
  } catch (err) {
    logger.warn({ err, name }, 'cron_runs insert failed — proceeding without ledger row')
  }

  const start = Date.now()
  try {
    const result = await body()
    if (runId) {
      // Ledger update. If this fails the cron body STILL succeeded, but the
      // `cron_runs` row stays in `status='running'`, which trips any
      // "stuck cron" alert that watches for long-running rows. Log so the
      // false-positive alert has context and we can correlate the orphan
      // ledger row with an actual success.
      const { error: ledgerErr } = await supabase
        .from('cron_runs')
        .update({
          ended_at: new Date().toISOString(),
          status: result.status,
          rows_affected: result.rowsAffected ?? null,
          metadata: result.metadata ?? null,
        })
        .eq('id', runId)
      if (ledgerErr) {
        logger.error(
          { err: ledgerErr, name, runId, actualStatus: result.status },
          'Failed to update cron_runs after successful run — ledger stuck on "running"'
        )
      }
    }
    logger.info({ name, status: result.status, ms: Date.now() - start, rowsAffected: result.rowsAffected }, 'cron finished')
    return { ok: true, id: runId, result }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (runId) {
      // Same reasoning as the success path: we must not let a ledger write
      // failure eat the signal. captureApiException + logger.error below
      // always fire so the real failure surfaces even if this write drops.
      const { error: ledgerErr } = await supabase
        .from('cron_runs')
        .update({
          ended_at: new Date().toISOString(),
          status: 'failed',
          error: msg,
        })
        .eq('id', runId)
      if (ledgerErr) {
        logger.error(
          { err: ledgerErr, name, runId, originalErr: msg },
          'Failed to update cron_runs after failed run — ledger stuck on "running" and original error below'
        )
      }
    }
    captureApiException(err, { route: `cron:${name}` })
    logger.error({ err, name, ms: Date.now() - start }, 'cron failed')
    return { ok: false, id: runId, error: msg }
  }
}
