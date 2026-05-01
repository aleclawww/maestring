import { requireAuthenticatedUser } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { formatRelativeTime } from '@/lib/utils'
import { ReadinessCard, type ReadinessData } from '@/components/dashboard/ReadinessCard'
import { OutcomeCaptureBanner } from '@/components/dashboard/OutcomeCaptureBanner'
import { StreakMilestoneTracker } from '@/components/dashboard/StreakMilestoneTracker'
import { logger } from '@/lib/logger'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Dashboard' }

export default async function DashboardPage() {
  const user = await requireAuthenticatedUser()
  const supabase = createClient()

  const [
    { data: profile },
    { data: stats },
    { data: recentSessions },
    { data: domainStates },
    { data: readinessRows },
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('full_name, current_streak, total_xp, exam_target_date, onboarding_completed, exam_outcome, streak_freezes_available')
      .eq('id', user.id)
      .single(),
    supabase.rpc('get_user_stats', { p_user_id: user.id }),
    supabase
      .from('study_sessions')
      .select('id, mode, created_at, concepts_studied, correct_count')
      .eq('user_id', user.id)
      .eq('is_completed', true)
      .order('created_at', { ascending: false })
      .limit(3),
    supabase
      .from('user_concept_states')
      .select('state, reps, lapses, concept_id, next_review_date')
      .eq('user_id', user.id),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    supabase.rpc('get_exam_readiness_v2' as any, { p_user_id: user.id }),
  ])

  // Auto-used freezes in the last 7 days — for the "saved your streak" toast.
  // Silent failure here suppressed the toast entirely: the dashboard renders
  // as if nothing happened, the user never learns their streak was saved, and
  // the freezes_available counter silently drops. Cosmetic, but it matters
  // for the retention loop — log warn so support can correlate "my streak
  // counter dropped and I saw no toast" reports.
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const { data: recentFreezes, error: freezesErr } = await supabase
    .from('streak_freeze_log')
    .select('missed_date, spent_at')
    .eq('user_id', user.id)
    .gte('spent_at', sevenDaysAgo)
    .order('spent_at', { ascending: false })
    .limit(3)
  if (freezesErr) {
    logger.warn(
      { err: freezesErr, userId: user.id },
      'dashboard: failed to read recent streak freezes — toast suppressed'
    )
  }

  const readiness = (readinessRows as ReadinessData[] | null)?.[0] ?? null

  const statsRow = stats?.[0]
  const dueCount =
    (domainStates ?? []).filter(
      s => s.reps === 0 || !s.next_review_date || new Date(s.next_review_date) <= new Date()
    ).length

  const daysToExam = profile?.exam_target_date
    ? Math.ceil(
        (new Date(profile.exam_target_date).getTime() - Date.now()) / 86400000
      )
    : null

  const firstName = profile?.full_name?.split(' ')[0] ?? 'Learner'

  // Outcome capture: exam date has passed and we still don't know the result.
  // Show the banner above everything else — that's the most important action today.
  const examOutcome = (profile as { exam_outcome?: string | null } | null)?.exam_outcome ?? null
  const needsOutcome =
    !!profile?.exam_target_date &&
    new Date(profile.exam_target_date).getTime() <= Date.now() &&
    Date.now() - new Date(profile.exam_target_date).getTime() <= 60 * 86400000 &&
    (examOutcome === null || examOutcome === 'unknown')

  return (
    <div className="p-6 space-y-6">
      <StreakMilestoneTracker streakDays={profile?.current_streak ?? 0} />
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">
          Hi, {firstName} 👋
        </h1>
        <p className="text-text-secondary mt-1">
          {daysToExam !== null && daysToExam > 0
            ? `${daysToExam} days until your exam. Let's go!`
            : 'Continue your AWS SAA-C03 prep.'}
        </p>
      </div>

      {/* Outcome capture banner — higher priority than readiness score */}
      {needsOutcome && profile?.exam_target_date && (
        <OutcomeCaptureBanner examDate={profile.exam_target_date} />
      )}

      {/* Readiness Score — placeholder for new users with no computed score yet */}
      {readiness && !needsOutcome && <ReadinessCard data={readiness} />}
      {!readiness && !needsOutcome && (
        <Card className="border-dashed">
          <CardContent className="py-6">
            <div className="flex items-start gap-4">
              <span className="text-3xl flex-shrink-0">📊</span>
              <div>
                <p className="text-sm font-semibold text-text-primary">Readiness Score appears after ~30 questions</p>
                <p className="text-xs text-text-muted mt-1 leading-relaxed">
                  The algorithm needs 2–3 sessions to calibrate your weak spots before the prediction is reliable.
                  Run your first session and the score will start tracking your trajectory to your exam date.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Card */}
      <Card className="border-primary/30 bg-gradient-to-r from-primary/10 to-transparent">
        <CardContent className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm text-text-muted mb-1">
              {dueCount > 0 ? `${dueCount} concepts ready to review` : !readiness ? 'First session starts here' : 'No pending reviews'}
            </p>
            <h2 className="text-lg font-bold text-text-primary">
              {dueCount > 0 ? 'Time to study' : !readiness ? 'Start your first session' : 'All caught up!'}
            </h2>
            {!readiness && (
              <p className="text-xs text-text-muted mt-1">6 minutes · the algorithm calibrates as you answer</p>
            )}
          </div>
          <Link href="/study" className="btn-primary flex-shrink-0">
            {dueCount > 0 ? `Study (${dueCount})` : !readiness ? 'Begin →' : 'Explore more'}
          </Link>
        </CardContent>
      </Card>

      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          {
            label: 'Current streak',
            value: `${profile?.current_streak ?? 0} days`,
            icon: '🔥',
            color: 'text-warning',
            subtitle: `🧊 ${profile?.streak_freezes_available ?? 0} freezes`,
          },
          {
            label: 'Total XP',
            value: (profile?.total_xp ?? 0).toLocaleString(),
            icon: '⭐',
            color: 'text-primary',
          },
          {
            label: 'Accuracy',
            value: `${Math.round((statsRow?.avg_accuracy ?? 0) * 100)}%`,
            icon: '🎯',
            color: 'text-success',
          },
          {
            label: 'Concepts mastered',
            value: (statsRow?.concepts_mastered ?? 0).toString(),
            icon: '🏆',
            color: 'text-success',
          },
        ].map(stat => (
          <Card key={stat.label}>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">{stat.icon}</span>
                <span className={`text-xl font-bold ${stat.color}`}>{stat.value}</span>
              </div>
              <p className="text-xs text-text-muted">{stat.label}</p>
              {'subtitle' in stat && stat.subtitle && (
                <p className="text-[11px] text-text-muted mt-0.5">{stat.subtitle}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {recentFreezes && recentFreezes.length > 0 && (
        <Card className="border-sky-500/30 bg-sky-500/5">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <span className="text-xl">🧊</span>
              <div>
                <p className="text-sm font-semibold text-sky-400">
                  A freeze saved your streak
                </p>
                <p className="text-xs text-text-muted mt-0.5">
                  {recentFreezes.length === 1
                    ? `We covered ${new Date(recentFreezes[0]!.missed_date).toLocaleDateString()} automatically.`
                    : `We covered ${recentFreezes.length} days you missed. You have ${profile?.streak_freezes_available ?? 0} freezes left.`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Sessions */}
      {recentSessions && recentSessions.length > 0 && (
        <Card>
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <h2 className="text-sm font-semibold text-text-primary">Recent sessions</h2>
            <Link href="/progress" className="text-xs text-primary hover:underline">
              View all
            </Link>
          </div>
          <div className="divide-y divide-border">
            {recentSessions.map(session => {
              const accuracy =
                session.concepts_studied > 0
                  ? Math.round((session.correct_count / session.concepts_studied) * 100)
                  : 0
              return (
                <div key={session.id} className="flex items-center justify-between px-6 py-3">
                  <div>
                    <p className="text-sm font-medium text-text-primary capitalize">
                      {session.mode === 'discovery'
                        ? 'Discovery'
                        : session.mode === 'review'
                        ? 'Review'
                        : session.mode === 'intensive'
                        ? 'Intensive'
                        : session.mode === 'exploration'
                        ? 'Exploration'
                        : 'Maintenance'}
                    </p>
                    <p className="text-xs text-text-muted">
                      {formatRelativeTime(session.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={accuracy >= 80 ? 'success' : accuracy >= 60 ? 'warning' : 'danger'}>
                      {accuracy}%
                    </Badge>
                    <span className="text-xs text-text-muted">
                      {session.concepts_studied} questions
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* Referral nudge — only shown once the user has completed at least
          one session, so brand-new signups aren't asked to share yet. */}
      {(recentSessions?.length ?? 0) > 0 && (
        <Link href="/referrals">
          <Card hover className="border-primary/30 bg-gradient-to-r from-primary/5 to-transparent">
            <CardContent className="flex items-center justify-between py-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🎁</span>
                <div>
                  <p className="text-sm font-semibold text-text-primary">
                    Invite a friend — you both get 7 days of Pro
                  </p>
                  <p className="text-xs text-text-muted">
                    Your unique link is waiting in Referrals.
                  </p>
                </div>
              </div>
              <span className="text-xs text-primary">View →</span>
            </CardContent>
          </Card>
        </Link>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {[
          { href: '/study', label: 'Quick session', desc: 'Review due concepts', icon: '⚡' },
          { href: '/exam', label: 'Mock exam', desc: '65 questions, 130 min', icon: '📝' },
          { href: '/documents', label: 'Upload PDF', desc: 'Turn your notes into questions', icon: '📤' },
        ].map(action => (
          <Link key={action.href} href={action.href}>
            <Card hover className="h-full">
              <CardContent className="pt-4">
                <span className="text-2xl">{action.icon}</span>
                <p className="mt-2 text-sm font-semibold text-text-primary">{action.label}</p>
                <p className="text-xs text-text-muted">{action.desc}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
