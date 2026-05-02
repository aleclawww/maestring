import Link from 'next/link'

export function TrialBanner({ trialEnd }: { trialEnd: string }) {
  const end = new Date(trialEnd)
  const now = new Date()
  const ms = end.getTime() - now.getTime()
  const daysRemaining = Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)))
  if (daysRemaining > 7 || daysRemaining < 0) return null

  const tone =
    daysRemaining <= 1 ? 'border-warning/40 bg-warning/10 text-warning'
    : daysRemaining <= 3 ? 'border-blue-500/40 bg-blue-500/10 text-blue-300'
    : 'border-primary/30 bg-primary/5 text-primary'

  return (
    <div className={`mx-4 mt-3 mb-1 rounded-lg border ${tone} px-4 py-2.5 flex items-center justify-between gap-3`}>
      <div className="text-sm">
        <span className="font-semibold">
          {daysRemaining === 0 ? 'Trial ends today' : `Trial · ${daysRemaining} day${daysRemaining === 1 ? '' : 's'} left`}
        </span>
        <span className="text-text-secondary ml-2 text-xs">
          {daysRemaining === 0
            ? 'Your card will be charged $19 at the end of today.'
            : `Your card will be charged $19 on ${end.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}.`}
        </span>
      </div>
      <Link
        href="/settings?tab=subscription"
        className="text-xs font-semibold underline whitespace-nowrap hover:no-underline"
      >
        Manage billing →
      </Link>
    </div>
  )
}
