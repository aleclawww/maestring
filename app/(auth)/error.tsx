'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'

export default function AuthError({
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
      <div className="mb-6 text-5xl">🔐</div>
      <h1 className="mb-2 text-xl font-bold text-text-primary">Something went wrong</h1>
      <p className="mb-6 max-w-sm text-sm text-text-secondary">
        We ran into an error during authentication. Please try again.
      </p>
      {error.digest && (
        <p className="mb-4 font-mono text-xs text-text-muted">Error ID: {error.digest}</p>
      )}
      <div className="flex gap-3">
        <button onClick={reset} className="btn-primary text-sm">
          Try again
        </button>
        <a href="/login" className="btn-outline text-sm">
          Back to login
        </a>
      </div>
    </div>
  )
}
