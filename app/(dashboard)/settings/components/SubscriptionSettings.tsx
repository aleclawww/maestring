'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { UpgradeButton } from '@/components/billing/UpgradeButton'
import { formatDate } from '@/lib/utils'
import type { SubscriptionPlan, SubscriptionStatus } from '@/types/database'

interface SubscriptionSettingsProps {
  plan: SubscriptionPlan
  status: SubscriptionStatus
  stripeCustomerId: string | null
  periodEnd: string | null
  cancelAtPeriodEnd: boolean
}

export function SubscriptionSettings({
  plan,
  status,
  stripeCustomerId,
  periodEnd,
  cancelAtPeriodEnd,
}: SubscriptionSettingsProps) {
  const [loading, setLoading] = useState(false)

  async function handlePortal() {
    setLoading(true)
    const res = await fetch('/api/stripe/portal', { method: 'POST' })
    const { url } = await res.json()
    if (url) window.location.href = url
    setLoading(false)
  }

  return (
    <section>
      <h2 className="text-sm font-semibold text-text-primary mb-4 pb-2 border-b border-border">
        Subscription
      </h2>
      <div className="rounded-xl border border-border bg-surface-2 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-text-primary">Current plan</p>
          <Badge variant={plan === 'free' ? 'outline' : 'default'}>
            {plan === 'free' ? 'Free' : plan === 'pro_annual' ? 'Pro Annual' : plan === 'enterprise' ? 'Enterprise' : 'Pro'}
          </Badge>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-sm text-text-secondary">Status</p>
          <Badge variant={status === 'active' ? 'success' : status === 'trialing' ? 'info' : 'danger'}>
            {status === 'active' ? 'Active' : status === 'trialing' ? 'Trial' : status}
          </Badge>
        </div>
        {periodEnd && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-text-secondary">
              {cancelAtPeriodEnd ? 'Cancels on' : 'Next charge'}
            </p>
            <p className="text-sm text-text-primary">{formatDate(periodEnd)}</p>
          </div>
        )}
      </div>

      {plan === 'free' ? (
        <UpgradeButton
          plan="monthly"
          className="btn-primary mt-4 block text-center w-full"
        >
          ✨ Upgrade to Pro
        </UpgradeButton>
      ) : stripeCustomerId ? (
        <Button
          onClick={handlePortal}
          loading={loading}
          loadingText="Opening portal..."
          variant="outline"
          className="mt-4 w-full"
        >
          Manage subscription
        </Button>
      ) : null}
    </section>
  )
}
