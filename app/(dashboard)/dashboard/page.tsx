/**
 * Dashboard home (v2 design).
 *
 * Same queries as the legacy page — preserves all behaviour:
 *   - profile (streak, XP, exam date, freezes, outcome)
 *   - get_user_stats RPC (avg accuracy, concepts mastered)
 *   - recent study_sessions
 *   - user_concept_states for due-count
 *   - get_exam_readiness_v2 RPC (readiness score)
 *   - user_learning_state for the FSRS phase
 *   - cognitive_fingerprint (calibration completion)
 *   - streak_freeze_log for "we saved your streak" toast
 *   - WhatsNext actions via buildNextActions()
 *   - SetupWarningBanner for env-config issues (dev only)
 *
 * Visuals fully rebuilt to v2 — colored shadows, indigo→violet brand,
 * warm light surfaces.
 */
import Link from 'next/link'
import {
  ArrowRight,
  Award,
  BookOpen,
  CheckCircle2,
  Clock,
  Flame,
  Gift,
  Lightbulb,
  Snowflake,
  Sparkles,
  Target,
  TrendingUp,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import {
  requireAuthenticatedUser,
  createClient,
} from '@/lib/supabase/server'
import { formatRelativeTime } from '@/lib/utils'
import { type ReadinessData } from '@/components/dashboard/ReadinessCard'
import { OutcomeCaptureBanner } from '@/components/dashboard/OutcomeCaptureBanner'
import { SetupWarningBanner } from '@/components/dashboard/SetupWarningBanner'
import { buildNextActions } from '@/components/dashboard/WhatsNext'
import { getSetupWarnings } from '@/lib/config-check'
import { logger } from '@/lib/logger'
import { CONCEPTS } from '@/lib/knowledge-graph/aws-saa'
import { THRESHOLDS } from '@/lib/learning-engine/transitions'
import type { Phase } from '@/lib/learning-engine/types'
import { FLAGS } from '@/lib/featureFlags'
import { computeJourneyPhase } from '@/lib/journey/compute'
import type { Metadata } from 'next'
import { Card, Pill, Eyebrow, Badge } from '@/components/v2'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Dashboard' }

export default async function DashboardPage() {
  const user = await requireAuthenticatedUser()
  const supabase = createClient()
  const setupWarnings = getSetupWarnings()

  const [
    { data: profile },
    { data: stats },
    { data: recentSessions },
    { data: domainStates },
    { data: readinessRows },
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select(
        'full_name, current_streak, total_xp, exam_target_date, onboarding_completed, exam_outcome, streak_freezes_available',
      )
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
      'dashboard: failed to read recent streak freezes — toast suppressed',
    )
  }

  const readiness = (readinessRows as ReadinessData[] | null)?.[0] ?? null
  const statsRow = stats?.[0]
  const dueCount =
    (domainStates ?? []).filter(
      (s) =>
        s.reps === 0 ||
        !s.next_review_date ||
        new Date(s.next_review_date) <= new Date(),
    ).length

  // ── What's Next inputs ──────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: ulsRow } = await (supabase
    .from('user_learning_state')
    .select('phase, ambient_exposures' as any) as any)
    .eq('user_id', user.id)
    .maybeSingle()
  const phase: Phase | null = (ulsRow?.phase as Phase) ?? null
  const ambientNeeded =
    phase === 'ambient'
      ? Math.max(
          0,
          THRESHOLDS.ambient.minExposures - ((ulsRow?.ambient_exposures as number) ?? 0),
        )
      : null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: fpRow } = await (supabase
    .from('profiles')
    .select('cognitive_fingerprint' as any) as any)
    .eq('id', user.id)
    .maybeSingle()
  const fpRaw = (fpRow?.cognitive_fingerprint ?? null) as
    | { v2_initialized_at?: string }
    | null
  const hasCalibration = Boolean(fpRaw && fpRaw.v2_initialized_at)

  const totalConcepts = CONCEPTS.length
  const seenIds = new Set((domainStates ?? []).map((s) => s.concept_id))
  const notSeenCount = totalConcepts - seenIds.size

  const nextActions = buildNextActions({
    hasCalibration,
    phase,
    dueCount,
    ambientNeeded: ambientNeeded ?? undefined,
    staleDomain: null,
    totalConcepts,
    notSeenCount,
  }).slice(0, 4)

  const daysToExam = profile?.exam_target_date
    ? Math.ceil(
        (new Date(profile.exam_target_date).getTime() - Date.now()) / 86400000,
      )
    : null

  // Mejora 1 — adaptive cold-start dashboard. Behind FF_ADAPTIVE_DASHBOARD.
  // `recentSessions` is fetched with .limit(3); we only use `>0` here, never
  // its raw length as a count. We pass sessionCount: 1 (vs 0) because
  // computeJourneyPhase only branches on ==0 vs >0 to decide pre_study.
  const hasCompletedSession = (recentSessions?.length ?? 0) > 0
  const journeyPhase = computeJourneyPhase({
    examTargetDate: profile?.exam_target_date ?? null,
    sessionCount: hasCompletedSession ? 1 : 0,
    examOutcome:
      (profile as { exam_outcome?: 'passed' | 'failed' | null } | null)
        ?.exam_outcome ?? null,
  })
  const adaptiveDashboardEnabled = FLAGS.ADAPTIVE_DASHBOARD(user.id)
  const adaptiveColdStart =
    adaptiveDashboardEnabled && !hasCompletedSession && dueCount === 0

  logger.debug(
    {
      userId: user.id,
      journeyPhase,
      hasCompletedSession,
      dueCount,
      flag: adaptiveDashboardEnabled,
    },
    'mejora1: dashboard adaptive context',
  )

  const firstName = profile?.full_name?.split(' ')[0] ?? 'Learner'
  const fullDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  const examOutcome =
    (profile as { exam_outcome?: string | null } | null)?.exam_outcome ?? null
  const needsOutcome =
    !!profile?.exam_target_date &&
    new Date(profile.exam_target_date).getTime() <= Date.now() &&
    Date.now() - new Date(profile.exam_target_date).getTime() <= 60 * 86400000 &&
    (examOutcome === null || examOutcome === 'unknown')

  const subhead = adaptiveColdStart
    ? daysToExam !== null && daysToExam > 0
      ? `${daysToExam} day${daysToExam === 1 ? '' : 's'} until your exam. Empecemos.`
      : 'Marca tu fecha de examen cuando la tengas. Empecemos.'
    : daysToExam !== null && daysToExam > 0
      ? `${daysToExam} day${daysToExam === 1 ? '' : 's'} until your exam${
          dueCount > 0 ? ` · ${dueCount} concepts due today` : ''
        }.`
      : dueCount > 0
        ? `${dueCount} concept${dueCount === 1 ? '' : 's'} ready to review.`
        : 'All caught up. New AI-generated questions surface as you advance.'

  return (
    <div className="space-y-10">
      {/* ── Header ────────────────────────────────────────────── */}
      <header>
        <p className="font-v2-mono text-[12px] uppercase tracking-v2-wide text-v2-foreground-subtle">
          {fullDate}
        </p>
        <h1 className="v2-display mt-2 text-[32px] sm:text-[36px]">
          Hi, <span className="v2-text-gradient">{firstName}.</span>
        </h1>
        <p className="mt-2 max-w-[600px] text-[15px] leading-[1.6] text-v2-foreground-muted">
          {subhead}
        </p>
      </header>

      {/* Setup warnings (dev) */}
      {setupWarnings.length > 0 && (
        <SetupWarningBanner warnings={setupWarnings} />
      )}

      {/* Outcome capture (post-exam date, no outcome yet) */}
      {needsOutcome && profile?.exam_target_date && (
        <OutcomeCaptureBanner examDate={profile.exam_target_date} />
      )}

      {/* ── Action card + side stack ───────────────────────────── */}
      <section className="grid grid-cols-1 gap-5 lg:grid-cols-[1.5fr_1fr]">
        {/* Big action card */}
        <Card padding="lg" className="relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-20 -top-20 h-60 w-60 rounded-full opacity-50 blur-3xl"
            style={{ background: 'var(--v2-gradient-brand-soft)' }}
          />

          <div className="relative">
            <Pill tone="brand" size="md">
              <Sparkles className="h-3 w-3" strokeWidth={2.5} />
              <span className="font-v2-mono text-[10px] uppercase tracking-v2-wide">
                Today's session
              </span>
            </Pill>

            <h2 className="v2-display mt-5 text-[28px] sm:text-[32px]">
              {adaptiveColdStart
                ? 'Empieza con tus primeros conceptos'
                : dueCount > 0
                  ? 'Ready to study?'
                  : 'Stay sharp.'}
            </h2>
            <p className="mt-2 max-w-[440px] text-[15px] leading-[1.6] text-v2-foreground-muted">
              {adaptiveColdStart
                ? 'Vamos paso a paso. Tu Readiness se calibrará tras tu primera sesión completa.'
                : dueCount > 0
                  ? `FSRS scheduled ${dueCount} concept${
                      dueCount === 1 ? '' : 's'
                    } for review. The window stays open until midnight CET.`
                  : 'No reviews due. Open Learn to advance into new concepts before your queue stacks up.'}
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/study"
                className={cn(
                  'inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-v2-gradient-brand px-5 text-[14px] font-semibold text-white shadow-v2-button transition-all hover:-translate-y-0.5 hover:shadow-v2-elevated',
                )}
              >
                {adaptiveColdStart
                  ? 'Comenzar primera sesión'
                  : dueCount > 0
                    ? `Start review · ${dueCount}`
                    : 'Open Learn'}
                <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
              </Link>
              <Link
                href="/learn"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-v2-border bg-v2-surface px-5 text-[14px] font-semibold text-v2-foreground transition-colors hover:bg-v2-surface-subtle"
              >
                Browse concepts
              </Link>
            </div>
          </div>
        </Card>

        {/* Side stack */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-1">
          {/* Streak */}
          <Card padding="lg">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-v2-warning-soft text-v2-warning">
                <Flame
                  className="h-6 w-6"
                  strokeWidth={2}
                  fill="currentColor"
                  fillOpacity={0.2}
                />
              </div>
              <div>
                <div className="font-v2-mono text-[11px] uppercase tracking-v2-wide text-v2-foreground-subtle">
                  Streak
                </div>
                <div className="text-[24px] font-bold text-v2-foreground">
                  {profile?.current_streak ?? 0} day
                  {(profile?.current_streak ?? 0) === 1 ? '' : 's'}
                </div>
              </div>
            </div>
            {(profile?.streak_freezes_available ?? 0) > 0 && (
              <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-v2-surface-subtle px-2.5 py-1 font-v2-mono text-[11px] font-semibold text-v2-foreground-muted">
                <Snowflake className="h-3 w-3" strokeWidth={2} />
                {profile?.streak_freezes_available} freeze
                {profile?.streak_freezes_available === 1 ? '' : 's'} available
              </div>
            )}
          </Card>

          {/* Readiness — mini */}
          {readiness ? (
            <Card padding="lg">
              <Eyebrow>Readiness</Eyebrow>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="v2-display text-[36px] leading-none">
                  {Math.round(readiness.score)}
                </span>
                <span className="text-[14px] text-v2-foreground-muted">
                  / 1000
                </span>
              </div>
              <p className="mt-2 text-[12px] leading-[1.5] text-v2-foreground-muted">
                Pass probability ~
                {Math.round(readiness.pass_probability * 100)}% ·
                {readiness.weakest_domain
                  ? ` weakest: ${readiness.weakest_domain}`
                  : ''}
              </p>
              <Link
                href="/progress"
                className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-v2-brand hover:text-v2-brand-hover"
              >
                Full breakdown
                <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.5} />
              </Link>
            </Card>
          ) : (
            <Card padding="lg">
              <Eyebrow>Readiness</Eyebrow>
              <p className="mt-4 text-[13px] leading-[1.55] text-v2-foreground-muted">
                Your exam-readiness estimate unlocks after your first study
                sessions. Answer 20–30 questions to calibrate.
              </p>
            </Card>
          )}
        </div>
      </section>

      {/* ── Recent freezes notice ──────────────────────────────── */}
      {recentFreezes && recentFreezes.length > 0 && (
        <Card
          padding="md"
          className="border-l-[3px] border-l-sky-500 bg-sky-50/60"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-700">
              <Snowflake className="h-4 w-4" strokeWidth={2.25} />
            </div>
            <div>
              <p className="text-[14px] font-semibold text-v2-foreground">
                A freeze saved your streak
              </p>
              <p className="mt-0.5 text-[12px] text-v2-foreground-muted">
                {recentFreezes.length === 1
                  ? `We covered ${new Date(recentFreezes[0]!.missed_date).toLocaleDateString()} automatically.`
                  : `We covered ${recentFreezes.length} days you missed. You have ${profile?.streak_freezes_available ?? 0} freezes left.`}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* ── What's next ────────────────────────────────────────── */}
      {nextActions.length > 0 && (
        <section>
          <Eyebrow>What's next</Eyebrow>
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {nextActions.map((a) => (
              <Link key={a.id} href={a.href} className="group block">
                <Card interactive className="h-full">
                  <div className="flex items-start gap-4">
                    <ActionIcon tone={a.tone} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] font-bold text-v2-foreground">
                        {a.title}
                      </p>
                      <p className="mt-1 text-[13px] leading-[1.5] text-v2-foreground-muted">
                        {a.reason}
                      </p>
                      <span className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-semibold text-v2-brand">
                        {a.cta}
                        <ArrowRight
                          className="h-3 w-3 transition-transform duration-200 ease-v2 group-hover:translate-x-0.5"
                          strokeWidth={2.5}
                        />
                      </span>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── Stats grid ─────────────────────────────────────────── */}
      <section>
        <Eyebrow>This month</Eyebrow>
        <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard
            Icon={Flame}
            tone="warning"
            label="Current streak"
            value={`${profile?.current_streak ?? 0}d`}
          />
          <StatCard
            Icon={Zap}
            tone="brand"
            label="Total XP"
            value={(profile?.total_xp ?? 0).toLocaleString()}
          />
          <StatCard
            Icon={Target}
            tone="success"
            label="Accuracy"
            value={`${Math.round((statsRow?.avg_accuracy ?? 0) * 100)}%`}
          />
          <StatCard
            Icon={Award}
            tone="success"
            label="Mastered"
            value={(statsRow?.concepts_mastered ?? 0).toString()}
          />
        </div>
      </section>

      {/* ── Recent sessions ────────────────────────────────────── */}
      {recentSessions && recentSessions.length > 0 && (
        <section>
          <div className="mb-5 flex items-end justify-between">
            <div>
              <Eyebrow>Recent sessions</Eyebrow>
              <h2 className="mt-2 text-[20px] font-bold tracking-v2-tight text-v2-foreground">
                Your last few studies
              </h2>
            </div>
            <Link
              href="/progress"
              className="text-[13px] font-semibold text-v2-brand hover:text-v2-brand-hover"
            >
              View all →
            </Link>
          </div>

          <Card padding="none" className="overflow-hidden">
            <ul className="divide-y divide-v2-border-subtle">
              {recentSessions.map((session) => {
                const accuracy =
                  session.concepts_studied > 0
                    ? Math.round(
                        (session.correct_count / session.concepts_studied) * 100,
                      )
                    : 0
                const accuracyTone =
                  accuracy >= 80
                    ? 'success'
                    : accuracy >= 60
                      ? 'warning'
                      : 'error'
                return (
                  <li
                    key={session.id}
                    className="flex items-center justify-between gap-4 px-5 py-4 sm:px-6"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-semibold capitalize text-v2-foreground">
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
                      <p className="mt-0.5 font-v2-mono text-[11px] text-v2-foreground-subtle">
                        {formatRelativeTime(session.created_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-v2-mono text-[12px] text-v2-foreground-muted">
                        {session.concepts_studied} q
                      </span>
                      <Badge tone={accuracyTone} size="sm">
                        {accuracy}%
                      </Badge>
                    </div>
                  </li>
                )
              })}
            </ul>
          </Card>
        </section>
      )}

      {/* ── Referral nudge ─────────────────────────────────────── */}
      {(recentSessions?.length ?? 0) > 0 && (
        <Link href="/referrals" className="group block">
          <Card
            interactive
            padding="md"
            className="border-l-[3px] border-l-v2-brand/60"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-v2-brand-soft text-v2-brand">
                  <Gift className="h-4 w-4" strokeWidth={2.25} />
                </div>
                <div>
                  <p className="text-[14px] font-bold text-v2-foreground">
                    Invite a friend — you both get 7 days of Pro
                  </p>
                  <p className="text-[12px] text-v2-foreground-muted">
                    Your unique link is waiting in Referrals.
                  </p>
                </div>
              </div>
              <ArrowRight
                className="h-4 w-4 shrink-0 text-v2-foreground-subtle transition-transform duration-200 ease-v2 group-hover:translate-x-1 group-hover:text-v2-brand"
                strokeWidth={2.25}
              />
            </div>
          </Card>
        </Link>
      )}

      {/* ── Quick actions ──────────────────────────────────────── */}
      <section>
        <Eyebrow>Jump to</Eyebrow>
        <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            {
              href: '/learn',
              label: 'Learn',
              desc: 'Read concept by concept',
              Icon: BookOpen,
            },
            {
              href: '/study',
              label: 'Quick session',
              desc: 'Review what is due',
              Icon: Zap,
            },
            {
              href: '/flashcards',
              label: 'Flashcards',
              desc: 'Drill the key facts',
              Icon: Lightbulb,
            },
            {
              href: '/exam',
              label: 'Mock exam',
              desc: '65 q · 130 min',
              Icon: Award,
            },
          ].map((action) => (
            <Link key={action.href} href={action.href} className="group block">
              <Card interactive className="h-full">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-v2-brand-soft text-v2-brand">
                  <action.Icon className="h-4 w-4" strokeWidth={2} />
                </div>
                <p className="mt-4 text-[14px] font-bold text-v2-foreground">
                  {action.label}
                </p>
                <p className="mt-0.5 text-[12px] text-v2-foreground-muted">
                  {action.desc}
                </p>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}

// ── Sub-components ───────────────────────────────────────────────────

function StatCard({
  Icon,
  tone,
  label,
  value,
}: {
  Icon: LucideIcon
  tone: 'brand' | 'warning' | 'success'
  label: string
  value: string
}) {
  const cls =
    tone === 'brand'
      ? 'bg-v2-brand-soft text-v2-brand'
      : tone === 'warning'
        ? 'bg-v2-warning-soft text-v2-warning'
        : 'bg-v2-success-soft text-v2-success'
  return (
    <Card padding="md">
      <div
        className={cn(
          'flex h-9 w-9 items-center justify-center rounded-lg',
          cls,
        )}
      >
        <Icon className="h-4 w-4" strokeWidth={2.25} />
      </div>
      <div className="mt-4 text-[24px] font-bold tabular-nums text-v2-foreground">
        {value}
      </div>
      <p className="mt-0.5 text-[12px] text-v2-foreground-muted">{label}</p>
    </Card>
  )
}

function ActionIcon({
  tone,
}: {
  tone: 'primary' | 'warning' | 'success' | 'info'
}) {
  const cls =
    tone === 'primary'
      ? 'bg-v2-brand-soft text-v2-brand'
      : tone === 'warning'
        ? 'bg-v2-warning-soft text-v2-warning'
        : tone === 'success'
          ? 'bg-v2-success-soft text-v2-success'
          : 'bg-sky-100 text-sky-700'
  const Icon =
    tone === 'success' ? CheckCircle2 : tone === 'warning' ? Clock : tone === 'info' ? TrendingUp : Sparkles
  return (
    <div
      className={cn(
        'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
        cls,
      )}
    >
      <Icon className="h-4 w-4" strokeWidth={2.25} />
    </div>
  )
}
