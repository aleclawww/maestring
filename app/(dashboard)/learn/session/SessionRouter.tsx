'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowRight,
  Award,
  BookOpen,
  Check,
  ChevronDown,
  Lightbulb,
  Moon,
  RefreshCw,
  Sparkles,
  Zap,
} from 'lucide-react'
import { Card, Button, Badge, Eyebrow } from '@/components/v2'
import { CONCEPTS } from '@/lib/knowledge-graph/aws-saa'
import {
  PHASE_LABEL,
  type ActivityDescriptor,
  type Phase,
} from '@/lib/learning-engine/types'

interface ProgressInfo {
  label: string
  num: number
  den: number
  pct: number
}

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

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (loading) {
    return (
      <Centered>
        <span className="font-v2-mono text-[12px] uppercase tracking-v2-wide text-v2-foreground-muted">
          Loading your next activity…
        </span>
      </Centered>
    )
  }

  if (error) {
    return (
      <Centered>
        <p className="text-[14px] font-medium text-v2-error">{error}</p>
        <div className="mt-4">
          <Button onClick={load}>
            <RefreshCw className="h-4 w-4" strokeWidth={2.25} />
            Retry
          </Button>
        </div>
      </Centered>
    )
  }

  if (!activity) {
    return (
      <Centered>
        <p className="text-[14px] text-v2-foreground-muted">
          No activity available.
        </p>
      </Centered>
    )
  }

  if (activity.type === 'calibration') {
    router.replace('/learn/calibration')
    return (
      <Centered>
        <span className="font-v2-mono text-[12px] uppercase tracking-v2-wide text-v2-foreground-muted">
          Routing to calibration…
        </span>
      </Centered>
    )
  }

  return (
    <div className="mx-auto max-w-3xl">
      {/* Phase header */}
      <div className="mb-5 flex items-start justify-between gap-3">
        <PhaseBadge phase={activity.phase} rationale={activity.rationale} />
        <details className="relative shrink-0">
          <summary className="inline-flex cursor-pointer list-none select-none items-center gap-1 rounded-md px-2 py-1 text-[12px] font-medium text-v2-foreground-muted transition-colors hover:bg-v2-surface-subtle hover:text-v2-foreground">
            Switch mode
            <ChevronDown className="h-3 w-3" strokeWidth={2.25} />
          </summary>
          <div className="absolute right-0 z-10 mt-2 w-60 space-y-0.5 overflow-hidden rounded-lg border border-v2-border bg-v2-surface p-1.5 shadow-v2-elevated">
            <DropdownLink href="/study" Icon={Zap} label="Quick session (MCQ)" />
            <DropdownLink href="/flashcards" Icon={Lightbulb} label="Flashcards" />
            <DropdownLink href="/learn" Icon={BookOpen} label="Browse syllabus" />
            <DropdownLink href="/exam" Icon={Award} label="Mock exam (65q)" />
            <button
              onClick={load}
              className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-[13px] font-medium text-v2-foreground-muted transition-colors hover:bg-v2-surface-subtle hover:text-v2-foreground"
            >
              <RefreshCw className="h-3.5 w-3.5" strokeWidth={2.25} />
              Refresh activity
            </button>
          </div>
        </details>
      </div>

      {progress && <PhaseProgress phase={activity.phase} progress={progress} />}

      {activity.type === 'rest_card' && (
        <RestCard
          reason={activity.reason ?? 'load_budget_exceeded'}
          onContinue={load}
        />
      )}
      {activity.type === 'ambient_card' && (
        <AmbientCard slug={activity.conceptSlug ?? null} onAdvance={load} />
      )}
      {activity.type === 'anchoring_prompt' && (
        <AnchoringPrompt onAdvance={load} />
      )}
      {activity.type === 'mcq' && <MCQRedirect />}
      {activity.type === 'mcq_timed' && <MCQRedirect timed />}
      {activity.type === 'transfer_scenario' && <TransferRedirect />}
    </div>
  )
}

function DropdownLink({
  href,
  Icon,
  label,
}: {
  href: string
  Icon: typeof Zap
  label: string
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] font-medium text-v2-foreground-muted transition-colors hover:bg-v2-surface-subtle hover:text-v2-foreground"
    >
      <Icon className="h-3.5 w-3.5" strokeWidth={2.25} />
      {label}
    </Link>
  )
}

function PhaseBadge({
  phase,
  rationale,
}: {
  phase: ActivityDescriptor['phase']
  rationale: string
}) {
  return (
    <div className="flex flex-1 items-start gap-3">
      <Badge tone="brand" size="md" mono>
        {PHASE_LABEL[phase]}
      </Badge>
      <p className="text-[12px] leading-[1.55] text-v2-foreground-muted">
        {rationale}
      </p>
    </div>
  )
}

