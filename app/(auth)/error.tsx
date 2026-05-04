'use client'

import { useEffect } from 'react'
import { Lock, RotateCcw } from 'lucide-react'
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
    <div
      className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 text-center"
      style={{
        fontFamily:
          'var(--font-jakarta), "Plus Jakarta Sans", system-ui, sans-serif',
      }}
    >
      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
        <Lock className="h-5 w-5" strokeWidth={2} />
      </div>
      <h1 className="mb-2 text-[22px] font-bold tracking-tight text-slate-900">
        Something went wrong
      </h1>
      <p className="mb-6 max-w-sm text-[14px] leading-[1.6] text-slate-500">
        We ran into an error during authentication. Please try again.
      </p>
      {error.digest && (
        <p className="mb-4 font-mono text-[11px] text-slate-400">
          Error ID: {error.digest}
        </p>
      )}
      <div className="flex flex-wrap justify-center gap-3">
        <button
          onClick={reset}
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 px-4 text-[13px] font-semibold text-white shadow-[0_4px_14px_0_rgba(79,70,229,0.30)] transition-all hover:-translate-y-0.5"
        >
          <RotateCcw className="h-3.5 w-3.5" strokeWidth={2.25} />
          Try again
        </button>
        <a
          href="/login"
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-[13px] font-semibold text-slate-900 transition-colors hover:bg-slate-50"
        >
          Back to login
        </a>
      </div>
    </div>
  )
}
