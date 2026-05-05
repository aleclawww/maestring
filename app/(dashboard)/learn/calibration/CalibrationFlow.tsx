'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { Card, Button, Badge, Eyebrow } from '@/components/v2'
import { cn } from '@/lib/utils'

type Step = 'intro' | 'nback' | 'speed' | 'profile' | 'review' | 'submitting'

interface Result {
  workingMemorySpan: number
  processingSpeedMs: number
  chronotype: 'morning' | 'evening' | 'neutral'
  sleepStartHour: number
  sleepEndHour: number
  cognitiveLoadBudget: number
}

const DEFAULT: Result = {
  workingMemorySpan: 5,
  processingSpeedMs: 600,
  chronotype: 'neutral',
  sleepStartHour: 23,
  sleepEndHour: 7,
  cognitiveLoadBudget: 3,
}

export function CalibrationFlow() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('intro')
  const [result, setResult] = useState<Result>(DEFAULT)
  const [error, setError] = useState<string | null>(null)

  async function submit(final: Result) {
    setStep('submitting')
    setError(null)
    try {
      const res = await fetch('/api/learn/calibration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(final),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `HTTP ${res.status}`)
      }
      router.push('/learn/session')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save calibration.')
      setStep('review')
    }
  }

  return (
    <div className="mx-auto max-w-[640px]">
      <header className="mb-6 text-center">
        <Badge tone="brand" size="md" mono className="mb-3">
          Phase 0 · Calibration
        </Badge>
        <h1 className="v2-display text-[28px] sm:text-[32px]">
          Build your cognitive fingerprint
        </h1>
        <p className="mx-auto mt-2 max-w-[520px] text-[14px] leading-[1.6] text-v2-foreground-muted">
          Three short tasks. Five minutes. The system uses these to decide what
          to put in front of you and when.
        </p>
      </header>

      {step === 'intro' && (
        <Card padding="lg" className="space-y-5">
          <div>
            <Eyebrow>What we'll measure</Eyebrow>
            <ul className="mt-3 space-y-2 text-[14px] leading-[1.6] text-v2-foreground">
              <li>
                <strong>Working memory span</strong> — how many chunks you can
                juggle (n-back lite)
              </li>
              <li>
                <strong>Processing speed</strong> — your reaction time on a
                simple task
              </li>
              <li>
                <strong>Chronotype + sleep window</strong> — when you study
                best, when to rest
              </li>
              <li>
                <strong>Cognitive load budget</strong> — how many tough
                questions before fatigue
              </li>
            </ul>
          </div>
          <p className="text-[12px] text-v2-foreground-subtle">
            Your answers stay private. They shape the orchestrator's decisions
            but aren't shared.
          </p>
          <div className="flex justify-end">
            <Button onClick={() => setStep('nback')}>
              Begin
              <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
            </Button>
          </div>
        </Card>
      )}

      {step === 'nback' && (
        <NBackTest
          onDone={(span) => {
            setResult((r) => ({ ...r, workingMemorySpan: span }))
            setStep('speed')
          }}
        />
      )}

      {step === 'speed' && (
        <SpeedTest
          onDone={(ms) => {
            setResult((r) => ({ ...r, processingSpeedMs: ms }))
            setStep('profile')
          }}
        />
      )}

      {step === 'profile' && (
        <ProfileForm
          initial={result}
          onSubmit={(data) => {
            setResult((prev) => ({ ...prev, ...data }))
            setStep('review')
          }}
        />
      )}

      {step === 'review' && (
        <Card padding="lg" className="space-y-5">
          <Eyebrow>Your fingerprint</Eyebrow>
          <div className="grid grid-cols-2 gap-3">
            <Stat k="Working memory" v={`${result.workingMemorySpan} chunks`} />
            <Stat k="Processing speed" v={`${result.processingSpeedMs} ms`} />
            <Stat k="Chronotype" v={result.chronotype} />
            <Stat
              k="Sleep window"
              v={`${pad(result.sleepStartHour)}:00 → ${pad(result.sleepEndHour)}:00`}
            />
            <Stat
              k="Load budget"
              v={`${result.cognitiveLoadBudget} / 5`}
            />
          </div>
          {error && (
            <div
              role="alert"
              className="rounded-lg border border-v2-error/30 bg-v2-error-soft px-3 py-2 text-[13px] text-v2-error"
            >
              {error}
            </div>
          )}
          <div className="flex justify-between">
            <Button variant="secondary" onClick={() => setStep('profile')}>
              <ArrowLeft className="h-4 w-4" strokeWidth={2.25} />
              Back
            </Button>
            <Button onClick={() => submit(result)}>
              Save and start learning
              <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
            </Button>
          </div>
        </Card>
      )}

      {step === 'submitting' && (
        <Card padding="lg" className="text-center">
          <p className="text-[14px] text-v2-foreground-muted">Saving…</p>
        </Card>
      )}
    </div>
  )
}