function PhaseProgress({
  phase,
  progress,
}: {
  phase: Phase
  progress: ProgressInfo
}) {
  return (
    <div className="mb-6 rounded-xl border border-v2-border bg-v2-surface px-4 py-3">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[13px] font-semibold text-v2-foreground">
          {progress.label}
        </span>
        <span className="font-v2-mono text-[12px] tabular-nums text-v2-foreground-muted">
          {progress.num} / {progress.den} · {progress.pct}%
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-v2-surface-sunken">
        <div
          className="h-full rounded-full bg-v2-gradient-brand transition-all"
          style={{ width: `${progress.pct}%` }}
        />
      </div>
      <p className="mt-1.5 font-v2-mono text-[10px] uppercase tracking-v2-wide text-v2-foreground-subtle">
        Until next phase ({PHASE_LABEL[phase]})
      </p>
    </div>
  )
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-md py-16 text-center">{children}</div>
  )
}

// ─── Rest card ──────────────────────────────────────────────────────────────
function RestCard({
  reason,
  onContinue,
}: {
  reason: 'sleep_window' | 'load_budget_exceeded' | 'forgetting_detected'
  onContinue: () => void
}) {
  const titles = {
    sleep_window: 'Sleep beats cramming',
    load_budget_exceeded: 'You hit your daily load',
    forgetting_detected: 'Time to consolidate',
  }
  const bodies = {
    sleep_window:
      'You configured this hour as your sleep window. Memory consolidates while you sleep — come back tomorrow morning.',
    load_budget_exceeded:
      'Your cognitive load budget is hit. Diminishing returns from here. Take a break — your brain consolidates between sessions.',
    forgetting_detected:
      'Your readiness dipped. The system is shifting back to consolidation to protect what you already learned.',
  }

  return (
    <Card padding="lg" className="border-l-[3px] border-l-v2-warning text-center sm:p-10">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-v2-warning-soft text-v2-warning">
        <Moon className="h-6 w-6" strokeWidth={2} />
      </div>
      <h2 className="v2-display mt-5 text-[22px] sm:text-[26px]">
        {titles[reason]}
      </h2>
      <p className="mx-auto mt-3 max-w-[440px] text-[14px] leading-[1.65] text-v2-foreground-muted">
        {bodies[reason]}
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Link href="/learn">
          <Button variant="secondary">Browse the syllabus</Button>
        </Link>
        <Button onClick={onContinue}>
          <RefreshCw className="h-4 w-4" strokeWidth={2.25} />
          Check again
        </Button>
      </div>
      {reason === 'sleep_window' && (
        <div className="mt-6 border-t border-v2-border-subtle pt-5">
          <p className="text-[12px] text-v2-foreground-muted">Awake anyway?</p>
          <Link href="/study" className="mt-2 inline-block">
            <Button variant="ghost" size="sm">
              <Zap className="h-3.5 w-3.5" strokeWidth={2.25} />
              Quick session (skip the gate)
            </Button>
          </Link>
          <p className="mt-2 text-[10px] text-v2-foreground-subtle">
            Tip: if your schedule has changed, update your sleep window in
            Settings.
          </p>
        </div>
      )}
    </Card>
  )
}

// ─── Ambient card ───────────────────────────────────────────────────────────
function AmbientCard({
  slug,
  onAdvance,
}: {
  slug: string | null
  onAdvance: () => void
}) {
  const concept = slug ? CONCEPTS.find((c) => c.slug === slug) : null

  async function done() {
    await fetch('/api/learn/bump', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'ambient_exposure' }),
    }).catch(() => {})
    onAdvance()
  }

  if (!concept) {
    return (
      <Card padding="lg">
        <p className="text-[14px] text-v2-foreground-muted">
          No ambient concept available.
        </p>
      </Card>
    )
  }

  return (
    <Card padding="lg" className="space-y-6">
      <div>
        <Eyebrow>Ambient · just read</Eyebrow>
        <h2 className="v2-display mt-3 text-[26px]">{concept.name}</h2>
        <p className="mt-2 text-[14px] leading-[1.6] text-v2-foreground-muted">
          {concept.description}
        </p>
      </div>

      <div>
        <p className="font-v2-mono text-[11px] font-semibold uppercase tracking-v2-wide text-v2-brand">
          Key facts
        </p>
        <ul className="mt-2 space-y-1.5">
          {concept.keyFacts.slice(0, 4).map((f, i) => (
            <li
              key={i}
              className="flex gap-2.5 text-[14px] leading-[1.55] text-v2-foreground"
            >
              <span className="shrink-0 text-v2-brand">·</span>
              <span>{f}</span>
            </li>
          ))}
        </ul>
      </div>

      {concept.examTips[0] && (
        <div className="rounded-lg bg-v2-surface-subtle p-4">
          <p className="font-v2-mono text-[10px] font-semibold uppercase tracking-v2-wide text-v2-foreground-subtle">
            Exam trigger
          </p>
          <p className="mt-1 text-[13px] leading-[1.6] text-v2-foreground">
            {concept.examTips[0]}
          </p>
        </div>
      )}

      <div className="flex items-center justify-between border-t border-v2-border-subtle pt-4">
        <Link
          href={`/learn/c/${concept.slug}`}
          className="text-[12px] font-medium text-v2-foreground-muted transition-colors hover:text-v2-foreground hover:underline"
        >
          Open full concept →
        </Link>
        <Button onClick={done}>
          <Check className="h-4 w-4" strokeWidth={2.5} />
          I've read it · Next
        </Button>
      </div>
    </Card>
  )
}

