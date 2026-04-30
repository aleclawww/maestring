import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <div className="mb-8 text-8xl font-bold text-text-muted">404</div>

      <div className="mb-6 rounded-lg border border-danger/30 bg-danger/10 px-6 py-4 font-mono text-sm text-danger">
        <p className="font-bold">ResourceNotFoundException</p>
        <p className="mt-1 text-danger/80">
          The page you requested does not exist in this region.
        </p>
        <p className="mt-2 text-text-muted text-xs">
          Error Code: 404 | Request ID: {crypto.randomUUID?.() ?? 'unknown'}
        </p>
      </div>

      <h1 className="mb-2 text-2xl font-bold text-text-primary">Page not found</h1>
      <p className="mb-8 max-w-md text-text-secondary">
        This route doesn&apos;t exist or was removed. Head back to the dashboard or
        check that the URL is correct.
      </p>

      <div className="flex gap-4">
        <Link
          href="/dashboard"
          className="btn-primary"
        >
          Go to Dashboard
        </Link>
        <Link
          href="/"
          className="btn-outline"
        >
          Home
        </Link>
      </div>

      <p className="mt-12 text-xs text-text-muted">
        Think this is a mistake? Contact support.
      </p>
    </div>
  )
}
