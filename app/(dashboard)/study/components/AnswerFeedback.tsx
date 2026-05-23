'use client'

import { useState } from 'react'
import {
  ArrowRight,
  Check,
  ChevronDown,
  Lightbulb,
  Sparkles,
  Wrench,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { track } from '@/lib/analytics'
import { Card } from '@/components/v2'
import type { Question, EvaluationResult } from '@/types/study'
import { ElaborationPanel } from './ElaborationPanel'

const TASK_LABELS: Record<string, string> = {
  '1.1': 'Secure access to AWS resources',
  '1.2': 'Secure workloads and applications',
  '1.3': 'Appropriate data security controls',
  '2.1': 'Scalable and loosely coupled architectures',
  '2.2': 'Highly available / fault-tolerant designs',
  '3.1': 'High-performing storage solutions',
  '3.2': 'High-performing compute solutions',
  '3.3': 'High-performing database solutions',
  '3.4': 'High-performing network architectures',
  '3.5': 'High-performing data ingestion & transform',
  '4.1': 'Cost-optimized storage solutions',
  '4.2': 'Cost-optimized compute solutions',
  '4.3': 'Cost-optimized database solutions',
  '4.4': 'Cost-optimized network architectures',
}

function DeepDive({
  content,
  tags,
  questionId,
  conceptId,
}: {
  content: string
  tags: string[]
  questionId: string
  conceptId: string
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="overflow-hidden rounded-lg border border-v2-border bg-v2-surface-subtle">
      <button
        onClick={() => {
          setOpen((v) => {
            if (!v)
              track({
                name: 'deep_explanation_opened',
                properties: { concept_id: conceptId, question_id: questionId },
              })
            return !v
          })
        }}
        className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-v2-surface-sunken/40"
      >
        <span className="font-v2-mono text-[11px] font-semibold uppercase tracking-v2-wide text-v2-foreground-muted">
          {open ? 'Hide deep dive' : 'Dive deeper into this concept'}
        </span>
        <ChevronDown
          className={cn(
            'h-3.5 w-3.5 text-v2-foreground-muted transition-transform duration-200',
            open && 'rotate-180',
          )}
          strokeWidth={2.25}
        />
      </button>
      {open && (
        <div className="space-y-3 border-t border-v2-border-subtle px-4 py-4">
          <p className="whitespace-pre-wrap text-[13px] leading-[1.65] text-v2-foreground-muted">
            {content}
          </p>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {tags.map((t) => (
                <span
                  key={t}
                  className="rounded-full bg-v2-brand-soft px-2 py-0.5 font-v2-mono text-[10px] font-semibold uppercase tracking-v2-wide text-v2-brand"
                >
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

interface AnswerFeedbackProps {
  question: Question
  selectedIndex: number
  evaluation: EvaluationResult
  onContinue: () => void
  isLast?: boolean
  /**
   * The active study_sessions.id, threaded through so the post-correct
   * ElaborationPanel can persist its row joined to the session for the
   * "% of sessions with ≥1 elaboration" product metric. Optional so the
   * component still mounts (and the panel silently no-ops) if a parent
   * forgets to pass it — degrades gracefully.
   */
  sessionId?: string
}

// Safe experimentation environment: negative feedback is NOT alarming red.
// It's amber-toned, constructive copy. The micro-elaboration step is shown
// BEFORE revealing the full reasoning (Bjork generation effect).
export function AnswerFeedback({
  question,
  selectedIndex,
  evaluation,
  onContinue,
  isLast,
  sessionId,
}: AnswerFeedbackProps) {
  const isOptimal = evaluation.isCorrect
  const [elaborationRevealed, setElaborationRevealed] = useState(false)
  const [userElaboration, setUserElaboration] = useState('')
  const showElaborationStep =
    !isOptimal && !!evaluation.elaboration && !elaborationRevealed

  return (
    <Card
      padding="none"
      className={cn(
        'overflow-hidden border-l-[3px]',
        isOptimal
          ? 'border-l-v2-success bg-v2-success-soft/30'
          : 'border-l-v2-warning bg-v2-warning-soft/30',
      )}
    >
      {/* Header */}
      <div
        className={cn(
          'flex items-start gap-3 border-b px-6 py-4',
          isOptimal ? 'border-v2-success/20' : 'border-v2-warning/20',
        )}
      >
        <div
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
            isOptimal
              ? 'bg-v2-success-soft text-v2-success'
              : 'bg-v2-warning-soft text-v2-warning',
          )}
        >
          {isOptimal ? (
            <Check className="h-5 w-5" strokeWidth={2.5} />
          ) : (
            <Wrench className="h-4 w-4" strokeWidth={2.25} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              'text-[15px] font-bold',
              isOptimal ? 'text-v2-success' : 'text-v2-warning',
            )}
          >
            {isOptimal ? 'Optimal choice' : 'Another option is preferable here'}
          </p>
          <p className="mt-0.5 text-[12px] leading-[1.5] text-v2-foreground-muted">
            {isOptimal
              ? 'The system reinforced this concept in your schedule.'
              : 'The system adjusted your schedule — this moves you closer to passing.'}
          </p>
          {question.blueprintTaskId && (
            <p className="mt-1 font-v2-mono text-[10px] uppercase tracking-v2-wide text-v2-foreground-subtle">
              Exam area {question.blueprintTaskId}
              {TASK_LABELS[question.blueprintTaskId]
                ? ` · ${TASK_LABELS[question.blueprintTaskId]}`
                : ''}
            </p>
          )}
        </div>
      </div>

      {/* Comparison */}
      <div className="space-y-2 bg-v2-surface px-6 py-5">
        <p className="font-v2-mono text-[11px] font-semibold uppercase tracking-v2-wide text-v2-foreground-muted">
          {isOptimal ? 'Your choice' : 'Comparison'}
        </p>

        {question.options.map((option, i) => {
          const isSelected = i === selectedIndex
          const isOptionOptimal = i === question.correctIndex

          return (
            <div
              key={i}
              className={cn(
                'flex items-start gap-3 rounded-xl border px-4 py-3 text-[14px]',
                isOptionOptimal
                  ? 'border-v2-success bg-v2-success-soft text-v2-foreground'
                  : isSelected && !isOptionOptimal
                    ? 'border-v2-warning bg-v2-warning-soft text-v2-foreground'
                    : 'border-v2-border-subtle bg-v2-surface text-v2-foreground-muted',
              )}
            >
              <span
                className={cn(
                  'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full font-v2-mono text-[10px] font-bold',
                  isOptionOptimal
                    ? 'bg-v2-success text-white'
                    : isSelected
                      ? 'bg-v2-warning text-white'
                      : 'border border-v2-border-strong text-v2-foreground-subtle',
                )}
              >
                {isOptionOptimal ? (
                  <Check className="h-3 w-3" strokeWidth={3} />
                ) : isSelected ? (
                  '·'
                ) : (
                  String.fromCharCode(65 + i)
                )}
              </span>
              <span
                className={cn(
                  'leading-[1.55]',
                  isOptionOptimal
                    ? 'font-semibold text-v2-foreground'
                    : isSelected
                      ? 'text-v2-foreground'
                      : 'text-v2-foreground-muted',
                )}
              >
                {option}
              </span>
              {(isOptionOptimal || (isSelected && !isOptionOptimal)) && (
                <span
                  className={cn(
                    'ml-auto shrink-0 font-v2-mono text-[10px] font-semibold uppercase tracking-v2-wide',
                    isOptionOptimal
                      ? isSelected
                        ? 'text-v2-success'
                        : 'text-v2-success'
                      : 'text-v2-warning',
                  )}
                >
                  {isOptionOptimal && isSelected
                    ? 'Your answer'
                    : isOptionOptimal
                      ? 'Best answer'
                      : 'Your answer'}
                </span>
              )}
            </div>
          )
        })}
      </div>

      {/* Micro-elaboration */}
      {showElaborationStep && evaluation.elaboration && (
        <div className="space-y-3 border-t border-v2-border-subtle bg-v2-warning-soft/40 px-6 py-5">
          <p className="font-v2-mono text-[11px] font-semibold uppercase tracking-v2-wide text-v2-warning">
            Before you continue
          </p>
          <p className="text-[14px] leading-[1.55] text-v2-foreground">
            {evaluation.elaboration.prompt}
          </p>
          <textarea
            value={userElaboration}
            onChange={(e) => setUserElaboration(e.target.value)}
            placeholder="Write one line (optional, not graded — the point is to think it through)"
            className="w-full resize-none rounded-lg border border-v2-border bg-v2-surface px-3 py-2 text-[14px] leading-[1.5] text-v2-foreground placeholder:text-v2-foreground-subtle focus:border-v2-warning focus:outline-none focus-visible:ring-2 focus-visible:ring-v2-warning/30"
            rows={2}
          />
          <button
            onClick={() => setElaborationRevealed(true)}
            className="inline-flex items-center gap-1 text-[12px] font-semibold text-v2-warning hover:underline"
          >
            Show the system's reasoning
            <ArrowRight className="h-3 w-3" strokeWidth={2.5} />
          </button>
        </div>
      )}

      {/* Explanation */}
      {(isOptimal || elaborationRevealed || !evaluation.elaboration) && (
        <div className="space-y-4 border-t border-v2-border-subtle bg-v2-surface px-6 py-5">
          {!isOptimal && evaluation.elaboration?.validReasoningHint && (
            <div className="rounded-lg bg-v2-surface-subtle px-4 py-3">
              <p className="font-v2-mono text-[10px] font-semibold uppercase tracking-v2-wide text-v2-foreground-muted">
                Your reasoning
              </p>
              <p className="mt-1 text-[13px] italic leading-[1.6] text-v2-foreground-muted">
                {evaluation.elaboration.validReasoningHint}
              </p>
            </div>
          )}

          <div>
            <p className="font-v2-mono text-[11px] font-semibold uppercase tracking-v2-wide text-v2-foreground-muted">
              {isOptimal ? "Why it's optimal" : 'Why the other is preferable here'}
            </p>
            <p className="mt-1.5 text-[14px] leading-[1.65] text-v2-foreground">
              {evaluation.explanation}
            </p>
          </div>

          {(question.keyInsight || evaluation.keyInsight) && (
            <div className="flex gap-3 rounded-lg border border-v2-brand/20 bg-v2-brand-soft/60 px-4 py-3">
              <Lightbulb
                className="mt-0.5 h-4 w-4 shrink-0 text-v2-brand"
                strokeWidth={2.25}
              />
              <div>
                <p className="font-v2-mono text-[10px] font-semibold uppercase tracking-v2-wide text-v2-brand">
                  Key takeaway
                </p>
                <p className="mt-1 text-[14px] leading-[1.55] text-v2-foreground">
                  {question.keyInsight || evaluation.keyInsight}
                </p>
              </div>
            </div>
          )}

          {question.explanationDeep && (
            <DeepDive
              content={question.explanationDeep}
              tags={question.tags ?? []}
              questionId={question.id}
              conceptId={question.conceptId}
            />
          )}

          {evaluation.studyTip && (
            <p className="text-[12px] italic text-v2-foreground-muted">
              {evaluation.studyTip}
            </p>
          )}

          {/*
            Post-correct elaboration: the twin of the pre-explanation Bjork
            panel above (which only fires on incorrect answers). Renders
            inline at the bottom of the explanation block — the user reads
            the model reasoning first, THEN gets the optional CTA to
            articulate it themselves. Component silently no-ops if no
            elaboration exists for this concept (404 from the GET), so we
            don't gate it on any availability check here.
          */}
          {isOptimal && (
            <ElaborationPanel
              conceptId={question.conceptId}
              questionId={question.id}
              sessionId={sessionId}
            />
          )}
        </div>
      )}

      {/* Continue */}
      <div className="border-t border-v2-border-subtle bg-v2-surface px-6 py-4">
        <button
          onClick={onContinue}
          disabled={showElaborationStep}
          className={cn(
            'inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-v2-gradient-brand text-[14px] font-semibold text-white shadow-v2-button transition-all duration-200 ease-v2',
            !showElaborationStep && 'hover:-translate-y-0.5 hover:shadow-v2-elevated',
            showElaborationStep && 'cursor-not-allowed opacity-50',
          )}
        >
          {isLast ? (
            <>
              <Sparkles className="h-4 w-4" strokeWidth={2.25} />
              See results
            </>
          ) : (
            <>
              Next question
              <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
            </>
          )}
        </button>
      </div>
    </Card>
  )
}
