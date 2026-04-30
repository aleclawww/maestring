export default function ExamResultsLoading() {
  return (
    <div className="min-h-screen bg-bg-primary p-6 md:p-10">
      <div className="max-w-3xl mx-auto space-y-6 animate-pulse">
        {/* Header banner skeleton */}
        <div className="rounded-2xl p-8 bg-bg-secondary flex flex-col items-center gap-4">
          <div className="h-8 w-48 rounded-lg bg-bg-tertiary" />
          <div className="h-16 w-36 rounded-xl bg-bg-tertiary" />
          <div className="h-4 w-64 rounded bg-bg-tertiary" />
          <div className="h-4 w-48 rounded bg-bg-tertiary" />
        </div>

        {/* Domain breakdown skeleton */}
        <div className="rounded-2xl bg-bg-secondary p-6 space-y-4">
          <div className="h-5 w-40 rounded bg-bg-tertiary" />
          {[...Array(4)].map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="flex justify-between">
                <div className="h-4 w-36 rounded bg-bg-tertiary" />
                <div className="h-4 w-16 rounded bg-bg-tertiary" />
              </div>
              <div className="h-2 w-full rounded-full bg-bg-tertiary" />
            </div>
          ))}
        </div>

        {/* CTA buttons skeleton */}
        <div className="flex gap-3">
          <div className="h-10 flex-1 rounded-xl bg-bg-secondary" />
          <div className="h-10 flex-1 rounded-xl bg-bg-secondary" />
        </div>
      </div>
    </div>
  )
}
