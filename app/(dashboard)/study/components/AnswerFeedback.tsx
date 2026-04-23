'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { track } from '@/lib/analytics'
import type { Question, EvaluationResult } from '@/types/study'

function DeepDive({ content, tags, questionId, conceptId }: { content: string; tags: string[]; questionId: string; conceptId: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-lg border border-border bg-surface-2">
      <button
        onClick={() => {
          setOpen(v => {
            if (!v) track({ name: 'deep_explanation_opened', properties: { concept_id: conceptId, question_id: questionId } })
            return !v
          })
        }}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <span className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
          {open ? 'Hide deep dive' : 'Dive deeper into this concept'}
        </span>
        <span className={cn('text-text-muted transition-transform', open && 'rotate-180')}>▾</span>
      </button>
      {open && (
        <div className="border-t border-border/40 px-4 py-3 space-y-3">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-text-secondary">
            {content}
          </p>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {tags.map(t => (
                <span
                  key={t}
                  className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary"
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
}

// Pilar 3 — Entorno de Experimentación Seguro:
// El feedback negativo NO es rojo brillante con "¡Fallaste!". Es ámbar
// (construcción, no alarma), tipografía regular, lenguaje no-punitivo. La
// micro-pregunta de elaboración (Bjork generation effect) se muestra ANTES
// de revelar el razonamiento completo, invitando al usuario a procesar
// activamente el error.
export function AnswerFeedback({
  question,
  selectedIndex,
  evaluation,
  onContinue,
  isLast,
}: AnswerFeedbackProps) {
  const isOptimal = evaluation.isCorrect
  const [elaborationRevealed, setElaborationRevealed] = useState(false)
  const [userElaboration, setUserElaboration] = useState('')
  const showElaborationStep = !isOptimal && !!evaluation.elaboration && !elaborationRevealed

  return (
    <div
      className={cn(
        'rounded-2xl border shadow-card animate-fade-in-up',
        isOptimal ? 'border-success/30 bg-success/5' : 'border-warning/30 bg-warning/5'
      )}
    >
      {/* Header — construcción, no alarma */}
      <div
        className={cn(
          'flex items-center gap-3 border-b px-6 py-4',
          isOptimal ? 'border-success/20' : 'border-warning/20'
        )}
      >
        <div
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-full text-xl',
            isOptimal ? 'bg-success/20' : 'bg-warning/20'
          )}
        >
          {isOptimal ? '✓' : '🔧'}
        </div>
        <div>
          <p
            className={cn(
              'text-base font-semibold',
              isOptimal ? 'text-success' : 'text-warning'
            )}
          >
            {isOptimal ? 'Optimal choice' : 'Another option is preferable here'}
          </p>
          <p className="text-xs text-text-muted">
            {isOptimal
              ? 'The system reinforced this concept in your schedule.'
              : 'The system adjusted your schedule — this moves you closer to passing.'}
          </p>
        </div>
      </div>

      {/* Comparativa de respuestas */}
      <div className="px-6 py-4 space-y-3">
        <p className="text-sm font-medium text-text-secondary mb-3">
          {isOptimal ? 'Your choice:' : 'Comparison:'}
        </p>

        {question.options.map((option, i) => {
          const isSelected = i === selectedIndex
          const isOptionOptimal = i === question.correctIndex

          return (
            <div
              key={i}
              className={cn(
                'flex items-start gap-3 rounded-xl border px-4 py-3 text-sm',
                isOptionOptimal
                  ? 'border-success/40 bg-success/10'
                  : isSelected && !isOptionOptimal
                  ? 'border-warning/40 bg-warning/10'
                  : 'border-border/50 opacity-50'
              )}
            >
              <span
                className={cn(
                  'flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold mt-0.5',
                  isOptionOptimal
                    ? 'bg-success text-white'
                    : isSelected
                    ? 'bg-warning text-white'
                    : 'bg-surface text-text-muted border border-border'
                )}
              >
                {isOptionOptimal ? '✓' : isSelected ? '·' : String.fromCharCode(65 + i)}
              </span>
              <span
                className={cn(
                  isOptionOptimal
                    ? 'text-success font-medium'
                    : isSelected
                    ? 'text-warning'
                    : 'text-text-muted'
                )}
              >
                {option}
              </span>
            </div>
          )
        })}
      </div>

      {/* Pilar 3 — Micro-elaboración: invita al usuario a procesar el error
          ANTES de servirle la explicación completa (efecto de generación). */}
      {showElaborationStep && evaluation.elaboration && (
        <div className="border-t border-border/30 px-6 py-4 space-y-3 bg-warning/5">
          <p className="text-xs font-semibold text-warning uppercase tracking-wide">
            Before you continue
          </p>
          <p className="text-sm text-text-primary">{evaluation.elaboration.prompt}</p>
          <textarea
            value={userElaboration}
            onChange={e => setUserElaboration(e.target.value)}
            placeholder="Write one line (optional, not graded — the point is to think it through)"
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-warning focus:outline-none resize-none"
            rows={2}
          />
          <button
            onClick={() => setElaborationRevealed(true)}
            className="text-xs text-warning hover:underline"
          >
            Show the system’s reasoning →
          </button>
        </div>
      )}

      {/* Explicación — sólo cuando isOptimal o cuando el usuario reveló */}
      {(isOptimal || elaborationRevealed || !evaluation.elaboration) && (
        <div className="border-t border-border/30 px-6 py-4 space-y-3">
          {!isOptimal && evaluation.elaboration?.validReasoningHint && (
            <div className="rounded-lg bg-surface-2 px-4 py-3">
              <p className="text-xs font-semibold text-text-muted mb-1">
                Your reasoning
              </p>
              <p className="text-sm text-text-secondary italic">
                {evaluation.elaboration.validReasoningHint}
              </p>
            </div>
          )}

          <div>
            <p className="text-xs font-semibold text-text-muted mb-1 uppercase tracking-wide">
              {isOptimal ? 'Why it’s optimal' : 'Why the other is preferable here'}
            </p>
            <p className="text-sm text-text-secondary leading-relaxed">
              {evaluation.explanation}
            </p>
          </div>

          {/* Rich keyInsight (from pool) beats the generic one from the evaluator
              — and both can coexist if the question author wrote one. */}
          {(question.keyInsight || evaluation.keyInsight) && (
            <div className="rounded-lg bg-primary/10 border border-primary/20 px-4 py-3">
              <p className="text-xs font-semibold text-primary mb-1">Key takeaway</p>
              <p className="text-sm text-text-primary">
                {question.keyInsight || evaluation.keyInsight}
              </p>
            </div>
          )}

          {/* Deep dive — only shown on demand to avoid wall-of-text. */}
          {question.explanationDeep && (
            <DeepDive
              content={question.explanationDeep}
              tags={question.tags ?? []}
              questionId={question.id}
              conceptId={question.conceptId}
            />
          )}

          {evaluation.studyTip && (
            <p className="text-xs text-text-muted italic">{evaluation.studyTip}</p>
          )}
        </div>
      )}

      {/* Continue */}
      <div className="border-t border-border/30 px-6 py-4">
        <button
          onClick={onContinue}
          disabled={showElaborationStep}
          className={cn('w-full btn-primary', showElaborationStep && 'opacity-50 cursor-not-allowed')}
        >
          {isLast ? 'See results' : 'Next question →'}
        </button>
      </div>
    </div>
  )
}
