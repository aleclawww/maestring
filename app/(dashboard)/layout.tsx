import { headers } from 'next/headers'
import { requireAuthenticatedUser } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/dashboard/Sidebar'
import { Navbar } from '@/components/dashboard/Navbar'
import type { SubscriptionPlan } from '@/types/database'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await requireAuthenticatedUser()
  const supabase = createClient()

  // Onboarding runs inside this route group but renders as a standalone wizard
  // — skip Sidebar/Navbar chrome so the user focuses on the flow.
  const pathname = headers().get('x-pathname') ?? ''
  const isOnboardingFlow = pathname === '/onboarding' || pathname.startsWith('/onboarding/')
  if (isOnboardingFlow) {
    return <>{children}</>
  }

  const [{ data: profile }, { data: subscription }] = await Promise.all([
    supabase
      .from('profiles')
      .select('full_name, avatar_url')
      .eq('id', user.id)
      .single(),
    supabase
      .from('subscriptions')
      .select('plan')
      .eq('user_id', user.id)
      .single(),
  ])

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar — hidden on mobile */}
      <div className="hidden lg:flex">
        <Sidebar
          userName={profile?.full_name}
          userAvatar={profile?.avatar_url}
          plan={(subscription?.plan ?? 'free') as SubscriptionPlan}
        />
      </div>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
