'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

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
    <div className="mx-auto max-w-2xl px-4 py-8">
      <header className="mb-6 text-center">
        <Badge variant="info" className="mb-2">Phase 0 — Calibration</Badge>
        <h1 className="text-2xl font-bold">Build your cognitive fingerprint</h1>
        <p className="text-text-secondary text-sm mt-2">
          Three short tasks. Five minutes. The system uses these to decide what to put in front of you and when.
        </p>
      </header>

      {step === 'intro' && (
        <Card>
          <CardContent className="p-6 space-y-4">
            <Section title="What we&rsquo;ll measure">
              <ul className="text-sm space-y-2">
                <li><b>Working memory span</b> — how many chunks you can juggle (n-back lite)</li>
                <li><b>Processing speed</b> — your reaction time on a simple task</li>
                <li><b>Chronotype + sleep window</b> — when you study best, when to rest</li>
                <li><b>Cognitive load budget</b> — how many tough questions before fatigue</li>
              </ul>
            </Section>
            <p className="text-xs text-text-secondary">
              Your answers stay private. They shape the orchestrator&rsquo;s decisions but aren&rsquo;t shared.
            </p>
            <div className="flex justify-end">
              <Button onClick={() => setStep('nback')}>Begin</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 'nback' && (
        <NBackTest
          onDone={span => {
            setResult(r => ({ ...r, workingMemorySpan: span }))
            setStep('speed')
          }}
        />
      )}

      {step === 'speed' && (
        <SpeedTest
          onDone={ms => {
            setResult(r => ({ ...r, processingSpeedMs: ms }))
            setStep('profile')
          }}
        />
      )}

      {step === 'profile' && (
        <ProfileForm
          initial={result}
          onSubmit={data => {
            setResult(prev => ({ ...prev, ...data }))
            setStep('review')
          }}
        />
      )}

      {step === 'review' && (
        <Card>
          <CardContent className="p-6 space-y-4">
            <h2 className="text-lg font-semibold">Your fingerprint</h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Stat k="Working memory" v={`${result.workingMemorySpan} chunks`} />
              <Stat k="Processing speed" v={`${result.processingSpeedMs} ms`} />
              <Stat k="Chronotype" v={result.chronotype} />
              <Stat k="Sleep window" v={`${pad(result.sleepStartHour)}:00 → ${pad(result.sleepEndHour)}:00`} />
              <Stat k="Load budget" v={`${result.cognitiveLoadBudget} / 5`} />
            </div>
            {error && <p className="text-sm text-danger">{error}</p>}
            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setStep('profile')}>Back</Button>
              <Button onClick={() => submit(result)}>Save and start learning</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 'submitting' && (
        <Card><CardContent className="p-8 text-center text-sm text-text-secondary">Saving…</CardContent></Card>
      )}
    </div>
  )
}

