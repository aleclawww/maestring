import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { requireAuthenticatedUser } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { TrialBanner } from '@/components/billing/TrialBanner'
import { PreviewBanner } from '@/components/billing/PreviewBanner'
import { getEntitlement } from '@/lib/subscription/check'
import type { SubscriptionPlan } from '@/types/database'

// Routes inside the (dashboard) group that should NOT enforce the trial
// paywall (so the user can complete onboarding, see the paywall itself,
// and reach Settings → Billing to fix a payment issue).
const PAYWALL_EXEMPT_PREFIXES = [
  '/onboarding',
  '/trial-required',
  '/settings',
]

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await requireAuthenticatedUser()
  const supabase = createClient()

  const pathname = headers().get('x-pathname') ?? ''
  const isOnboardingFlow = pathname === '/onboarding' || pathname.startsWith('/onboarding/')
  if (isOnboardingFlow) return <>{children}</>

  // Subscription gate: every user needs an active 7-day trial or paid sub.
  // /trial-required is the paywall page itself; /settings hosts billing
  // portal so a past_due user can update their card.
  const isExempt = PAYWALL_EXEMPT_PREFIXES.some(p => pathname === p || pathname.startsWith(p + '/'))
  let trialEnd: string | null = null
  let trialCancelAtEnd = false
  let previewUsage: { questions: number; ambient: number; anchoring: number } | null = null
  if (!isExempt) {
    const ent = await getEntitlement(user.id)
    if (ent.kind === 'gated') redirect('/trial-required')
    if (ent.kind === 'trialing') {
      trialEnd = ent.trialEnd
      trialCancelAtEnd = ent.cancelAtPeriodEnd
    }
    if (ent.kind === 'exploring') previewUsage = ent.usage
  }

  const [{ data: profile }, { data: subscription }] = await Promise.all([
    supabase.from('profiles').select('full_name, avatar_url').eq('id', user.id).single(),
    supabase.from('subscriptions').select('plan').eq('user_id', user.id).single(),
  ])

  return (
    <DashboardShell
      userName={profile?.full_name}
      userAvatar={profile?.avatar_url}
      plan={(subscription?.plan ?? 'free') as SubscriptionPlan}
    >
      {trialEnd && <TrialBanner trialEnd={trialEnd} cancelAtPeriodEnd={trialCancelAtEnd} />}
      {previewUsage && <PreviewBanner usage={previewUsage} />}
      {children}
    </DashboardShell>
  )
}
