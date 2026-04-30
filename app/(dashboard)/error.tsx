'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'

// Segment-level error boundary for the entire dashboard shell.
// Without this, any unhandled exception in the dashboard layout (which fetches
// profile + subscription on every request) takes down the full page with the
// root app/error.tsx — a white full-screen error with no navigation.
// This boundary renders inside the dashboard layout chrome so the sidebar,
// header, and navigation remain functional even when a specific page throws.
export default function DashboardError({
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
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
      <div className="text-4xl mb-4">⚠️</div>
      <h2 className="text-lg font-semibold text-text-primary mb-2">
        Something went wrong
      </h2>
      <p className="text-sm text-text-secondary mb-6 max-w-sm">
        This page hit an unexpected error. Your study progress is safe.
      </p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="btn-primary text-sm px-4 py-2"
        >
          Try again
        </button>
        <a href="/dashboard" className="btn-outline text-sm px-4 py-2">
          Go to Dashboard
        </a>
      </div>
      {error.digest && (
        <p className="mt-4 text-xs text-text-muted font-mono">
          Error ID: {error.digest}
        </p>
      )}
    </div>
  )
}
