import { requireAuthenticatedUser } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { StudySession } from './components/StudySession'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Study Session' }

export default async function StudyPage() {
  const user = await requireAuthenticatedUser()
  const supabase = createClient()

  // Check for active session. Silent failure here rendered StudySession with
  // `activeSessionId={undefined}` — the client then POSTed /api/study/session
  // to create a new session, orphaning the existing active one. The server
  // route abandons stale actives (session/route.ts:54) so it cleaned up, but
  // the user lost mid-session progress they could have resumed. Log warn so
  // support tickets about "I lost my session" get a trail.
  const { data: activeSession, error: activeSessionErr } = await supabase
    .from('study_sessions')
    .select('id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (activeSessionErr) {
    logger.warn(
      { err: activeSessionErr, userId: user.id },
      'study/page: failed to read active session — rendering as if no active session (user may lose resume)'
    )
  }

  // Get due count + plan in one parallel batch
  const [{ count: dueCount }, { data: sub }] = await Promise.all([
    supabase
      .from('user_concept_states')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .or('reps.eq.0,next_review_date.lte.' + new Date().toISOString()),
    supabase
      .from('subscriptions')
      .select('plan, status')
      .eq('user_id', user.id)
      .maybeSingle(),
  ])

  const hasPro =
    sub?.plan === 'pro' || sub?.plan === 'pro_annual'
      ? sub.status === 'active' || sub.status === 'trialing'
      : false

  return (
    <StudySession
      userId={user.id}
      activeSessionId={activeSession?.id}
      dueCount={dueCount ?? 0}
      hasPro={hasPro}
    />
  )
}
