'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { track } from '@/lib/analytics'
import type { Question } from '@/types/study'

interface QuestionCardProps {
  question: Question
  onAnswer: (selectedIndex: number, firstAttemptCorrect: boolean) => void
}

// Progressive-explanation flow (plan A3.2):
//   attempt 1 wrong  → reveal hint, lock selected option, allow ONE retry
//   attempt 2        → submit regardless of correctness
//   correct first try → submit immediately
// The submit callback receives `firstAttemptCorrect` so the evaluator can
// record the honest rating (only first-try-correct is "good"; everything
// else flags FSRS Again).
export function QuestionCard({ question, onAnswer }: QuestionCardProps) {
  const [selected, setSelected] = useState<number | null>(null)
  const [attempt, setAttempt] = useState<1 | 2>(1)
  const [hintShown, setHintShown] = useState(false)
  const [firstAttempt, setFirstAttempt] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)

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

    // First attempt correct, or no hint available, or on second attempt → submit.
    if (isCorrect || !hasHint || attempt === 2) {
      setSubmitting(true)
      const firstCorrect = attempt === 1 && isCorrect
      setTimeout(() => onAnswer(selected, firstCorrect), 200)
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
        <span className={cn('text-xs font-semibold', difficultyLabel.color)}>
          {difficultyLabel.label}
        </span>
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

      {/* Hint reveal — surfaces after a wrong first attempt */}
      {hintShown && question.hint && (
        <div className="mx-6 mb-2 rounded-xl border border-warning/30 bg-warning/5 px-4 py-3">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-warning">
            Hint
          </p>
          <p className="text-sm text-text-primary">{question.hint}</p>
          <p className="mt-2 text-xs italic text-text-muted">
            You get one retry. This question no longer counts as a "first-try correct".
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
