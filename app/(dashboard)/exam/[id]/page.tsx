'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  Clock,
  Flag,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card } from '@/components/v2'

interface ExamItem {
  position: number
  user_answer_index: number | null
  flagged: boolean
  answered_at: string | null
  is_correct: boolean | null
  question: {
    id: string
    question_text: string
    options: string[]
    difficulty: string
    concept_slug: string | null
    concept_name: string | null
    domain_slug: string | null
    domain_name: string | null
    correct_index: number | null
    explanation: string | null
  }
}

interface ExamSession {
  id: string
  status: 'in_progress' | 'submitted' | 'abandoned'
  started_at: string
  deadline_at: string
  total_questions: number
}

export default function ExamRunnerPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [session, setSession] = useState<ExamSession | null>(null)
  const [items, setItems] = useState<ExamItem[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [now, setNow] = useState(() => Date.now())
  const [submitting, setSubmitting] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [answerError, setAnswerError] = useState<string | null>(null)
  const [confirmingSubmit, setConfirmingSubmit] = useState(false)
  const submittedRef = useRef(false)

  const submitExam = useCallback(async () => {
    if (submittedRef.current) return
    submittedRef.current = true
    setSubmitting(true)
    setSubmitError(null)
    // Previously this was a fire-and-forget `await fetch(...)` with no `res.ok`
    // check, so a 500 from the submit endpoint navigated the user to the
    // results page anyway — making them think their exam was graded when it
    // was actually still `in_progress` on the server.
    try {
      const res = await fetch(`/api/exam/${params.id}/submit`, { method: 'POST' })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        const msg =
          (j as { error?: string; message?: string })?.message ??
          (j as { error?: string; message?: string })?.error ??
          `Couldn't submit (HTTP ${res.status}). Please try again.`
        console.error('ExamRunner submit failed', { status: res.status, body: j })
        setSubmitError(msg)
        submittedRef.current = false
        setSubmitting(false)
        return
      }
    } catch (err) {
      console.error('ExamRunner submit network error', err)
      setSubmitError("Network error. Your exam was not submitted — please try again.")
      submittedRef.current = false
      setSubmitting(false)
      return
    }
    router.push(`/exam/${params.id}/results`)
  }, [params.id, router])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`/api/exam/${params.id}`)
        if (cancelled) return
        const json = await res.json().catch(() => ({}))
        if (!res.ok) {
          setLoadError((json as { error?: string })?.error ?? `Couldn't load (HTTP ${res.status})`)
          return
        }
        if (json.data.session.status !== 'in_progress') {
          router.replace(`/exam/${params.id}/results`)
          return
        }
        setSession(json.data.session)
        setItems(json.data.items)
        const firstUnanswered = json.data.items.findIndex((it: ExamItem) => it.user_answer_index === null)
        setCurrentIdx(firstUnanswered === -1 ? 0 : firstUnanswered)
      } catch (err) {
        if (cancelled) return
        console.error('ExamRunner load network error', err)
        setLoadError("Network error. Couldn't load the exam — please refresh.")
      }
    })()
    return () => {
      cancelled = true
    }
  }, [params.id, router])

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const deadlineMs = session ? new Date(session.deadline_at).getTime() : 0
  const secondsLeft = Math.max(0, Math.floor((deadlineMs - now) / 1000))

  useEffect(() => {
    if (!session) return
    if (secondsLeft === 0 && !submittedRef.current) {
      void submitExam()
    }
  }, [secondsLeft, session, submitExam])

  const current = items[currentIdx]

  async function persistAnswer(position: number, answerIndex: number | null, flagged: boolean) {
    // Fire-and-forget previously: a bare `await fetch(...)` discarded both
    // non-2xx responses and network errors, so a failed answer save looked
    // identical to a successful one — leading to invisible data loss during
    // the mock exam. Surface both failure modes inline so the user knows
    // their last action didn't persist, without blocking the UI.
    try {
      const res = await fetch(`/api/exam/${params.id}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ position, answerIndex, flagged }),
      })
      if (!res.ok) {
        console.error('ExamRunner persistAnswer failed', { status: res.status, position })
        setAnswerError(
          `We couldn't save your last change (HTTP ${res.status}). Your answer may not be recorded — try again.`
        )
        return
      }
      setAnswerError(null)
    } catch (err) {
      console.error('ExamRunner persistAnswer network error', err)
      setAnswerError("We couldn't save your last change. Check your connection and try again.")
    }
  }

  function selectAnswer(answerIndex: number) {
    if (!current) return
    const pos = current.position
    setItems((prev) =>
      prev.map((it) =>
        it.position === pos ? { ...it, user_answer_index: answerIndex, answered_at: new Date().toISOString() } : it
      )
    )
    void persistAnswer(pos, answerIndex, current.flagged)
  }

  function toggleFlag() {
    if (!current) return
    const pos = current.position
    const newFlag = !current.flagged
    setItems((prev) => prev.map((it) => (it.position === pos ? { ...it, flagged: newFlag } : it)))
    void persistAnswer(pos, current.user_answer_index, newFlag)
  }

  if (loadError) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <Card padding="lg" className="max-w-[420px] text-center">
          <AlertCircle
            className="mx-auto h-8 w-8 text-v2-error"
            strokeWidth={2}
          />
          <p className="mt-3 text-[14px] font-semibold text-v2-error">
            {loadError}
          </p>
          <a
            href="/exam"
            className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-v2-foreground px-4 text-[13px] font-semibold text-white transition-colors hover:bg-v2-deep-darker"
          >
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2.25} />
            Back to exams
          </a>
        </Card>
      </div>
    )
  }

  if (!session || !current) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-v2-foreground-muted">
        <span className="font-v2-mono text-[12px] uppercase tracking-v2-wide">
          Loading mock exam…
        </span>
      </div>
    )
  }

  const mins = Math.floor(secondsLeft / 60)
  const secs = secondsLeft % 60
  const isLowTime = secondsLeft < 600
  const isCritical = secondsLeft < 120
  const answeredCount = items.filter((it) => it.user_answer_index !== null).length

  return (
    <div className="-mx-4 -my-8 flex h-[calc(100vh-3.5rem)] flex-col bg-v2-background sm:-mx-6 sm:-my-10">
      {(submitError || answerError) && (
        <div
          role="alert"
          className="border-b border-v2-error/30 bg-v2-error-soft px-6 py-2 text-[12px] font-medium text-v2-error"
        >
          {submitError ?? answerError}
        </div>
      )}

      {/* Top bar */}
      <div
        className={cn(
          'flex items-center justify-between gap-4 border-b px-6 py-3 transition-colors',
          isLowTime
            ? 'border-v2-error/30 bg-v2-error-soft/40'
            : 'border-v2-border bg-v2-surface',
        )}
      >
        <div className="flex items-center gap-3">
          <span className="rounded-md border border-v2-brand/20 bg-v2-brand-soft px-1.5 py-0.5 font-v2-mono text-[10px] font-semibold uppercase tracking-v2-wide text-v2-brand">
            SAA-C03
          </span>
          <span className="text-[13px] font-semibold text-v2-foreground">
            Question {currentIdx + 1} / {items.length}
          </span>
          <span className="hidden font-v2-mono text-[11px] text-v2-foreground-subtle sm:inline">
            {answeredCount} answered
          </span>
        </div>

        {/* Timer */}
        <div
          aria-live="polite"
          aria-label={`Time remaining: ${String(mins).padStart(2, '0')} minutes ${String(secs).padStart(2, '0')} seconds`}
          className={cn(
            'inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 transition-colors',
            isCritical
              ? 'animate-pulse border-v2-error/40 bg-v2-error-soft text-v2-error'
              : isLowTime
                ? 'border-v2-warning/40 bg-v2-warning-soft text-v2-warning'
                : 'border-v2-border bg-v2-surface text-v2-foreground',
          )}
        >
          <Clock className="h-3.5 w-3.5" strokeWidth={2.25} />
          <span className="font-v2-mono text-[15px] font-bold tabular-nums tracking-v2-tight">
            {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
          </span>
        </div>

        {/* Submit */}
        {!confirmingSubmit ? (
          <button
            onClick={() => setConfirmingSubmit(true)}
            disabled={submitting}
            className="inline-flex h-9 items-center justify-center rounded-lg bg-v2-foreground px-4 text-[13px] font-semibold text-white transition-colors hover:bg-v2-deep-darker disabled:opacity-50"
          >
            {submitting ? 'Submitting…' : 'Submit'}
          </button>
        ) : (
          <span className="flex flex-wrap items-center gap-2 text-[12px]">
            <span className="text-v2-foreground-muted">
              {answeredCount}/{items.length} answered. Submit?
            </span>
            <button
              onClick={() => {
                setConfirmingSubmit(false)
                void submitExam()
              }}
              className="font-bold text-v2-error hover:underline"
            >
              Yes
            </button>
            <button
              onClick={() => setConfirmingSubmit(false)}
              className="text-v2-foreground-muted hover:text-v2-foreground"
            >
              Cancel
            </button>
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Question area */}
        <div className="flex-1 overflow-y-auto px-6 py-8 sm:px-8 sm:py-10">
          <div className="mx-auto max-w-[820px]">
            {/* Question header */}
            <div className="flex items-center justify-between gap-3">
              <span className="font-v2-mono text-[11px] uppercase tracking-v2-wide text-v2-foreground-subtle">
                Domain · {current.question.domain_name ?? 'Domain'}
              </span>
              <button
                onClick={toggleFlag}
                aria-pressed={current.flagged}
                className={cn(
                  'inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[12px] font-medium transition-colors',
                  current.flagged
                    ? 'bg-v2-warning-soft text-v2-warning'
                    : 'text-v2-foreground-muted hover:bg-v2-surface-subtle hover:text-v2-foreground',
                )}
              >
                <Flag
                  className="h-3.5 w-3.5"
                  strokeWidth={2.25}
                  fill={current.flagged ? 'currentColor' : 'none'}
                  fillOpacity={current.flagged ? 0.25 : 0}
                />
                {current.flagged ? 'Flagged' : 'Flag'}
              </button>
            </div>

            {/* Question text */}
            <p className="mt-5 whitespace-pre-wrap text-[17px] font-semibold leading-[1.55] text-v2-foreground sm:text-[18px]">
              {current.question.question_text}
            </p>

            {/* Options */}
            <div className="mt-7 space-y-3">
              {current.question.options.map((opt, i) => {
                const isSel = current.user_answer_index === i
                return (
                  <button
                    key={i}
                    onClick={() => selectAnswer(i)}
                    aria-pressed={isSel}
                    className={cn(
                      'flex w-full items-start gap-4 rounded-xl border px-5 py-4 text-left transition-all duration-150',
                      isSel
                        ? 'border-v2-brand bg-v2-brand-soft shadow-v2-soft'
                        : 'border-v2-border bg-v2-surface hover:border-v2-border-strong hover:bg-v2-surface-subtle/50',
                    )}
                  >
                    <span
                      className={cn(
                        'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-v2-mono text-[12px] font-bold transition-colors',
                        isSel
                          ? 'bg-v2-brand text-white shadow-v2-button'
                          : 'border border-v2-border-strong bg-v2-surface text-v2-foreground-muted',
                      )}
                    >
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span className="text-[15px] leading-[1.55] text-v2-foreground">
                      {opt}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Prev / Next */}
            <div className="mt-8 flex gap-3">
              <button
                disabled={currentIdx === 0}
                onClick={() => setCurrentIdx((i) => i - 1)}
                aria-label="Previous question"
                className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-v2-border bg-v2-surface text-[14px] font-semibold text-v2-foreground transition-colors hover:bg-v2-surface-subtle disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ArrowLeft className="h-4 w-4" strokeWidth={2.25} />
                Previous
              </button>
              <button
                disabled={currentIdx === items.length - 1}
                onClick={() => setCurrentIdx((i) => i + 1)}
                aria-label="Next question"
                className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-v2-gradient-brand text-[14px] font-semibold text-white shadow-v2-button transition-all hover:-translate-y-0.5 hover:shadow-v2-elevated disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
                <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </div>

        {/* Question navigator */}
        <aside className="hidden w-[260px] shrink-0 overflow-y-auto border-l border-v2-border bg-v2-surface p-5 lg:block">
          <p className="font-v2-mono text-[11px] font-semibold uppercase tracking-v2-wide text-v2-foreground-subtle">
            Navigator
          </p>

          <div className="mt-3 grid grid-cols-5 gap-1.5">
            {items.map((it, i) => {
              const isCurr = i === currentIdx
              const isAnswered = it.user_answer_index !== null
              const isFlag = it.flagged
              return (
                <button
                  key={it.position}
                  onClick={() => setCurrentIdx(i)}
                  aria-label={`Question ${i + 1}`}
                  aria-current={isCurr ? 'true' : undefined}
                  className={cn(
                    'flex h-9 items-center justify-center rounded-md border font-v2-mono text-[11px] font-bold transition-colors',
                    isCurr
                      ? 'border-v2-foreground bg-v2-foreground text-white'
                      : isAnswered && isFlag
                        ? 'border-v2-warning/40 bg-v2-warning-soft text-v2-warning'
                        : isAnswered
                          ? 'border-v2-brand/30 bg-v2-brand-soft text-v2-brand'
                          : isFlag
                            ? 'border-v2-warning/40 text-v2-warning'
                            : 'border-v2-border bg-v2-surface text-v2-foreground-muted hover:border-v2-border-strong hover:text-v2-foreground',
                  )}
                >
                  {i + 1}
                </button>
              )
            })}
          </div>

          {/* Legend */}
          <div className="mt-5 space-y-2 rounded-lg border border-v2-border-subtle bg-v2-surface-subtle/60 p-3">
            <LegendRow
              dot="bg-v2-brand-soft border border-v2-brand/30"
              label="Answered"
            />
            <LegendRow
              dot="bg-v2-warning-soft border border-v2-warning/30"
              label="Flagged"
            />
            <LegendRow dot="bg-v2-foreground" label="Current" />
            <LegendRow
              dot="bg-v2-surface border border-v2-border"
              label="Unanswered"
            />
          </div>

          <button
            onClick={() => setConfirmingSubmit(true)}
            disabled={submitting}
            className="mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-v2-foreground text-[13px] font-semibold text-white transition-colors hover:bg-v2-deep-darker disabled:opacity-50"
          >
            <Check className="h-4 w-4" strokeWidth={2.5} />
            Submit exam
          </button>
        </aside>
      </div>
    </div>
  )
}

function LegendRow({ dot, label }: { dot: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={cn('h-3 w-3 shrink-0 rounded-sm', dot)} />
      <span className="text-[12px] text-v2-foreground-muted">{label}</span>
    </div>
  )
}
