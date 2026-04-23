import * as Sentry from '@sentry/nextjs'

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN
const env = process.env.NEXT_PUBLIC_SENTRY_ENV ?? process.env.NODE_ENV ?? 'development'

if (dsn) {
  Sentry.init({
    dsn,
    environment: env,
    // Sample 10% of traces in prod, 100% in dev for local debugging.
    tracesSampleRate: env === 'production' ? 0.1 : 1.0,
    // Session replay only on errors — keeps bundle cheap and PII exposure low.
    replaysOnErrorSampleRate: 1.0,
    replaysSessionSampleRate: 0,
    integrations: [
      Sentry.replayIntegration({
        maskAllText: true,
        maskAllInputs: true,
        blockAllMedia: true,
      }),
    ],
    // Drop noisy errors we can't do anything about.
    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
      'Non-Error promise rejection captured',
      /^Failed to fetch$/,
      /NetworkError/,
    ],
    beforeSend(event) {
      // Never ship raw user input to Sentry. Request bodies can contain
      // prompts that include PII (student names, work context, etc.).
      if (event.request) {
        delete event.request.data
        delete event.request.cookies
      }
      return event
    },
  })
}
