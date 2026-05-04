/**
 * /preview/exam/[id]/results — exam results.
 *
 * Sections:
 *  1. Header — score ring, pass/fail pill, timing summary, CTAs
 *  2. Domain breakdown — horizontal bars vs passing threshold
 *  3. Question review — filterable list (all / incorrect / flagged) with
 *     each question, the user's answer, the correct answer, and explanation
 */
'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Flag,
  RotateCcw,
  Sparkles,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, Pill, Eyebrow } from '@/components/v2'
import {
  EXAM_META,
  QUESTIONS,
  SAMPLE_RESULTS,
  SAMPLE_FLAGGED,
} from '../exam-data'

type Filter = 'all' | 'incorrect' | 'flagged'

export default function ResultsPage({ params }: { params: { id: string } }) {
  // Stats
  const total = QUESTIONS.length
  const correctCount = QUESTIONS.filter(
    (q) => SAMPLE_RESULTS[q.id] === q.correct,
  ).length
  const incorrectCount = total - correctCount
  // Scale our 8-question sample up to 1000 for an exam-style score.
  const scaled = Math.round((correctCount / total) * 1000)
  // Bias toward typical user — under 800 makes for a more interesting result page.
  const score = Math.max(620, Math.min(scaled, 980))
  const passed = score >= EXAM_META.passingScore

  // Domain stats
  const domains = ['Resilient', 'High-performing', 'Secure', 'Cost-optimized'] as const
  const byDomain = domains.map((d) => {
    const qs = QUESTIONS.filter((q) => q.domain === d)
    const got = qs.filter((q) => SAMPLE_RESULTS[q.id] === q.correct).length
    const pct = qs.length === 0 ? 0 : Math.round((got / qs.length) * 100)
    return { name: d, total: qs.length, got, pct }
  })

  const [filter, setFilter] = React.useState<Filter>('all')
  const filtered = QUESTIONS.filter((q) => {
    if (filter === 'incorrect') return SAMPLE_RESULTS[q.id] !== q.correct
    if (filter === 'flagged') return SAMPLE_FLAGGED.has(q.id)
    return true
  })

  return (
    <div className="min-h-screen bg-v2-background">
      {/* Slim top */}
      <header className="border-b border-v2-border bg-v2-surface">
        <div className="mx-auto flex h-14 max-w-[1100px] items-center justify-between px-6">
          <Link
            href="/preview/dashboard"
            className="inline-flex items-center gap-1.5 rounded-md text-[13px] font-medium text-v2-foreground-muted transition-colors hover:text-v2-foreground"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={2.25} />
            Back to dashboard
          </Link>
          <span className="font-v2-mono text-[11px] uppercase tracking-v2-wide text-v2-foreground-subtle">
            {EXAM_META.code} · Mock #5 · Results
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-[1100px] px-6 py-12 sm:py-16">
        {/* ── Score header ───────────────────────────────── */}
        <section className="grid grid-cols-1 gap-8 lg:grid-cols-[auto_1fr] lg:items-center">
          <ScoreRing
            score={score}
            max={1000}
            tone={passed ? 'success' : 'brand'}
          />

          <div>
            <Pill tone={passed ? 'gradient' : 'brand'} size="md">
              <Sparkles className="h-3 w-3" strokeWidth={2.5} />
              {passed ? 'Passing score' : 'Below threshold'}
            </Pill>
            <h1 className="v2-display mt-4 text-[36px] sm:text-[44px]">
              {passed ? 'You would pass.' : 'Almost there.'}
            </h1>
            <p className="mt-3 max-w-[560px] text-[16px] leading-[1.7] text-v2-foreground-muted">
              {passed
                ? `You scored ${score} out of 1,000 — above the ${EXAM_META.passingScore} passing line. Two of your domains still have room to harden before the official exam.`
                : `You scored ${score} out of 1,000 — ${
                    EXAM_META.passingScore - score
                  } points below the ${EXAM_META.passingScore} passing line. Most candidates close this gap with one focused week on the weakest domain.`}
            </p>

            {/* Stat strip */}
            <div className="mt-6 flex flex-wrap gap-3">
              <Stat label="Correct" value={`${correctCount}/${total}`} tone="success" />
              <Stat label="Incorrect" value={`${incorrectCount}/${total}`} tone="error" />
              <Stat label="Flagged" value={`${SAMPLE_FLAGGED.size}`} tone="warning" />
              <Stat label="Time used" value="1:42:18" tone="neutral" />
            </div>

            {/* CTAs */}
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href={`/preview/exam/${params.id}`}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-v2-border bg-v2-surface px-5 text-[14px] font-semibold text-v2-foreground transition-colors hover:bg-v2-surface-subtle"
              >
                <RotateCcw className="h-4 w-4" strokeWidth={2.25} />
                Retake exam
              </Link>
              <Link
                href="/preview/dashboard/courses/saa-c03"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-v2-gradient-brand px-5 text-[14px] font-semibold text-white shadow-v2-button transition-all hover:-translate-y-0.5 hover:shadow-v2-elevated"
              >
                Review weak domains
                <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
              </Link>
            </div>
          </div>
        </section>

        {/* ── Domain breakdown ───────────────────────────── */}
        <section className="mt-16">
          <Eyebrow>Domain breakdown</Eyebrow>
          <h2 className="v2-display mt-3 text-[28px] sm:text-[32px]">
            Where your points came from.
          </h2>
          <p className="mt-3 max-w-[560px] text-[15px] leading-[1.65] text-v2-foreground-muted">
            Each domain is weighted differently on the official exam. The
            dashed line marks the rough threshold you'd need per domain to
            pass overall.
          </p>

          <Card padding="lg" className="mt-7">
            <div className="space-y-6">
              {byDomain.map((d) => {
                const ok = d.pct >= 70
                return (
                  <div key={d.name}>
                    <div className="flex items-baseline justify-between gap-3">
                      <div className="flex items-baseline gap-2">
                        <span className="text-[15px] font-semibold text-v2-foreground">
                          {d.name}
                        </span>
                        <span className="font-v2-mono text-[10px] uppercase tracking-v2-wide text-v2-foreground-subtle">
                          {d.got} of {d.total} correct
                        </span>
                      </div>
                      <span
                        className={cn(
                          'font-v2-mono text-[14px] font-semibold',
                          ok ? 'text-v2-success' : 'text-v2-warning',
                        )}
                      >
                        {d.pct}%
                      </span>
                    </div>
                    <div className="relative mt-2 h-3 w-full overflow-hidden rounded-full bg-v2-surface-sunken">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all duration-500 ease-v2',
                          ok ? 'bg-v2-success' : 'bg-v2-gradient-brand',
                        )}
                        style={{ width: `${d.pct}%` }}
                      />
                      {/* Dashed threshold marker at 70% */}
                      <div
                        aria-hidden
                        className="absolute top-0 h-full"
                        style={{
                          left: '70%',
                          borderLeft: '2px dashed var(--v2-foreground-subtle)',
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
            <p className="mt-6 inline-flex items-center gap-2 font-v2-mono text-[11px] uppercase tracking-v2-wide text-v2-foreground-subtle">
              <span
                aria-hidden
                className="inline-block h-3 w-2"
                style={{
                  borderLeft: '2px dashed var(--v2-foreground-subtle)',
                }}
              />
              70% threshold
            </p>
          </Card>
        </section>

        {/* ── Question review ────────────────────────────── */}
        <section className="mt-16">
          <Eyebrow>Question review</Eyebrow>
          <h2 className="v2-display mt-3 text-[28px] sm:text-[32px]">
            Walk through every answer.
          </h2>

          {/* Filter pills */}
          <div className="mt-5 flex flex-wrap gap-2">
            {(
              [
                { key: 'all' as const, label: `All ${total}` },
                {
                  key: 'incorrect' as const,
                  label: `Incorrect ${incorrectCount}`,
                },
                {
                  key: 'flagged' as const,
                  label: `Flagged ${SAMPLE_FLAGGED.size}`,
                },
              ] as const
            ).map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                className={cn(
                  'inline-flex h-8 items-center rounded-full px-3.5 text-[12px] font-semibold transition-colors',
                  filter === f.key
                    ? 'bg-v2-foreground text-white'
                    : 'border border-v2-border bg-v2-surface text-v2-foreground-muted hover:bg-v2-surface-subtle hover:text-v2-foreground',
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Question cards */}
          <div className="mt-6 space-y-4">
            {filtered.map((q) => {
              const userAns = SAMPLE_RESULTS[q.id]
              const correct = userAns === q.correct
              const flagged = SAMPLE_FLAGGED.has(q.id)
              return (
                <Card key={q.id} padding="lg">
                  {/* Header */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="font-v2-mono text-[11px] font-semibold uppercase tracking-v2-wide text-v2-foreground-subtle">
                        Question {q.id}
                      </span>
                      <span className="text-v2-foreground-subtle">·</span>
                      <span className="font-v2-mono text-[11px] uppercase tracking-v2-wide text-v2-foreground-muted">
                        {q.domain}
                      </span>
                      {flagged && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-v2-warning-soft px-2 py-0.5 font-v2-mono text-[10px] font-semibold uppercase tracking-v2-wide text-v2-warning">
                          <Flag className="h-2.5 w-2.5" strokeWidth={2.5} fill="currentColor" fillOpacity={0.3} />
                          Flagged
                        </span>
                      )}
                    </div>
                    <span
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-v2-mono text-[11px] font-semibold uppercase tracking-v2-wide',
                        correct
                          ? 'bg-v2-success-soft text-v2-success'
                          : 'bg-v2-error-soft text-v2-error',
                      )}
                    >
                      {correct ? (
                        <Check className="h-3 w-3" strokeWidth={3} />
                      ) : (
                        <X className="h-3 w-3" strokeWidth={3} />
                      )}
                      {correct ? 'Correct' : 'Incorrect'}
                    </span>
                  </div>

                  {/* Prompt */}
                  <p className="mt-4 text-[15px] font-semibold leading-[1.5] text-v2-foreground">
                    {q.prompt}
                  </p>

                  {/* Options */}
                  <ul className="mt-4 space-y-2">
                    {q.options.map((o) => {
                      const isUser = userAns === o.label
                      const isCorrect = o.label === q.correct
                      return (
                        <li
                          key={o.label}
                          className={cn(
                            'flex items-start gap-3 rounded-lg border px-4 py-3 text-[14px] leading-[1.5]',
                            isCorrect
                              ? 'border-v2-success bg-v2-success-soft text-v2-foreground'
                              : isUser && !isCorrect
                              ? 'border-v2-error bg-v2-error-soft text-v2-foreground'
                              : 'border-v2-border-subtle bg-v2-surface text-v2-foreground-muted',
                          )}
                        >
                          <span
                            className={cn(
                              'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full font-v2-mono text-[10px] font-bold',
                              isCorrect
                                ? 'bg-v2-success text-white'
                                : isUser && !isCorrect
                                ? 'bg-v2-error text-white'
                                : 'border border-v2-border-strong text-v2-foreground-subtle',
                            )}
                          >
                            {isCorrect ? (
                              <Check className="h-3 w-3" strokeWidth={3} />
                            ) : isUser && !isCorrect ? (
                              <X className="h-3 w-3" strokeWidth={3} />
                            ) : (
                              o.label
                            )}
                          </span>
                          <span className="flex-1">{o.text}</span>
                          {(isCorrect || (isUser && !isCorrect)) && (
                            <span
                              className={cn(
                                'shrink-0 font-v2-mono text-[10px] font-semibold uppercase tracking-v2-wide',
                                isCorrect
                                  ? 'text-v2-success'
                                  : 'text-v2-error',
                              )}
                            >
                              {isCorrect && isUser
                                ? 'Your answer'
                                : isCorrect
                                ? 'Correct'
                                : 'Your answer'}
                            </span>
                          )}
                        </li>
                      )
                    })}
                  </ul>

                  {/* Explanation */}
                  <div className="mt-4 rounded-lg bg-v2-surface-subtle p-4">
                    <p className="font-v2-mono text-[11px] font-semibold uppercase tracking-v2-wide text-v2-foreground-subtle">
                      Explanation
                    </p>
                    <p className="mt-1.5 text-[14px] leading-[1.65] text-v2-foreground-muted">
                      {q.explanation}
                    </p>
                  </div>
                </Card>
              )
            })}
          </div>
        </section>
      </main>
    </div>
  )
}

// ── Score ring ───────────────────────────────────────────────────────

function ScoreRing({
  score,
  max,
  tone,
}: {
  score: number
  max: number
  tone: 'success' | 'brand'
}) {
  const r = 64
  const circ = 2 * Math.PI * r
  const offset = circ - (score / max) * circ

  return (
    <div className="relative flex h-[180px] w-[180px] shrink-0 items-center justify-center">
      <svg
        width="180"
        height="180"
        viewBox="0 0 160 160"
        className="-rotate-90"
      >
        <circle
          cx="80"
          cy="80"
          r={r}
          fill="none"
          stroke="var(--v2-surface-sunken)"
          strokeWidth="8"
        />
        <circle
          cx="80"
          cy="80"
          r={r}
          fill="none"
          stroke={
            tone === 'success' ? 'var(--v2-success)' : 'url(#score-gradient)'
          }
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
        />
        <defs>
          <linearGradient
            id="score-gradient"
            x1="0"
            y1="0"
            x2="160"
            y2="160"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#4F46E5" />
            <stop offset="100%" stopColor="#7C3AED" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute flex flex-col items-center text-center">
        <span className="v2-display text-[56px] leading-none text-v2-foreground">
          {score}
        </span>
        <span className="mt-1 font-v2-mono text-[11px] uppercase tracking-v2-wide text-v2-foreground-subtle">
          / {max}
        </span>
      </div>
    </div>
  )
}

// ── Stat chip ────────────────────────────────────────────────────────

function Stat({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone: 'success' | 'error' | 'warning' | 'neutral'
}) {
  const cls =
    tone === 'success'
      ? 'border-v2-success/20 bg-v2-success-soft text-v2-success'
      : tone === 'error'
      ? 'border-v2-error/20 bg-v2-error-soft text-v2-error'
      : tone === 'warning'
      ? 'border-v2-warning/20 bg-v2-warning-soft text-v2-warning'
      : 'border-v2-border bg-v2-surface text-v2-foreground'
  return (
    <div className={cn('rounded-lg border px-3 py-2', cls)}>
      <div className="font-v2-mono text-[10px] uppercase tracking-v2-wide opacity-80">
        {label}
      </div>
      <div className="mt-0.5 text-[16px] font-bold tabular-nums">{value}</div>
    </div>
  )
}
