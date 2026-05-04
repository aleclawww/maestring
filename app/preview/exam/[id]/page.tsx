/**
 * /preview/exam/[id] — practice exam in progress.
 *
 * Layout (per directive §10):
 *  - Top bar: cert code + name (left), big mono timer (center), flag toggle
 *    + exit (right). Timer shifts to warning at 10min, error at 2min.
 *  - Question area max-w-[820px] centered. Letter-prefixed radio cards.
 *  - Bottom: prev/next + segmented progress strip (one cell per question).
 *  - Right rail (collapsible) with the question navigator grid.
 */
'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  Flag,
  X,
  Clock,
  Grid2x2,
  Check,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { EXAM_META, QUESTIONS } from './exam-data'

type Letter = 'A' | 'B' | 'C' | 'D'

export default function ExamPage({ params }: { params: { id: string } }) {
  const router = useRouter()

  const total = QUESTIONS.length
  const [current, setCurrent] = React.useState(0)
  const [answers, setAnswers] = React.useState<Record<number, Letter | null>>(
    {},
  )
  const [flagged, setFlagged] = React.useState<Set<number>>(new Set())
  const [navigatorOpen, setNavigatorOpen] = React.useState(false)
  const [confirmExit, setConfirmExit] = React.useState(false)
  const [submitted, setSubmitted] = React.useState(false)

  // ── Timer (130 minutes) ─────────────────────────────────────
  const [secondsLeft, setSecondsLeft] = React.useState(
    EXAM_META.totalMinutes * 60,
  )
  React.useEffect(() => {
    if (submitted) return
    const t = setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1))
    }, 1000)
    return () => clearInterval(t)
  }, [submitted])

  const minutes = Math.floor(secondsLeft / 60)
  const seconds = secondsLeft % 60
  const timerTone =
    secondsLeft <= 2 * 60
      ? 'text-v2-error bg-v2-error-soft border-v2-error/30'
      : secondsLeft <= 10 * 60
      ? 'text-v2-warning bg-v2-warning-soft border-v2-warning/30'
      : 'text-v2-foreground bg-v2-surface border-v2-border'

  const q = QUESTIONS[current] ?? QUESTIONS[0]!
  const selectedLetter = answers[q.id] ?? null
  const isFlagged = flagged.has(q.id)

  const select = (letter: Letter) => {
    setAnswers((a) => ({ ...a, [q.id]: letter }))
  }

  const toggleFlag = () => {
    setFlagged((f) => {
      const next = new Set(f)
      if (next.has(q.id)) next.delete(q.id)
      else next.add(q.id)
      return next
    })
  }

  const goPrev = () => setCurrent((c) => Math.max(0, c - 1))
  const goNext = () => setCurrent((c) => Math.min(total - 1, c + 1))
  const goTo = (idx: number) => {
    setCurrent(idx)
    setNavigatorOpen(false)
  }

  const submit = () => {
    setSubmitted(true)
    router.push(`/preview/exam/${params.id}/results`)
  }

  return (
    <div className="flex min-h-screen flex-col bg-v2-background">
      {/* ── Top bar ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-v2-border bg-v2-background/95 px-4 backdrop-blur-md sm:px-6">
        {/* Left: cert badge + name */}
        <div className="flex min-w-0 items-center gap-2">
          <span className="rounded-md border border-v2-brand/20 bg-v2-brand-soft px-2 py-0.5 font-v2-mono text-[11px] font-semibold uppercase tracking-v2-wide text-v2-brand">
            {EXAM_META.code}
          </span>
          <span className="hidden truncate text-[13px] font-semibold text-v2-foreground sm:inline">
            {EXAM_META.name}
          </span>
        </div>

        {/* Center: timer */}
        <div
          className={cn(
            'mx-auto inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 transition-colors duration-300',
            timerTone,
          )}
        >
          <Clock className="h-3.5 w-3.5" strokeWidth={2.25} />
          <span className="font-v2-mono text-[16px] font-bold tabular-nums tracking-v2-tight">
            {String(minutes).padStart(2, '0')}:
            {String(seconds).padStart(2, '0')}
          </span>
        </div>

        {/* Right: flag + navigator + exit */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={toggleFlag}
            aria-pressed={isFlagged}
            aria-label={isFlagged ? 'Unflag question' : 'Flag for review'}
            className={cn(
              'inline-flex h-9 items-center gap-1.5 rounded-md px-2.5 text-[13px] font-medium transition-colors',
              isFlagged
                ? 'bg-v2-warning-soft text-v2-warning'
                : 'text-v2-foreground-muted hover:bg-v2-surface-subtle hover:text-v2-foreground',
            )}
          >
            <Flag
              className="h-3.5 w-3.5"
              strokeWidth={2.25}
              fill={isFlagged ? 'currentColor' : 'none'}
              fillOpacity={isFlagged ? 0.25 : 0}
            />
            <span className="hidden sm:inline">
              {isFlagged ? 'Flagged' : 'Flag'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setNavigatorOpen((v) => !v)}
            aria-pressed={navigatorOpen}
            aria-label="Open question navigator"
            className="inline-flex h-9 items-center gap-1.5 rounded-md px-2.5 text-[13px] font-medium text-v2-foreground-muted transition-colors hover:bg-v2-surface-subtle hover:text-v2-foreground"
          >
            <Grid2x2 className="h-3.5 w-3.5" strokeWidth={2.25} />
            <span className="hidden sm:inline">Navigator</span>
          </button>

          <button
            type="button"
            onClick={() => setConfirmExit(true)}
            aria-label="Exit exam"
            className="inline-flex h-9 items-center gap-1.5 rounded-md px-2.5 text-[13px] font-medium text-v2-foreground-muted transition-colors hover:bg-v2-error-soft hover:text-v2-error"
          >
            <X className="h-3.5 w-3.5" strokeWidth={2.25} />
            <span className="hidden sm:inline">Exit</span>
          </button>
        </div>
      </header>

      {/* ── Body ────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[820px] px-6 py-10 sm:py-14">
            {/* Question header */}
            <div className="flex items-center justify-between">
              <span className="font-v2-mono text-[12px] font-semibold uppercase tracking-v2-wide text-v2-foreground-subtle">
                Question {current + 1} of {EXAM_META.totalQuestions}
              </span>
              <span className="font-v2-mono text-[11px] uppercase tracking-v2-wide text-v2-foreground-subtle">
                Domain · {q.domain}
              </span>
            </div>

            {/* Prompt */}
            <h1 className="mt-5 text-[19px] font-semibold leading-[1.55] text-v2-foreground sm:text-[20px]">
              {q.prompt}
            </h1>

            {/* Options */}
            <ul className="mt-8 space-y-3">
              {q.options.map((o) => {
                const isSelected = selectedLetter === o.label
                return (
                  <li key={o.label}>
                    <button
                      type="button"
                      onClick={() => select(o.label)}
                      className={cn(
                        'flex w-full items-start gap-4 rounded-xl border px-5 py-4 text-left transition-all duration-150',
                        isSelected
                          ? 'border-v2-brand bg-v2-brand-soft shadow-v2-soft'
                          : 'border-v2-border bg-v2-surface hover:border-v2-border-strong hover:bg-v2-surface-subtle/50',
                      )}
                      aria-pressed={isSelected}
                    >
                      <span
                        className={cn(
                          'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-v2-mono text-[12px] font-bold transition-colors',
                          isSelected
                            ? 'bg-v2-brand text-white shadow-v2-button'
                            : 'border border-v2-border-strong bg-v2-surface text-v2-foreground-muted',
                        )}
                      >
                        {o.label}
                      </span>
                      <span className="text-[15px] leading-[1.55] text-v2-foreground">
                        {o.text}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>

            {/* Skip + clear answer */}
            <div className="mt-7 flex items-center justify-between text-[13px]">
              <button
                type="button"
                onClick={toggleFlag}
                className="inline-flex items-center gap-1.5 font-medium text-v2-foreground-muted hover:text-v2-foreground"
              >
                <Bookmark className="h-3.5 w-3.5" strokeWidth={2} />
                {isFlagged ? 'Remove flag' : 'Flag for review'}
              </button>
              {selectedLetter && (
                <button
                  type="button"
                  onClick={() => setAnswers((a) => ({ ...a, [q.id]: null }))}
                  className="font-medium text-v2-foreground-muted hover:text-v2-error"
                >
                  Clear answer
                </button>
              )}
            </div>
          </div>
        </main>

        {/* Question navigator (right rail) */}
        {navigatorOpen && (
          <aside className="hidden w-[300px] shrink-0 overflow-y-auto border-l border-v2-border bg-v2-surface p-5 lg:block">
            <Navigator
              total={EXAM_META.totalQuestions}
              answered={Object.keys(answers).filter((k) => answers[Number(k)]).map(Number)}
              flagged={flagged}
              currentId={q.id}
              onJump={(qid) => {
                const idx = QUESTIONS.findIndex((qq) => qq.id === qid)
                if (idx >= 0) goTo(idx)
                else if (qid <= total) goTo(qid - 1)
              }}
              onSubmit={submit}
            />
          </aside>
        )}
      </div>

      {/* ── Bottom bar ──────────────────────────────────────── */}
      <footer className="sticky bottom-0 z-20 border-t border-v2-border bg-v2-surface/95 backdrop-blur-md">
        {/* Segmented progress strip — one cell per question */}
        <div className="grid h-1.5 w-full" style={{ gridTemplateColumns: `repeat(${EXAM_META.totalQuestions}, minmax(0, 1fr))` }}>
          {Array.from({ length: EXAM_META.totalQuestions }).map((_, i) => {
            const qid = i + 1
            const answered = Boolean(answers[qid])
            const isFlag = flagged.has(qid)
            const isCurrent = qid === q.id
            return (
              <span
                key={i}
                className={cn(
                  'h-full',
                  isCurrent
                    ? 'bg-v2-foreground'
                    : answered && isFlag
                    ? 'bg-v2-warning'
                    : answered
                    ? 'bg-v2-gradient-brand'
                    : isFlag
                    ? 'bg-v2-warning-soft'
                    : 'bg-v2-surface-sunken',
                )}
              />
            )
          })}
        </div>

        <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
          <button
            type="button"
            onClick={goPrev}
            disabled={current === 0}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-v2-border bg-v2-surface px-4 text-[13px] font-semibold text-v2-foreground transition-colors hover:bg-v2-surface-subtle disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={2.25} />
            Previous
          </button>

          <div className="hidden flex-1 text-center font-v2-mono text-[12px] uppercase tracking-v2-wide text-v2-foreground-subtle sm:block">
            {Object.values(answers).filter(Boolean).length} answered ·{' '}
            {flagged.size} flagged
          </div>
          <div className="flex-1 sm:hidden" />

          {current < total - 1 ? (
            <button
              type="button"
              onClick={goNext}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-v2-gradient-brand px-5 text-[13px] font-semibold text-white shadow-v2-button transition-all hover:-translate-y-0.5 hover:shadow-v2-elevated"
            >
              Next question
              <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
            </button>
          ) : (
            <button
              type="button"
              onClick={submit}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-v2-foreground px-5 text-[13px] font-semibold text-white transition-colors hover:bg-v2-deep-darker"
            >
              Submit exam
              <Check className="h-4 w-4" strokeWidth={2.5} />
            </button>
          )}
        </div>
      </footer>

      {/* Exit confirmation modal */}
      {confirmExit && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-40 flex items-center justify-center bg-v2-foreground/40 p-6 backdrop-blur-sm"
        >
          <div className="w-full max-w-[420px] rounded-2xl border border-v2-border bg-v2-surface p-7 shadow-v2-modal">
            <h3 className="text-[18px] font-bold text-v2-foreground">
              Exit this exam?
            </h3>
            <p className="mt-2 text-[14px] leading-[1.6] text-v2-foreground-muted">
              Your answers will be saved as a draft attempt. You can resume
              from where you left off — but your timer keeps running.
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmExit(false)}
                className="inline-flex h-10 items-center rounded-lg border border-v2-border bg-v2-surface px-4 text-[13px] font-semibold text-v2-foreground hover:bg-v2-surface-subtle"
              >
                Keep going
              </button>
              <Link
                href="/preview/dashboard"
                className="inline-flex h-10 items-center rounded-lg bg-v2-error px-4 text-[13px] font-semibold text-white hover:opacity-90"
              >
                Exit anyway
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Navigator (right rail) ───────────────────────────────────────────

function Navigator({
  total,
  answered,
  flagged,
  currentId,
  onJump,
  onSubmit,
}: {
  total: number
  answered: number[]
  flagged: Set<number>
  currentId: number
  onJump: (qid: number) => void
  onSubmit: () => void
}) {
  const answeredSet = new Set(answered)

  return (
    <div className="space-y-6">
      <div>
        <p className="font-v2-mono text-[11px] font-semibold uppercase tracking-v2-wide text-v2-foreground-subtle">
          Question navigator
        </p>
        <div className="mt-3 grid grid-cols-7 gap-1.5">
          {Array.from({ length: total }).map((_, i) => {
            const qid = i + 1
            const ansd = answeredSet.has(qid)
            const flag = flagged.has(qid)
            const cur = qid === currentId
            let cls =
              'flex h-9 items-center justify-center rounded-md border font-v2-mono text-[11px] font-semibold transition-colors'
            if (cur)
              cls +=
                ' bg-v2-foreground text-white border-v2-foreground'
            else if (ansd && flag)
              cls +=
                ' bg-v2-warning-soft border-v2-warning/40 text-v2-warning'
            else if (ansd)
              cls +=
                ' bg-v2-brand-soft border-v2-brand/30 text-v2-brand'
            else if (flag)
              cls +=
                ' border-v2-warning/40 text-v2-warning'
            else
              cls +=
                ' border-v2-border bg-v2-surface text-v2-foreground-muted hover:border-v2-border-strong hover:text-v2-foreground'

            return (
              <button
                key={qid}
                type="button"
                onClick={() => onJump(qid)}
                className={cls}
                aria-current={cur ? 'true' : undefined}
              >
                {qid}
              </button>
            )
          })}
        </div>
      </div>

      <div className="space-y-2 rounded-lg border border-v2-border-subtle bg-v2-surface-subtle/60 p-3">
        <LegendRow color="bg-v2-gradient-brand" label="Answered" />
        <LegendRow color="bg-v2-warning-soft border border-v2-warning/40" label="Flagged" />
        <LegendRow color="bg-v2-foreground" label="Current" />
        <LegendRow color="border border-v2-border bg-v2-surface" label="Unanswered" />
      </div>

      <button
        type="button"
        onClick={onSubmit}
        className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-v2-foreground text-[13px] font-semibold text-white transition-colors hover:bg-v2-deep-darker"
      >
        Submit exam
        <Check className="h-4 w-4" strokeWidth={2.5} />
      </button>
    </div>
  )
}

function LegendRow({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={cn('h-3 w-3 shrink-0 rounded-sm', color)} />
      <span className="text-[12px] text-v2-foreground-muted">{label}</span>
    </div>
  )
}
