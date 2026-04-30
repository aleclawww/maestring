'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'

export interface BlueprintTaskRow {
  task_id: string
  task_label: string
  domain_number: number
  domain_name: string
  domain_weight_pct: number
  attempts: number
  correct: number
  accuracy_pct: number | null
  pool_available: number
}

interface Props {
  tasks: BlueprintTaskRow[]
}

const DOMAIN_COLORS: Record<number, string> = {
  1: '#6366f1',  // indigo — Secure
  2: '#22c55e',  // green  — Resilient
  3: '#f59e0b',  // amber  — Performant
  4: '#ec4899',  // pink   — Cost-Optimized
}

function accuracyBadge(pct: number | null, attempts: number) {
  if (attempts === 0 || pct === null)
    return <Badge variant="outline" className="text-xs">Not started</Badge>
  if (pct >= 80)
    return <Badge variant="success" className="text-xs">{pct}%</Badge>
  if (pct >= 60)
    return <Badge variant="warning" className="text-xs">{pct}%</Badge>
  return <Badge variant="danger" className="text-xs">{pct}%</Badge>
}

export function BlueprintAccuracyCard({ tasks }: Props) {
  // Group by domain — derive from actual task data so this stays correct if
  // domains are added or renumbered.
  const domains = [...new Set(tasks.map(t => t.domain_number))].sort((a, b) => a - b)
  const byDomain = domains.map(d => ({
    number: d,
    name: tasks.find(t => t.domain_number === d)?.domain_name ?? `Domain ${d}`,
    weight: tasks.find(t => t.domain_number === d)?.domain_weight_pct ?? 0,
    tasks: tasks.filter(t => t.domain_number === d),
    color: DOMAIN_COLORS[d] ?? '#6366f1',
  }))

  const totalAttempts = tasks.reduce((a, t) => a + t.attempts, 0)
  const tasksStarted = tasks.filter(t => t.attempts > 0).length
  const overallAccuracy =
    totalAttempts > 0
      ? Math.round(tasks.reduce((a, t) => a + t.correct, 0) / totalAttempts * 100)
      : null

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>Exam Blueprint Coverage</CardTitle>
            <p className="text-xs text-text-muted mt-0.5">
              SAA-C03 · {tasksStarted}/{tasks.length} tasks attempted
              {overallAccuracy !== null && ` · ${overallAccuracy}% overall accuracy`}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs text-text-muted">Questions answered</p>
            <p className="text-lg font-bold text-text-primary">{totalAttempts}</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {byDomain.map(({ number, name, weight, tasks: domainTasks, color }) => {
          const domainAttempts = domainTasks.reduce((a, t) => a + t.attempts, 0)
          const domainCorrect  = domainTasks.reduce((a, t) => a + t.correct, 0)
          const domainAccuracy = domainAttempts > 0
            ? Math.round(domainCorrect / domainAttempts * 100)
            : null

          return (
            <div key={number}>
              {/* Domain header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-sm font-semibold text-text-primary">
                    D{number} — {name.replace('Design ', '')}
                  </span>
                  <span className="text-xs text-text-muted">({weight}%)</span>
                </div>
                {domainAccuracy !== null && (
                  <span className="text-xs font-medium text-text-muted">
                    {domainAttempts} attempts · {domainAccuracy}%
                  </span>
                )}
              </div>

              {/* Tasks */}
              <div className="space-y-1.5 ml-4">
                {domainTasks.map(task => {
                  const barWidth = task.attempts > 0 && task.accuracy_pct !== null
                    ? task.accuracy_pct
                    : 0
                  return (
                    <div key={task.task_id} className="group">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-mono text-text-muted w-6 shrink-0">
                          {task.task_id}
                        </span>
                        <span
                          className={cn(
                            'text-xs flex-1 truncate',
                            task.attempts > 0 ? 'text-text-primary' : 'text-text-muted',
                          )}
                          title={task.task_label}
                        >
                          {task.task_label}
                        </span>
                        <div className="shrink-0">
                          {accuracyBadge(task.accuracy_pct, task.attempts)}
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="ml-8 h-1.5 rounded-full bg-surface-2 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: task.attempts === 0 ? '0%' : `${barWidth}%`,
                            backgroundColor:
                              task.accuracy_pct === null || task.attempts === 0
                                ? 'transparent'
                                : task.accuracy_pct >= 80
                                  ? '#22c55e'
                                  : task.accuracy_pct >= 60
                                    ? '#f59e0b'
                                    : '#ef4444',
                          }}
                        />
                      </div>

                      {/* Attempts count on hover — shown via title on parent */}
                      {task.attempts > 0 && (
                        <p className="ml-8 text-xs text-text-muted mt-0.5">
                          {task.correct}/{task.attempts} correct
                          <span className="text-text-subtle ml-1">
                            · {task.pool_available} in pool
                          </span>
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}

        {/* Legend */}
        <div className="flex items-center gap-4 pt-1 text-xs text-text-muted border-t border-border">
          <span>Accuracy:</span>
          {[
            { label: '≥80% strong', color: '#22c55e' },
            { label: '60-79% ok',   color: '#f59e0b' },
            { label: '<60% weak',   color: '#ef4444' },
          ].map(l => (
            <div key={l.label} className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full" style={{ backgroundColor: l.color }} />
              <span>{l.label}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
