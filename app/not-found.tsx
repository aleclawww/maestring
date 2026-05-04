import Link from 'next/link'
import { ArrowRight, Compass } from 'lucide-react'

export default function NotFound() {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 text-center"
      style={{
        fontFamily:
          'var(--font-jakarta), "Plus Jakarta Sans", system-ui, sans-serif',
      }}
    >
      <div className="mb-6 inline-flex items-baseline gap-2">
        <span className="text-[120px] font-extrabold leading-none tracking-tight text-slate-900">
          404
        </span>
      </div>

      <div className="mb-6 max-w-md rounded-lg border border-rose-200 bg-rose-50 px-5 py-4 text-left font-mono text-[13px] text-rose-900">
        <p className="font-bold">ResourceNotFoundException</p>
        <p className="mt-1 opacity-80">
          The page you requested does not exist in this region.
        </p>
        <p className="mt-2 text-[11px] text-slate-500">
          Error Code: 404 | Request ID: {crypto.randomUUID?.() ?? 'unknown'}
        </p>
      </div>

      <h1 className="mb-2 text-[28px] font-bold tracking-tight text-slate-900">
        Page not found
      </h1>
      <p className="mb-8 max-w-md text-[15px] leading-[1.6] text-slate-500">
        This route doesn't exist or was removed. Head back to the dashboard or
        check that the URL is correct.
      </p>

      <div className="flex flex-wrap justify-center gap-3">
        <Link
          href="/dashboard"
          className="inline-flex h-11 items-center gap-2 rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 px-5 text-[14px] font-semibold text-white shadow-[0_4px_14px_0_rgba(79,70,229,0.30)] transition-all hover:-translate-y-0.5"
        >
          <Compass className="h-4 w-4" strokeWidth={2.25} />
          Go to Dashboard
          <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
        </Link>
        <Link
          href="/"
          className="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-5 text-[14px] font-semibold text-slate-900 transition-colors hover:bg-slate-50"
        >
          Home
        </Link>
      </div>

      <p className="mt-12 text-[12px] text-slate-400">
        Think this is a mistake? Contact support.
      </p>
    </div>
  )
}
