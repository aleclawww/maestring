import { requireAuthenticatedUser } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import { ProfileSettings } from './components/ProfileSettings'
import { SubscriptionSettings } from './components/SubscriptionSettings'
import { NotificationSettings } from './components/NotificationSettings'
import { TestimonialForm } from './components/TestimonialForm'
import { DangerZone } from './components/DangerZone'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Settings' }

export default async function SettingsPage() {
  const user = await requireAuthenticatedUser()
  const supabase = createClient()

  const [{ data: profile }, { data: subscription }, { data: existingTestimonial }] = await Promise.all([
    supabase.from('profiles').select('full_name, avatar_url, study_minutes_per_day, email_nudges_enabled').eq('id', user.id).single(),
    supabase.from('subscriptions').select('plan, status, stripe_customer_id, current_period_end, cancel_at_period_end').eq('user_id', user.id).single(),
    supabase
      .from('testimonials')
      .select('status, content, display_name, role')
      .eq('user_id', user.id)
      .order('submitted_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <header>
        <p className="font-v2-mono text-[12px] uppercase tracking-v2-wide text-v2-foreground-subtle">
          Account
        </p>
        <h1 className="v2-display mt-2 text-[32px] sm:text-[36px]">Settings</h1>
        <p className="mt-2 max-w-[560px] text-[15px] leading-[1.6] text-v2-foreground-muted">
          Profile, notifications, billing, and the door out. Changes save as you
          edit — no submit buttons unless you see one.
        </p>
      </header>

      <ProfileSettings
        userId={user.id}
        email={user.email ?? ''}
        fullName={profile?.full_name ?? ''}
        avatarUrl={profile?.avatar_url ?? ''}
      />

      <NotificationSettings
        userId={user.id}
        studyMinutesPerDay={profile?.study_minutes_per_day ?? 30}
        emailNudgesEnabled={profile?.email_nudges_enabled ?? true}
      />

      <TestimonialForm
        existing={existingTestimonial as { status: 'pending' | 'approved' | 'rejected'; content: string; display_name: string; role: string | null } | null}
        defaultName={profile?.full_name ? profile.full_name.split(' ')[0] + ' ' + (profile.full_name.split(' ')[1]?.[0] ?? '') + '.' : ''}
      />

      <SubscriptionSettings
        plan={subscription?.plan ?? 'free'}
        status={subscription?.status ?? 'active'}
        stripeCustomerId={subscription?.stripe_customer_id ?? null}
        periodEnd={subscription?.current_period_end ?? null}
        cancelAtPeriodEnd={subscription?.cancel_at_period_end ?? false}
      />

      <DangerZone email={user.email ?? ''} />
    </div>
  )
}
