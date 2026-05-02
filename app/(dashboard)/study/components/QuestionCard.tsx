'use client'

import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { track } from '@/lib/analytics'
import type { Question } from '@/types/study'

interface QuestionCardProps {
  question: Question
  onAnswer: (selectedIndex: number, firstAttemptCorrect: boolean, confidence?: number) => void
  /** When set, shows a countdown timer (Automation phase). Auto-submits at 0. */
  timeLimitSec?: number
}

// Progressive-explanation flow (plan A3.2):
//   attempt 1 wrong  → reveal hint, lock selected option, allow ONE retry
//   attempt 2        → submit regardless of correctness
//   correct first try → submit immediately
// The submit callback receives `firstAttemptCorrect` so the evaluator can
// record the honest rating (only first-try-correct is "good"; everything
// else flags FSRS Again).
export function QuestionCard({ question, onAnswer, timeLimitSec }: QuestionCardProps) {
  const [selected, setSelected] = useState<number | null>(null)
  const [attempt, setAttempt] = useState<1 | 2>(1)
  const [hintShown, setHintShown] = useState(false)
  const [hintRequestedBeforeAnswer, setHintRequestedBeforeAnswer] = useState(false)
  const [firstAttempt, setFirstAttempt] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)
  // Metacognitive calibration: 1..5 confidence picked BEFORE the reveal.
  const [confidence, setConfidence] = useState<number | null>(null)
  // Ref-based lock prevents double-submit within a single React batch cycle.
  // useState alone has a race window: React hasn't flushed the state update yet
  // by the time a second tap (≤200ms on mobile) checks the lock, so both taps
  // read locked=false and queue a setTimeout. The ref is set synchronously and
  // is visible to the very next microtask, closing the window entirely.
  const submittingRef = useRef(false)

  const hasHint = Boolean(question.hint)
  const locked = submitting

  const handleSelect = (index: number) => {
    if (locked) return
    // On attempt 2, the user cannot reselect the same wrong option.
    if (attempt === 2 && index === firstAttempt) return
    setSelected(index)
  }

  const handleSubmit = () => {
    if (selected === null || locked) return

    const isCorrect = selected === question.correctIndex

    // First attempt correct, or no hint available, or on second attempt,
    // or user already consumed the hint proactively → submit.
    if (isCorrect || !hasHint || attempt === 2 || hintRequestedBeforeAnswer) {
      // Set ref synchronously before any async work so a second tap in the
      // same render cycle sees the lock immediately, before React re-renders.
      if (submittingRef.current) return
      submittingRef.current = true
      setSubmitting(true)
      // Proactive hint use forfeits first-try bonus even when correct.
      const firstCorrect = attempt === 1 && isCorrect && !hintRequestedBeforeAnswer
      setTimeout(() => onAnswer(selected, firstCorrect, confidence ?? undefined), 200)
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
      ? { label: 'Easy', color: 'text-success' }
      : question.difficulty < 0.6
      ? { label: 'Medium', color: 'text-warning' }
      : question.difficulty < 0.8
      ? { label: 'Hard', color: 'text-danger' }
      : { label: 'Expert', color: 'text-danger' }

  const scenario = question.scenarioContext ?? null

  return (
    <div className="rounded-2xl border border-border bg-surface shadow-card animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-6 py-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-text-muted">AWS SAA-C03</span>
          <span className="text-text-muted">·</span>
          <span className="text-xs font-medium text-text-muted">{question.conceptName}</span>
          {attempt === 2 && (
            <>
              <span className="text-text-muted">·</span>
              <span className="text-xs font-semibold text-warning">Retry</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className={cn('text-xs font-semibold', difficultyLabel.color)}>
            {difficultyLabel.label}
          </span>
          {hasHint && !hintShown && attempt === 1 && !locked && (
            <button
              onClick={() => {
                setHintShown(true)
                setHintRequestedBeforeAnswer(true)
                track({
                  name: 'hint_revealed',
                  properties: { concept_id: question.conceptId, question_id: question.id, proactive: true },
                })
              }}
              className="text-xs text-text-muted hover:text-warning transition-colors"
            >
              💡 Hint
            </button>
          )}
        </div>
      </div>

      {/* Question text */}
      <div className="px-6 py-5">
        <p className="text-base font-medium text-text-primary leading-relaxed">
          {question.questionText}
        </p>

        {scenario?.constraints && scenario.constraints.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {scenario.constraints.map((c, i) => (
              <span
                key={i}
                className="rounded-full border border-border bg-surface-2 px-3 py-1 text-xs text-text-secondary"
              >
                {c}
              </span>
            ))}
          </div>
        )}

        {scenario?.costTable && scenario.costTable.length > 0 && (
          <div className="mt-4 overflow-hidden rounded-lg border border-border">
            <table className="w-full text-xs">
              <thead className="bg-surface-2 text-text-muted">
                <tr>
                  {Object.keys(scenario.costTable[0] ?? {}).map(k => (
                    <th key={k} className="px-3 py-2 text-left font-semibold uppercase tracking-wide">
                      {k}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {scenario.costTable.map((row, i) => (
                  <tr key={i} className="border-t border-border">
                    {Object.values(row).map((v, j) => (
                      <td key={j} className="px-3 py-2 text-text-secondary">
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

      {/* Hint — shown proactively (user clicked 💡) or after a wrong first attempt */}
      {hintShown && question.hint && (
        <div className="mx-6 mb-2 rounded-xl border border-warning/30 bg-warning/5 px-4 py-3">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-warning">
            Hint
          </p>
          <p className="text-sm text-text-primary">{question.hint}</p>
          <p className="mt-2 text-xs italic text-text-muted">
            {hintRequestedBeforeAnswer
              ? 'First-try bonus forfeited — the system will still reinforce the concept.'
              : 'You get one retry. This question no longer counts as a "first-try correct".'}
          </p>
        </div>
      )}

      {/* Options */}
      <div className="px-6 pb-4 space-y-3">
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
                'w-full text-left rounded-xl border px-4 py-3 text-sm transition-all',
                locked && 'cursor-default',
                !locked && !isDisabledByRetry && 'hover:border-primary/50 hover:bg-primary/5',
                isDisabledByRetry && 'opacity-40 line-through cursor-not-allowed',
                isSelected && !locked
                  ? 'border-primary bg-primary/10 text-text-primary'
                  : 'border-border text-text-secondary'
              )}
            >
              <span className="flex items-start gap-3">
                <span
                  className={cn(
                    'flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border text-xs font-semibold mt-0.5',
                    isSelected && !locked
                      ? 'border-primary bg-primary text-white'
                      : 'border-border text-text-muted'
                  )}
                >
                  {String.fromCharCode(65 + index)}
                </span>
                <span className={cn(isSelected && !locked ? 'text-text-primary' : '')}>
                  {option}
                </span>
              </span>
            </button>
          )
        })}
      </div>

      {/* Confidence picker — appears once an option is selected (attempt 1 only). */}
      {selected !== null && attempt === 1 && (
        <div className="border-t border-border px-6 py-3">
          <p className="text-xs text-text-secondary mb-2">
            How confident are you? <span className="opacity-60">(optional — calibrates your metacognition)</span>
          </p>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map(v => (
              <button
                key={v}
                type="button"
                onClick={() => setConfidence(v)}
                disabled={locked}
                aria-label={`Confidence ${v} of 5`}
                className={cn(
                  'flex-1 rounded-lg border py-1.5 text-xs font-semibold transition-colors',
                  confidence === v
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-text-secondary hover:border-text-secondary'
                )}
              >
                {v === 1 ? '1 · guess' : v === 5 ? '5 · sure' : v}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Countdown timer — Automation phase. Shown when timeLimitSec is set. */}
      {timeLimitSec && (
        <Countdown
          seconds={timeLimitSec}
          paused={locked || attempt === 2}
          onTimeout={() => {
            if (selected === null && !locked) {
              // Forced timeout — submit -1 placeholder so server records a wrong attempt.
              // Easier: just submit current selection or 0 if none.
              const idx = selected ?? 0
              if (!submittingRef.current) {
                submittingRef.current = true
                setSubmitting(true)
                setTimeout(() => onAnswer(idx, false, confidence ?? undefined), 100)
              }
            } else if (selected !== null && !locked) {
              handleSubmit()
            }
          }}
        />
      )}

      {/* Submit button */}
      <div className="border-t border-border px-6 py-4">
        <button
          onClick={handleSubmit}
          disabled={selected === null || locked}
          className="w-full btn-primary disabled:opacity-40"
        >
          {locked ? (
            <span className="flex items-center gap-2">
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Evaluating...
            </span>
          ) : attempt === 2 ? (
            'Confirm retry'
          ) : (
            'Confirm answer'
          )}
        </button>
      </div>
    </div>
  )
}

// Countdown — drives the Automation phase 8s deadline. Shows a coloured bar
// + numeric seconds remaining, and fires onTimeout exactly once when it hits 0.
function Countdown({ seconds, paused, onTimeout }: { seconds: number; paused: boolean; onTimeout: () => void }) {
  const [remaining, setRemaining] = useState(seconds)
  const firedRef = useRef(false)

  useEffect(() => {
    if (paused) return
    if (remaining <= 0) {
      if (!firedRef.current) { firedRef.current = true; onTimeout() }
      return
    }
    const t = setTimeout(() => setRemaining(r => r - 1), 1000)
    return () => clearTimeout(t)
  }, [remaining, paused, onTimeout])

  const pct = Math.max(0, Math.min(100, (remaining / seconds) * 100))
  const tone = remaining <= 2 ? 'bg-danger' : remaining <= 4 ? 'bg-warning' : 'bg-success'

  return (
    <div className="border-t border-border px-6 py-3">
      <div className="flex items-center justify-between text-xs mb-1.5">
        <span className="font-semibold text-text-secondary">⏱ Automation drill</span>
        <span className="font-bold tabular-nums">{remaining}s</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-surface overflow-hidden">
        <div className={cn('h-full transition-all duration-1000 ease-linear', tone)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
