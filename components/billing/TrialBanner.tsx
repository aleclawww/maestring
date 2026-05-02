import Link from 'next/link'

export function TrialBanner({
  trialEnd,
  cancelAtPeriodEnd = false,
}: {
  trialEnd: string
  cancelAtPeriodEnd?: boolean
}) {
  const end = new Date(trialEnd)
  const now = new Date()
  const ms = end.getTime() - now.getTime()
  const daysRemaining = Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)))
  if (daysRemaining > 7 || daysRemaining < 0) return null

  const endDateStr = end.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

  // Three visual modes:
  //   1. Canceled-during-trial — neutral grey, "no charge" copy + Resume CTA
  //   2. Last day                — warning yellow, charge happens today
  //   3. Standard trial          — primary/blue gradient by days remaining
  if (cancelAtPeriodEnd) {
    return (
      <div className="mx-4 mt-3 mb-1 rounded-lg border border-text-muted/30 bg-surface/40 px-4 py-2.5 flex items-center justify-between gap-3">
        <div className="text-sm">
          <span className="font-semibold">
            🌙 Trial ends in {daysRemaining} day{daysRemaining === 1 ? '' : 's'} · No charge
          </span>
          <span className="text-text-secondary ml-2 text-xs">
            Subscription canceled. You keep access until {endDateStr}, then it ends. Resume anytime.
          </span>
        </div>
        <Link
          href="/settings?tab=subscription"
          className="text-xs font-semibold whitespace-nowrap rounded-lg bg-primary text-white px-3 py-1.5 hover:opacity-90 transition-opacity"
        >
          Resume →
        </Link>
      </div>
    )
  }

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
            : `Your card will be charged $19 on ${endDateStr}.`}
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
