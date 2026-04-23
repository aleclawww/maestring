import { requireAuthenticatedUser } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import { ProfileSettings } from './components/ProfileSettings'
import { SubscriptionSettings } from './components/SubscriptionSettings'
import { NotificationSettings } from './components/NotificationSettings'
import { TestimonialForm } from './components/TestimonialForm'
import { DangerZone } from './components/DangerZone'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Settings' }

export default async function SettingsPage() {
  const user = await requireAuthenticatedUser()
  const supabase = createClient()

  const [{ data: profile }, { data: subscription }, { data: existingTestimonial }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('subscriptions').select('*').eq('user_id', user.id).single(),
    supabase
      .from('testimonials')
      .select('status, content, display_name, role')
      .eq('user_id', user.id)
      .order('submitted_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-8">
      <h1 className="text-xl font-bold text-text-primary">Settings</h1>

      <ProfileSettings
        userId={user.id}
        email={user.email ?? ''}
        fullName={profile?.full_name ?? ''}
        avatarUrl={profile?.avatar_url ?? ''}
      />

      <NotificationSettings userId={user.id} studyMinutesPerDay={profile?.study_minutes_per_day ?? 30} />

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

      <DangerZone userId={user.id} email={user.email ?? ''} />
    </div>
  )
}
