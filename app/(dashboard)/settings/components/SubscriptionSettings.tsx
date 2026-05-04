'use client'

import { useState } from 'react'
import { ArrowRight, Sparkles } from 'lucide-react'
import { UpgradeButton } from '@/components/billing/UpgradeButton'
import { formatDate, cn } from '@/lib/utils'
import { Card, Badge, Button, Eyebrow } from '@/components/v2'
import { buttonVariants } from '@/components/v2/Button'
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
    try {
      const res = await fetch('/api/lemonsqueezy/portal', { method: 'POST' })
      const body = (await res.json().catch(() => ({}))) as {
        url?: string
        error?: string
        message?: string
      }
      if (!res.ok || !body.url) {
        console.error('SubscriptionSettings portal failed', {
          status: res.status,
          body,
        })
        setPortalError(
          body.message ??
            body.error ??
            `Couldn't open the billing portal (HTTP ${res.status}). Please try again.`,
        )
        setLoading(false)
        return
      }
      try {
        const parsed = new URL(body.url)
        const ok =
          parsed.protocol === 'https:' &&
          (parsed.hostname.endsWith('.lemonsqueezy.com') ||
            parsed.hostname === 'lemonsqueezy.com')
        if (!ok) throw new Error('unexpected hostname')
      } catch {
        console.error('SubscriptionSettings: portal URL failed origin check', {
          url: body.url,
        })
        setPortalError('Unexpected portal response. Please try again.')
        setLoading(false)
        return
      }
      window.location.href = body.url
    } catch (err) {
      console.error('SubscriptionSettings portal network error', err)
      setPortalError(
        "Network error. Couldn't open the billing portal — please try again.",
      )
      setLoading(false)
    }
  }

  const planLabel =
    plan === 'free'
      ? 'Free'
      : plan === 'pro_annual'
        ? 'Pro Annual'
        : plan === 'enterprise'
          ? 'Enterprise'
          : 'Pro'

  const statusTone =
    status === 'active'
      ? 'success'
      : status === 'trialing'
        ? 'brand'
        : 'error'
  const statusLabel =
    status === 'active'
      ? 'Active'
      : status === 'trialing'
        ? 'Trial'
        : status

  return (
    <section>
      <Eyebrow>Subscription</Eyebrow>

      <Card padding="lg" className="mt-3 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-[14px] font-semibold text-v2-foreground">
            Current plan
          </p>
          <Badge tone={plan === 'free' ? 'neutral' : 'brand'} size="md">
            {planLabel}
          </Badge>
        </div>
        <div className="flex items-center justify-between border-t border-v2-border-subtle pt-4">
          <p className="text-[14px] text-v2-foreground-muted">Status</p>
          <Badge tone={statusTone} size="md">
            {statusLabel}
          </Badge>
        </div>
        {periodEnd && (
          <div className="flex items-center justify-between border-t border-v2-border-subtle pt-4">
            <p className="text-[14px] text-v2-foreground-muted">
              {cancelAtPeriodEnd ? 'Cancels on' : 'Next charge'}
            </p>
            <p className="font-v2-mono text-[13px] font-semibold text-v2-foreground">
              {formatDate(periodEnd)}
            </p>
          </div>
        )}
      </Card>

      {plan === 'free' ? (
        <div className="mt-4">
          <UpgradeButton
            plan="monthly"
            className={cn(
              buttonVariants({ variant: 'primary', size: 'lg' }),
              'w-full',
            )}
          >
            <Sparkles className="h-4 w-4" strokeWidth={2.25} />
            Upgrade to Pro
            <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
          </UpgradeButton>
        </div>
      ) : stripeCustomerId ? (
        <div className="mt-4">
          <Button
            onClick={handlePortal}
            loading={loading}
            variant="secondary"
            size="lg"
            className="w-full"
          >
            {loading ? 'Opening portal…' : 'Manage subscription'}
          </Button>
          {portalError && (
            <p
              role="alert"
              className="mt-2 text-[12px] font-medium text-v2-error"
            >
              {portalError}
            </p>
          )}
        </div>
      ) : (
        <Card padding="md" className="mt-4 bg-v2-surface-subtle">
          <p className="text-[13px] leading-[1.55] text-v2-foreground-muted">
            Your plan is managed by your organisation.{' '}
            <a
              href="mailto:support@maestring.com"
              className="font-semibold text-v2-brand hover:text-v2-brand-hover"
            >
              Contact support
            </a>{' '}
            to make changes.
          </p>
        </Card>
      )}
    </section>
  )
}
