/**
 * /preview/dashboard — authenticated home.
 *
 * Sections in order (per directive §8.2):
 *   1. Greeting
 *   2. Continue card (60) + side cards stack (40)
 *   3. Week plan strip (7 days)
 *   4. Domain mastery list (segmented bars)
 *   5. Recent activity (lightweight feed)
 */
import Link from 'next/link'
import {
  ArrowRight,
  Flame,
  Calendar,
  CheckCircle2,
  Clock,
  Lightbulb,
  FileCheck,
  BookOpen,
} from 'lucide-react'
import { Card, Button, Badge, Pill } from '@/components/v2'

const PLAN = [
  { day: 'Mon', date: '04', hours: 1.0, status: 'done' as const },
  { day: 'Tue', date: '05', hours: 1.5, status: 'done' as const },
  { day: 'Wed', date: '06', hours: 0.5, status: 'done' as const },
  { day: 'Thu', date: '07', hours: 1.0, status: 'today' as const },
  { day: 'Fri', date: '08', hours: 1.5, status: 'planned' as const },
  { day: 'Sat', date: '09', hours: 2.0, status: 'planned' as const },
  { day: 'Sun', date: '10', hours: 0.0, status: 'rest' as const },
]

const DOMAINS = [
  { name: 'Resilient architectures', mastery: 84, weight: '26%' },
  { name: 'High-performing architectures', mastery: 71, weight: '24%' },
  { name: 'Secure architectures', mastery: 62, weight: '30%' },
  { name: 'Cost-optimized architectures', mastery: 48, weight: '20%' },
]

const ACTIVITY = [
  {
    Icon: CheckCircle2,
    text: 'Completed lesson · S3 storage classes',
    time: '2h ago',
    tone: 'success' as const,
  },
  {
    Icon: Lightbulb,
    text: 'New weak area surfaced · KMS key rotation',
    time: '5h ago',
    tone: 'warning' as const,
  },
  {
    Icon: FileCheck,
    text: 'Mock exam #4 attempted · scored 762/1000',
    time: 'Yesterday',
    tone: 'brand' as const,
  },
]

