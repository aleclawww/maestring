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
  const [portalError, setPortalError] = useState<string | null>(null)

  async function handlePortal() {
    setLoading(true)
    setPortalError(null)
    // Previously this treated any response as success: it destructured
    // `url` from `await res.json()` and only redirected `if (url)`, so a
    // 401/500/network failure silently reset the loading state and the
    // user saw nothing happen after clicking "Manage subscription".
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' })
      const body = (await res.json().catch(() => ({}))) as { url?: string; error?: string; message?: string }
      if (!res.ok || !body.url) {
        console.error('SubscriptionSettings portal failed', { status: res.status, body })
        setPortalError(
          body.message ??
            body.error ??
            `Couldn't open the billing portal (HTTP ${res.status}). Please try again.`
        )
        setLoading(false)
        return
      }
      window.location.href = body.url
    } catch (err) {
      console.error('SubscriptionSettings portal network error', err)
      setPortalError("Network error. Couldn't open the billing portal — please try again.")
      setLoading(false)
    }
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
        <>
          <Button
            onClick={handlePortal}
            loading={loading}
            loadingText="Opening portal..."
            variant="outline"
            className="mt-4 w-full"
          >
            Manage subscription
          </Button>
          {portalError && (
            <p className="mt-2 text-xs text-danger" role="alert">
              {portalError}
            </p>
          )}
        </>
      ) : null}
    </section>
  )
}
