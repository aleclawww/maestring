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

  // Get due count for display
  const { count: dueCount } = await supabase
    .from('user_concept_states')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .or('reps.eq.0,next_review_date.lte.' + new Date().toISOString())

  return (
    <StudySession
      userId={user.id}
      activeSessionId={activeSession?.id}
      dueCount={dueCount ?? 0}
    />
  )
}
