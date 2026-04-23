import type { NextRequest } from 'next/server'

/**
 * Best-effort client IP for rate-limiting keys.
 * Trusts x-forwarded-for (set by Vercel) → x-real-ip → falls back to a constant bucket.
 * Not suitable for security decisions — only for sliding-window throttles.
 */
export function getRequestIp(req: NextRequest | Request): string {
  const h = (req as NextRequest).headers ?? (req as Request).headers
  const fwd = h.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0]!.trim()
  const real = h.get('x-real-ip')
  if (real) return real.trim()
  return 'unknown'
}
