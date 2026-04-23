'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { track } from '@/lib/analytics'

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
  { v: 1, label: "I've seen it", desc: "I know it exists, haven't used it" },
  { v: 2, label: 'Basic', desc: "I've used it in tutorials" },
  { v: 3, label: 'Intermediate', desc: 'I use it in real projects' },
  { v: 4, label: 'Advanced', desc: 'I master it, could teach it' },
]

const BACKGROUNDS: Array<{ v: Background; label: string; hint: string }> = [
  { v: 'developer', label: 'Developer', hint: 'Backend, frontend, full-stack' },
  { v: 'sysadmin', label: 'SysAdmin / DevOps', hint: 'Infra, networks, operations' },
  { v: 'business', label: 'Business / Product', hint: 'PM, consultant, business architect' },
  { v: 'student', label: 'Student', hint: 'No professional experience yet' },
  { v: 'other', label: 'Other', hint: '' },
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
  const [selfLevels, setSelfLevels] = useState<Record<string, number>>(
    () => Object.fromEntries(domains.map(d => [d.slug, 1]))
  )
  const [diagnostic, setDiagnostic] = useState<DiagnosticQuestion[]>([])
  const [diagnosticLoading, setDiagnosticLoading] = useState(false)
  const [diagnosticAnswers, setDiagnosticAnswers] = useState<Record<string, number>>({})
  const diagnosticFetchedRef = useRef(false)

  useEffect(() => {
    if (step !== 3 || diagnosticFetchedRef.current) return
    diagnosticFetchedRef.current = true
    setDiagnosticLoading(true)
    fetch('/api/onboarding/diagnostic')
      .then(r => r.json())
      .then(j => setDiagnostic(j?.data?.questions ?? []))
      .catch(() => setDiagnostic([]))
      .finally(() => setDiagnosticLoading(false))
  }, [step])

  const days = examTargetDate
    ? Math.ceil((new Date(examTargetDate).getTime() - Date.now()) / 86_400_000)
    : null
  const pace: 'sprint' | 'crucero' | null =
    days === null ? null : days <= 21 ? 'sprint' : 'crucero'

  async function submit() {
    setLoading(true)
    setError(null)
    try {
      const diagnosticResults = diagnostic
        .filter(q => diagnosticAnswers[q.questionId] !== undefined)
        .map(q => ({
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
      router.push('/dashboard')
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="border-b border-border px-6 py-4">
        <div className="flex gap-2">
          {STEPS.map((s, i) => (
            <div key={s} className="flex-1 flex flex-col items-center gap-1">
              <div className={`h-1.5 w-full rounded-full ${i <= step ? 'bg-primary' : 'bg-surface-2'}`} />
              <span className={`text-xs hidden sm:block ${i <= step ? 'text-primary' : 'text-text-muted'}`}>{s}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="p-6 space-y-6">
        {step === 0 && (
          <div>
            <h2 className="text-lg font-bold text-text-primary mb-1">What's your background?</h2>
            <p className="text-sm text-text-secondary mb-5">
              This tunes the tone of explanations — a developer gets technical context,
              a business profile gets conceptual analogies.
            </p>
            <div className="space-y-2">
              {BACKGROUNDS.map(b => (
                <label
                  key={b.v}
                  className={`flex items-center gap-3 rounded-xl border p-3 cursor-pointer ${
                    background === b.v ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'
                  }`}
                >
                  <input
                    type="radio"
                    name="bg"
                    checked={background === b.v}
                    onChange={() => setBackground(b.v)}
                  />
                  <div>
                    <p className="font-semibold text-text-primary">{b.label}</p>
                    {b.hint && <p className="text-xs text-text-muted">{b.hint}</p>}
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

        {step === 1 && (
          <div>
            <h2 className="text-lg font-bold text-text-primary mb-1">When is your exam?</h2>
            <p className="text-sm text-text-secondary mb-5">
              We calibrate the recommended pace from this.
            </p>
            <input
              type="date"
              value={examTargetDate}
              min={new Date().toISOString().split('T')[0]}
              onChange={e => setExamTargetDate(e.target.value)}
              className="input-field mb-3"
            />
            {pace && days !== null && (
              <div className={`text-sm rounded-lg px-3 py-2 mb-5 ${
                pace === 'sprint' ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success'
              }`}>
                {days} days → <strong>{pace}</strong> mode
                {pace === 'sprint'
                  ? ': daily sessions, focus on high-weight domains.'
                  : ': 3-4 sessions/week, broad exploration.'}
              </div>
            )}
            <label className="text-sm font-medium text-text-secondary mb-2 block">
              Minutes per day available:
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[15, 30, 45, 60, 90, 120].map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setStudyMinutesPerDay(m)}
                  className={`rounded-lg border px-4 py-2 text-sm font-medium ${
                    studyMinutesPerDay === m
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-text-secondary hover:border-primary/50'
                  }`}
                >
                  {m} min
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="text-lg font-bold text-text-primary mb-1">Self-rated level by domain</h2>
            <p className="text-sm text-text-secondary mb-5">
              Be honest. This seeds your cognitive model — the system will refine it with every
              answer. Underestimating is better than overestimating.
            </p>
            <div className="space-y-4">
              {domains.map(d => (
                <div key={d.slug} className="rounded-lg border border-border p-3">
                  <div className="flex items-baseline justify-between gap-3 mb-2">
                    <p className="font-semibold text-text-primary text-sm">{d.name}</p>
                    <span className="text-xs text-text-muted">{d.exam_weight_percent}% of the exam</span>
                  </div>
                  <div className="grid grid-cols-5 gap-1">
                    {LEVEL_LABELS.map(l => (
                      <button
                        key={l.v}
                        type="button"
                        onClick={() => setSelfLevels(s => ({ ...s, [d.slug]: l.v }))}
                        className={`rounded px-1 py-2 text-xs font-medium ${
                          selfLevels[d.slug] === l.v
                            ? 'bg-primary text-white'
                            : 'bg-surface-2 text-text-secondary hover:bg-primary/20'
                        }`}
                        title={l.desc}
                      >
                        {l.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 className="text-lg font-bold text-text-primary mb-1">Quick diagnostic</h2>
            <p className="text-sm text-text-secondary mb-5">
              {diagnostic.length > 0
                ? `${diagnostic.length} questions (one per domain). It's not graded like an exam — we're just refining your starting point. Getting these wrong is useful.`
                : diagnosticLoading
                ? 'Loading diagnostic…'
                : 'Your initial plan will use your self-assessment. The system will adjust with your first sessions.'}
            </p>
            {diagnostic.map((q, qi) => {
              const selected = diagnosticAnswers[q.questionId]
              return (
                <div key={q.questionId} className="rounded-xl border border-border p-4 mb-4">
                  <div className="flex items-baseline justify-between gap-2 mb-2">
                    <span className="text-xs font-semibold text-text-muted uppercase tracking-wide">
                      {qi + 1}/{diagnostic.length} · {q.conceptName}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-text-primary mb-3 leading-relaxed">
                    {q.questionText}
                  </p>
                  <div className="space-y-2">
                    {q.options.map((opt, oi) => (
                      <button
                        key={oi}
                        type="button"
                        onClick={() =>
                          setDiagnosticAnswers(a => ({ ...a, [q.questionId]: oi }))
                        }
                        className={`w-full text-left rounded-lg border px-3 py-2 text-sm ${
                          selected === oi
                            ? 'border-primary bg-primary/10 text-text-primary'
                            : 'border-border text-text-secondary hover:border-primary/50'
                        }`}
                      >
                        <span className="mr-2 font-semibold">
                          {String.fromCharCode(65 + oi)}.
                        </span>
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
            {diagnostic.length > 0 && (
              <p className="text-xs text-text-muted italic">
                Answer all of them to continue — or skip if you'd rather start with your self-assessment.
              </p>
            )}
          </div>
        )}

        {step === 4 && (
          <div>
            <h2 className="text-lg font-bold text-text-primary mb-1">Psychological contract</h2>
            <p className="text-sm text-text-secondary mb-5">Before you start, this matters:</p>
            <div className="rounded-xl border border-border bg-surface-2 p-4 mb-5 space-y-3 text-sm">
              <p className="text-text-primary">
                <strong>In Maestring, mistakes aren't problems — they're the learning mechanism.</strong>
              </p>
              <p className="text-text-secondary">
                Every time you miss a question, the system learns more about you and adjusts your plan.
                You will miss questions. That's exactly what's supposed to happen.
              </p>
              <p className="text-text-secondary">
                Your Readiness Score starts low and rises with spaced repetitions — not with
                consecutive correct answers. Consistency wins, not speed.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-surface-2 p-4 text-sm space-y-1">
              <p>📅 Exam: <strong>{examTargetDate || 'no date'}</strong>{days !== null && ` (${days}d)`}</p>
              <p>⏱️ Daily study: <strong>{studyMinutesPerDay} min</strong></p>
              <p>🎯 Background: <strong>{BACKGROUNDS.find(b => b.v === background)?.label}</strong></p>
              <p>📊 Concepts to seed: <strong>{domains.length * 5}</strong></p>
            </div>
            {error && <p className="text-sm text-danger mt-3">{error}</p>}
          </div>
        )}

        <div className={`flex ${step > 0 ? 'justify-between' : 'justify-end'}`}>
          {step > 0 && (
            <button onClick={() => setStep(s => s - 1)} className="btn-outline" disabled={loading}>
              ← Back
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button onClick={() => setStep(s => s + 1)} className="btn-primary">
              Continue →
            </button>
          ) : (
            <button onClick={submit} disabled={loading} className="btn-primary">
              {loading ? 'Calibrating…' : 'Start studying'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
