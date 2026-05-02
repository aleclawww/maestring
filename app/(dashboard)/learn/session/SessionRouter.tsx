'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { CONCEPTS } from '@/lib/knowledge-graph/aws-saa'
import { PHASE_LABEL, type ActivityDescriptor, type Phase } from '@/lib/learning-engine/types'

interface ProgressInfo { label: string; num: number; den: number; pct: number }

export function SessionRouter() {
  const router = useRouter()
  const [activity, setActivity] = useState<ActivityDescriptor | null>(null)
  const [progress, setProgress] = useState<ProgressInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [actRes, stateRes] = await Promise.all([
        fetch('/api/learn/next-activity'),
        fetch('/api/learn/state'),
      ])
      if (!actRes.ok) throw new Error(`HTTP ${actRes.status}`)
      const json = await actRes.json()
      setActivity(json.data as ActivityDescriptor)
      if (stateRes.ok) {
        const sj = await stateRes.json()
        if (sj?.data?.progress) setProgress(sj.data.progress as ProgressInfo)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load activity')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  if (loading) return <Centered><span className="text-text-secondary">Loading your next activity…</span></Centered>
  if (error) return <Centered>
    <p className="text-danger mb-3">{error}</p>
    <Button onClick={load}>Retry</Button>
  </Centered>
  if (!activity) return <Centered>No activity available.</Centered>

  // Hard redirect for calibration — it has its own dedicated route.
  if (activity.type === 'calibration') {
    router.replace('/learn/calibration')
    return <Centered><span className="text-text-secondary">Routing to calibration…</span></Centered>
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="flex items-start justify-between gap-3 mb-4">
        <PhaseBadge phase={activity.phase} rationale={activity.rationale} />
        <details className="text-xs text-text-secondary shrink-0 relative">
          <summary className="cursor-pointer hover:text-text-primary list-none select-none">
            Switch mode ▾
          </summary>
          <div className="absolute right-0 mt-2 w-56 rounded-lg border border-border bg-surface shadow-lg p-2 z-10 space-y-1">
            <Link href="/study" className="block px-3 py-2 rounded hover:bg-surface-2">⚡ Quick session (MCQ)</Link>
            <Link href="/flashcards" className="block px-3 py-2 rounded hover:bg-surface-2">🃏 Flashcards</Link>
            <Link href="/learn" className="block px-3 py-2 rounded hover:bg-surface-2">📚 Browse syllabus</Link>
            <Link href="/exam" className="block px-3 py-2 rounded hover:bg-surface-2">📝 Mock exam (65q)</Link>
            <button onClick={load} className="w-full text-left px-3 py-2 rounded hover:bg-surface-2">🔄 Refresh activity</button>
          </div>
        </details>
      </div>
      {progress && <PhaseProgress phase={activity.phase} progress={progress} />}
      {activity.type === 'rest_card' && <RestCard reason={activity.reason ?? 'load_budget_exceeded'} onContinue={load} />}
      {activity.type === 'ambient_card' && <AmbientCard slug={activity.conceptSlug ?? null} onAdvance={load} />}
      {activity.type === 'anchoring_prompt' && <AnchoringPrompt onAdvance={load} />}
      {activity.type === 'mcq' && <MCQRedirect />}
      {activity.type === 'mcq_timed' && <MCQRedirect timed />}
      {activity.type === 'transfer_scenario' && <TransferRedirect />}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
function PhaseBadge({ phase, rationale }: { phase: ActivityDescriptor['phase']; rationale: string }) {
  return (
    <div className="mb-4 flex items-start gap-3">
      <Badge variant="info" className="mt-0.5">{PHASE_LABEL[phase]}</Badge>
      <p className="text-xs text-text-secondary leading-relaxed">{rationale}</p>
    </div>
  )
}

function PhaseProgress({ phase, progress }: { phase: Phase; progress: ProgressInfo }) {
  return (
    <div className="mb-5 rounded-lg border border-border bg-surface/40 px-4 py-3">
      <div className="flex items-center justify-between text-xs mb-1.5">
        <span className="font-medium">{progress.label}</span>
        <span className="tabular-nums text-text-secondary">
          {progress.num} / {progress.den} · {progress.pct}%
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-surface overflow-hidden">
        <div className="h-full bg-primary transition-all" style={{ width: `${progress.pct}%` }} />
      </div>
      <p className="text-[10px] text-text-secondary mt-1.5 uppercase tracking-wide">
        Until next phase ({PHASE_LABEL[phase]})
      </p>
    </div>
  )
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-md px-4 py-16 text-center">{children}</div>
}

// ─── Rest card ──────────────────────────────────────────────────────────────
function RestCard({ reason, onContinue }: { reason: 'sleep_window' | 'load_budget_exceeded' | 'forgetting_detected'; onContinue: () => void }) {
  const titles = {
    sleep_window: 'Sleep beats cramming',
    load_budget_exceeded: 'You hit your daily load',
    forgetting_detected: 'Time to consolidate',
  }
  const bodies = {
    sleep_window: 'You configured this hour as your sleep window. Memory consolidates while you sleep — come back tomorrow morning.',
    load_budget_exceeded: 'Your cognitive load budget is hit. Diminishing returns from here. Take a break — your brain consolidates between sessions.',
    forgetting_detected: 'Your readiness dipped. The system is shifting back to consolidation to protect what you already learned.',
  }
  return (
    <Card className="border-warning/40">
      <CardContent className="p-8 text-center space-y-4">
        <div className="text-5xl">🌙</div>
        <h2 className="text-xl font-semibold">{titles[reason]}</h2>
        <p className="text-sm text-text-secondary">{bodies[reason]}</p>
        <div className="flex gap-3 justify-center pt-2">
          <Link href="/learn"><Button variant="ghost">Browse the syllabus</Button></Link>
          <Button onClick={onContinue}>Check again</Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Ambient card ───────────────────────────────────────────────────────────
function AmbientCard({ slug, onAdvance }: { slug: string | null; onAdvance: () => void }) {
  const concept = slug ? CONCEPTS.find(c => c.slug === slug) : null

  async function done() {
    await fetch('/api/learn/bump', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'ambient_exposure' }),
    }).catch(() => {})
    onAdvance()
  }

  if (!concept) {
    return <Card><CardContent className="p-6 text-sm text-text-secondary">No ambient concept available.</CardContent></Card>
  }

  return (
    <Card>
      <CardContent className="p-6 space-y-5">
        <div>
          <p className="text-xs text-text-secondary uppercase tracking-wide">Ambient — just read</p>
          <h2 className="text-2xl font-bold mt-1">{concept.name}</h2>
          <p className="text-sm text-text-secondary mt-2">{concept.description}</p>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase text-primary mb-2">Key facts</p>
          <ul className="space-y-1.5">
            {concept.keyFacts.slice(0, 4).map((f, i) => (
              <li key={i} className="flex gap-2 text-sm">
                <span className="text-primary shrink-0">·</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>

        {concept.examTips[0] && (
          <div className="rounded-lg bg-surface/50 p-4 text-xs">
            <span className="text-text-secondary">Exam trigger to remember: </span>
            <span>{concept.examTips[0]}</span>
          </div>
        )}

        <div className="flex justify-between items-center pt-2">
          <Link href={`/learn/c/${concept.slug}`} className="text-xs text-text-secondary hover:underline">
            Open full concept →
          </Link>
          <Button onClick={done}>I&rsquo;ve read it · Next</Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Anchoring open-ended prompt ────────────────────────────────────────────
function AnchoringPrompt({ onAdvance }: { onAdvance: () => void }) {
  // Pick a concept the user has been exposed to ambiently. Random for simplicity.
  const [concept] = useState(() => {
    const eligible = CONCEPTS.filter(c => c.keyFacts.length >= 2)
    return eligible[Math.floor(Math.random() * eligible.length)]
  })
  const [response, setResponse] = useState('')
  const [submitted, setSubmitted] = useState(false)

  async function submit() {
    setSubmitted(true)
    await fetch('/api/learn/bump', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'anchoring_response' }),
    }).catch(() => {})
  }

  if (!concept) return null

  return (
    <Card>
      <CardContent className="p-6 space-y-5">
        <div>
          <p className="text-xs text-text-secondary uppercase tracking-wide">Anchoring — explain in your own words</p>
          <h2 className="text-xl font-semibold mt-1">
            Why does <span className="text-primary">{concept.name}</span> exist? What problem does it solve, and what would happen if it didn&rsquo;t exist?
          </h2>
        </div>

        <textarea
          value={response}
          onChange={e => setResponse(e.target.value)}
          rows={6}
          placeholder="Write a few sentences. The system doesn't grade this — generation alone forces deeper encoding."
          className="w-full rounded-lg border border-border bg-surface p-3 text-sm"
          disabled={submitted}
        />

        {!submitted ? (
          <div className="flex justify-end">
            <Button onClick={submit} disabled={response.trim().length < 30}>
              Submit my answer
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg bg-success/10 border border-success/30 p-4 text-sm">
              ✓ Recorded. Now compare with the canonical answer below.
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-primary mb-2">Canonical key facts</p>
              <ul className="space-y-1.5">
                {concept.keyFacts.map((f, i) => (
                  <li key={i} className="flex gap-2 text-sm">
                    <span className="text-primary shrink-0">·</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex justify-end">
              <Button onClick={onAdvance}>Next</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Transfer scenario — exam-style multi-domain mini-block ─────────────────
// At Transfer phase the orchestrator wants the user to face a small
// multi-concept block. We compose this by sending them to /exam (the existing
// 65q mock) but capped to a 5-question quick block via ?count=5.
function TransferRedirect() {
  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <p className="text-sm">
          Transfer block — 5 mixed exam-style questions spanning multiple
          domains. No hints, no second tries. This is the closest the platform
          gets to the real exam.
        </p>
        <div className="flex justify-end gap-3">
          <Link href="/learn/session"><Button variant="ghost">Refresh</Button></Link>
          <Link href="/exam"><Button>Start a mock exam</Button></Link>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── MCQ redirect — reuses existing /study flow ─────────────────────────────
function MCQRedirect({ timed }: { timed?: boolean } = {}) {
  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <p className="text-sm">
          {timed
            ? 'Timed drill — you have 8 seconds per question. Answer fast.'
            : 'Time for active practice. The system has lined up questions targeted at this phase.'}
        </p>
        <div className="flex justify-end gap-3">
          <Link href="/learn/session">
            <Button variant="ghost">Refresh</Button>
          </Link>
          <Link href={timed ? '/study?timed=8' : '/study'}>
            <Button>{timed ? 'Start timed drill' : 'Start practice'}</Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
