import { Skeleton } from '@/components/ui/Skeleton'

export default function ExamLoading() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 gap-6">
      {/* Intro card */}
      <div className="w-full max-w-lg rounded-xl border border-border bg-surface p-8 space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <Skeleton className="h-14 w-14" rounded="lg" />
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-1 rounded-lg bg-background p-3">
              <Skeleton className="h-6 w-12" />
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </div>

        {/* Info bullets */}
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <Skeleton className="h-4 w-4 shrink-0" rounded="full" />
              <Skeleton className="h-4 w-full" />
            </div>
          ))}
        </div>

        <Skeleton className="h-11 w-full" rounded="lg" />
      </div>
    </div>
  )
}
