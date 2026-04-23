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
    const { data } = await supabase
      .from('cron_runs')
      .insert({ name })
      .select('id')
      .single()
    runId = data?.id ?? null
  } catch (err) {
    logger.warn({ err, name }, 'cron_runs insert failed — proceeding without ledger row')
  }

  const start = Date.now()
  try {
    const result = await body()
    if (runId) {
      await supabase
        .from('cron_runs')
        .update({
          ended_at: new Date().toISOString(),
          status: result.status,
          rows_affected: result.rowsAffected ?? null,
          metadata: result.metadata ?? null,
        })
        .eq('id', runId)
    }
    logger.info({ name, status: result.status, ms: Date.now() - start, rowsAffected: result.rowsAffected }, 'cron finished')
    return { ok: true, id: runId, result }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (runId) {
      await supabase
        .from('cron_runs')
        .update({
          ended_at: new Date().toISOString(),
          status: 'failed',
          error: msg,
        })
        .eq('id', runId)
    }
    captureApiException(err, { route: `cron:${name}` })
    logger.error({ err, name, ms: Date.now() - start }, 'cron failed')
    return { ok: false, id: runId, error: msg }
  }
}
