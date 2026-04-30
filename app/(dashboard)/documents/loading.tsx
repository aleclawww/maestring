import { Skeleton } from '@/components/ui/Skeleton'

export default function DocumentsLoading() {
  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="space-y-1">
        <Skeleton className="h-8 w-36" />
        <Skeleton className="h-4 w-64" />
      </div>

      {/* Upload zone */}
      <div className="rounded-xl border-2 border-dashed border-border p-10 flex flex-col items-center gap-3">
        <Skeleton className="h-10 w-10" rounded="lg" />
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-4 w-64" />
        <Skeleton className="h-10 w-36 mt-2" rounded="lg" />
      </div>

      {/* Document list */}
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 rounded-lg border border-border bg-surface p-4">
            <Skeleton className="h-10 w-10 shrink-0" rounded="lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="h-6 w-20" rounded="full" />
            <Skeleton className="h-8 w-8" rounded="lg" />
          </div>
        ))}
      </div>
    </div>
  )
}
