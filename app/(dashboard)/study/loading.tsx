import { Skeleton } from '@/components/ui/Skeleton'

export default function StudyLoading() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 gap-6">
      {/* Session header */}
      <div className="w-full max-w-2xl flex items-center justify-between">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-20" />
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-2xl">
        <Skeleton className="h-2 w-full" rounded="full" />
      </div>

      {/* Question card */}
      <div className="w-full max-w-2xl rounded-xl border border-border bg-surface p-6 space-y-5">
        {/* Domain badge + timer */}
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-36" rounded="full" />
          <Skeleton className="h-6 w-16" rounded="full" />
        </div>

        {/* Question text */}
        <div className="space-y-2">
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-3/4" />
        </div>

        {/* Answer options */}
        <div className="space-y-3 pt-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3 rounded-lg border border-border p-4">
              <Skeleton className="h-5 w-5 mt-0.5 shrink-0" rounded="full" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-full" />
                {i % 2 === 0 && <Skeleton className="h-4 w-4/5" />}
              </div>
            </div>
          ))}
        </div>

        {/* Submit button */}
        <Skeleton className="h-11 w-full" rounded="lg" />
      </div>
    </div>
  )
}