// ─── Anchoring open-ended prompt ────────────────────────────────────────────
function AnchoringPrompt({ onAdvance }: { onAdvance: () => void }) {
  const [concept] = useState(() => {
    const eligible = CONCEPTS.filter((c) => c.keyFacts.length >= 2)
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
    <Card padding="lg" className="space-y-5">
      <div>
        <Eyebrow>Anchoring · explain in your own words</Eyebrow>
        <h2 className="mt-3 text-[20px] font-bold leading-[1.4] text-v2-foreground">
          Why does <span className="text-v2-brand">{concept.name}</span> exist?
          What problem does it solve, and what would happen if it didn't exist?
        </h2>
      </div>

      <textarea
        value={response}
        onChange={(e) => setResponse(e.target.value)}
        rows={6}
        placeholder="Write a few sentences. The system doesn't grade this — generation alone forces deeper encoding."
        className="w-full resize-none rounded-lg border border-v2-border bg-v2-surface p-3 text-[14px] leading-[1.55] text-v2-foreground placeholder:text-v2-foreground-subtle focus:border-v2-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-v2-brand/30"
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
          <div className="flex items-start gap-3 rounded-lg border border-v2-success/30 bg-v2-success-soft p-4">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-v2-success text-white">
              <Check className="h-3 w-3" strokeWidth={3} />
            </span>
            <p className="text-[13px] leading-[1.55] text-v2-foreground">
              Recorded. Now compare with the canonical answer below.
            </p>
          </div>
          <div>
            <p className="font-v2-mono text-[11px] font-semibold uppercase tracking-v2-wide text-v2-brand">
              Canonical key facts
            </p>
            <ul className="mt-2 space-y-1.5">
              {concept.keyFacts.map((f, i) => (
                <li
                  key={i}
                  className="flex gap-2.5 text-[14px] leading-[1.55] text-v2-foreground"
                >
                  <span className="shrink-0 text-v2-brand">·</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex justify-end">
            <Button onClick={onAdvance}>
              Next
              <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}

// ─── Transfer scenario ──────────────────────────────────────────────────────
function TransferRedirect() {
  return (
    <Card padding="lg" className="space-y-5">
      <div>
        <Eyebrow>Transfer block</Eyebrow>
        <p className="mt-2 text-[14px] leading-[1.65] text-v2-foreground">
          Five mixed exam-style questions spanning multiple domains. No hints,
          no second tries. This is the closest the platform gets to the real
          exam.
        </p>
      </div>
      <div className="flex justify-end gap-3">
        <Link href="/learn/session">
          <Button variant="secondary">
            <RefreshCw className="h-4 w-4" strokeWidth={2.25} />
            Refresh
          </Button>
        </Link>
        <Link href="/exam">
          <Button>
            <Sparkles className="h-4 w-4" strokeWidth={2.25} />
            Start a mock exam
          </Button>
        </Link>
      </div>
    </Card>
  )
}

// ─── MCQ redirect ───────────────────────────────────────────────────────────
function MCQRedirect({ timed }: { timed?: boolean } = {}) {
  return (
    <Card padding="lg" className="space-y-5">
      <p className="text-[14px] leading-[1.65] text-v2-foreground">
        {timed
          ? 'Timed drill — you have 8 seconds per question. Answer fast.'
          : 'Time for active practice. The system has lined up questions targeted at this phase.'}
      </p>
      <div className="flex justify-end gap-3">
        <Link href="/learn/session">
          <Button variant="secondary">
            <RefreshCw className="h-4 w-4" strokeWidth={2.25} />
            Refresh
          </Button>
        </Link>
        <Link href={timed ? '/study?timed=8' : '/study'}>
          <Button>
            <Zap className="h-4 w-4" strokeWidth={2.25} />
            {timed ? 'Start timed drill' : 'Start practice'}
          </Button>
        </Link>
      </div>
    </Card>
  )
}
