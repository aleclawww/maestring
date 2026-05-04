import Link from 'next/link'
import { ArrowRight, Clock, Moon } from 'lucide-react'

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

  const endDateStr = end.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })

  if (cancelAtPeriodEnd) {
    return (
      <div className="mx-4 my-2 flex items-center justify-between gap-3 rounded-lg border border-v2-border bg-v2-surface-subtle px-4 py-2.5">
        <div className="flex items-start gap-2.5 text-[13px]">
          <Moon
            className="mt-0.5 h-4 w-4 shrink-0 text-v2-foreground-muted"
            strokeWidth={2.25}
          />
          <div>
            <span className="font-semibold text-v2-foreground">
              Trial ends in {daysRemaining} day
              {daysRemaining === 1 ? '' : 's'} · No charge
            </span>
            <span className="ml-2 text-[12px] text-v2-foreground-muted">
              Subscription canceled. You keep access until {endDateStr}, then
              it ends. Resume anytime.
            </span>
          </div>
        </div>
        <Link
          href="/settings?tab=subscription"
          className="inline-flex h-8 shrink-0 items-center gap-1 whitespace-nowrap rounded-lg bg-v2-gradient-brand px-3 text-[12px] font-semibold text-white shadow-v2-button transition-all hover:-translate-y-0.5"
        >
          Resume
          <ArrowRight className="h-3 w-3" strokeWidth={2.5} />
        </Link>
      </div>
    )
  }

  const toneCls =
    daysRemaining <= 1
      ? 'border-v2-warning/40 bg-v2-warning-soft text-v2-warning'
      : daysRemaining <= 3
        ? 'border-sky-500/30 bg-sky-50 text-sky-700'
        : 'border-v2-brand/30 bg-v2-brand-soft text-v2-brand'

  return (
    <div
      className={`mx-4 my-2 flex items-center justify-between gap-3 rounded-lg border px-4 py-2.5 ${toneCls}`}
    >
      <div className="flex items-start gap-2.5 text-[13px]">
        <Clock className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2.25} />
        <div>
          <span className="font-semibold">
            {daysRemaining === 0
              ? 'Trial ends today'
              : `Trial · ${daysRemaining} day${daysRemaining === 1 ? '' : 's'} left`}
          </span>
          <span className="ml-2 text-[12px] opacity-80">
            {daysRemaining === 0
              ? 'Your card will be charged $19 at the end of today.'
              : `Your card will be charged $19 on ${endDateStr}.`}
          </span>
        </div>
      </div>
      <Link
        href="/settings?tab=subscription"
        className="text-[12px] font-semibold underline underline-offset-2 hover:no-underline"
      >
        Manage billing →
      </Link>
    </div>
  )
}
