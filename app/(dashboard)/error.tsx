'use client'

import { useEffect } from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'
import * as Sentry from '@sentry/nextjs'
import { Card, Button } from '@/components/v2'

// Segment-level error boundary for the entire dashboard shell.
// Renders inside the dashboard layout chrome so the sidebar, header, and
// navigation remain functional even when a specific page throws.
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
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <Card padding="lg" className="max-w-[480px] text-center sm:p-10">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-v2-warning-soft text-v2-warning">
          <AlertTriangle className="h-5 w-5" strokeWidth={2} />
        </div>
        <h2 className="v2-display mt-4 text-[22px] sm:text-[26px]">
          Something went wrong
        </h2>
        <p className="mx-auto mt-2 max-w-[400px] text-[14px] leading-[1.6] text-v2-foreground-muted">
          This page hit an unexpected error. Your study progress is safe.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button onClick={reset}>
            <RotateCcw className="h-4 w-4" strokeWidth={2.25} />
            Try again
          </Button>
          <a href="/dashboard">
            <Button variant="secondary">Go to Dashboard</Button>
          </a>
        </div>
        {error.digest && (
          <p className="mt-5 font-v2-mono text-[11px] text-v2-foreground-subtle">
            Error ID: {error.digest}
          </p>
        )}
      </Card>
    </div>
  )
}
