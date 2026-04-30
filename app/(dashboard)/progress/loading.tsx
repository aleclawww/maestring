import { Skeleton } from '@/components/ui/Skeleton'

export default function ProgressLoading() {
  return (
    <div className="min-h-screen bg-background p-6 space-y-6">
      {/* Page header */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>

      {/* Readiness score hero */}
      <div className="rounded-xl border border-border bg-surface p-8 flex flex-col items-center gap-4">
        <Skeleton className="h-32 w-32" rounded="full" />
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-56" />
      </div>

      {/* Blueprint accuracy breakdown */}
      <div className="rounded-xl border border-border bg-surface p-6 space-y-4">
        <Skeleton className="h-6 w-52" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-12" />
              </div>
              <Skeleton className="h-2 w-full" rounded="full" />
            </div>
          ))}
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-surface p-5 space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-32" />
          </div>
        ))}
      </div>

      {/* Weekly activity */}
      <div className="rounded-xl border border-border bg-surface p-6 space-y-4">
        <Skeleton className="h-6 w-36" />
        <div className="flex gap-2 items-end h-24">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton
              key={i}
              className="flex-1"
              style={{ height: `${30 + Math.random() * 60}%` }}
              rounded="sm"
            />
          ))}
        </div>
        <div className="flex justify-between">
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
            <Skeleton key={i} className="h-3 w-4" />
          ))}
        </div>
      </div>
    </div>
  )
}
