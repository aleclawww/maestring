import { redirect } from 'next/navigation'
import { requireAuthenticatedUser } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'
import { OnboardingForm } from './OnboardingForm'

export const dynamic = 'force-dynamic'

export default async function OnboardingPage() {
  const user = await requireAuthenticatedUser()
  const supabase = createAdminClient()

  // Backfill reconciliation: if the profile says onboarding is already
  // complete but user_metadata was never mirrored (older accounts, migration
  // gap), mirror the flag now so middleware stops routing them here — then
  // bounce to /dashboard. One-time, idempotent.
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('onboarding_completed')
    .eq('id', user.id)
    .single()

  if (profileErr) {
    // Not fatal: if the profile read fails we fall through and render the
    // OnboardingForm. Worst case the user re-submits onboarding — annoying,
    // not a loop. But we need the log trail so ops can see RLS/DB hiccups
    // that flatten users through the reconciliation branch silently.
    logger.warn(
      { err: profileErr, userId: user.id },
      'Failed to read profile for onboarding reconciliation — rendering form'
    )
  }

  if (profile?.onboarding_completed && user.user_metadata?.['onboarding_completed'] !== true) {
    // Critical path: if this mirror-write fails silently, user_metadata stays
    // stale, middleware keeps bouncing the user back to /onboarding, the
    // profile check sends them to this branch again, and we tight-loop. A
    // thrown error is strictly better UX than an infinite redirect — the user
    // hits an error boundary they can report, not a dead URL that spins.
    const { error: mirrorErr } = await supabase.auth.admin.updateUserById(user.id, {
      user_metadata: { ...(user.user_metadata ?? {}), onboarding_completed: true },
    })
    if (mirrorErr) {
      logger.error(
        { err: mirrorErr, userId: user.id },
        'Failed to mirror onboarding_completed to user_metadata — aborting redirect to prevent middleware loop'
      )
      throw new Error('Onboarding reconciliation failed')
    }
    redirect('/dashboard')
  }

  if (profile?.onboarding_completed) {
    redirect('/dashboard')
  }

  const { data: domains, error: domainsErr } = await supabase
    .from('knowledge_domains')
    .select('id, slug, name, description, exam_weight_percent')
    .eq('certification_id', 'aws-saa-c03')
    .order('sort_order', { ascending: true })

  if (domainsErr) {
    // Fail-soft: the form handles `[]` gracefully. But without a log we never
    // learn that onboarding is silently domain-less for every affected user.
    logger.warn(
      { err: domainsErr, userId: user.id },
      'Failed to load knowledge_domains for onboarding — rendering with empty list'
    )
  }

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
