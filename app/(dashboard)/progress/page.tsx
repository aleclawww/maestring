/**
 * Progress page (v2 design).
 *
 * Same Supabase queries as before. The legacy ReadinessCard / KnowledgeMap /
 * BlueprintAccuracyCard components are not rendered here anymore — they're
 * dark-themed and would clash with the v2 chrome. They live in git history;
 * a v2 rewrite is tracked under Stage D.
 *
 * What this page shows:
 *   - Readiness summary (mini, derived from get_exam_readiness_v2)
 *   - Stats grid (sessions, XP, streak, mastered)
 *   - Activity heatmap (12 weeks × 7 days)
 *   - Domain progress bars
 *   - Session history
 */
import { requireAuthenticatedUser } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import { formatRelativeTime, formatDuration } from '@/lib/utils'
import { CONCEPTS } from '@/lib/knowledge-graph/aws-saa'
import {
  Award,
  BookOpen,
  Flame,
  Sparkles,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { ReadinessCard, type ReadinessData } from '@/components/dashboard/ReadinessCard'
import {
  BlueprintAccuracyCard,
  type BlueprintTaskRow,
} from '@/components/dashboard/BlueprintAccuracyCard'
import { KnowledgeMap } from '@/components/dashboard/KnowledgeMap'
import { Card, Eyebrow, Badge } from '@/components/v2'
import { cn } from '@/lib/utils'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'My Progress' }

