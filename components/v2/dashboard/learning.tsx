/**
 * Learning primitives — used inside lesson pages.
 *
 * Co-located here because they only show up in the reading column. Each
 * component is small but the typography/spacing rules are non-negotiable
 * (per directive §9): body 17px / 1.7, code blocks on the deep bg with a
 * language label, callouts with semantic-coloured left border, inline
 * practice cards with a brand-left rule.
 */
'use client'

import * as React from 'react'
import {
  Info,
  AlertTriangle,
  Lightbulb,
  Check,
  X,
  Copy as CopyIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Callout ──────────────────────────────────────────────────────────

type CalloutTone = 'info' | 'warning' | 'tip'

const CALLOUT_CONFIG: Record<
  CalloutTone,
  { Icon: typeof Info; bg: string; border: string; iconColor: string }
> = {
  info: {
    Icon: Info,
    bg: 'bg-v2-brand-soft/50',
    border: 'border-l-v2-brand',
    iconColor: 'text-v2-brand',
  },
  warning: {
    Icon: AlertTriangle,
    bg: 'bg-v2-warning-soft/60',
    border: 'border-l-v2-warning',
    iconColor: 'text-v2-warning',
  },
  tip: {
    Icon: Lightbulb,
    bg: 'bg-v2-success-soft/60',
    border: 'border-l-v2-success',
    iconColor: 'text-v2-success',
  },
}

export function Callout({
  tone = 'info',
  title,
  children,
}: {
  tone?: CalloutTone
  title?: string
  children: React.ReactNode
}) {
  const cfg = CALLOUT_CONFIG[tone]
  return (
    <aside
      className={cn(
        'my-8 flex gap-3 rounded-r-lg border-l-[3px] p-4',
        cfg.bg,
        cfg.border,
      )}
    >
      <cfg.Icon
        className={cn('mt-0.5 h-5 w-5 shrink-0', cfg.iconColor)}
        strokeWidth={2.25}
      />
      <div className="min-w-0">
        {title && (
          <p className="text-[14px] font-bold text-v2-foreground">{title}</p>
        )}
        <div
          className={cn(
            'text-[15px] leading-[1.65] text-v2-foreground',
            title && 'mt-1',
          )}
        >
          {children}
        </div>
      </div>
    </aside>
  )
}

// ── Code block ───────────────────────────────────────────────────────

export function CodeBlock({
  language,
  code,
}: {
  language: string
  code: string
}) {
  const [copied, setCopied] = React.useState(false)

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // ignore — older browsers
    }
  }

  return (
    <div className="my-8 overflow-hidden rounded-lg border border-v2-deep bg-v2-deep">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2">
        <span className="font-v2-mono text-[11px] font-semibold uppercase tracking-v2-wide text-white/60">
          {language}
        </span>
        <button
          type="button"
          onClick={onCopy}
          aria-label="Copy code"
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 font-v2-mono text-[11px] font-medium text-white/60 transition-colors hover:bg-white/10 hover:text-white"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3" strokeWidth={2.5} /> Copied
            </>
          ) : (
            <>
              <CopyIcon className="h-3 w-3" strokeWidth={2} /> Copy
            </>
          )}
        </button>
      </div>
      <pre className="overflow-x-auto px-4 py-4 font-v2-mono text-[13px] leading-[1.7] text-white/90">
        <code>{code}</code>
      </pre>
    </div>
  )
}

// Inline code — `aws iam list-users`
export function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded-[4px] bg-v2-surface-sunken px-1.5 py-0.5 font-v2-mono text-[0.88em] text-v2-foreground">
      {children}
    </code>
  )
}

// ── Inline practice question ─────────────────────────────────────────

export interface PracticeOption {
  label: string
  text: string
  correct?: boolean
}