// ─── n-back lite ────────────────────────────────────────────────────────────
function NBackTest({ onDone }: { onDone: (span: number) => void }) {
  const [phase, setPhase] = useState<'show' | 'recall' | 'done'>('show')
  const [span, setSpan] = useState(3)
  const [seq, setSeq] = useState<number[]>([])
  const [shownIdx, setShownIdx] = useState(-1)
  const [input, setInput] = useState('')
  const [bestSpan, setBestSpan] = useState<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (phase !== 'show') return
    const newSeq = Array.from({ length: span }, () =>
      Math.floor(Math.random() * 10),
    )
    setSeq(newSeq)
    setShownIdx(-1)
    setInput('')

    let i = 0
    function step() {
      if (i >= newSeq.length) {
        setShownIdx(-1)
        setPhase('recall')
        return
      }
      setShownIdx(i)
      i++
      timerRef.current = setTimeout(step, 800)
    }
    timerRef.current = setTimeout(step, 600)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [phase, span])

  function check() {
    const expected = seq.join('')
    const ok = input.trim() === expected
    if (ok) {
      setBestSpan(span)
      if (span >= 9) {
        onDone(9)
        return
      }
      setSpan((s) => s + 1)
      setPhase('show')
    } else {
      onDone(bestSpan ?? Math.max(2, span - 1))
    }
  }

  return (
    <Card padding="lg" className="space-y-5">
      <div>
        <Eyebrow>N-back lite</Eyebrow>
        <p className="mt-2 text-[13px] text-v2-foreground-muted">
          Watch the digits. When they stop, type them back in order.
        </p>
      </div>

      <div className="flex h-40 items-center justify-center rounded-xl border border-v2-border bg-v2-surface-subtle">
        {phase === 'show' && shownIdx === -1 && (
          <span className="font-v2-mono text-[12px] uppercase tracking-v2-wide text-v2-foreground-subtle">
            Get ready…
          </span>
        )}
        {phase === 'show' && shownIdx >= 0 && (
          <span className="v2-display text-[72px] tabular-nums leading-none text-v2-foreground">
            {seq[shownIdx]}
          </span>
        )}
        {phase === 'recall' && (
          <input
            autoFocus
            inputMode="numeric"
            pattern="[0-9]*"
            value={input}
            onChange={(e) => setInput(e.target.value.replace(/\D/g, ''))}
            className="w-48 border-b-2 border-v2-brand bg-transparent text-center font-v2-mono text-[40px] tabular-nums text-v2-foreground outline-none placeholder:text-v2-foreground-subtle"
            placeholder="…"
          />
        )}
      </div>

      <div className="flex items-center justify-between">
        <span className="font-v2-mono text-[11px] uppercase tracking-v2-wide text-v2-foreground-subtle">
          Sequence length: {span}
        </span>
        {phase === 'recall' && (
          <Button onClick={check} disabled={input.length !== span}>
            Submit
          </Button>
        )}
      </div>
    </Card>
  )
}

// ─── Processing speed test ──────────────────────────────────────────────────
function SpeedTest({ onDone }: { onDone: (ms: number) => void }) {
  const [state, setState] = useState<'wait' | 'go' | 'done'>('wait')
  const [trial, setTrial] = useState(0)
  const [times, setTimes] = useState<number[]>([])
  const startedAt = useRef<number>(0)
  const TRIALS = 5

  useEffect(() => {
    if (state !== 'wait') return
    const delay = 800 + Math.random() * 1500
    const t = setTimeout(() => {
      setState('go')
      startedAt.current = performance.now()
    }, delay)
    return () => clearTimeout(t)
  }, [state, trial])

  function tap() {
    if (state !== 'go') return
    const dt = Math.round(performance.now() - startedAt.current)
    const next = [...times, dt]
    setTimes(next)
    if (next.length >= TRIALS) {
      const sorted = [...next].sort((a, b) => a - b)
      const median = sorted[Math.floor(sorted.length / 2)]!
      onDone(median)
      setState('done')
    } else {
      setTrial((t) => t + 1)
      setState('wait')
    }
  }

  return (
    <Card padding="lg" className="space-y-5">
      <div>
        <Eyebrow>Reaction speed</Eyebrow>
        <p className="mt-2 text-[13px] text-v2-foreground-muted">
          Tap the moment the panel turns green. {TRIALS} trials.
        </p>
      </div>
      <button
        onClick={tap}
        className={cn(
          'h-44 w-full rounded-xl border transition-colors duration-150',
          state === 'go'
            ? 'border-v2-success bg-v2-success-soft'
            : state === 'done'
              ? 'border-v2-border bg-v2-surface-subtle'
              : 'border-v2-warning/30 bg-v2-warning-soft/60',
        )}
      >
        <span
          className={cn(
            'font-v2-mono text-[14px] font-bold uppercase tracking-v2-wide',
            state === 'go'
              ? 'text-v2-success'
              : state === 'done'
                ? 'text-v2-foreground-muted'
                : 'text-v2-warning',
          )}
        >
          {state === 'go' ? 'TAP NOW' : state === 'done' ? 'Done' : 'Wait…'}
        </span>
      </button>
      <p className="text-center font-v2-mono text-[11px] uppercase tracking-v2-wide text-v2-foreground-subtle">
        Trial {Math.min(trial + 1, TRIALS)} of {TRIALS}
      </p>
    </Card>
  )
}

