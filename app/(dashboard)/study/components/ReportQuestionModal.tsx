'use client'

import { useEffect, useState } from 'react'
import { Loader2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from '@/lib/toast'
import { track } from '@/lib/analytics'

export type ReportCategory =
  | 'wrong_answer'
  | 'multiple_correct'
  | 'unclear'
  | 'outdated'
  | 'other'

const CATEGORIES: { value: ReportCategory; label: string; helper: string }[] = [
  { value: 'wrong_answer', label: 'Wrong answer', helper: 'The marked correct option is incorrect.' },
  { value: 'multiple_correct', label: 'Multiple correct', helper: 'More than one option is valid.' },
  { value: 'unclear', label: 'Unclear or poorly worded', helper: 'Ambiguous, typo, or hard to parse.' },
  { value: 'outdated', label: 'Outdated', helper: 'AWS service or pricing has changed.' },
  { value: 'other', label: 'Other', helper: 'Comment is required.' },
]

interface ReportQuestionModalProps {
  open: boolean
  onClose: () => void
  questionId: string
  conceptId: string
  /** The option (0..3) the user had selected when opening the modal, if any. */
  userSelectedOption: number | null
}

export function ReportQuestionModal({
  open,
  onClose,
  questionId,
  conceptId,
  userSelectedOption,
}: ReportQuestionModalProps) {
  const [category, setCategory] = useState<ReportCategory | null>(null)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) {
      setCategory(null)
      setComment('')
      setSubmitting(false)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !submitting) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, submitting, onClose])

  if (!open) return null

  const otherNeedsComment =
    category === 'other' && comment.trim().length === 0
  const tooLong = comment.length > 2000
  const canSubmit = category !== null && !otherNeedsComment && !tooLong && !submitting

  async function handleSubmit() {
    if (!canSubmit || category === null) return
    setSubmitting(true)
    try {
      const payload: Record<string, unknown> = { questionId, category }
      const trimmed = comment.trim()
      if (trimmed.length > 0) payload['comment'] = trimmed
      if (userSelectedOption !== null) payload['userSelectedOption'] = userSelectedOption

      const res = await fetch('/api/questions/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.status === 429) {
        toast.warning('You have reported the limit (5/hour). Try again later.')
        setSubmitting(false)
        return
      }
      if (!res.ok) {
        toast.error('Could not submit report. Please try again.')
        setSubmitting(false)
        return
      }

      track({
        name: 'question_reported',
        properties: { question_id: questionId, concept_id: conceptId, category },
      })
      toast.success('Thanks — a reviewer will take a look.')
      onClose()
    } catch {
      toast.error('Could not submit report. Please try again.')
      setSubmitting(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={() => !submitting && onClose()}
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
      />
      <div className="relative w-full max-w-md rounded-xl border border-v2-border bg-v2-surface shadow-v2-elevated">
        <div className="flex items-start justify-between border-b border-v2-border-subtle px-5 py-4">
          <div>
            <h2
              id="report-modal-title"
              className="text-[15px] font-semibold text-v2-foreground"
            >
              Report this question
            </h2>
            <p className="mt-0.5 text-[12px] text-v2-foreground-muted">
              Tell us what's wrong. We review every report.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-md p-1 text-v2-foreground-muted transition-colors hover:bg-v2-surface-subtle hover:text-v2-foreground disabled:opacity-40"
            aria-label="Close"
          >
            <X className="h-4 w-4" strokeWidth={2.25} />
          </button>
        </div>

        <div className="space-y-2 px-5 py-4">
          {CATEGORIES.map((c) => {
            const selected = category === c.value
            return (
              <button
                key={c.value}
                type="button"
                onClick={() => setCategory(c.value)}
                disabled={submitting}
                aria-pressed={selected}
                className={cn(
                  'flex w-full flex-col items-start gap-0.5 rounded-lg border px-3 py-2.5 text-left transition-colors',
                  selected
                    ? 'border-v2-brand bg-v2-brand-soft'
                    : 'border-v2-border bg-v2-surface hover:border-v2-border-strong hover:bg-v2-surface-subtle/50',
                )}
              >
                <span className="text-[13px] font-semibold text-v2-foreground">
                  {c.label}
                </span>
                <span className="text-[11px] text-v2-foreground-muted">
                  {c.helper}
                </span>
              </button>
            )
          })}

          <div className="pt-2">
            <label
              htmlFor="report-comment"
              className="text-[12px] font-medium text-v2-foreground-muted"
            >
              Comment{' '}
              <span className="text-v2-foreground-subtle">
                {category === 'other' ? '(required)' : '(optional)'}
              </span>
            </label>
            <textarea
              id="report-comment"
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              disabled={submitting}
              maxLength={2000}
              placeholder="Add details that help the reviewer."
              className={cn(
                'mt-1 w-full rounded-lg border bg-v2-surface px-3 py-2 text-[13px] text-v2-foreground placeholder:text-v2-foreground-subtle',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-v2-brand focus-visible:ring-offset-1 focus-visible:ring-offset-v2-background',
                tooLong
                  ? 'border-v2-error focus:border-v2-error focus-visible:ring-v2-error'
                  : 'border-v2-border focus:border-v2-brand',
              )}
            />
            <div className="mt-1 flex justify-between text-[11px] text-v2-foreground-subtle">
              <span>{otherNeedsComment ? 'Please describe the issue.' : ''}</span>
              <span className={tooLong ? 'text-v2-error' : ''}>
                {comment.length}/2000
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-v2-border-subtle px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg px-3 py-2 text-[13px] font-medium text-v2-foreground-muted transition-colors hover:bg-v2-surface-subtle hover:text-v2-foreground disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={cn(
              'inline-flex items-center gap-2 rounded-lg bg-v2-gradient-brand px-4 py-2 text-[13px] font-semibold text-white shadow-v2-button transition-all',
              canSubmit && 'hover:-translate-y-0.5 hover:shadow-v2-elevated',
              'disabled:cursor-not-allowed disabled:opacity-40',
            )}
          >
            {submitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2.25} />
                Sending…
              </>
            ) : (
              'Submit report'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