export function InlineQuestion({
  question,
  options,
  explanation,
}: {
  question: string
  options: PracticeOption[]
  explanation: string
}) {
  const [selected, setSelected] = React.useState<string | null>(null)
  const [submitted, setSubmitted] = React.useState(false)

  const correct = options.find((o) => o.correct)?.label
  const isCorrect = submitted && selected === correct

  const reset = () => {
    setSelected(null)
    setSubmitted(false)
  }

  return (
    <aside className="my-10 rounded-r-lg border border-l-[3px] border-v2-border border-l-v2-brand bg-v2-surface p-6 shadow-v2-soft">
      <p className="font-v2-mono text-[11px] font-semibold uppercase tracking-v2-wide text-v2-brand">
        Check your understanding
      </p>
      <p className="mt-3 text-[16px] font-semibold leading-[1.5] text-v2-foreground">
        {question}
      </p>

      <ul className="mt-5 space-y-2">
        {options.map((o) => {
          const isSelected = selected === o.label
          let cls =
            'flex items-start gap-3 rounded-lg border bg-v2-surface px-4 py-3 text-left text-[14px] transition-colors duration-150'
          if (submitted && o.correct) {
            cls += ' border-v2-success bg-v2-success-soft text-v2-foreground'
          } else if (submitted && isSelected && !o.correct) {
            cls += ' border-v2-error bg-v2-error-soft text-v2-foreground'
          } else if (isSelected) {
            cls += ' border-v2-brand bg-v2-brand-soft text-v2-foreground'
          } else {
            cls +=
              ' border-v2-border text-v2-foreground hover:border-v2-border-strong'
          }
          return (
            <li key={o.label}>
              <button
                type="button"
                onClick={() => !submitted && setSelected(o.label)}
                className={cls + ' w-full'}
                disabled={submitted}
              >
                <span
                  className={cn(
                    'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full font-v2-mono text-[10px] font-bold',
                    submitted && o.correct
                      ? 'bg-v2-success text-white'
                      : submitted && isSelected && !o.correct
                      ? 'bg-v2-error text-white'
                      : isSelected
                      ? 'bg-v2-brand text-white'
                      : 'border border-v2-border-strong text-v2-foreground-muted',
                  )}
                >
                  {submitted && o.correct ? (
                    <Check className="h-3 w-3" strokeWidth={3} />
                  ) : submitted && isSelected && !o.correct ? (
                    <X className="h-3 w-3" strokeWidth={3} />
                  ) : (
                    o.label
                  )}
                </span>
                <span className="leading-[1.5]">{o.text}</span>
              </button>
            </li>
          )
        })}
      </ul>

      <div className="mt-5 flex items-center gap-3">
        {!submitted ? (
          <button
            type="button"
            disabled={!selected}
            onClick={() => setSubmitted(true)}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-v2-foreground px-5 text-[14px] font-semibold text-white transition-colors hover:bg-v2-deep-darker disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Check answer
          </button>
        ) : (
          <button
            type="button"
            onClick={reset}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-v2-border bg-v2-surface px-5 text-[14px] font-semibold text-v2-foreground hover:bg-v2-surface-subtle"
          >
            Try again
          </button>
        )}
        {submitted && (
          <span
            className={cn(
              'inline-flex items-center gap-1.5 font-v2-mono text-[12px] font-semibold uppercase tracking-v2-wide',
              isCorrect ? 'text-v2-success' : 'text-v2-error',
            )}
          >
            <span
              className={cn(
                'h-1.5 w-1.5 rounded-full',
                isCorrect ? 'bg-v2-success' : 'bg-v2-error',
              )}
            />
            {isCorrect ? 'Correct' : 'Not quite'}
          </span>
        )}
      </div>

      {submitted && (
        <div className="mt-5 rounded-lg bg-v2-surface-subtle p-4">
          <p className="text-[13px] font-semibold text-v2-foreground">
            Explanation
          </p>
          <p className="mt-1 text-[14px] leading-[1.65] text-v2-foreground-muted">
            {explanation}
          </p>
        </div>
      )}
    </aside>
  )
}
