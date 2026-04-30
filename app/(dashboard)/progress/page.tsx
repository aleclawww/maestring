import { requireAuthenticatedUser } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import { formatRelativeTime, formatDuration } from '@/lib/utils'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { ReadinessCard, type ReadinessData } from '@/components/dashboard/ReadinessCard'
import { BlueprintAccuracyCard, type BlueprintTaskRow } from '@/components/dashboard/BlueprintAccuracyCard'
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
    { data: blueprintRows },
  ] = await Promise.all([
    supabase.rpc('get_user_stats', { p_user_id: user.id }),
    supabase.rpc('get_study_heatmap', { p_user_id: user.id, p_days: 84 }),
    supabase
      .from('study_sessions')
      .select('id, mode, created_at, total_time_seconds, concepts_studied, correct_count, xp_earned')
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
      .select('concept_id, state, reps, lapses, stability')
      .eq('user_id', user.id),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    supabase.rpc('get_exam_readiness_v2' as any, { p_user_id: user.id }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    supabase.rpc('get_blueprint_task_accuracy' as any, { p_user_id: user.id }),
  ])

  const readiness = (readinessRows as ReadinessData[] | null)?.[0] ?? null
  const blueprintTasks = (blueprintRows as BlueprintTaskRow[] | null) ?? []

  const statsRow = stats?.[0]
  const masteredIds = new Set(
    (conceptStates ?? []).filter(s => s.reps >= 5 && s.lapses <= 1).map(s => s.concept_id)
  )

  // Build heatmap grid (12 weeks x 7 days)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const heatmapMap = new Map(
    (heatmap ?? []).map((h: { study_date: string; session_count: number }) => [h.study_date, h.session_count])
  )
  const heatmapGrid: Array<{ date: string; count: number }[]> = []
  for (let week = 11; week >= 0; week--) {
    const weekData: Array<{ date: string; count: number }> = []
    for (let day = 0; day < 7; day++) {
      const d = new Date(today)
      d.setDate(d.getDate() - (week * 7 + (6 - day)))
      const dateStr = d.toISOString().split('T')[0] ?? ''
      weekData.push({ date: dateStr, count: (heatmapMap.get(dateStr) ?? 0) as number })
    }
    heatmapGrid.push(weekData)
  }

  function getHeatColor(count: number): string {
    if (count === 0) return '#1e2535'
    if (count === 1) return '#312e81'
    if (count <= 2) return '#4338ca'
    if (count <= 3) return '#6366f1'
    return '#818cf8'
  }

  return (
    <div className="p-6 space-y-6">
      {/* Readiness score — shown once the user has enough history to compute it */}
      {readiness && <ReadinessCard data={readiness} />}

      {/* Stats overview */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Total sessions', value: statsRow?.total_sessions ?? 0, icon: '📚' },
          { label: 'Total XP', value: (statsRow?.total_xp ?? 0).toLocaleString(), icon: '⭐' },
          { label: 'Current streak', value: `${statsRow?.current_streak ?? 0}d`, icon: '🔥' },
          { label: 'Concepts mastered', value: statsRow?.concepts_mastered ?? 0, icon: '🏆' },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="pt-4">
              <p className="text-2xl mb-1">{s.icon}</p>
              <p className="text-xl font-bold text-text-primary">{s.value}</p>
              <p className="text-xs text-text-muted">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Activity Heatmap */}
      <Card>
        <CardHeader>
          <CardTitle>Activity — Last 12 weeks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-1 overflow-x-auto pb-2">
            {heatmapGrid.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-1">
                {week.map(day => (
                  <div
                    key={day.date}
                    className="h-3 w-3 rounded-sm transition-colors"
                    style={{ backgroundColor: getHeatColor(day.count) }}
                    title={`${day.date}: ${day.count} sessions`}
                  />
                ))}
              </div>
            ))}
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs text-text-muted">
            <span>Less</span>
            {[0, 1, 2, 3, 4].map(n => (
              <div
                key={n}
                className="h-3 w-3 rounded-sm"
                style={{ backgroundColor: getHeatColor(n) }}
              />
            ))}
            <span>More</span>
          </div>
        </CardContent>
      </Card>

      {/* Blueprint task accuracy */}
      <BlueprintAccuracyCard tasks={blueprintTasks} />

      {/* Domain progress */}
      <Card>
        <CardHeader>
          <CardTitle>Progress by domain</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {(domains ?? []).map(domain => {
              const domainConceptIds = (domain.concepts ?? []).map((c: { id: string }) => c.id)
              const mastered = domainConceptIds.filter((id: string) => masteredIds.has(id)).length
              const total = domainConceptIds.length
              const percent = total > 0 ? Math.round((mastered / total) * 100) : 0

              return (
                <div key={domain.id}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-text-primary">{domain.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-text-muted">{mastered}/{total}</span>
                      <Badge variant={percent >= 80 ? 'success' : percent >= 50 ? 'warning' : 'outline'}>
                        {percent}%
                      </Badge>
                    </div>
                  </div>
                  <div className="h-2 rounded-full bg-surface-2 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${percent}%`,
                        backgroundColor: domain.color ?? '#6366f1',
                      }}
                    />
                  </div>
                  <p className="text-xs text-text-muted mt-0.5">
                    Exam weight: {domain.exam_weight_percent}%
                  </p>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Recent sessions */}
      <Card>
        <CardHeader>
          <CardTitle>Session history</CardTitle>
        </CardHeader>
        {(sessions ?? []).length === 0 ? (
          <div className="px-6 py-10 text-center">
            <p className="text-3xl mb-3">📚</p>
            <p className="text-sm font-medium text-text-primary">No sessions yet</p>
            <p className="text-xs text-text-muted mt-1">
              Complete your first study session and it will appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {(sessions ?? []).map(s => {
              const accuracy =
                s.concepts_studied > 0
                  ? Math.round((s.correct_count / s.concepts_studied) * 100)
                  : 0
              return (
                <div key={s.id} className="flex items-center justify-between px-6 py-3">
                  <div>
                    <p className="text-sm font-medium text-text-primary capitalize">
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
                    <p className="text-xs text-text-muted">
                      {formatRelativeTime(s.created_at)} · {formatDuration(s.total_time_seconds)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={accuracy >= 80 ? 'success' : accuracy >= 60 ? 'warning' : 'danger'}>
                      {accuracy}%
                    </Badge>
                    <div className="text-right">
                      <p className="text-sm font-medium text-text-primary">{s.concepts_studied} questions</p>
                      <p className="text-xs text-primary">+{s.xp_earned} XP</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}
