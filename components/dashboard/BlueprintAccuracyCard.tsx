'use client'

import { Card, Badge, Eyebrow } from '@/components/v2'
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

const DOMAIN_COLOR_CLASS: Record<number, string> = {
  1: 'bg-v2-brand',
  2: 'bg-v2-success',
  3: 'bg-v2-warning',
  4: 'bg-v2-accent',
}

function accuracyBadge(pct: number | null, attempts: number) {
  if (attempts === 0 || pct === null)
    return (
      <Badge tone="neutral" size="sm">
        Not started
      </Badge>
    )
  if (pct >= 80)
    return (
      <Badge tone="success" size="sm">
        {pct}%
      </Badge>
    )
  if (pct >= 60)
    return (
      <Badge tone="warning" size="sm">
        {pct}%
      </Badge>
    )
  return (
    <Badge tone="error" size="sm">
      {pct}%
    </Badge>
  )
}

export function BlueprintAccuracyCard({ tasks }: Props) {
  const domains = [...new Set(tasks.map((t) => t.domain_number))].sort(
    (a, b) => a - b,
  )
  const byDomain = domains.map((d) => ({
    number: d,
    name: tasks.find((t) => t.domain_number === d)?.domain_name ?? `Domain ${d}`,
    weight:
      tasks.find((t) => t.domain_number === d)?.domain_weight_pct ?? 0,
    tasks: tasks.filter((t) => t.domain_number === d),
    colorClass: DOMAIN_COLOR_CLASS[d] ?? 'bg-v2-brand',
  }))

  const totalAttempts = tasks.reduce((a, t) => a + t.attempts, 0)
  const tasksStarted = tasks.filter((t) => t.attempts > 0).length
  const overallAccuracy =
    totalAttempts > 0
      ? Math.round(
          (tasks.reduce((a, t) => a + t.correct, 0) / totalAttempts) * 100,
        )
      : null

  return (
    <Card padding="lg">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Eyebrow>Exam blueprint coverage</Eyebrow>
          <p className="mt-1.5 text-[12px] text-v2-foreground-muted">
            SAA-C03 · {tasksStarted}/{tasks.length} tasks attempted
            {overallAccuracy !== null && ` · ${overallAccuracy}% overall`}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-v2-mono text-[10px] uppercase tracking-v2-wide text-v2-foreground-subtle">
            Questions
          </p>
          <p className="text-[18px] font-bold tabular-nums text-v2-foreground">
            {totalAttempts}
          </p>
        </div>
      </div>

      <div className="mt-6 space-y-6">
        {byDomain.map(({ number, name, weight, tasks: domainTasks, colorClass }) => {
          const domainAttempts = domainTasks.reduce(
            (a, t) => a + t.attempts,
            0,
          )
          const domainCorrect = domainTasks.reduce((a, t) => a + t.correct, 0)
          const domainAccuracy =
            domainAttempts > 0
              ? Math.round((domainCorrect / domainAttempts) * 100)
              : null

          return (
            <div key={number}>
              {/* Domain header */}
              <div className="mb-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`h-2.5 w-2.5 rounded-full ${colorClass}`} />
                  <span className="text-[13px] font-bold text-v2-foreground">
                    D{number} — {name.replace('Design ', '')}
                  </span>
                  <span className="font-v2-mono text-[11px] text-v2-foreground-subtle">
                    ({weight}%)
                  </span>
                </div>
                {domainAccuracy !== null && (
                  <span className="font-v2-mono text-[11px] font-medium text-v2-foreground-muted">
                    {domainAttempts} attempts · {domainAccuracy}%
                  </span>
                )}
              </div>

              {/* Tasks */}
              <div className="ml-4 space-y-2">
                {domainTasks.map((task) => {
                  const barWidth =
                    task.attempts > 0 && task.accuracy_pct !== null
                      ? task.accuracy_pct
                      : 0
                  const barTone =
                    task.accuracy_pct === null || task.attempts === 0
                      ? ''
                      : task.accuracy_pct >= 80
                        ? 'bg-v2-success'
                        : task.accuracy_pct >= 60
                          ? 'bg-v2-warning'
                          : 'bg-v2-error'
                  return (
                    <div key={task.task_id}>
                      <div className="mb-1 flex items-center gap-2">
                        <span className="w-7 shrink-0 font-v2-mono text-[11px] font-semibold text-v2-foreground-muted">
                          {task.task_id}
                        </span>
                        <span
                          className={cn(
                            'flex-1 truncate text-[12px]',
                            task.attempts > 0
                              ? 'text-v2-foreground'
                              : 'text-v2-foreground-muted',
                          )}
                          title={task.task_label}
                        >
                          {task.task_label}
                        </span>
                        <div className="shrink-0">
                          {accuracyBadge(task.accuracy_pct, task.attempts)}
                        </div>
                      </div>
                      <div className="ml-9 h-1.5 overflow-hidden rounded-full bg-v2-surface-sunken">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all duration-500',
                            barTone,
                          )}
                          style={{
                            width:
                              task.attempts === 0 ? '0%' : `${barWidth}%`,
                          }}
                        />
                      </div>
                      {task.attempts > 0 && (
                        <p className="ml-9 mt-0.5 font-v2-mono text-[10px] text-v2-foreground-subtle">
                          {task.correct}/{task.attempts} correct ·{' '}
                          {task.pool_available} in pool
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
        <div className="flex flex-wrap items-center gap-4 border-t border-v2-border-subtle pt-4 font-v2-mono text-[11px] uppercase tracking-v2-wide text-v2-foreground-subtle">
          <span>Accuracy</span>
          {[
            { label: '≥80% strong', cls: 'bg-v2-success' },
            { label: '60-79% ok', cls: 'bg-v2-warning' },
            { label: '<60% weak', cls: 'bg-v2-error' },
          ].map((l) => (
            <div key={l.label} className="flex items-center gap-1.5">
              <div className={`h-2 w-2 rounded-full ${l.cls}`} />
              <span className="normal-case tracking-normal">{l.label}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}
