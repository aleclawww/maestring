import { headers } from 'next/headers'
import { requireAuthenticatedUser } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import type { SubscriptionPlan } from '@/types/database'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await requireAuthenticatedUser()
  const supabase = createClient()

  // Onboarding renders as a standalone wizard — skip all chrome.
  const pathname = headers().get('x-pathname') ?? ''
  const isOnboardingFlow = pathname === '/onboarding' || pathname.startsWith('/onboarding/')
  if (isOnboardingFlow) {
    return <>{children}</>
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
      {children}
    </DashboardShell>
  )
}
