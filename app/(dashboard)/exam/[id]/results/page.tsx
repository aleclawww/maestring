import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, BookOpen, Sparkles } from 'lucide-react'
import { requireAuthenticatedUser } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'
import { cn } from '@/lib/utils'
import { Card, Badge, Pill, Eyebrow } from '@/components/v2'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Exam Results' }

const PASSING_SCORE = 720
const MAX_SCORE = 1000

interface DomainRow {
  slug: string
  name: string
  weight: number
  total: number
  correct: number
  accuracy: number
}

export default async function ExamResultsPage({
  params,
}: {
  params: { id: string }
}) {
  const user = await requireAuthenticatedUser()
  const supabase = createAdminClient()

  const { data: session, error: sessionErr } = await supabase
    .from('exam_sessions')
    .select(
      'id, user_id, status, total_questions, correct_count, scaled_score, passed, by_domain, started_at, submitted_at',
    )
    .eq('id', params.id)
    .single()

  if (sessionErr) {
    logger.error(
      { err: sessionErr, sessionId: params.id, userId: user.id },
      'exam/results: failed to read exam_sessions — rendering notFound',
    )
  }

  if (!session || session.user_id !== user.id) notFound()
  if (session.status === 'in_progress') redirect(`/exam/${params.id}`)

  const scaled = session.scaled_score ?? 0
  const passed = !!session.passed
  const correct = session.correct_count ?? 0
  const total = session.total_questions ?? 0
  const accuracy = total > 0 ? correct / total : 0
  const byDomain = (session.by_domain as DomainRow[] | null) ?? []

  const circumference = 2 * Math.PI * 42
  const offset = circumference * (1 - scaled / MAX_SCORE)
  const ringColor = passed ? 'var(--v2-success)' : 'var(--v2-error)'

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header className="text-center">
        <Pill
          tone={passed ? 'gradient' : 'brand'}
          size="md"
          className="mx-auto"
        >
          <Sparkles className="h-3 w-3" strokeWidth={2.5} />
          <span className="font-v2-mono text-[10px] uppercase tracking-v2-wide">
            Mock exam result
          </span>
        </Pill>
        <h1 className="v2-display mt-4 text-[36px] sm:text-[44px]">
          {passed ? 'You would pass.' : 'Almost there.'}
        </h1>
        <p className="mx-auto mt-2 max-w-[520px] text-[15px] leading-[1.6] text-v2-foreground-muted">
          {passed
            ? "You've cleared the passing threshold. Solid work — your retention curves keep climbing."
            : "You didn't hit the threshold this time. The scheduler now knows where you're soft — keep going."}
        </p>
      </header>

      {/* Score + stats */}
      <Card padding="lg" className="overflow-hidden">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-[auto_1fr] sm:items-center">
          {/* Score ring */}
          <div className="relative mx-auto h-44 w-44">
            <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke="var(--v2-surface-sunken)"
                strokeWidth="8"
              />
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke={ringColor}
                strokeWidth="8"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                strokeLinecap="round"
                className="transition-all duration-1000"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="v2-display text-[40px] leading-none text-v2-foreground">
                {scaled}
              </span>
              <span className="mt-1 font-v2-mono text-[11px] text-v2-foreground-subtle">
                / {MAX_SCORE}
              </span>
              <Badge
                tone={passed ? 'success' : 'error'}
                size="sm"
                mono
                className="mt-2"
              >
                {passed ? 'Passed' : 'Failed'}
              </Badge>
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3">
            <StatCell
              tone="success"
              value={correct.toString()}
              label="Correct"
            />
            <StatCell
              tone="error"
              value={(total - correct).toString()}
              label="Incorrect"
            />
            <StatCell
              tone="brand"
              value={`${Math.round(accuracy * 100)}%`}
              label="Accuracy"
            />
            <StatCell
              tone={passed ? 'success' : 'warning'}
              value={PASSING_SCORE.toString()}
              label="Passing threshold"
            />
          </div>
        </div>
      </Card>

      {/* By domain */}
      <Card padding="lg">
        <Eyebrow>By domain</Eyebrow>
        <h2 className="v2-display mt-3 text-[22px]">Where points came from</h2>

        <div className="mt-5 space-y-5">
          {byDomain.length === 0 && (
            <p className="text-[13px] text-v2-foreground-muted">
              No data by domain.
            </p>
          )}
          {byDomain.map((d) => {
            const pct = Math.round(d.accuracy * 100)
            const ok = pct >= 72
            return (
              <div key={d.slug}>
                <div className="flex items-baseline justify-between gap-3">
                  <div className="flex items-baseline gap-2">
                    <span className="text-[14px] font-semibold text-v2-foreground">
                      {d.name}
                    </span>
                    <span className="font-v2-mono text-[10px] uppercase tracking-v2-wide text-v2-foreground-subtle">
                      {d.weight}% of exam
                    </span>
                  </div>
                  <span
                    className={cn(
                      'font-v2-mono text-[13px] font-semibold',
                      ok ? 'text-v2-success' : 'text-v2-warning',
                    )}
                  >
                    {pct}% · {d.correct}/{d.total}
                  </span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-v2-surface-sunken">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-500',
                      ok ? 'bg-v2-success' : 'bg-v2-gradient-brand',
                    )}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      {/* Actions */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href="/exam"
          className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-v2-border bg-v2-surface text-[14px] font-semibold text-v2-foreground transition-colors hover:bg-v2-surface-subtle"
        >
          New mock exam
        </Link>
        <Link
          href="/study"
          className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-v2-gradient-brand text-[14px] font-semibold text-white shadow-v2-button transition-all hover:-translate-y-0.5 hover:shadow-v2-elevated"
        >
          <BookOpen className="h-4 w-4" strokeWidth={2.25} />
          Keep studying
          <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
        </Link>
      </div>
    </div>
  )
}

function StatCell({
  tone,
  value,
  label,
}: {
  tone: 'success' | 'error' | 'brand' | 'warning'
  value: string
  label: string
}) {
  const cls =
    tone === 'success'
      ? 'border-v2-success/20 bg-v2-success-soft text-v2-success'
      : tone === 'error'
        ? 'border-v2-error/20 bg-v2-error-soft text-v2-error'
        : tone === 'warning'
          ? 'border-v2-warning/20 bg-v2-warning-soft text-v2-warning'
          : 'border-v2-brand/20 bg-v2-brand-soft text-v2-brand'
  return (
    <div className={cn('rounded-xl border p-4 text-center', cls)}>
      <p className="v2-display text-[28px] leading-none">{value}</p>
      <p className="mt-2 font-v2-mono text-[10px] uppercase tracking-v2-wide opacity-80">
        {label}
      </p>
    </div>
  )
}