// ─── n-back lite ────────────────────────────────────────────────────────────
// Show a sequence of digits one at a time. After it ends, the user types back
// the sequence in order. The longest correctly-recalled sequence is the span.
function NBackTest({ onDone }: { onDone: (span: number) => void }) {
  const [phase, setPhase] = useState<'show' | 'recall' | 'done'>('show')
  const [span, setSpan] = useState(3)
  const [seq, setSeq] = useState<number[]>([])
  const [shownIdx, setShownIdx] = useState(-1)
  const [input, setInput] = useState('')
  const [bestSpan, setBestSpan] = useState<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Start a new round when span changes or test (re)starts.
  useEffect(() => {
    if (phase !== 'show') return
    const newSeq = Array.from({ length: span }, () => Math.floor(Math.random() * 10))
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
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [phase, span])

  function check() {
    const expected = seq.join('')
    const ok = input.trim() === expected
    if (ok) {
      setBestSpan(span)
      if (span >= 9) { onDone(9); return }
      setSpan(s => s + 1)
      setPhase('show')
    } else {
      // Failed at this span — final score is the previous best (default 2).
      onDone(bestSpan ?? Math.max(2, span - 1))
    }
  }

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold">N-back lite</h2>
          <p className="text-xs text-text-secondary">Watch the digits. When they stop, type them back in order.</p>
        </div>

        <div className="h-32 rounded-lg bg-surface flex items-center justify-center">
          {phase === 'show' && shownIdx === -1 && <span className="text-text-secondary text-sm">Get ready…</span>}
          {phase === 'show' && shownIdx >= 0 && (
            <span className="text-6xl font-bold tabular-nums">{seq[shownIdx]}</span>
          )}
          {phase === 'recall' && (
            <input
              autoFocus
              inputMode="numeric"
              pattern="[0-9]*"
              value={input}
              onChange={e => setInput(e.target.value.replace(/\D/g, ''))}
              className="w-40 text-center text-3xl tabular-nums bg-transparent border-b-2 border-primary outline-none"
              placeholder="…"
            />
          )}
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-text-secondary">Sequence length: {span}</span>
          {phase === 'recall' && (
            <Button onClick={check} disabled={input.length !== span}>Submit</Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Processing speed test ──────────────────────────────────────────────────
// Show a green dot at random delays. User clicks. Median reaction time wins.
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
      setTrial(t => t + 1)
      setState('wait')
    }
  }

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Reaction speed</h2>
          <p className="text-xs text-text-secondary">Tap the moment the panel turns green. {TRIALS} trials.</p>
        </div>
        <button
          onClick={tap}
          className={`h-40 w-full rounded-lg transition-colors ${
            state === 'go' ? 'bg-success' : state === 'done' ? 'bg-surface' : 'bg-warning/30'
          }`}
        >
          <span className="text-sm font-semibold">
            {state === 'go' ? 'TAP NOW' : state === 'done' ? 'Done' : 'Wait…'}
          </span>
        </button>
        <p className="text-xs text-center text-text-secondary">Trial {Math.min(trial + 1, TRIALS)} of {TRIALS}</p>
      </CardContent>
    </Card>
  )
}

// ─── Profile form ───────────────────────────────────────────────────────────
function ProfileForm({ initial, onSubmit }: { initial: Result; onSubmit: (r: Pick<Result, 'chronotype' | 'sleepStartHour' | 'sleepEndHour' | 'cognitiveLoadBudget'>) => void }) {
  const [chronotype, setChronotype] = useState(initial.chronotype)
  const [sleepStart, setSleepStart] = useState(initial.sleepStartHour)
  const [sleepEnd, setSleepEnd] = useState(initial.sleepEndHour)
  const [budget, setBudget] = useState(initial.cognitiveLoadBudget)

  return (
    <Card>
      <CardContent className="p-6 space-y-5">
        <h2 className="text-lg font-semibold">When and how much</h2>

        <div>
          <label className="text-sm font-medium">Chronotype</label>
          <div className="mt-2 flex gap-2">
            {(['morning', 'neutral', 'evening'] as const).map(opt => (
              <button
                key={opt}
                type="button"
                onClick={() => setChronotype(opt)}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm capitalize ${
                  chronotype === opt ? 'border-primary bg-primary/10' : 'border-border'
                }`}
              >{opt}</button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium">Sleep start</label>
            <select
              value={sleepStart}
              onChange={e => setSleepStart(Number(e.target.value))}
              className="mt-2 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
            >
              {Array.from({ length: 24 }, (_, h) => (
                <option key={h} value={h}>{pad(h)}:00</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Sleep end</label>
            <select
              value={sleepEnd}
              onChange={e => setSleepEnd(Number(e.target.value))}
              className="mt-2 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
            >
              {Array.from({ length: 24 }, (_, h) => (
                <option key={h} value={h}>{pad(h)}:00</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium">Cognitive load budget — questions per block before rest</label>
          <input
            type="range" min={1} max={5} step={1}
            value={budget}
            onChange={e => setBudget(Number(e.target.value))}
            className="mt-2 w-full"
          />
          <div className="flex justify-between text-xs text-text-secondary">
            <span>1 (light)</span><span>{budget}</span><span>5 (heavy)</span>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={() => onSubmit({ chronotype, sleepStartHour: sleepStart, sleepEndHour: sleepEnd, cognitiveLoadBudget: budget })}>
            Continue
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Misc ───────────────────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-semibold mb-2">{title}</h3>
      {children}
    </div>
  )
}
function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-lg bg-surface/50 px-4 py-3">
      <p className="text-xs text-text-secondary">{k}</p>
      <p className="text-sm font-bold mt-0.5 capitalize">{v}</p>
    </div>
  )
}
function pad(n: number): string { return n.toString().padStart(2, '0') }