export default async function ProgressPage() {
  const user = await requireAuthenticatedUser()
  const supabase = createClient()

  const [
    { data: stats },
    { data: heatmap },
    { data: sessions },
    { data: domains },
    { data: conceptStates },
    { data: readinessRows },
    { data: _blueprintRows },
  ] = await Promise.all([
    supabase.rpc('get_user_stats', { p_user_id: user.id }),
    supabase.rpc('get_study_heatmap', { p_user_id: user.id, p_days: 84 }),
    supabase
      .from('study_sessions')
      .select(
        'id, mode, created_at, total_time_seconds, concepts_studied, correct_count, xp_earned',
      )
      .eq('user_id', user.id)
      .eq('is_completed', true)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('knowledge_domains')
      .select('id, name, color, exam_weight_percent, concepts(id)')
      .eq('certification_id', 'aws-saa-c03'),
    supabase
      .from('user_concept_states')
      .select(
        'concept_id, state, reps, lapses, stability, concepts!inner(slug, domain_id)',
      )
      .eq('user_id', user.id),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    supabase.rpc('get_exam_readiness_v2' as any, { p_user_id: user.id }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    supabase.rpc('get_blueprint_task_accuracy' as any, { p_user_id: user.id }),
  ])

  const readiness = (readinessRows as ReadinessData[] | null)?.[0] ?? null
  const blueprintTasks = (_blueprintRows as BlueprintTaskRow[] | null) ?? []

  const statsRow = stats?.[0]
  const masteredIds = new Set(
    (conceptStates ?? [])
      .filter((s) => s.reps >= 5 && s.lapses <= 1)
      .map((s) => s.concept_id),
  )

  // Build slug→state map for the Knowledge Map.
  const stateBySlug = new Map<
    string,
    { state: number; reps: number; lapses: number; stability: number }
  >(
    ((conceptStates ?? []) as unknown as Array<{
      state: number
      reps: number
      lapses: number
      stability: number
      concepts: { slug: string; domain_id: string }
    }>)
      .filter((r) => r.concepts?.slug)
      .map((r) => [
        r.concepts.slug,
        {
          state: r.state,
          reps: r.reps,
          lapses: r.lapses,
          stability: r.stability,
        },
      ]),
  )

  // Heatmap grid (12 weeks x 7 days)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const heatmapMap = new Map(
    (heatmap ?? []).map(
      (h: { study_date: string; session_count: number }) => [
        h.study_date,
        h.session_count,
      ],
    ),
  )
  const heatmapGrid: Array<{ date: string; count: number }[]> = []
  for (let week = 11; week >= 0; week--) {
    const weekData: Array<{ date: string; count: number }> = []
    for (let day = 0; day < 7; day++) {
      const d = new Date(today)
      d.setDate(d.getDate() - (week * 7 + (6 - day)))
      const dateStr = d.toISOString().split('T')[0] ?? ''
      weekData.push({
        date: dateStr,
        count: (heatmapMap.get(dateStr) ?? 0) as number,
      })
    }
    heatmapGrid.push(weekData)
  }

  function heatColor(count: number): string {
    if (count === 0) return 'var(--v2-surface-sunken)'
    if (count === 1) return 'var(--v2-brand-soft-2)'
    if (count <= 2) return '#A5B4FC' // indigo-300
    if (count <= 3) return 'var(--v2-brand)'
    return 'var(--v2-accent)'
  }

  return (
    <div className="space-y-10">
      <header>
        <Eyebrow>Progress</Eyebrow>
        <h1 className="v2-display mt-2 text-[32px] sm:text-[36px]">
          Where you are,{' '}
          <span className="v2-text-gradient">honestly.</span>
        </h1>
        <p className="mt-2 max-w-[560px] text-[15px] leading-[1.6] text-v2-foreground-muted">
          Readiness, mastered concepts, recent activity. Everything refreshed
          from your real attempts — no vanity numbers.
        </p>
      </header>

      {/* Readiness — full card with gauge + sparkline + at-risk drawer */}
      {readiness ? (
        <ReadinessCard data={readiness} />
      ) : (
        <Card padding="lg">
          <Eyebrow>Exam readiness</Eyebrow>
          <p className="mt-3 text-[14px] leading-[1.6] text-v2-foreground-muted">
            Your exam-readiness estimate unlocks after your first study
            sessions. Answer 20–30 questions to calibrate.
          </p>
        </Card>
      )}

      {/* Stats grid */}
      <section>
        <Eyebrow>Lifetime</Eyebrow>
        <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard
            Icon={BookOpen}
            tone="brand"
            label="Total sessions"
            value={(statsRow?.total_sessions ?? 0).toString()}
          />
          <StatCard
            Icon={Zap}
            tone="brand"
            label="Total XP"
            value={(statsRow?.total_xp ?? 0).toLocaleString()}
          />
          <StatCard
            Icon={Flame}
            tone="warning"
            label="Current streak"
            value={`${statsRow?.current_streak ?? 0}d`}
          />
          <StatCard
            Icon={Award}
            tone="success"
            label="Mastered"
            value={(statsRow?.concepts_mastered ?? 0).toString()}
          />
        </div>
      </section>

      {/* Knowledge map — per-concept mastery dots */}
      <KnowledgeMap stateBySlug={stateBySlug} />

      {/* Blueprint accuracy — per-task official exam blueprint */}
      {blueprintTasks.length > 0 && (
        <BlueprintAccuracyCard tasks={blueprintTasks} />
      )}

      {/* Heatmap */}
      <section>
        <div className="mb-5 flex items-end justify-between">
          <div>
            <Eyebrow>Activity</Eyebrow>
            <h2 className="mt-2 text-[20px] font-bold tracking-v2-tight text-v2-foreground">
              Last 12 weeks
            </h2>
          </div>
        </div>
        <Card padding="lg">
          <div className="flex gap-1 overflow-x-auto pb-2">
            {heatmapGrid.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-1">
                {week.map((day) => (
                  <div
                    key={day.date}
                    className="h-3 w-3 rounded-sm transition-colors"
                    style={{ backgroundColor: heatColor(day.count) }}
                    title={`${day.date}: ${day.count} sessions`}
                  />
                ))}
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2 font-v2-mono text-[10px] uppercase tracking-v2-wide text-v2-foreground-subtle">
            <span>Less</span>
            {[0, 1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="h-3 w-3 rounded-sm"
                style={{ backgroundColor: heatColor(n) }}
              />
            ))}
            <span>More</span>
          </div>
        </Card>
      </section>

      {/* Domain progress */}
      <section>
        <Eyebrow>Per domain</Eyebrow>
        <Card padding="lg" className="mt-5">
          <div className="space-y-5">
            {(domains ?? []).map((domain) => {
              const domainConceptIds = (domain.concepts ?? []).map(
                (c: { id: string }) => c.id,
              )
              const mastered = domainConceptIds.filter((id: string) =>
                masteredIds.has(id),
              ).length
              const total = domainConceptIds.length
              const percent = total > 0 ? Math.round((mastered / total) * 100) : 0

              return (
                <div key={domain.id}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-[14px] font-semibold text-v2-foreground">
                      {domain.name}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-v2-mono text-[11px] text-v2-foreground-subtle">
                        {mastered}/{total}
                      </span>
                      <Badge
                        tone={
                          percent >= 80
                            ? 'success'
                            : percent >= 50
                              ? 'warning'
                              : 'neutral'
                        }
                        size="sm"
                      >
                        {percent}%
                      </Badge>
                    </div>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-v2-surface-sunken">
                    <div
                      className="h-full rounded-full bg-v2-gradient-brand transition-all duration-500"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <p className="mt-1 font-v2-mono text-[10px] uppercase tracking-v2-wide text-v2-foreground-subtle">
                    {domain.exam_weight_percent}% of exam
                  </p>
                </div>
              )
            })}
          </div>
        </Card>
      </section>

      {/* Session history */}
      <section>
        <div className="mb-5 flex items-end justify-between">
          <div>
            <Eyebrow>History</Eyebrow>
            <h2 className="mt-2 text-[20px] font-bold tracking-v2-tight text-v2-foreground">
              Session history
            </h2>
          </div>
        </div>

        {(sessions ?? []).length === 0 ? (
          <Card padding="lg" className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-v2-brand-soft text-v2-brand">
              <Sparkles className="h-5 w-5" strokeWidth={2} />
            </div>
            <p className="mt-4 text-[14px] font-bold text-v2-foreground">
              No sessions yet
            </p>
            <p className="mt-1 text-[12px] text-v2-foreground-muted">
              Complete your first study session and it will appear here.
            </p>
          </Card>
        ) : (
          <Card padding="none" className="overflow-hidden">
            <ul className="divide-y divide-v2-border-subtle">
              {(sessions ?? []).map((s) => {
                const accuracy =
                  s.concepts_studied > 0
                    ? Math.round((s.correct_count / s.concepts_studied) * 100)
                    : 0
                const tone =
                  accuracy >= 80
                    ? 'success'
                    : accuracy >= 60
                      ? 'warning'
                      : 'error'
                return (
                  <li
                    key={s.id}
                    className="flex items-center justify-between gap-4 px-5 py-4 sm:px-6"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-semibold capitalize text-v2-foreground">
                        {s.mode === 'discovery'
                          ? 'Discovery'
                          : s.mode === 'review'
                            ? 'Review'
                            : s.mode === 'intensive'
                              ? 'Intensive'
                              : s.mode === 'exploration'
                                ? 'Exploration'
                                : 'Maintenance'}
                      </p>
                      <p className="mt-0.5 font-v2-mono text-[11px] text-v2-foreground-subtle">
                        {formatRelativeTime(s.created_at)} ·{' '}
                        {formatDuration(s.total_time_seconds)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="font-v2-mono text-[12px] text-v2-foreground-muted">
                          {s.concepts_studied} q
                        </p>
                        <p className="font-v2-mono text-[11px] font-semibold text-v2-brand">
                          +{s.xp_earned} XP
                        </p>
                      </div>
                      <Badge tone={tone} size="sm">
                        {accuracy}%
                      </Badge>
                    </div>
                  </li>
                )
              })}
            </ul>
          </Card>
        )}
      </section>
    </div>
  )
}

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
