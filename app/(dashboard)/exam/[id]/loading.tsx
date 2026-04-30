import { Skeleton } from '@/components/ui/Skeleton'

export default function ExamSessionLoading() {
  return (
    <div className="min-h-screen bg-background flex flex-col p-4 gap-4">
      {/* Header: progress + timer */}
      <div className="flex items-center justify-between py-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-8 w-20" rounded="lg" />
        <Skeleton className="h-4 w-20" />
      </div>

      {/* Progress bar */}
      <Skeleton className="h-2 w-full" rounded="full" />

      {/* Question card */}
      <div className="flex-1 flex flex-col items-center justify-center max-w-2xl w-full mx-auto gap-5">
        <div className="w-full rounded-xl border border-border bg-surface p-6 space-y-4">
          {/* Question number + domain */}
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-5 w-36" rounded="full" />
          </div>

          {/* Question text */}
          <div className="space-y-2">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-2/3" />
          </div>

          {/* Answer options */}
          <div className="space-y-3 pt-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 rounded-lg border border-border p-4">
                <Skeleton className="h-5 w-5 mt-0.5 shrink-0" rounded="full" />
                <Skeleton className="h-4 flex-1" />
              </div>
            ))}
          </div>

          <Skeleton className="h-11 w-full" rounded="lg" />
        </div>
      </div>
    </div>
  )
}
