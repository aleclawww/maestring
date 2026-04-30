import { Skeleton } from '@/components/ui/Skeleton'

export default function LoginLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <Skeleton className="h-12 w-12" rounded="lg" />
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-48" />
        </div>

        {/* Email input */}
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-11 w-full" rounded="lg" />
        </div>

        {/* Submit button */}
        <Skeleton className="h-11 w-full" rounded="lg" />

        {/* Divider */}
        <div className="flex items-center gap-3">
          <Skeleton className="h-px flex-1" />
          <Skeleton className="h-4 w-6" />
          <Skeleton className="h-px flex-1" />
        </div>

        {/* Google button */}
        <Skeleton className="h-11 w-full" rounded="lg" />

        {/* Footer link */}
        <div className="flex justify-center gap-1 pt-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>
    </div>
  )
}
