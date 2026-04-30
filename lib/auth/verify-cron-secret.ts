import { timingSafeEqual } from 'crypto'

/**
 * Constant-time verification of the CRON_SECRET bearer token.
 *
 * Plain `=== ` comparison short-circuits on the first differing byte, creating
 * a timing side-channel that lets an attacker brute-force the secret one byte
 * at a time. `timingSafeEqual` always takes the same time regardless of where
 * the strings diverge.
 *
 * Also guards against:
 *   - Missing CRON_SECRET env var (returns false, logs a misconfiguration error)
 *   - Empty CRON_SECRET (same — "Bearer " would trivially pass a naïve check)
 *   - Missing or malformed Authorization header
 */
export function verifyCronSecret(authorizationHeader: string | null): boolean {
  const secret = process.env['CRON_SECRET']
  if (!secret) {
    // Misconfigured environment — fail closed. Caller should return 500.
    console.error('[verifyCronSecret] CRON_SECRET env var is not set — all cron requests will be rejected')
    return false
  }

  if (!authorizationHeader) return false

  const expected = `Bearer ${secret}`

  // timingSafeEqual requires equal-length Buffers. If lengths differ we still
  // must not short-circuit — compare against a dummy buffer of the same length
  // as the incoming header to avoid leaking length information.
  const a = Buffer.from(authorizationHeader)
  const b = Buffer.from(expected)

  if (a.length !== b.length) {
    // Lengths differ — definitely wrong, but don't return early based on length
    // alone (that leaks length). Pad and compare anyway, then return false.
    const padded = Buffer.alloc(a.length)
    b.copy(padded, 0, 0, Math.min(b.length, a.length))
    timingSafeEqual(a, padded) // discard result — length mismatch is already a fail
    return false
  }

  return timingSafeEqual(a, b)
}