export default function DashboardHome() {
  const today = new Date('2026-05-04T08:00:00')
  const dateStr = today.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="space-y-10">
      {/* ── Greeting ───────────────────────────────────────────── */}
      <header>
        <p className="font-v2-mono text-[12px] uppercase tracking-v2-wide text-v2-foreground-subtle">
          {dateStr}
        </p>
        <h1 className="v2-display mt-2 text-[32px] sm:text-[36px]">
          Good morning, <span className="v2-text-gradient">Alex.</span>
        </h1>
        <p className="mt-2 max-w-[560px] text-[15px] text-v2-foreground-muted">
          You're 18 days from your scheduled SAA-C03 exam. Today's review
          window has 24 cards — about 22 minutes if you keep moving.
        </p>
      </header>

      {/* ── Continue card + side stack ─────────────────────────── */}
      <section className="grid grid-cols-1 gap-5 lg:grid-cols-[1.5fr_1fr] lg:gap-6">
        {/* Continue card */}
        <Card padding="lg" className="relative overflow-hidden">
          {/* Decorative corner gradient */}
          <div
            aria-hidden
            className="pointer-events-none absolute -right-20 -top-20 h-60 w-60 rounded-full opacity-50 blur-3xl"
            style={{ background: 'var(--v2-gradient-brand-soft)' }}
          />

          <div className="relative">
            <div className="flex items-center gap-2">
              <Pill tone="brand" size="md">
                <span className="font-v2-mono text-[10px] font-semibold uppercase tracking-v2-wide">
                  Continue
                </span>
              </Pill>
              <span className="font-v2-mono text-[11px] uppercase tracking-v2-wide text-v2-foreground-subtle">
                Module 03 · Resilience & Performance
              </span>
            </div>

            <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-start">
              {/* Reading preview — first lines of the lesson, not a video thumb */}
              <div className="relative h-[140px] w-full shrink-0 overflow-hidden rounded-lg border border-v2-border bg-v2-surface-subtle p-4 sm:w-[200px]">
                {/* Lesson chapter pin */}
                <div className="flex items-center gap-1.5">
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-v2-brand-soft text-v2-brand">
                    <BookOpen className="h-3 w-3" strokeWidth={2.25} />
                  </div>
                  <span className="font-v2-mono text-[10px] font-semibold uppercase tracking-v2-wide text-v2-foreground-muted">
                    § 03.4
                  </span>
                </div>
                {/* Excerpt */}
                <p className="mt-3 text-[12px] font-bold leading-[1.45] text-v2-foreground">
                  Lifecycle hooks let you intercept Auto Scaling…
                </p>
                <div className="mt-2 space-y-1.5">
                  <div className="h-1.5 w-full rounded-full bg-v2-border" />
                  <div className="h-1.5 w-[88%] rounded-full bg-v2-border" />
                  <div className="h-1.5 w-[64%] rounded-full bg-v2-border-strong" />
                </div>
                {/* Bottom corner: read time */}
                <div className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-md bg-v2-surface px-1.5 py-0.5 shadow-v2-soft">
                  <Clock
                    className="h-2.5 w-2.5 text-v2-foreground-muted"
                    strokeWidth={2.25}
                  />
                  <span className="font-v2-mono text-[10px] font-semibold text-v2-foreground-muted">
                    13 min
                  </span>
                </div>
              </div>

              <div className="min-w-0 flex-1">
                <h2 className="text-[20px] font-bold leading-[1.3] text-v2-foreground">
                  Auto Scaling lifecycle hooks
                </h2>
                <p className="mt-1 text-[14px] text-v2-foreground-muted">
                  Lesson 4 of 16 · ~13 min read
                </p>

                <div className="mt-4">
                  <div className="flex items-center justify-between">
                    <span className="font-v2-mono text-[11px] font-semibold uppercase tracking-v2-wide text-v2-foreground-muted">
                      Module progress
                    </span>
                    <span className="font-v2-mono text-[12px] font-semibold text-v2-foreground">
                      4 / 16
                    </span>
                  </div>
                  <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-v2-surface-sunken">
                    <div
                      className="h-full rounded-full bg-v2-gradient-brand"
                      style={{ width: '25%' }}
                    />
                  </div>
                </div>

                <div className="mt-5">
                  <Button>
                    Continue lesson
                    <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Side stack */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-1">
          {/* Next mock exam */}
          <Card padding="lg">
            <div className="flex items-center justify-between">
              <Pill tone="neutral" size="md">
                <Calendar className="h-3 w-3" strokeWidth={2.25} />
                <span className="font-v2-mono text-[10px] uppercase tracking-v2-wide">
                  Scheduled
                </span>
              </Pill>
              <span className="font-v2-mono text-[11px] text-v2-foreground-subtle">
                Mock #5
              </span>
            </div>
            <h3 className="mt-4 text-[18px] font-bold leading-[1.3] text-v2-foreground">
              Next mock exam
            </h3>
            <p className="mt-1 text-[13px] text-v2-foreground-muted">
              Saturday, May 9 · 10:00 CET · 130 minutes
            </p>
            <Button variant="secondary" size="sm" className="mt-5 w-full">
              Reschedule
            </Button>
          </Card>

          {/* Streak */}
          <Card padding="lg">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-v2-warning-soft text-v2-warning">
                <Flame
                  className="h-6 w-6"
                  strokeWidth={2}
                  fill="currentColor"
                  fillOpacity={0.2}
                />
              </div>
              <div>
                <div className="font-v2-mono text-[11px] uppercase tracking-v2-wide text-v2-foreground-subtle">
                  Streak
                </div>
                <div className="text-[24px] font-bold text-v2-foreground">
                  12 days
                </div>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-7 gap-1.5">
              {Array.from({ length: 7 }).map((_, i) => (
                <div
                  key={i}
                  className={
                    i < 6
                      ? 'h-7 rounded bg-v2-gradient-brand'
                      : 'h-7 rounded border-2 border-dashed border-v2-brand/40 bg-v2-brand-soft'
                  }
                />
              ))}
            </div>
            <p className="mt-3 text-[12px] text-v2-foreground-muted">
              Last 7 days · today's window still open
            </p>
          </Card>
        </div>
      </section>

      {/* ── Week plan strip ───────────────────────────────────── */}
      <section>
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-[20px] font-bold tracking-v2-tight text-v2-foreground">
              Your week's plan
            </h2>
            <p className="mt-1 text-[13px] text-v2-foreground-muted">
              7 hours scheduled · 3 completed
            </p>
          </div>
          <Link
            href="/preview/dashboard/progress"
            className="hidden text-[13px] font-semibold text-v2-brand hover:text-v2-brand-hover sm:inline-flex"
          >
            Edit plan →
          </Link>
        </div>

        <div className="mt-5 grid grid-cols-7 gap-2 sm:gap-3">
          {PLAN.map((d) => {
            const isToday = d.status === 'today'
            const isDone = d.status === 'done'
            const isRest = d.status === 'rest'
            return (
              <div
                key={d.date}
                className={
                  isToday
                    ? 'rounded-xl border-2 border-v2-brand bg-v2-surface p-3 shadow-v2-elevated'
                    : 'rounded-xl border border-v2-border bg-v2-surface p-3 shadow-v2-soft'
                }
              >
                <div className="font-v2-mono text-[11px] font-semibold uppercase tracking-v2-wide text-v2-foreground-subtle">
                  {d.day}
                </div>
                <div className="mt-1 text-[18px] font-bold text-v2-foreground">
                  {d.date}
                </div>
                <div className="mt-3">
                  {isRest ? (
                    <span className="font-v2-mono text-[11px] text-v2-foreground-subtle">
                      Rest
                    </span>
                  ) : (
                    <span className="font-v2-mono text-[11px] font-semibold text-v2-foreground-muted">
                      {d.hours}h
                    </span>
                  )}
                </div>
                <div className="mt-3">
                  {isDone && (
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-v2-success-soft text-v2-success">
                      <CheckCircle2 className="h-3 w-3" strokeWidth={2.5} />
                    </span>
                  )}
                  {isToday && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-v2-brand-soft px-2 py-0.5 font-v2-mono text-[9px] font-semibold uppercase tracking-v2-wide text-v2-brand">
                      <span className="h-1.5 w-1.5 rounded-full bg-v2-brand" />
                      Today
                    </span>
                  )}
                  {d.status === 'planned' && (
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-v2-border-strong text-v2-foreground-subtle">
                      <Clock className="h-3 w-3" strokeWidth={2} />
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── Domain mastery + activity ─────────────────────────── */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-[1.5fr_1fr]">
        {/* Domain mastery */}
        <Card padding="lg">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-[18px] font-bold text-v2-foreground">
                Domain mastery · SAA-C03
              </h2>
              <p className="mt-1 text-[13px] text-v2-foreground-muted">
                12-segment bars showing concept-level retention.
              </p>
            </div>
            <Badge tone="neutral" size="sm" mono>
              Live
            </Badge>
          </div>

          <div className="mt-7 space-y-5">
            {DOMAINS.map((d) => (
              <div key={d.name}>
                <div className="flex items-baseline justify-between gap-3">
                  <div className="flex items-baseline gap-2">
                    <span className="text-[14px] font-semibold text-v2-foreground">
                      {d.name}
                    </span>
                    <span className="font-v2-mono text-[10px] uppercase tracking-v2-wide text-v2-foreground-subtle">
                      {d.weight} of exam
                    </span>
                  </div>
                  <span className="font-v2-mono text-[13px] font-semibold text-v2-brand">
                    {d.mastery}%
                  </span>
                </div>
                <SegmentedBar value={d.mastery} />
              </div>
            ))}
          </div>

          <div className="mt-7 flex items-center justify-between border-t border-v2-border-subtle pt-5">
            <p className="text-[12px] text-v2-foreground-muted">
              Mastery decays over time — keep the streak alive to hold it.
            </p>
            <Link
              href="/preview/dashboard/progress"
              className="text-[13px] font-semibold text-v2-brand hover:text-v2-brand-hover"
            >
              See full breakdown →
            </Link>
          </div>
        </Card>

        {/* Recent activity */}
        <Card padding="lg">
          <h2 className="text-[18px] font-bold text-v2-foreground">
            Recent activity
          </h2>
          <ul className="mt-5 space-y-4">
            {ACTIVITY.map((a, i) => (
              <li key={i} className="flex items-start gap-3">
                <span
                  className={
                    a.tone === 'success'
                      ? 'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-v2-success-soft text-v2-success'
                      : a.tone === 'warning'
                      ? 'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-v2-warning-soft text-v2-warning'
                      : 'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-v2-brand-soft text-v2-brand'
                  }
                >
                  <a.Icon className="h-4 w-4" strokeWidth={2.25} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] leading-[1.5] text-v2-foreground">
                    {a.text}
                  </p>
                  <p className="mt-0.5 font-v2-mono text-[11px] text-v2-foreground-subtle">
                    {a.time}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </section>
    </div>
  )
}

function SegmentedBar({ value }: { value: number }) {
  const segments = 12
  const filled = Math.round((value / 100) * segments)
  return (
    <div className="mt-2 grid grid-cols-12 gap-1">
      {Array.from({ length: segments }).map((_, i) => {
        // Tone scales with how far into the bar this segment sits
        let cls = 'bg-v2-surface-sunken'
        if (i < filled) {
          // Map segment position to a tone — earlier segments brand-soft,
          // later segments full brand. This isn't strictly mastery-based
          // but it gives the bar a satisfying ramp.
          if (i < filled - 6) cls = 'bg-v2-brand-soft'
          else if (i < filled - 3) cls = 'bg-v2-brand/60'
          else cls = 'bg-v2-gradient-brand'
        }
        return (
          <div
            key={i}
            className={`h-2 rounded-sm transition-all duration-300 ease-v2 ${cls}`}
          />
        )
      })}
    </div>
  )
}
