import { Skeleton } from '@/components/ui/Skeleton'

export default function ReferralsLoading() {
  return (
    <div className="p-6 max-w-2xl mx-auto space-y-8">
      <div className="space-y-1">
        <Skeleton className="h-8 w-36" />
        <Skeleton className="h-4 w-64" />
      </div>

      {/* Share block */}
      <div className="rounded-xl border border-border bg-surface p-6 space-y-4">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-72" />
        <div className="flex gap-2">
          <Skeleton className="h-10 flex-1" rounded="lg" />
          <Skeleton className="h-10 w-24" rounded="lg" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-9 w-32" rounded="lg" />
          <Skeleton className="h-9 w-32" rounded="lg" />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-surface p-4 space-y-2">
            <Skeleton className="h-8 w-12" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>

      {/* Referral rows */}
      <div className="space-y-3">
        <Skeleton className="h-5 w-32" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between rounded-lg border border-border bg-surface p-4">
            <div className="space-y-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-6 w-20" rounded="full" />
          </div>
        ))}
      </div>
    </div>
  )
}
