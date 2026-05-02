/**
 * Subscription gating helper.
 *
 * The product no longer has a no-card free tier — every user must either
 * be in an active 7-day trial or on a paid subscription to access the
 * dashboard. Public marketing routes, /onboarding, and the billing flow
 * itself stay open (defined in middleware.ts PUBLIC_PREFIXES).
 *
 * This helper lives in lib/ rather than middleware.ts because middleware
 * runs in the Edge runtime — `@supabase/supabase-js` plays nicer in the
 * Node runtime used by route handlers and server components.
 */

import { createAdminClient } from '@/lib/supabase/admin'

export type Entitlement =
  | { allowed: true; status: 'trialing' | 'active'; trialEnd: string | null; planLabel: 'pro' | 'team' }
  | { allowed: false; reason: 'no_subscription' | 'expired' | 'past_due' | 'canceled' }

/**
 * Returns whether the user has an active entitlement (trial or paid sub).
 * Reads the `subscriptions` table that's kept in sync by Stripe webhooks.
 */
export async function getEntitlement(userId: string): Promise<Entitlement> {
  const supabase = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase
    .from('subscriptions')
    .select('plan, status, current_period_end, trial_end' as any) as any)
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !data) return { allowed: false, reason: 'no_subscription' }

  const sub = data as {
    plan: 'free' | 'pro' | 'team'
    status: 'trialing' | 'active' | 'past_due' | 'canceled' | 'incomplete'
    current_period_end: string | null
    trial_end: string | null
  }

  if (sub.status === 'trialing') {
    return {
      allowed: true,
      status: 'trialing',
      trialEnd: sub.trial_end,
      planLabel: (sub.plan === 'team' ? 'team' : 'pro'),
    }
  }
  if (sub.status === 'active') {
    return {
      allowed: true,
      status: 'active',
      trialEnd: null,
      planLabel: (sub.plan === 'team' ? 'team' : 'pro'),
    }
  }
  if (sub.status === 'past_due') return { allowed: false, reason: 'past_due' }
  if (sub.status === 'canceled') return { allowed: false, reason: 'canceled' }
  return { allowed: false, reason: 'expired' }
}
