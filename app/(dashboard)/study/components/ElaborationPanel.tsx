'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowRight, BookOpen, Check, PenLine } from 'lucide-react'
import { cn } from '@/lib/utils'
import { track } from '@/lib/analytics'
import ReactMarkdown from 'react-markdown'

// Post-CORRECT elaboration panel — the twin of the post-incorrect Bjork
// prompt that already lives in AnswerFeedback.tsx:250-274.
//
// Pedagogy (gobierna decisión por decisión):
//   * The user writes BEFORE seeing the model explanation. Reveal is gated
//     behind submit. This is the entire point — Karpicke's elaborative
//     retrieval, the value is in the attempt.
//   * Opt-in via a discreet CTA. Ignoring it costs nothing — the parent
//     AnswerFeedback's Continue button always works.
//   * No grading, no XP, no badge. The closing line acknowledges the act
//     of writing as the reward in itself. Adult learners do not need
//     dopamine bait for a 30-second cognitive exercise.
//   * No LLM call. All content is pre-written and lives in
//     concept_elaborations (migration 052). If the concept has no row
//     there, this component renders nothing — silent fail, zero noise.
//
// Voice coherence (P1 product requirement): same vocabulary as the existing
// post-incorrect panel. "system" not "AI", "not graded — the point is to
// think it through" tone, mono-uppercase eyebrows, warning-soft for
// pre-submit / brand-soft for the model reveal so the two moments feel
// visually distinct but stylistically the same.

interface ElaborationContent {
  conceptId: string
  modelExplanationMd: string
  keyPoints: string[]
  metacognitivePrompt: string | null
}

interface ElaborationPanelProps {
  conceptId: string
  questionId: string
  sessionId?: string
}

type Phase = 'loading' | 'unavailable' | 'idle' | 'writing' | 'submitting' | 'done'

