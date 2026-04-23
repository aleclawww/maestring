import * as Sentry from '@sentry/nextjs'

type Context = {
  route?: string
  userId?: string | null
  extra?: Record<string, unknown>
}

/**
 * Capture an exception with optional route/user context.
 * Safe to call without DSN configured — Sentry.init becomes a no-op and this returns undefined.
 */
export function captureApiException(err: unknown, context: Context = {}): string | undefined {
  return Sentry.captureException(err, (scope) => {
    if (context.route) scope.setTag('route', context.route)
    if (context.userId) scope.setUser({ id: context.userId })
    if (context.extra) scope.setContext('extra', context.extra)
    return scope
  })
}
