'use client'

import { useState, useRef, useEffect } from 'react'
import { Clock, Flag, Lightbulb, Loader2, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { track } from '@/lib/analytics'
import { Card, Badge } from '@/components/v2'
import type { Question } from '@/types/study'
import { ReportQuestionModal } from './ReportQuestionModal'

interface QuestionCardProps {
  question: Question
  onAnswer: (
    selectedIndex: number,
    firstAttemptCorrect: boolean,
    confidence?: number,
  ) => void
  /** When set, shows a countdown timer (Automation phase). Auto-submits at 0. */
  timeLimitSec?: number
}

// Progressive-explanation flow:
//   attempt 1 wrong  → reveal hint, lock selected option, allow ONE retry
//   attempt 2        → submit regardless of correctness
//   correct first try → submit immediately
// The submit callback receives `firstAttemptCorrect` so the evaluator can
// record the honest rating (only first-try-correct is "good"; everything
// else flags FSRS Again).
export function QuestionCard({
  question,
  onAnswer,
  timeLimitSec,
}: QuestionCardProps) {
  const [selected, setSelected] = useState<number | null>(null)
  const [attempt, setAttempt] = useState<1 | 2>(1)
  const [hintShown, setHintShown] = useState(false)
  const [hintRequestedBeforeAnswer, setHintRequestedBeforeAnswer] =
    useState(false)
  const [firstAttempt, setFirstAttempt] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)
  // Metacognitive calibration: 1..5 confidence picked BEFORE the reveal.
  // After 10 ratings we collapse the picker behind a small "Add confidence"
  // toggle. Tracked in localStorage so the threshold survives across sessions.
  const [confidence, setConfidence] = useState<number | null>(null)
  const [showConfidence, setShowConfidence] = useState(true)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const count = Number(
      localStorage.getItem('maestring_confidence_count') ?? '0',
    )
    if (count >= 10) setShowConfidence(false)
  }, [])
  function recordConfidenceUse() {
    if (typeof window === 'undefined') return
    const count =
      Number(localStorage.getItem('maestring_confidence_count') ?? '0') + 1
    localStorage.setItem('maestring_confidence_count', String(count))
  }
  // Ref-based double-submit lock — see legacy comments for the race details.
  const submittingRef = useRef(false)
  const [reportOpen, setReportOpen] = useState(false)

  const hasHint = Boolean(question.hint)
  const locked = submitting

  const handleSelect = (index: number) => {
    if (locked) return
    if (attempt === 2 && index === firstAttempt) return
    setSelected(index)
  }

  const handleSubmit = () => {
    if (selected === null || locked) return

    const isCorrect = selected === question.correctIndex

    if (
      isCorrect ||
      !hasHint ||
      attempt === 2 ||
      hintRequestedBeforeAnswer
    ) {
      if (submittingRef.current) return
      submittingRef.current = true
      setSubmitting(true)
      const firstCorrect =
        attempt === 1 && isCorrect && !hintRequestedBeforeAnswer
      setTimeout(
        () => onAnswer(selected, firstCorrect, confidence ?? undefined),
        200,
      )
      return
    }

    // First attempt wrong + hint available → show hint, allow one retry.
    setFirstAttempt(selected)
    setHintShown(true)
    setAttempt(2)
    setSelected(null)
    track({
      name: 'hint_revealed',
      properties: { concept_id: question.conceptId, question_id: question.id },
    })
  }

  const difficultyLabel =
    question.difficulty < 0.3
      ? { label: 'Easy', tone: 'success' as const }
      : question.difficulty < 0.6
        ? { label: 'Medium', tone: 'warning' as const }
        : question.difficulty < 0.8
          ? { label: 'Hard', tone: 'error' as const }
          : { label: 'Expert', tone: 'error' as const }

  const scenario = question.scenarioContext ?? null

  return (
    <Card padding="none" className="overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-v2-border-subtle px-6 py-3">
        <div className="flex items-center gap-2 text-[12px]">
          <span className="rounded-md border border-v2-brand/20 bg-v2-brand-soft px-1.5 py-0.5 font-v2-mono text-[10px] font-semibold uppercase tracking-v2-wide text-v2-brand">
            SAA-C03
          </span>
          <span className="font-medium text-v2-foreground-muted">
            {question.conceptName}
          </span>
          {attempt === 2 && (
            <Badge tone="warning" size="sm" className="ml-1">
              Retry
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Badge tone={difficultyLabel.tone} size="sm">
            {difficultyLabel.label}
          </Badge>
          {hasHint && !hintShown && attempt === 1 && !locked && (
            <button
              onClick={() => {
                setHintShown(true)
                setHintRequestedBeforeAnswer(true)
                track({
                  name: 'hint_revealed',
                  properties: {
                    concept_id: question.conceptId,
                    question_id: question.id,
                    proactive: true,
                  },
                })
              }}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-v2-foreground-muted transition-colors hover:bg-v2-warning-soft hover:text-v2-warning"
            >
              <Lightbulb className="h-3 w-3" strokeWidth={2.25} />
              Hint
            </button>
          )}
          <button
            onClick={() => setReportOpen(true)}
            disabled={locked}
            aria-label="Report this question"
            title="Report this question"
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-v2-foreground-muted transition-colors hover:bg-v2-error-soft hover:text-v2-error disabled:opacity-40"
          >
            <Flag className="h-3 w-3" strokeWidth={2.25} />
            Report
          </button>
        </div>
      </div>

      {/* Question text */}
      <div className="px-6 py-6">
        <p className="text-[16px] font-semibold leading-[1.55] text-v2-foreground sm:text-[17px]">
          {question.questionText}
        </p>

        {scenario?.constraints && scenario.constraints.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {scenario.constraints.map((c, i) => (
              <span
                key={i}
                className="rounded-full border border-v2-border bg-v2-surface-subtle px-3 py-1 font-v2-mono text-[11px] text-v2-foreground-muted"
              >
                {c}
              </span>
            ))}
          </div>
        )}

        {scenario?.costTable && scenario.costTable.length > 0 && (
          <div className="mt-4 overflow-hidden rounded-lg border border-v2-border">
            <table className="w-full text-[12px]">
              <thead className="bg-v2-surface-subtle">
                <tr>
                  {Object.keys(scenario.costTable[0] ?? {}).map((k) => (
                    <th
                      key={k}
                      className="px-3 py-2 text-left font-v2-mono text-[10px] font-semibold uppercase tracking-v2-wide text-v2-foreground-subtle"
                    >
                      {k}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {scenario.costTable.map((row, i) => (
                  <tr key={i} className="border-t border-v2-border-subtle">
                    {Object.values(row).map((v, j) => (
                      <td
                        key={j}
                        className="px-3 py-2 text-v2-foreground-muted"
                      >
                        {String(v)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Hint */}
      {hintShown && question.hint && (
        <div className="mx-6 mb-2 flex gap-3 rounded-r-lg border-l-[3px] border-l-v2-warning bg-v2-warning-soft/60 px-4 py-3">
          <Lightbulb
            className="mt-0.5 h-4 w-4 shrink-0 text-v2-warning"
            strokeWidth={2.25}
          />
          <div>
            <p className="font-v2-mono text-[10px] font-semibold uppercase tracking-v2-wide text-v2-warning">
              Hint
            </p>
            <p className="mt-1 text-[14px] leading-[1.55] text-v2-foreground">
              {question.hint}
            </p>
            <p className="mt-2 text-[11px] italic text-v2-foreground-muted">
              {hintRequestedBeforeAnswer
                ? 'First-try bonus forfeited — the system will still reinforce the concept.'
                : 'You get one retry. This question no longer counts as a "first-try correct".'}
            </p>
          </div>
        </div>
      )}

      {/* Options */}
      <div className="space-y-2 px-6 pb-4">
        {question.options.map((option, index) => {
          const isDisabledByRetry = attempt === 2 && index === firstAttempt
          const isSelected = selected === index
          return (
            <button
              key={index}
              onClick={() => handleSelect(index)}
              disabled={locked || isDisabledByRetry}
              aria-pressed={isSelected}
              className={cn(
                'flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left transition-all duration-150',
                locked && 'cursor-default',
                !locked &&
                  !isDisabledByRetry &&
                  !isSelected &&
                  'hover:border-v2-border-strong hover:bg-v2-surface-subtle/50',
                isDisabledByRetry &&
                  'cursor-not-allowed line-through opacity-40',
                isSelected && !locked
                  ? 'border-v2-brand bg-v2-brand-soft shadow-v2-soft'
                  : 'border-v2-border bg-v2-surface',
              )}
            >
              <span
                className={cn(
                  'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-v2-mono text-[11px] font-bold transition-colors',
                  isSelected && !locked
                    ? 'bg-v2-brand text-white shadow-v2-button'
                    : 'border border-v2-border-strong text-v2-foreground-muted',
                )}
              >
                {String.fromCharCode(65 + index)}
              </span>
              <span
                className={cn(
                  'text-[14px] leading-[1.55]',
                  isSelected && !locked
                    ? 'text-v2-foreground'
                    : 'text-v2-foreground-muted',
                )}
              >
                {option}
              </span>
            </button>
          )
        })}
      </div>

      {/* Confidence picker (attempt 1) */}
      {selected !== null && attempt === 1 && (
        showConfidence ? (
          <div className="border-t border-v2-border-subtle bg-v2-surface-subtle/40 px-6 py-3">
            <p className="text-[12px] text-v2-foreground-muted">
              How confident are you?{' '}
              <span className="text-v2-foreground-subtle">
                (optional — calibrates your metacognition)
              </span>
            </p>
            <div className="mt-2 flex gap-1.5">
              {[1, 2, 3, 4, 5].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => {
                    setConfidence(v)
                    recordConfidenceUse()
                  }}
                  disabled={locked}
                  aria-label={`Confidence ${v} of 5`}
                  className={cn(
                    'flex-1 rounded-md border px-2 py-1.5 text-[11px] font-bold transition-colors',
                    confidence === v
                      ? 'border-v2-brand bg-v2-brand-soft text-v2-brand'
                      : 'border-v2-border bg-v2-surface text-v2-foreground-muted hover:border-v2-border-strong hover:text-v2-foreground',
                  )}
                >
                  {v === 1 ? '1 · guess' : v === 5 ? '5 · sure' : v}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="border-t border-v2-border-subtle px-6 py-2.5">
            <button
              type="button"
              onClick={() => setShowConfidence(true)}
              className="text-[12px] font-medium text-v2-foreground-muted hover:text-v2-foreground"
            >
              + Add confidence rating
            </button>
          </div>
        )
      )}

      {/* Countdown — Automation phase */}
      {timeLimitSec && (
        <Countdown
          seconds={timeLimitSec}
          paused={locked || attempt === 2}
          onTimeout={() => {
            if (selected === null && !locked) {
              const idx = selected ?? 0
              if (!submittingRef.current) {
                submittingRef.current = true
                setSubmitting(true)
                setTimeout(
                  () => onAnswer(idx, false, confidence ?? undefined),
                  100,
                )
              }
            } else if (selected !== null && !locked) {
              handleSubmit()
            }
          }}
        />
      )}

      {/* Submit */}
      <div className="border-t border-v2-border-subtle px-6 py-4">
        <button
          onClick={handleSubmit}
          disabled={selected === null || locked}
          className={cn(
            'inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-v2-gradient-brand text-[14px] font-semibold text-white shadow-v2-button transition-all duration-200 ease-v2',
            !locked &&
              selected !== null &&
              'hover:-translate-y-0.5 hover:shadow-v2-elevated',
            'disabled:cursor-not-allowed disabled:opacity-40',
          )}
        >
          {locked ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.25} />
              Evaluating…
            </>
          ) : attempt === 2 ? (
            'Confirm retry'
          ) : (
            <>
              <Sparkles className="h-4 w-4" strokeWidth={2.25} />
              Confirm answer
            </>
          )}
        </button>
      </div>
      <ReportQuestionModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        questionId={question.id}
        conceptId={question.conceptId}
        userSelectedOption={selected}
      />
    </Card>
  )
}

function Countdown({
  seconds,
  paused,
  onTimeout,
}: {
  seconds: number
  paused: boolean
  onTimeout: () => void
}) {
  const [remaining, setRemaining] = useState(seconds)
  const firedRef = useRef(false)

  useEffect(() => {
    if (paused) return
    if (remaining <= 0) {
      if (!firedRef.current) {
        firedRef.current = true
        onTimeout()
      }
      return
    }
    const t = setTimeout(() => setRemaining((r) => r - 1), 1000)
    return () => clearTimeout(t)
  }, [remaining, paused, onTimeout])

  const pct = Math.max(0, Math.min(100, (remaining / seconds) * 100))
  const tone =
    remaining <= 2
      ? 'bg-v2-error'
      : remaining <= 4
        ? 'bg-v2-warning'
        : 'bg-v2-success'

  return (
    <div className="border-t border-v2-border-subtle bg-v2-surface-subtle/40 px-6 py-3">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 font-v2-mono text-[11px] font-semibold uppercase tracking-v2-wide text-v2-foreground-muted">
          <Clock className="h-3 w-3" strokeWidth={2.25} />
          Automation drill
        </span>
        <span className="font-v2-mono text-[14px] font-bold tabular-nums text-v2-foreground">
          {remaining}s
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-v2-surface-sunken">
        <div
          className={cn(
            'h-full transition-all duration-1000 ease-linear',
            tone,
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
