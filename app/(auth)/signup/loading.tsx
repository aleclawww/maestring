import { Skeleton } from '@/components/ui/Skeleton'

export default function SignupLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-5">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <Skeleton className="h-12 w-12" rounded="lg" />
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-4 w-52" />
        </div>

        {/* Name input */}
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-11 w-full" rounded="lg" />
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

        {/* Footer links */}
        <div className="flex justify-center gap-1 pt-1">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-4 w-16" />
        </div>

        {/* ToS note */}
        <div className="flex justify-center gap-1">
          <Skeleton className="h-3 w-64" />
        </div>
      </div>
    </div>
  )
}
