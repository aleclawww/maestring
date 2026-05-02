/**
 * Engagement-gated subscription model.
 *
 * 4 entitlement kinds:
 *
 *   exploring  — new user without a Stripe subscription. Full feature access
 *                up to the FREE_PREVIEW limits below. No card required yet.
 *                The Coach + Calibration + first 20 questions are designed
 *                as the demo; once the user is hooked they hit the paywall.
 *
 *   trialing   — has a Stripe subscription with status='trialing'. Full
 *                access. Card on file, $0 charged, auto-converts on day 8.
 *
 *   active     — has a Stripe subscription with status='active'. Full
 *                access. Paying $19/mo.
 *
 *   gated      — exhausted the exploring quota AND no active subscription
 *                (or sub is past_due / canceled / expired). Layout redirects
 *                to /trial-required.
 *
 * Counts come from existing tables: question_attempts row count for the
 * user, plus user_learning_state.ambient_exposures + anchoring_responses.
 * No new schema required.
 */

import { createAdminClient } from '@/lib/supabase/admin'

// Engagement budget for the exploring state. Tuned so the user completes
// calibration → ambient + first retrieval cycle and just begins to feel the
// FSRS scheduling kick in before being asked for the card.
export const FREE_PREVIEW = {
  questions: 20,
  ambient: 10,
  anchoring: 1,
} as const

export interface UsageSnapshot {
  questions: number
  ambient: number
  anchoring: number
}

export type Entitlement =
  | { kind: 'trialing'; trialEnd: string | null; planLabel: 'pro' | 'team' }
  | { kind: 'active'; planLabel: 'pro' | 'team' }
  | { kind: 'exploring'; usage: UsageSnapshot; limits: typeof FREE_PREVIEW }
  | { kind: 'gated'; reason: 'preview_exhausted' | 'past_due' | 'canceled' | 'expired'; usage?: UsageSnapshot }

/** True when this entitlement allows access to the dashboard at all. */
export function isAllowed(e: Entitlement): boolean {
  return e.kind === 'trialing' || e.kind === 'active' || e.kind === 'exploring'
}

/** True when the user has reached the soft cap on a specific feature. */
export function overCap(usage: UsageSnapshot): boolean {
  return (
    usage.questions >= FREE_PREVIEW.questions ||
    usage.ambient >= FREE_PREVIEW.ambient ||
    usage.anchoring >= FREE_PREVIEW.anchoring
  )
}

export async function getEntitlement(userId: string): Promise<Entitlement> {
  const supabase = createAdminClient()

  // 1) Stripe-side subscription state.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: subData } = await (supabase
    .from('subscriptions')
    .select('plan, status, current_period_end, trial_end' as any) as any)
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const sub = subData as
    | { plan: 'free' | 'pro' | 'team'; status: string; trial_end: string | null }
    | null

  if (sub?.status === 'trialing') {
    return { kind: 'trialing', trialEnd: sub.trial_end, planLabel: sub.plan === 'team' ? 'team' : 'pro' }
  }
  if (sub?.status === 'active') {
    return { kind: 'active', planLabel: sub.plan === 'team' ? 'team' : 'pro' }
  }
  if (sub?.status === 'past_due') return { kind: 'gated', reason: 'past_due' }
  // Don't auto-gate on `canceled` if the user is mid-preview — they may have
  // canceled a previous trial and still have engagement budget left.

  // 2) Usage tally for the exploring state.
  const usage = await tallyUsage(userId)

  if (sub?.status === 'canceled' && overCap(usage)) {
    return { kind: 'gated', reason: 'canceled', usage }
  }

  if (overCap(usage)) {
    return { kind: 'gated', reason: 'preview_exhausted', usage }
  }

  return { kind: 'exploring', usage, limits: FREE_PREVIEW }
}

async function tallyUsage(userId: string): Promise<UsageSnapshot> {
  const supabase = createAdminClient()

  const [attemptsRes, ulsRes] = await Promise.all([
    supabase
      .from('question_attempts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('user_learning_state').select('ambient_exposures, anchoring_responses' as any) as any)
      .eq('user_id', userId)
      .maybeSingle(),
  ])

  const questions = attemptsRes.count ?? 0
  const ulsRow = ulsRes.data as { ambient_exposures?: number; anchoring_responses?: number } | null
  return {
    questions,
    ambient: ulsRow?.ambient_exposures ?? 0,
    anchoring: ulsRow?.anchoring_responses ?? 0,
  }
}
