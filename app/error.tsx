'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <div className="mb-8 text-7xl">⚠️</div>

      <div className="mb-6 rounded-lg border border-warning/30 bg-warning/10 px-6 py-4 font-mono text-sm text-warning">
        <p className="font-bold">InternalServiceError</p>
        <p className="mt-1 text-warning/80">An unexpected error occurred on the server.</p>
        {error.digest && (
          <p className="mt-2 text-text-muted text-xs">Digest: {error.digest}</p>
        )}
      </div>

      <h1 className="mb-2 text-2xl font-bold text-text-primary">Something went wrong</h1>
      <p className="mb-8 max-w-md text-text-secondary">
        This error was reported automatically. You can try reloading the page.
      </p>

      <div className="flex gap-4">
        <button onClick={reset} className="btn-primary">
          Try again
        </button>
        <a href="/dashboard" className="btn-outline">
          Go to Dashboard
        </a>
      </div>
    </div>
  )
}
