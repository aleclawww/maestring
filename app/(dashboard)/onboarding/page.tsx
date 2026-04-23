import { redirect } from 'next/navigation'
import { requireAuthenticatedUser } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { OnboardingForm } from './OnboardingForm'

export const dynamic = 'force-dynamic'

export default async function OnboardingPage() {
  const user = await requireAuthenticatedUser()
  const supabase = createAdminClient()

  // Backfill reconciliation: if the profile says onboarding is already
  // complete but user_metadata was never mirrored (older accounts, migration
  // gap), mirror the flag now so middleware stops routing them here — then
  // bounce to /dashboard. One-time, idempotent.
  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarding_completed')
    .eq('id', user.id)
    .single()

  if (profile?.onboarding_completed && user.user_metadata?.['onboarding_completed'] !== true) {
    await supabase.auth.admin.updateUserById(user.id, {
      user_metadata: { ...(user.user_metadata ?? {}), onboarding_completed: true },
    })
    redirect('/dashboard')
  }

  if (profile?.onboarding_completed) {
    redirect('/dashboard')
  }

  const { data: domains } = await supabase
    .from('knowledge_domains')
    .select('id, slug, name, description, exam_weight_percent')
    .eq('certification_id', 'aws-saa-c03')
    .order('sort_order', { ascending: true })

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="rounded-2xl border border-border bg-surface overflow-hidden">
          <OnboardingForm domains={domains ?? []} />
        </div>
      </div>
    </div>
  )
}