export function ElaborationPanel({ conceptId, questionId, sessionId }: ElaborationPanelProps) {
  const [phase, setPhase] = useState<Phase>('loading')
  const [content, setContent] = useState<ElaborationContent | null>(null)
  const [userText, setUserText] = useState('')
  const [coveredIdx, setCoveredIdx] = useState<Set<number>>(new Set())
  const [metaResponded, setMetaResponded] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Track `elaboration_offered` exactly once per concept/question impression.
  // Without the ref guard, React strict-mode double-mount in dev (and any
  // future re-render triggered by parent state) would fire the event twice
  // and pollute the funnel.
  const offeredTrackedRef = useRef(false)

  // Fetch the elaboration content as soon as we mount. If the concept has
  // no elaboration authored, the GET returns 404 and we render nothing —
  // the user never sees a broken CTA.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`/api/concepts/${conceptId}/elaboration`, {
          method: 'GET',
          credentials: 'same-origin',
        })
        if (cancelled) return
        if (res.status === 404) {
          setPhase('unavailable')
          return
        }
        if (!res.ok) {
          // Other error: treat as unavailable rather than show a broken
          // CTA. The user doesn't need to know our API has a bad day.
          setPhase('unavailable')
          return
        }
        const data = (await res.json()) as ElaborationContent
        if (cancelled) return
        setContent(data)
        setPhase('idle')

        if (!offeredTrackedRef.current) {
          offeredTrackedRef.current = true
          track({
            name: 'elaboration_offered',
            properties: {
              concept_id: conceptId,
              question_id: questionId,
              session_id: sessionId,
            },
          })
        }
      } catch {
        if (!cancelled) setPhase('unavailable')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [conceptId, questionId, sessionId])

  const handleStart = useCallback(() => {
    setPhase('writing')
    track({
      name: 'elaboration_started',
      properties: { concept_id: conceptId, question_id: questionId },
    })
  }, [conceptId, questionId])

  const handleSubmit = useCallback(async () => {
    if (!content || !sessionId) return
    const trimmed = userText.trim()
    if (trimmed.length === 0) return

    setPhase('submitting')
    setSubmitError(null)

    try {
      const res = await fetch('/api/elaborations', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conceptId,
          questionId,
          sessionId,
          userExplanation: trimmed,
          coveredPointIndices: [],
          metacognitiveResponded: false,
        }),
      })

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        setSubmitError(body.error ?? 'submit_failed')
        setPhase('writing')
        return
      }

      track({
        name: 'elaboration_submitted',
        properties: {
          concept_id: conceptId,
          question_id: questionId,
          session_id: sessionId,
          text_length: trimmed.length,
        },
      })
      setPhase('done')
    } catch {
      setSubmitError('network')
      setPhase('writing')
    }
  }, [content, sessionId, userText, conceptId, questionId])

  // Self-assessment writes are best-effort: we PATCH-ish the row by sending
  // a new insert? No — the table is INSERT-only. The covered indices have
  // to land on the SAME row as the submit. The simplest correct path is:
  // the user toggles checkboxes locally after `submitted`, and we fire a
  // single track event each time so PostHog can compute "average points
  // covered when users self-assess". We do NOT re-POST to elaboration_attempts
  // per toggle — the indices in the DB row stay at [] in v1 (matches the
  // DB default), and the self-assessment lives in analytics only. If the
  // founder wants per-user history of WHICH points they marked, we'd add
  // a PATCH endpoint in v1.5. For the "% sessions with elaboration" metric
  // this is sufficient.
  const handleTogglePoint = useCallback(
    (idx: number) => {
      if (!content) return
      const next = new Set(coveredIdx)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      setCoveredIdx(next)

      // Fire the self-assessment event once per toggle so the funnel
      // captures engagement depth. PostHog will dedupe-ish on properties
      // for cohort analysis.
      track({
        name: 'elaboration_self_assessed',
        properties: {
          concept_id: content.conceptId,
          points_covered_count: next.size,
          points_total: content.keyPoints.length,
        },
      })
    },
    [content, coveredIdx],
  )

  // Render nothing if loading, unavailable, or sessionId is missing.
  // Missing sessionId would make the POST fail anyway, and "no CTA" is the
  // right UX (the user is not in an active session — probably page-router
  // edge case during transition).
  if (phase === 'loading' || phase === 'unavailable' || !content || !sessionId) {
    return null
  }

  // STATE: idle — discreet opt-in CTA, no friction if ignored.
  if (phase === 'idle') {
    return (
      <button
        onClick={handleStart}
        className="group flex w-full items-center gap-3 rounded-lg border border-dashed border-v2-brand/40 bg-v2-brand-soft/40 px-4 py-3 text-left transition-colors hover:bg-v2-brand-soft/70"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-v2-brand-soft text-v2-brand">
          <PenLine className="h-4 w-4" strokeWidth={2.25} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-bold text-v2-brand">
            Explain it in your own words
          </p>
          <p className="text-[12px] leading-[1.5] text-v2-foreground-muted">
            30 seconds of writing nearly doubles what you'll remember in a
            week. Optional, not graded — the system reveals its own
            explanation after you submit.
          </p>
        </div>
      </button>
    )
  }

  // STATE: writing — textarea + submit. Model stays HIDDEN.
  if (phase === 'writing' || phase === 'submitting') {
    return (
      <div className="space-y-3 rounded-lg border border-v2-brand/30 bg-v2-brand-soft/40 px-5 py-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-v2-brand-soft text-v2-brand">
            <PenLine className="h-4 w-4" strokeWidth={2.25} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-v2-mono text-[11px] font-semibold uppercase tracking-v2-wide text-v2-brand">
              In your own words
            </p>
            <p className="mt-1 text-[13px] leading-[1.55] text-v2-foreground">
              Why is your answer correct? Two or three sentences. Don't
              rephrase the question — explain it like you would to a
              colleague who hasn't seen the answer yet.
            </p>
          </div>
        </div>
        <textarea
          value={userText}
          onChange={(e) => setUserText(e.target.value)}
          placeholder="Write here. Not graded — the act of articulating is the point."
          className="w-full resize-none rounded-lg border border-v2-border bg-v2-surface px-3 py-2 text-[14px] leading-[1.5] text-v2-foreground placeholder:text-v2-foreground-subtle focus:border-v2-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-v2-brand/30"
          rows={4}
          maxLength={4000}
          disabled={phase === 'submitting'}
          autoFocus
        />
        {submitError && (
          <p role="alert" className="text-[12px] text-v2-error">
            Couldn't save your elaboration — please try again.
          </p>
        )}
        <div className="flex items-center justify-between gap-3">
          <p className="font-v2-mono text-[10px] uppercase tracking-v2-wide text-v2-foreground-subtle">
            {userText.trim().length === 0
              ? 'Empty — nothing to compare yet'
              : `${userText.trim().length} chars`}
          </p>
          <button
            onClick={handleSubmit}
            disabled={userText.trim().length === 0 || phase === 'submitting'}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg bg-v2-brand px-4 py-2 text-[13px] font-semibold text-white shadow-v2-button transition-all duration-150',
              userText.trim().length > 0 && phase !== 'submitting'
                ? 'hover:-translate-y-0.5 hover:bg-v2-brand-hover hover:shadow-v2-elevated'
                : 'cursor-not-allowed opacity-50',
            )}
          >
            {phase === 'submitting' ? 'Saving…' : 'Reveal model & self-check'}
            <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.5} />
          </button>
        </div>
      </div>
    )
  }

  // STATE: done — side-by-side reveal + checklist self-assessment +
  // optional metacognitive seed. The closing line acknowledges the act,
  // does not gamify.
  return (
    <div className="space-y-4 rounded-lg border border-v2-brand/30 bg-v2-surface px-5 py-4">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-v2-brand-soft text-v2-brand">
          <BookOpen className="h-4 w-4" strokeWidth={2.25} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-v2-mono text-[11px] font-semibold uppercase tracking-v2-wide text-v2-brand">
            Side by side
          </p>
          <p className="text-[12px] leading-[1.5] text-v2-foreground-muted">
            Yours vs the model. Mark below what you covered — honor system,
            no grade, no judgment.
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-v2-border-subtle bg-v2-surface-subtle/60 p-3">
          <p className="font-v2-mono text-[10px] font-semibold uppercase tracking-v2-wide text-v2-foreground-muted">
            Your explanation
          </p>
          <p className="mt-1.5 whitespace-pre-wrap text-[13px] leading-[1.6] text-v2-foreground">
            {userText.trim()}
          </p>
        </div>
        <div className="rounded-lg border border-v2-brand/20 bg-v2-brand-soft/30 p-3">
          <p className="font-v2-mono text-[10px] font-semibold uppercase tracking-v2-wide text-v2-brand">
            Model explanation
          </p>
          <div className="prose prose-sm mt-1.5 max-w-none text-[13px] leading-[1.6] text-v2-foreground prose-strong:font-semibold prose-strong:text-v2-foreground prose-code:rounded prose-code:bg-v2-surface-sunken prose-code:px-1 prose-code:py-0.5 prose-code:font-v2-mono prose-code:text-[12px] prose-code:font-normal prose-code:text-v2-foreground">
            <ReactMarkdown>{content.modelExplanationMd}</ReactMarkdown>
          </div>
        </div>
      </div>

      <div>
        <p className="font-v2-mono text-[10px] font-semibold uppercase tracking-v2-wide text-v2-foreground-muted">
          What a good explanation covers
        </p>
        <ul className="mt-2 space-y-1.5">
          {content.keyPoints.map((point, idx) => {
            const checked = coveredIdx.has(idx)
            return (
              <li key={idx}>
                <button
                  onClick={() => handleTogglePoint(idx)}
                  className={cn(
                    'flex w-full items-start gap-2.5 rounded-md px-2 py-1.5 text-left text-[13px] leading-[1.5] transition-colors',
                    checked
                      ? 'bg-v2-success-soft/50 text-v2-foreground'
                      : 'text-v2-foreground-muted hover:bg-v2-surface-subtle',
                  )}
                >
                  <span
                    className={cn(
                      'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors',
                      checked
                        ? 'border-v2-success bg-v2-success text-white'
                        : 'border-v2-border-strong bg-v2-surface',
                    )}
                  >
                    {checked && <Check className="h-3 w-3" strokeWidth={3} />}
                  </span>
                  <span>{point}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>

      {content.metacognitivePrompt && (
        <div className="rounded-lg bg-v2-surface-subtle px-4 py-3">
          <p className="font-v2-mono text-[10px] font-semibold uppercase tracking-v2-wide text-v2-foreground-muted">
            For the road (no answer required)
          </p>
          <p className="mt-1 text-[13px] italic leading-[1.55] text-v2-foreground-muted">
            {content.metacognitivePrompt}
          </p>
          {!metaResponded && (
            <button
              onClick={() => setMetaResponded(true)}
              className="mt-2 text-[11px] font-semibold text-v2-brand hover:underline"
            >
              I'll think about it →
            </button>
          )}
          {metaResponded && (
            <p className="mt-2 text-[11px] font-semibold text-v2-success">
              Noted.
            </p>
          )}
        </div>
      )}

      <p className="border-t border-v2-border-subtle pt-3 text-[12px] italic leading-[1.55] text-v2-foreground-muted">
        That writing did more than the next ten clicks would have.
      </p>
    </div>
  )
}
