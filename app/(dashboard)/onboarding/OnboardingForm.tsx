'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  Code2,
  GraduationCap,
  Loader2,
  Server,
  Target,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { track } from '@/lib/analytics'
import { createClient } from '@/lib/supabase/client'
import { Button, Input } from '@/components/v2'
import { cn } from '@/lib/utils'

interface Domain {
  id: string
  slug: string
  name: string
  description: string | null
  exam_weight_percent: number
}

type Background = 'developer' | 'sysadmin' | 'business' | 'student' | 'other'

const STEPS = ['Background', 'Exam', 'Calibration', 'Diagnostic', 'Ready'] as const

interface DiagnosticQuestion {
  domainSlug: string
  conceptId: string
  conceptName: string
  questionId: string
  questionText: string
  options: string[]
  correctIndex: number
}

const LEVEL_LABELS = [
  { v: 0, label: 'Zero', desc: "I've never touched it" },
  { v: 1, label: "Seen it", desc: 'Know it exists, never used it' },
  { v: 2, label: 'Basic', desc: "Tutorials only" },
  { v: 3, label: 'Inter.', desc: 'Real projects' },
  { v: 4, label: 'Adv.', desc: 'Could teach it' },
]

const BACKGROUNDS: Array<{
  v: Background
  label: string
  hint: string
  Icon: LucideIcon
}> = [
  {
    v: 'developer',
    label: 'Developer',
    hint: 'Backend, frontend, full-stack',
    Icon: Code2,
  },
  {
    v: 'sysadmin',
    label: 'SysAdmin / DevOps',
    hint: 'Infra, networks, operations',
    Icon: Server,
  },
  {
    v: 'business',
    label: 'Business / Product',
    hint: 'PM, consultant, business architect',
    Icon: Target,
  },
  {
    v: 'student',
    label: 'Student',
    hint: 'No professional experience yet',
    Icon: GraduationCap,
  },
  {
    v: 'other',
    label: 'Other',
    hint: 'Pick this if none of the above fits',
    Icon: Users,
  },
]

