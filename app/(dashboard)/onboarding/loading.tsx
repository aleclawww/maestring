import { Skeleton } from '@/components/ui/Skeleton'

export default function OnboardingLoading() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <Skeleton className="h-8 w-48 mx-auto" />
          <Skeleton className="h-4 w-64 mx-auto" />
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className={`h-2 ${i === 0 ? 'w-8' : 'w-2'}`} rounded="full" />
          ))}
        </div>

        {/* Form card */}
        <div className="rounded-xl border border-border bg-surface p-6 space-y-5">
          <div className="space-y-1">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-60" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" rounded="lg" />
            ))}
          </div>
          <Skeleton className="h-11 w-full" rounded="lg" />
        </div>
      </div>
    </div>
  )
}
