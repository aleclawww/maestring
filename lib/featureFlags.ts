/**
 * Feature flags — server-only.
 *
 * Read `process.env.*` directly at module level. Each flag is a boolean derived
 * from the string 'true'. Default OFF when the var is unset or any other value.
 *
 * DO NOT import this in client components — these vars are not prefixed with
 * NEXT_PUBLIC_ and won't be bundled for the browser. If a flag ever needs to
 * be read client-side, expose it via a server component prop or rename to
 * NEXT_PUBLIC_FF_*.
 */

function parseAllowlist(raw: string | undefined): Set<string> {
  if (!raw) return new Set()
  return new Set(
    raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  )
}

export const FLAGS = {
  /**
   * Mejora 1 — adaptive cold-start dashboard. When ON, the dashboard adapts
   * its action card and greeting subhead for users who haven't completed
   * a study session yet.
   *
   * Resolution order:
   *   1. `FF_ADAPTIVE_DASHBOARD=true` → ON for everyone (global rollout).
   *   2. `userId` is in the comma-separated `FF_ADAPTIVE_DASHBOARD_USERS`
   *      env var → ON for that user only (gradual rollout / dogfooding).
   *   3. Otherwise → OFF.
   *
   * Default OFF in production. Pass `user.id` from the request to enable
   * the allowlist check; calling with no argument only honors the global flag.
   */
  ADAPTIVE_DASHBOARD: (userId?: string): boolean => {
    if (process.env.FF_ADAPTIVE_DASHBOARD === 'true') return true
    if (!userId) return false
    return parseAllowlist(process.env.FF_ADAPTIVE_DASHBOARD_USERS).has(userId)
  },
} as const
