import * as Sentry from '@sentry/nextjs'
import { logger } from '@/lib/logger'

// Debounce window for Sentry captures. A dead Redis can receive thousands of
// calls per minute — without this, we'd page ourselves into oblivion on the
// first outage and chew through the Sentry quota in seconds.
//
// Per-operation: so a rate-limit failure doesn't hide a cache failure, and
// vice versa.
const WINDOW_MS = 5 * 60_000
const lastCaptureByOp = new Map<string, number>()

/**
 * Called from fail-open code paths in `lib/redis/*` whenever Redis is
 * unreachable. The caller's behavior is unchanged — this is purely a signal
 * so operators know the app is running without rate caps / cache.
 *
 * Behavior:
 *   - Logs a warning via pino every time (cheap, picked up by Vercel logs).
 *   - Captures a Sentry message at most once per WINDOW_MS per operation.
 *   - Tagged with `redis_outage_fail_open: 'true'` for easy filtering.
 *
 * Sentry is a no-op without DSN configured, so this is safe in local dev too.
 */
export function notifyRedisOutage(
  operation: string,
  err: unknown,
  extra?: Record<string, unknown>,
): void {
  const message = err instanceof Error ? err.message : String(err)

  logger.warn(
    { operation, error: message, ...extra },
    'redis operation failed — fail-open path engaged',
  )

  const now = Date.now()
  const last = lastCaptureByOp.get(operation) ?? 0
  if (now - last < WINDOW_MS) return
  lastCaptureByOp.set(operation, now)

  Sentry.captureMessage(`Redis outage (fail-open): ${operation}`, {
    level: 'warning',
    tags: { redis_outage_fail_open: 'true', operation },
    extra: { error: message, ...extra },
  })
}

/**
 * Test-only: clear the debounce state so back-to-back tests don't interfere.
 * Not exported from an index — callers import this directly.
 */
export function __resetRedisOutageDebounce(): void {
  lastCaptureByOp.clear()
}
