'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { Question } from '@/types/study'

interface QuestionCardProps {
  question: Question
  onAnswer: (selectedIndex: number) => void
}

export function QuestionCard({ question, onAnswer }: QuestionCardProps) {
  const [selected, setSelected] = useState<number | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const handleSelect = (index: number) => {
    if (submitted) return
    setSelected(index)
  }

  const handleSubmit = () => {
    if (selected === null || submitted) return
    setSubmitted(true)
    setTimeout(() => onAnswer(selected), 200)
  }

  const difficultyLabel =
    question.difficulty < 0.3
      ? { label: 'Fácil', color: 'text-success' }
      : question.difficulty < 0.6
      ? { label: 'Medio', color: 'text-warning' }
      : question.difficulty < 0.8
      ? { label: 'Difícil', color: 'text-danger' }
      : { label: 'Experto', color: 'text-danger' }

  return (
    <div className="rounded-2xl border border-border bg-surface shadow-card animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-6 py-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-text-muted">AWS SAA-C03</span>
          <span className="text-text-muted">·</span>
          <span className="text-xs font-medium text-text-muted">{question.conceptName}</span>
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
      </div>

      {/* Options */}
      <div className="px-6 pb-4 space-y-3">
        {question.options.map((option, index) => (
          <button
            key={index}
            onClick={() => handleSelect(index)}
            disabled={submitted}
            className={cn(
              'w-full text-left rounded-xl border px-4 py-3 text-sm transition-all',
              submitted && 'cursor-default',
              !submitted && 'hover:border-primary/50 hover:bg-primary/5',
              selected === index && !submitted
                ? 'border-primary bg-primary/10 text-text-primary'
                : 'border-border text-text-secondary',
              submitted && selected === index
                ? 'border-primary/30 bg-primary/5'
                : ''
            )}
          >
            <span className="flex items-start gap-3">
              <span
                className={cn(
                  'flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border text-xs font-semibold mt-0.5',
                  selected === index && !submitted
                    ? 'border-primary bg-primary text-white'
                    : 'border-border text-text-muted'
                )}
              >
                {String.fromCharCode(65 + index)}
              </span>
              <span className={cn(selected === index && !submitted ? 'text-text-primary' : '')}>
                {option}
              </span>
            </span>
          </button>
        ))}
      </div>

      {/* Submit button */}
      <div className="border-t border-border px-6 py-4">
        <button
          onClick={handleSubmit}
          disabled={selected === null || submitted}
          className="w-full btn-primary disabled:opacity-40"
        >
          {submitted ? (
            <span className="flex items-center gap-2">
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Evaluando...
            </span>
          ) : (
            'Confirmar respuesta'
          )}
        </button>
      </div>
    </div>
  )
}
