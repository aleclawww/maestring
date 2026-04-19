import { requireAuthenticatedUser } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import { StudySession } from './components/StudySession'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Sesión de Estudio' }

export default async function StudyPage() {
  const user = await requireAuthenticatedUser()
  const supabase = createClient()

  // Check for active session
  const { data: activeSession } = await supabase
    .from('study_sessions')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // Get due count for display
  const { count: dueCount } = await supabase
    .from('user_concept_states')
    .select('*', { count: 'exact', head: true })
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
