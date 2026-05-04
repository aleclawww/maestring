'use client'

import { useEffect } from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'
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
    <div
      className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 text-center"
      style={{
        fontFamily:
          'var(--font-jakarta), "Plus Jakarta Sans", system-ui, sans-serif',
      }}
    >
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
        <AlertTriangle className="h-8 w-8" strokeWidth={2} />
      </div>

      <div className="mb-6 max-w-md rounded-lg border border-amber-200 bg-amber-50 px-5 py-4 text-left font-mono text-[13px] text-amber-900">
        <p className="font-bold">InternalServiceError</p>
        <p className="mt-1 opacity-80">
          An unexpected error occurred on the server.
        </p>
        {error.digest && (
          <p className="mt-2 text-[11px] text-slate-500">
            Digest: {error.digest}
          </p>
        )}
      </div>

      <h1 className="mb-2 text-[28px] font-bold tracking-tight text-slate-900">
        Something went wrong
      </h1>
      <p className="mb-8 max-w-md text-[15px] leading-[1.6] text-slate-500">
        This error was reported automatically. You can try reloading the page.
      </p>

      <div className="flex flex-wrap justify-center gap-3">
        <button
          onClick={reset}
          className="inline-flex h-11 items-center gap-2 rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 px-5 text-[14px] font-semibold text-white shadow-[0_4px_14px_0_rgba(79,70,229,0.30)] transition-all hover:-translate-y-0.5"
        >
          <RotateCcw className="h-4 w-4" strokeWidth={2.25} />
          Try again
        </button>
        <a
          href="/dashboard"
          className="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-5 text-[14px] font-semibold text-slate-900 transition-colors hover:bg-slate-50"
        >
          Go to Dashboard
        </a>
      </div>
    </div>
  )
}