// ─── Profile form ───────────────────────────────────────────────────────────
function ProfileForm({
  initial,
  onSubmit,
}: {
  initial: Result
  onSubmit: (
    r: Pick<
      Result,
      | 'chronotype'
      | 'sleepStartHour'
      | 'sleepEndHour'
      | 'cognitiveLoadBudget'
    >,
  ) => void
}) {
  const [chronotype, setChronotype] = useState(initial.chronotype)
  const [sleepStart, setSleepStart] = useState(initial.sleepStartHour)
  const [sleepEnd, setSleepEnd] = useState(initial.sleepEndHour)
  const [budget, setBudget] = useState(initial.cognitiveLoadBudget)

  return (
    <Card padding="lg" className="space-y-6">
      <Eyebrow>When and how much</Eyebrow>

      <div>
        <label className="text-[13px] font-semibold text-v2-foreground">
          Chronotype
        </label>
        <div className="mt-2 flex gap-2">
          {(['morning', 'neutral', 'evening'] as const).map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setChronotype(opt)}
              className={cn(
                'flex-1 rounded-lg border px-3 py-2 text-[13px] font-semibold capitalize transition-colors',
                chronotype === opt
                  ? 'border-v2-brand bg-v2-brand-soft text-v2-brand'
                  : 'border-v2-border bg-v2-surface text-v2-foreground-muted hover:border-v2-border-strong',
              )}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-[13px] font-semibold text-v2-foreground">
            Sleep start
          </label>
          <select
            value={sleepStart}
            onChange={(e) => setSleepStart(Number(e.target.value))}
            className="mt-2 w-full rounded-lg border border-v2-border bg-v2-surface px-3 py-2 text-[14px] text-v2-foreground"
          >
            {Array.from({ length: 24 }, (_, h) => (
              <option key={h} value={h}>
                {pad(h)}:00
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[13px] font-semibold text-v2-foreground">
            Sleep end
          </label>
          <select
            value={sleepEnd}
            onChange={(e) => setSleepEnd(Number(e.target.value))}
            className="mt-2 w-full rounded-lg border border-v2-border bg-v2-surface px-3 py-2 text-[14px] text-v2-foreground"
          >
            {Array.from({ length: 24 }, (_, h) => (
              <option key={h} value={h}>
                {pad(h)}:00
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <div className="flex items-baseline justify-between">
          <label className="text-[13px] font-semibold text-v2-foreground">
            Cognitive load budget
          </label>
          <span className="font-v2-mono text-[12px] font-bold text-v2-brand">
            {budget} / 5
          </span>
        </div>
        <p className="mt-0.5 text-[12px] text-v2-foreground-muted">
          Questions per block before rest
        </p>
        <input
          type="range"
          min={1}
          max={5}
          step={1}
          value={budget}
          onChange={(e) => setBudget(Number(e.target.value))}
          className="mt-2 w-full accent-v2-brand"
        />
        <div className="mt-1 flex justify-between font-v2-mono text-[10px] uppercase tracking-v2-wide text-v2-foreground-subtle">
          <span>1 (light)</span>
          <span>5 (heavy)</span>
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          onClick={() =>
            onSubmit({
              chronotype,
              sleepStartHour: sleepStart,
              sleepEndHour: sleepEnd,
              cognitiveLoadBudget: budget,
            })
          }
        >
          Continue
          <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
        </Button>
      </div>
    </Card>
  )
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-lg border border-v2-border-subtle bg-v2-surface-subtle/60 px-4 py-3">
      <p className="font-v2-mono text-[10px] uppercase tracking-v2-wide text-v2-foreground-subtle">
        {k}
      </p>
      <p className="mt-1 text-[14px] font-bold capitalize text-v2-foreground">
        {v}
      </p>
    </div>
  )
}

function pad(n: number) {
  return n.toString().padStart(2, '0')
}
