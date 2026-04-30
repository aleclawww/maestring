import { Skeleton } from '@/components/ui/Skeleton'

function SettingsSection({ rows = 3 }: { rows?: number }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-6 space-y-5">
      <div className="space-y-1">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="space-y-4">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" rounded="lg" />
          </div>
        ))}
      </div>
      <Skeleton className="h-10 w-32" rounded="lg" />
    </div>
  )
}

export default function SettingsLoading() {
  return (
    <div className="p-6 max-w-2xl mx-auto space-y-8">
      <Skeleton className="h-8 w-28" />
      <SettingsSection rows={2} />
      <SettingsSection rows={1} />
      <SettingsSection rows={2} />
      {/* Danger zone */}
      <div className="rounded-xl border border-red-500/30 bg-surface p-6 space-y-4">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-4 w-72" />
        <Skeleton className="h-10 w-36" rounded="lg" />
      </div>
    </div>
  )
}
