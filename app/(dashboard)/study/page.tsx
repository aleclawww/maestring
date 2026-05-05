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
    <div className="space-y-6">
      <header>
        <p className="font-v2-mono text-[12px] uppercase tracking-v2-wide text-v2-foreground-subtle">
          Study session
        </p>
        <h1 className="v2-display mt-2 text-[28px] sm:text-[32px]">
          {dueCount && dueCount > 0
            ? `${dueCount} concept${dueCount === 1 ? '' : 's'} ready`
            : 'Pick up where you left off'}
        </h1>
      </header>
      <StudySession
        userId={user.id}
        activeSessionId={activeSession?.id}
        dueCount={dueCount ?? 0}
      />
    </div>
  )
}