export function OnboardingForm({ domains }: { domains: Domain[] }) {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const startedRef = useRef(false)
  const lastStepFiredRef = useRef<number>(-1)

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    track({ name: 'onboarding_started' })
  }, [])

  useEffect(() => {
    if (step === lastStepFiredRef.current) return
    lastStepFiredRef.current = step
    track({
      name: 'onboarding_step_completed',
      properties: { step, step_name: STEPS[step] ?? `step_${step}` },
    })
  }, [step])

  const [background, setBackground] = useState<Background>('developer')
  const [examTargetDate, setExamTargetDate] = useState('')
  const [studyMinutesPerDay, setStudyMinutesPerDay] = useState(30)
  const [selfLevels, setSelfLevels] = useState<Record<string, number>>(() =>
    Object.fromEntries(domains.map((d) => [d.slug, 1])),
  )
  const [diagnostic, setDiagnostic] = useState<DiagnosticQuestion[]>([])
  const [diagnosticLoading, setDiagnosticLoading] = useState(false)
  const [diagnosticAnswers, setDiagnosticAnswers] = useState<
    Record<string, number>
  >({})
  const [diagnosticError, setDiagnosticError] = useState<string | null>(null)
  const diagnosticFetchedRef = useRef(false)

  useEffect(() => {
    if (step !== 3 || diagnosticFetchedRef.current) return
    diagnosticFetchedRef.current = true
    setDiagnosticLoading(true)
    setDiagnosticError(null)
    fetch('/api/onboarding/diagnostic')
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((j) => setDiagnostic(j?.data?.questions ?? []))
      .catch((err) => {
        console.error('Onboarding diagnostic fetch failed', err)
        setDiagnosticError(
          err?.message || 'Could not load diagnostic questions.',
        )
        setDiagnostic([])
      })
      .finally(() => setDiagnosticLoading(false))
  }, [step])

  const days = examTargetDate
    ? Math.ceil((new Date(examTargetDate).getTime() - Date.now()) / 86_400_000)
    : null
  const pace: 'sprint' | 'cruise' | null =
    days === null ? null : days <= 21 ? 'sprint' : 'cruise'

  async function submit() {
    setLoading(true)
    setError(null)
    try {
      const diagnosticResults = diagnostic
        .filter((q) => diagnosticAnswers[q.questionId] !== undefined)
        .map((q) => ({
          domainSlug: q.domainSlug,
          isCorrect: diagnosticAnswers[q.questionId] === q.correctIndex,
        }))
      const res = await fetch('/api/onboarding/calibrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          certificationId: 'aws-saa-c03',
          examTargetDate: examTargetDate || null,
          studyMinutesPerDay,
          background,
          selfLevels,
          diagnosticResults,
        }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || "Couldn't save your calibration")
      }
      track({
        name: 'onboarding_completed',
        properties: {
          exam_target_date: examTargetDate || undefined,
          minutes_per_day: studyMinutesPerDay,
        },
      })

      // Refresh session before navigating — without this, middleware reads
      // a stale JWT (onboarding_completed=false) and bounces us right back.
      const supabase = createClient()
      const { error: refreshErr } = await supabase.auth.refreshSession()
      if (refreshErr) {
        await new Promise((r) => setTimeout(r, 800))
        const { error: retryErr } = await supabase.auth.refreshSession()
        if (retryErr) {
          throw new Error(
            'Session refresh failed — please reload the page and try again.',
          )
        }
      }

      router.push('/dashboard')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      {/* Step bar */}
      <div className="border-b border-v2-border-subtle px-6 py-5 sm:px-8">
        <div className="flex gap-2">
          {STEPS.map((s, i) => (
            <div key={s} className="flex flex-1 flex-col items-center gap-1.5">
              <div
                className={cn(
                  'h-1 w-full rounded-full transition-colors duration-300',
                  i < step
                    ? 'bg-v2-gradient-brand'
                    : i === step
                      ? 'bg-v2-brand'
                      : 'bg-v2-surface-sunken',
                )}
              />
              <span
                className={cn(
                  'hidden font-v2-mono text-[10px] uppercase tracking-v2-wide sm:block',
                  i <= step
                    ? 'font-semibold text-v2-foreground'
                    : 'text-v2-foreground-subtle',
                )}
              >
                {s}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Step content */}
      <div className="space-y-6 px-6 py-7 sm:px-8 sm:py-8">
        {step === 0 && (
          <div>
            <h2 className="v2-display text-[22px] sm:text-[24px]">
              What's your background?
            </h2>
            <p className="mt-2 text-[14px] leading-[1.6] text-v2-foreground-muted">
              This tunes the tone of explanations — a developer gets technical
              context, a business profile gets conceptual analogies.
            </p>
            <div className="mt-6 space-y-2.5">
              {BACKGROUNDS.map((b) => {
                const selected = background === b.v
                return (
                  <label
                    key={b.v}
                    className={cn(
                      'flex cursor-pointer items-center gap-4 rounded-xl border p-4 transition-all duration-150',
                      selected
                        ? 'border-v2-brand bg-v2-brand-soft shadow-v2-soft'
                        : 'border-v2-border bg-v2-surface hover:border-v2-border-strong',
                    )}
                  >
                    <input
                      type="radio"
                      name="bg"
                      checked={selected}
                      onChange={() => setBackground(b.v)}
                      className="sr-only"
                    />
                    <div
                      className={cn(
                        'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                        selected
                          ? 'bg-v2-brand text-white shadow-v2-button'
                          : 'bg-v2-surface-subtle text-v2-foreground-muted',
                      )}
                    >
                      <b.Icon className="h-4 w-4" strokeWidth={2.25} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-bold text-v2-foreground">
                        {b.label}
                      </p>
                      <p className="text-[12px] text-v2-foreground-muted">
                        {b.hint}
                      </p>
                    </div>
                    <span
                      className={cn(
                        'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2',
                        selected
                          ? 'border-v2-brand bg-v2-brand'
                          : 'border-v2-border-strong',
                      )}
                    >
                      {selected && (
                        <span className="h-2 w-2 rounded-full bg-white" />
                      )}
                    </span>
                  </label>
                )
              })}
            </div>
          </div>
        )}

        {step === 1 && (
          <div>
            <h2 className="v2-display text-[22px] sm:text-[24px]">
              When is your exam?
            </h2>
            <p className="mt-2 text-[14px] leading-[1.6] text-v2-foreground-muted">
              We calibrate the recommended pace from this.
            </p>

            <div className="mt-6">
              <label
                htmlFor="exam-date"
                className="block text-[13px] font-semibold text-v2-foreground"
              >
                Exam date
              </label>
              <Input
                id="exam-date"
                type="date"
                value={examTargetDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setExamTargetDate(e.target.value)}
                className="mt-1.5"
              />
              {pace && days !== null && (
                <div
                  className={cn(
                    'mt-3 flex items-start gap-2.5 rounded-r-lg border-l-[3px] p-3 text-[13px]',
                    pace === 'sprint'
                      ? 'border-l-v2-warning bg-v2-warning-soft/60 text-v2-foreground'
                      : 'border-l-v2-success bg-v2-success-soft/60 text-v2-foreground',
                  )}
                >
                  <CalendarClock
                    className={cn(
                      'mt-0.5 h-4 w-4 shrink-0',
                      pace === 'sprint' ? 'text-v2-warning' : 'text-v2-success',
                    )}
                    strokeWidth={2.25}
                  />
                  <div>
                    <span className="font-semibold">{days} days</span> →{' '}
                    <span className="font-bold uppercase">{pace}</span> mode
                    {pace === 'sprint'
                      ? ': daily sessions, focus on high-weight domains.'
                      : ': 3–4 sessions/week, broad exploration.'}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-7">
              <p className="text-[13px] font-semibold text-v2-foreground">
                Minutes per day available
              </p>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {[15, 30, 45, 60, 90, 120].map((m) => {
                  const sel = studyMinutesPerDay === m
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setStudyMinutesPerDay(m)}
                      className={cn(
                        'rounded-lg border px-4 py-2.5 text-[13px] font-semibold transition-colors',
                        sel
                          ? 'border-v2-brand bg-v2-brand-soft text-v2-brand'
                          : 'border-v2-border bg-v2-surface text-v2-foreground-muted hover:border-v2-border-strong hover:text-v2-foreground',
                      )}
                    >
                      {m} min
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="v2-display text-[22px] sm:text-[24px]">
              Self-rated level by domain
            </h2>
            <p className="mt-2 text-[14px] leading-[1.6] text-v2-foreground-muted">
              Be honest. This seeds your cognitive model — every answer refines
              it. Underestimating is better than overestimating.
            </p>

            <div className="mt-6 space-y-3">
              {domains.map((d) => (
                <div
                  key={d.slug}
                  className="rounded-xl border border-v2-border bg-v2-surface p-4"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-[14px] font-bold text-v2-foreground">
                      {d.name}
                    </p>
                    <span className="font-v2-mono text-[11px] text-v2-foreground-subtle">
                      {d.exam_weight_percent}% of exam
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-5 gap-1.5">
                    {LEVEL_LABELS.map((l) => {
                      const sel = selfLevels[d.slug] === l.v
                      return (
                        <button
                          key={l.v}
                          type="button"
                          onClick={() =>
                            setSelfLevels((s) => ({ ...s, [d.slug]: l.v }))
                          }
                          title={l.desc}
                          className={cn(
                            'rounded-md px-1.5 py-2 text-[11px] font-semibold transition-colors',
                            sel
                              ? 'bg-v2-gradient-brand text-white shadow-v2-button'
                              : 'bg-v2-surface-subtle text-v2-foreground-muted hover:bg-v2-brand-soft hover:text-v2-brand',
                          )}
                        >
                          {l.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 className="v2-display text-[22px] sm:text-[24px]">
              Quick diagnostic
            </h2>
            <p className="mt-2 text-[14px] leading-[1.6] text-v2-foreground-muted">
              {diagnostic.length > 0
                ? `${diagnostic.length} questions, one per domain. Not graded — we're refining your starting point. Getting these wrong is useful.`
                : diagnosticLoading
                  ? 'Loading diagnostic…'
                  : 'Your initial plan will use your self-assessment. The system adjusts with your first sessions.'}
            </p>

            {diagnosticLoading && (
              <div className="mt-6 flex items-center justify-center py-8 text-v2-foreground-muted">
                <Loader2 className="h-5 w-5 animate-spin" strokeWidth={2.25} />
              </div>
            )}

            {diagnosticError && (
              <div
                role="alert"
                className="mt-4 rounded-lg border border-v2-error/30 bg-v2-error-soft px-3 py-2 text-[12px] text-v2-error"
              >
                Couldn't load the diagnostic. Continuing with your
                self-assessment.
              </div>
            )}

            <div className="mt-6 space-y-4">
              {diagnostic.map((q, qi) => {
                const selected = diagnosticAnswers[q.questionId]
                return (
                  <div
                    key={q.questionId}
                    className="rounded-xl border border-v2-border bg-v2-surface p-5"
                  >
                    <span className="font-v2-mono text-[11px] font-semibold uppercase tracking-v2-wide text-v2-foreground-subtle">
                      {qi + 1}/{diagnostic.length} · {q.conceptName}
                    </span>
                    <p className="mt-3 text-[14px] font-semibold leading-[1.55] text-v2-foreground">
                      {q.questionText}
                    </p>
                    <div className="mt-4 space-y-2">
                      {q.options.map((opt, oi) => {
                        const isSel = selected === oi
                        return (
                          <button
                            key={oi}
                            type="button"
                            onClick={() =>
                              setDiagnosticAnswers((a) => ({
                                ...a,
                                [q.questionId]: oi,
                              }))
                            }
                            className={cn(
                              'flex w-full items-start gap-3 rounded-lg border px-3 py-2.5 text-left text-[13px] transition-colors',
                              isSel
                                ? 'border-v2-brand bg-v2-brand-soft text-v2-foreground'
                                : 'border-v2-border bg-v2-surface text-v2-foreground-muted hover:border-v2-border-strong hover:text-v2-foreground',
                            )}
                          >
                            <span
                              className={cn(
                                'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full font-v2-mono text-[10px] font-bold',
                                isSel
                                  ? 'bg-v2-brand text-white'
                                  : 'border border-v2-border-strong text-v2-foreground-muted',
                              )}
                            >
                              {String.fromCharCode(65 + oi)}
                            </span>
                            <span className="leading-[1.5]">{opt}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>

            {diagnostic.length > 0 && (
              <p className="mt-4 text-[12px] italic text-v2-foreground-subtle">
                Answer them all to continue — or skip to start with your
                self-assessment.
              </p>
            )}
          </div>
        )}

        {step === 4 && (
          <div>
            <h2 className="v2-display text-[22px] sm:text-[24px]">
              Psychological contract
            </h2>
            <p className="mt-2 text-[14px] leading-[1.6] text-v2-foreground-muted">
              Before you start, this matters:
            </p>

            <div className="mt-6 space-y-3 rounded-xl border border-l-[3px] border-v2-border border-l-v2-brand bg-v2-brand-soft/40 p-5">
              <p className="text-[14px] font-bold text-v2-foreground">
                In Maestring, mistakes aren't problems — they're the learning
                mechanism.
              </p>
              <p className="text-[13px] leading-[1.6] text-v2-foreground-muted">
                Every time you miss a question, the system learns more about
                you and adjusts your plan. You will miss questions. That's
                exactly what's supposed to happen.
              </p>
              <p className="text-[13px] leading-[1.6] text-v2-foreground-muted">
                Your Readiness Score starts low and rises with spaced
                repetitions — not with consecutive correct answers. Consistency
                wins, not speed.
              </p>
            </div>

            <div className="mt-5 rounded-xl border border-v2-border bg-v2-surface-subtle p-5">
              <p className="font-v2-mono text-[11px] font-semibold uppercase tracking-v2-wide text-v2-foreground-subtle">
                Your plan
              </p>
              <ul className="mt-3 space-y-1.5 text-[13px]">
                <li className="text-v2-foreground">
                  Exam:{' '}
                  <span className="font-bold">
                    {examTargetDate || 'no date'}
                  </span>
                  {days !== null && (
                    <span className="text-v2-foreground-muted"> · {days}d</span>
                  )}
                </li>
                <li className="text-v2-foreground">
                  Daily study:{' '}
                  <span className="font-bold">{studyMinutesPerDay} min</span>
                </li>
                <li className="text-v2-foreground">
                  Background:{' '}
                  <span className="font-bold">
                    {BACKGROUNDS.find((b) => b.v === background)?.label}
                  </span>
                </li>
                <li className="text-v2-foreground">
                  Concepts to seed:{' '}
                  <span className="font-bold">{domains.length * 5}</span>
                </li>
              </ul>
            </div>

            {error && (
              <div
                role="alert"
                className="mt-4 rounded-lg border border-v2-error/30 bg-v2-error-soft px-3 py-2 text-[13px] text-v2-error"
              >
                {error}
              </div>
            )}
          </div>
        )}

        {/* Nav row */}
        <div
          className={cn(
            'flex pt-2',
            step > 0 ? 'justify-between' : 'justify-end',
          )}
        >
          {step > 0 && (
            <Button
              variant="secondary"
              onClick={() => setStep((s) => s - 1)}
              disabled={loading}
            >
              <ArrowLeft className="h-4 w-4" strokeWidth={2.25} />
              Back
            </Button>
          )}
          {step < STEPS.length - 1 ? (
            <Button onClick={() => setStep((s) => s + 1)}>
              Continue
              <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
            </Button>
          ) : (
            <Button onClick={submit} disabled={loading} loading={loading}>
              {loading ? 'Calibrating…' : 'Start studying'}
              {!loading && <ArrowRight className="h-4 w-4" strokeWidth={2.5} />}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
