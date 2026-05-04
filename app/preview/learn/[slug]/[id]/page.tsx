/**
 * Lesson view — focused reading mode (directive §9).
 *
 * Layout (desktop):
 *   ┌──────────────────────────────────────────────┐
 *   │  topbar (back + crumb + close)               │
 *   ├────────┬─────────────────────────┬───────────┤
 *   │ module │   reading column        │   right   │
 *   │  tree  │   (max-w-[720px])       │   rail    │
 *   │  240   │                         │   280     │
 *   └────────┴─────────────────────────┴───────────┘
 *   sticky bottom bar (prev / progress / next)
 *
 * Reading typography: 17px / 1.7, max ~65 chars per line. Headings
 * h2 28px, h3 20px with 48px top margin. Inline code in surface-sunken,
 * code blocks on the deep gradient with a language label.
 */
'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  ChevronLeft,
  X,
  PlayCircle,
  Lock,
  FileCheck,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Bookmark,
  StickyNote,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Callout,
  CodeBlock,
  InlineCode,
  InlineQuestion,
} from '@/components/v2/dashboard/learning'

// ── Module tree data (mirrors the course overview) ───────────────────

const MODULES = [
  {
    title: 'Foundations · IAM, VPC, EC2',
    lessons: [
      { id: '1.1', title: 'IAM identities and trust policies', minutes: 14, status: 'done' as const },
      { id: '1.2', title: 'VPC subnets, route tables, IGW vs NAT', minutes: 18, status: 'done' as const },
      { id: '1.3', title: 'Security groups vs NACLs', minutes: 12, status: 'done' as const },
      { id: '1.4', title: 'EC2 placement groups + instance metadata', minutes: 16, status: 'done' as const },
    ],
  },
  {
    title: 'Storage & Databases',
    lessons: [
      { id: '2.1', title: 'S3 storage classes and lifecycle', minutes: 17, status: 'done' as const },
      { id: '2.2', title: 'EBS volume types and IOPS', minutes: 13, status: 'done' as const },
      { id: '2.3', title: 'RDS Multi-AZ vs read replicas', minutes: 15, status: 'done' as const },
      { id: '2.4', title: 'DynamoDB partitions and adaptive capacity', minutes: 19, status: 'done' as const },
    ],
  },
  {
    title: 'Resilience & Performance',
    lessons: [
      { id: '3.1', title: 'ALB vs NLB vs Gateway LB', minutes: 14, status: 'done' as const },
      { id: '3.2', title: 'Auto Scaling groups and policies', minutes: 16, status: 'done' as const },
      { id: '3.3', title: 'Auto Scaling cooldowns and warm pools', minutes: 12, status: 'done' as const },
      { id: '3.4', title: 'Auto Scaling lifecycle hooks', minutes: 13, status: 'in-progress' as const },
      { id: '3.5', title: 'CloudFront origins and behaviors', minutes: 18, status: 'todo' as const },
      { id: '3.6', title: 'Route 53 routing policies', minutes: 15, status: 'todo' as const },
    ],
  },
  {
    title: 'Security, Cost, Migration',
    lessons: [
      { id: '4.1', title: 'KMS keys, grants, and rotation', minutes: 16, status: 'todo' as const },
      { id: '4.2', title: 'Secrets Manager vs Parameter Store', minutes: 11, status: 'todo' as const },
      { id: '4.3', title: 'Cost Explorer and Compute Optimizer', minutes: 13, status: 'locked' as const },
      { id: '4.4', title: 'DMS and DataSync migration patterns', minutes: 17, status: 'locked' as const },
    ],
  },
]

const ANCHORS = [
  { id: 'why-hooks', label: 'Why hooks exist' },
  { id: 'lifecycle-events', label: 'Lifecycle events' },
  { id: 'how-to-implement', label: 'Implementing a hook' },
  { id: 'common-pitfalls', label: 'Common pitfalls' },
  { id: 'check-understanding', label: 'Check your understanding' },
]

export default function LessonPage({
  params,
}: {
  params: { slug: string; id: string }
}) {
  // Find current lesson + neighbours in the flat module/lesson list
  const flat = MODULES.flatMap((m) =>
    m.lessons.map((l) => ({ ...l, moduleTitle: m.title })),
  )
  const currentIdx = flat.findIndex((l) => l.id === params.id)
  const current = currentIdx >= 0 ? flat[currentIdx] : flat[0]
  const prev = currentIdx > 0 ? flat[currentIdx - 1] : null
  const next = currentIdx < flat.length - 1 ? flat[currentIdx + 1] : null

  const [leftOpen, setLeftOpen] = React.useState(true)
  const [rightOpen, setRightOpen] = React.useState(true)

  return (
    <div className="flex min-h-screen flex-col bg-v2-background">
      {/* Top bar — slimmer than the dashboard top bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-v2-border bg-v2-background/85 px-4 backdrop-blur-md sm:px-6">
        <Link
          href={`/preview/dashboard/courses/${params.slug}`}
          aria-label="Back to course"
          className="inline-flex h-9 items-center gap-1.5 rounded-md px-2 text-[13px] font-medium text-v2-foreground-muted transition-colors hover:bg-v2-surface-subtle hover:text-v2-foreground"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={2.25} />
          <span className="hidden sm:inline">Back to course</span>
        </Link>

        <span aria-hidden className="h-5 w-px bg-v2-border" />

        <div className="flex min-w-0 items-center gap-1.5 truncate">
          <span className="rounded-md border border-v2-brand/20 bg-v2-brand-soft px-1.5 py-0.5 font-v2-mono text-[10px] font-semibold uppercase tracking-v2-wide text-v2-brand">
            SAA-C03
          </span>
          <span className="truncate font-v2-mono text-[11px] text-v2-foreground-subtle">
            {current?.moduleTitle}
          </span>
        </div>

        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            aria-label={leftOpen ? 'Hide module list' : 'Show module list'}
            onClick={() => setLeftOpen((v) => !v)}
            className="hidden h-8 w-8 items-center justify-center rounded-md text-v2-foreground-muted transition-colors hover:bg-v2-surface-subtle hover:text-v2-foreground lg:inline-flex"
          >
            {leftOpen ? (
              <PanelLeftClose className="h-4 w-4" strokeWidth={2} />
            ) : (
              <PanelLeftOpen className="h-4 w-4" strokeWidth={2} />
            )}
          </button>
          <button
            type="button"
            aria-label={rightOpen ? 'Hide notes panel' : 'Show notes panel'}
            onClick={() => setRightOpen((v) => !v)}
            className="hidden h-8 w-8 items-center justify-center rounded-md text-v2-foreground-muted transition-colors hover:bg-v2-surface-subtle hover:text-v2-foreground xl:inline-flex"
          >
            {rightOpen ? (
              <PanelRightClose className="h-4 w-4" strokeWidth={2} />
            ) : (
              <PanelRightOpen className="h-4 w-4" strokeWidth={2} />
            )}
          </button>
          <Link
            href={`/preview/dashboard/courses/${params.slug}`}
            aria-label="Exit lesson"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-v2-foreground-muted transition-colors hover:bg-v2-surface-subtle hover:text-v2-foreground"
          >
            <X className="h-4 w-4" strokeWidth={2} />
          </Link>
        </div>
      </header>

      {/* Three-column body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: module tree */}
        {leftOpen && (
          <aside className="hidden w-[260px] shrink-0 overflow-y-auto border-r border-v2-border bg-v2-surface lg:block">
            <ModuleTree currentId={current?.id ?? ''} slug={params.slug} />
          </aside>
        )}

        {/* Center: reading column */}
        <main className="flex-1 overflow-y-auto">
          <article className="mx-auto max-w-[720px] px-6 py-12 sm:py-16">
            <p className="font-v2-mono text-[12px] font-semibold uppercase tracking-v2-wide text-v2-brand">
              Lesson 3.4 · Resilience &amp; Performance
            </p>
            <h1 className="v2-display mt-3 text-[40px] leading-[1.1] sm:text-[44px]">
              Auto Scaling lifecycle hooks
            </h1>
            <p className="mt-4 text-[16px] leading-[1.6] text-v2-foreground-muted">
              Why graceful instance launch and termination matters, the four
              lifecycle states you'll be asked about on the exam, and the one
              gotcha that breaks most production rollouts.
            </p>

            <LessonContent />

            {/* Mark complete row */}
            <div className="mt-16 flex flex-col items-start justify-between gap-4 border-t border-v2-border-subtle pt-8 sm:flex-row sm:items-center">
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-lg border border-v2-border bg-v2-surface px-4 py-2 text-[13px] font-semibold text-v2-foreground transition-colors hover:bg-v2-surface-subtle"
              >
                <Bookmark className="h-3.5 w-3.5" strokeWidth={2} />
                Bookmark for review
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-lg bg-v2-foreground px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-v2-deep-darker"
              >
                <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                Mark lesson complete
              </button>
            </div>
          </article>
        </main>

        {/* Right rail */}
        {rightOpen && (
          <aside className="hidden w-[280px] shrink-0 overflow-y-auto border-l border-v2-border bg-v2-surface xl:block">
            <RightRail />
          </aside>
        )}
      </div>

      {/* Sticky bottom bar */}
      <BottomBar
        slug={params.slug}
        prev={prev ?? null}
        next={next ?? null}
        currentIdx={currentIdx}
        total={flat.length}
      />
    </div>
  )
}

// ── Module tree ──────────────────────────────────────────────────────

function ModuleTree({
  currentId,
  slug,
}: {
  currentId: string
  slug: string
}) {
  return (
    <nav className="px-3 py-5">
      <p className="px-3 pb-3 font-v2-mono text-[11px] font-semibold uppercase tracking-v2-wide text-v2-foreground-subtle">
        Course outline
      </p>
      <div className="space-y-5">
        {MODULES.map((m, mi) => (
          <div key={m.title}>
            <p className="px-3 text-[11px] font-bold uppercase tracking-wide text-v2-foreground-muted">
              <span className="font-v2-mono text-v2-foreground-subtle">
                {String(mi + 1).padStart(2, '0')} ·{' '}
              </span>
              {m.title}
            </p>
            <ul className="mt-2 space-y-px">
              {m.lessons.map((l) => {
                const active = l.id === currentId
                const isLocked = l.status === 'locked'
                return (
                  <li key={l.id}>
                    <Link
                      href={
                        isLocked
                          ? '#'
                          : `/preview/learn/${slug}/${l.id}`
                      }
                      className={cn(
                        'group flex items-start gap-2.5 rounded-md py-1.5 pl-3 pr-2 text-[13px] leading-[1.4] transition-colors duration-150',
                        active
                          ? 'border-l-2 border-v2-brand bg-v2-brand-soft pl-[10px] font-semibold text-v2-foreground'
                          : isLocked
                          ? 'cursor-not-allowed text-v2-foreground-subtle'
                          : 'text-v2-foreground-muted hover:bg-v2-surface-subtle hover:text-v2-foreground',
                      )}
                    >
                      <LessonStatusIcon status={l.status} />
                      <span className="flex-1">
                        <span className="font-v2-mono text-[10px] font-semibold text-v2-foreground-subtle">
                          {l.id}
                        </span>{' '}
                        {l.title}
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  )
}

function LessonStatusIcon({
  status,
}: {
  status: 'done' | 'in-progress' | 'todo' | 'locked'
}) {
  if (status === 'done')
    return (
      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-v2-success-soft text-v2-success">
        <Check className="h-2.5 w-2.5" strokeWidth={3} />
      </span>
    )
  if (status === 'in-progress')
    return (
      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-v2-gradient-brand text-white">
        <PlayCircle className="h-2.5 w-2.5" strokeWidth={2.5} fill="currentColor" />
      </span>
    )
  if (status === 'locked')
    return (
      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center text-v2-foreground-subtle">
        <Lock className="h-2.5 w-2.5" strokeWidth={2.25} />
      </span>
    )
  return (
    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center text-v2-foreground-subtle">
      <FileCheck className="h-2.5 w-2.5" strokeWidth={2} />
    </span>
  )
}

// ── Right rail (anchors + notes) ─────────────────────────────────────

function RightRail() {
  const [note, setNote] = React.useState(
    'Heartbeat timeout default is 1h — exam loves this number.',
  )

  return (
    <div className="space-y-7 px-5 py-6">
      <section>
        <p className="font-v2-mono text-[11px] font-semibold uppercase tracking-v2-wide text-v2-foreground-subtle">
          On this page
        </p>
        <ul className="mt-3 space-y-1.5 border-l border-v2-border-subtle">
          {ANCHORS.map((a, i) => (
            <li key={a.id}>
              <a
                href={`#${a.id}`}
                className={cn(
                  '-ml-px block border-l-2 py-1 pl-3 text-[13px] transition-colors',
                  i === 0
                    ? 'border-v2-brand font-semibold text-v2-foreground'
                    : 'border-transparent text-v2-foreground-muted hover:border-v2-border-strong hover:text-v2-foreground',
                )}
              >
                {a.label}
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <div className="flex items-center gap-2">
          <StickyNote
            className="h-3.5 w-3.5 text-v2-foreground-muted"
            strokeWidth={2}
          />
          <p className="font-v2-mono text-[11px] font-semibold uppercase tracking-v2-wide text-v2-foreground-subtle">
            Your notes
          </p>
        </div>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Jot down what stuck…"
          rows={6}
          className="mt-3 w-full resize-none rounded-lg border border-v2-border bg-v2-surface-subtle/50 p-3 text-[13px] leading-[1.55] text-v2-foreground placeholder:text-v2-foreground-subtle focus:border-v2-brand focus:bg-v2-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-v2-brand/30"
        />
        <p className="mt-2 font-v2-mono text-[10px] uppercase tracking-v2-wide text-v2-foreground-subtle">
          Saved · synced across devices
        </p>
      </section>

      <section className="rounded-lg border border-v2-border bg-v2-surface-subtle/50 p-4">
        <p className="font-v2-mono text-[11px] font-semibold uppercase tracking-v2-wide text-v2-foreground-subtle">
          Up next in your queue
        </p>
        <p className="mt-3 text-[13px] font-semibold leading-[1.4] text-v2-foreground">
          CloudFront origins and behaviors
        </p>
        <p className="mt-1 font-v2-mono text-[11px] text-v2-foreground-muted">
          18 min · Module 03
        </p>
      </section>
    </div>
  )
}

// ── Bottom bar ───────────────────────────────────────────────────────

function BottomBar({
  slug,
  prev,
  next,
  currentIdx,
  total,
}: {
  slug: string
  prev: { id: string; title: string } | null
  next: { id: string; title: string } | null
  currentIdx: number
  total: number
}) {
  const pct = total > 0 ? Math.round(((currentIdx + 1) / total) * 100) : 0
  return (
    <footer className="sticky bottom-0 z-20 border-t border-v2-border bg-v2-surface/95 backdrop-blur-md">
      {/* Thin progress at the very top of the bar */}
      <div className="h-1 w-full bg-v2-surface-sunken">
        <div
          className="h-full bg-v2-gradient-brand transition-all duration-500 ease-v2"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
        {prev ? (
          <Link
            href={`/preview/learn/${slug}/${prev.id}`}
            className="group inline-flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium text-v2-foreground-muted transition-colors hover:bg-v2-surface-subtle hover:text-v2-foreground"
          >
            <ChevronLeft
              className="h-4 w-4 transition-transform duration-150 ease-v2 group-hover:-translate-x-0.5"
              strokeWidth={2.25}
            />
            <span className="hidden sm:inline">Previous</span>
          </Link>
        ) : (
          <div className="w-24" />
        )}

        <div className="hidden flex-1 text-center font-v2-mono text-[11px] uppercase tracking-v2-wide text-v2-foreground-subtle sm:block">
          Lesson {currentIdx + 1} of {total} · {pct}%
        </div>

        <div className="flex-1 sm:hidden" />

        {next ? (
          <Link
            href={`/preview/learn/${slug}/${next.id}`}
            className="group inline-flex items-center gap-2 rounded-lg bg-v2-gradient-brand px-4 py-2 text-[13px] font-semibold text-white shadow-v2-button transition-all duration-200 ease-v2 hover:-translate-y-0.5 hover:shadow-v2-elevated"
          >
            <span className="max-w-[180px] truncate">
              Next: {next.title}
            </span>
            <ChevronRight
              className="h-4 w-4 transition-transform duration-150 ease-v2 group-hover:translate-x-0.5"
              strokeWidth={2.5}
            />
          </Link>
        ) : (
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg bg-v2-foreground px-4 py-2 text-[13px] font-semibold text-white"
          >
            Finish module
            <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
          </button>
        )}
      </div>
    </footer>
  )
}

// ── Lesson content ───────────────────────────────────────────────────

function LessonContent() {
  return (
    <div className="prose-lesson mt-12">
      <style jsx>{`
        .prose-lesson :global(h2) {
          font-size: 28px;
          font-weight: 700;
          letter-spacing: -0.015em;
          line-height: 1.25;
          color: var(--v2-foreground);
          margin-top: 48px;
          margin-bottom: 16px;
          scroll-margin-top: 80px;
        }
        .prose-lesson :global(h3) {
          font-size: 20px;
          font-weight: 700;
          line-height: 1.3;
          color: var(--v2-foreground);
          margin-top: 32px;
          margin-bottom: 12px;
          scroll-margin-top: 80px;
        }
        .prose-lesson :global(p) {
          font-size: 17px;
          line-height: 1.7;
          color: var(--v2-foreground);
          margin-bottom: 18px;
        }
        .prose-lesson :global(ul) {
          font-size: 17px;
          line-height: 1.7;
          color: var(--v2-foreground);
          margin: 18px 0;
          padding-left: 1.5em;
        }
        .prose-lesson :global(li) {
          margin-bottom: 8px;
        }
        .prose-lesson :global(li)::marker {
          color: var(--v2-brand);
        }
        .prose-lesson :global(strong) {
          font-weight: 700;
          color: var(--v2-foreground);
        }
        .prose-lesson :global(a) {
          color: var(--v2-brand);
          text-decoration: underline;
          text-decoration-thickness: 1px;
          text-underline-offset: 3px;
        }
        .prose-lesson :global(a:hover) {
          color: var(--v2-brand-hover);
        }
      `}</style>

      <h2 id="why-hooks">Why hooks exist</h2>
      <p>
        When an Auto Scaling group launches a new instance, AWS happily
        marks it healthy the moment the EC2 status checks pass. That's
        often <em>before</em> your application is ready — the JVM is still
        warming up, configuration is still pulling from{' '}
        <InlineCode>SSM Parameter Store</InlineCode>, the cache is empty.
        Traffic gets sent in. Latency spikes. Customers notice.
      </p>
      <p>
        <strong>Lifecycle hooks</strong> let you pause an instance in a
        well-defined state — between <InlineCode>Pending</InlineCode> and{' '}
        <InlineCode>InService</InlineCode> on launch, between{' '}
        <InlineCode>Terminating</InlineCode> and{' '}
        <InlineCode>Terminated</InlineCode> on scale-in — so you can do
        the work that has to finish before traffic flows or after it stops.
      </p>

      <Callout tone="info" title="What the exam is actually testing">
        Three things keep coming up: which lifecycle state a hook fires
        in, the default heartbeat timeout (one hour), and what happens
        when the timeout expires. Master those and you'll handle every
        Auto Scaling lifecycle question on the SAA-C03.
      </Callout>

      <h2 id="lifecycle-events">The four lifecycle events</h2>
      <p>
        Auto Scaling exposes two pause points, in two directions:
      </p>
      <ul>
        <li>
          <strong>Launch · Pending:Wait</strong> — the instance is up but
          not yet in service. Use this to bake AMI configuration,
          register with service discovery, prime caches.
        </li>
        <li>
          <strong>Launch · InService</strong> — fired when the instance
          enters service. Useful for cold-start observability.
        </li>
        <li>
          <strong>Terminate · Terminating:Wait</strong> — the instance is
          coming out. Drain connections, flush logs, deregister from
          your load balancer's target group cleanly.
        </li>
        <li>
          <strong>Terminate · Terminated</strong> — fired post-shutdown.
          Mostly bookkeeping.
        </li>
      </ul>

      <h2 id="how-to-implement">Implementing a hook</h2>
      <p>
        Attach a hook to an Auto Scaling group, then have something react
        to the lifecycle notification. The notification target can be an
        SQS queue, an SNS topic, or an EventBridge rule. EventBridge is
        the modern default — it lets you fan out to a Lambda directly:
      </p>

      <CodeBlock
        language="aws cli"
        code={`aws autoscaling put-lifecycle-hook \\
  --lifecycle-hook-name asg-warmup \\
  --auto-scaling-group-name web-asg \\
  --lifecycle-transition autoscaling:EC2_INSTANCE_LAUNCHING \\
  --heartbeat-timeout 600 \\
  --default-result ABANDON`}
      />

      <p>
        The Lambda then does the warmup work and signals back when ready:
      </p>

      <CodeBlock
        language="python"
        code={`import boto3

asg = boto3.client('autoscaling')

def handler(event, _ctx):
    detail = event['detail']
    asg.complete_lifecycle_action(
        LifecycleHookName=detail['LifecycleHookName'],
        AutoScalingGroupName=detail['AutoScalingGroupName'],
        LifecycleActionToken=detail['LifecycleActionToken'],
        LifecycleActionResult='CONTINUE',
    )`}
      />

      <h3>Default vs ABANDON on timeout</h3>
      <p>
        If your Lambda never calls{' '}
        <InlineCode>complete_lifecycle_action</InlineCode>, the hook sits
        in <InlineCode>Pending:Wait</InlineCode> until the heartbeat
        timeout expires (<strong>one hour by default</strong>). Whatever
        you set as <InlineCode>--default-result</InlineCode> then runs:
        <InlineCode>CONTINUE</InlineCode> proceeds, <InlineCode>ABANDON</InlineCode>{' '}
        terminates the instance.
      </p>

      <Callout tone="warning" title="The classic mistake">
        Leaving the heartbeat at one hour <em>and</em> the default at
        CONTINUE. If your warmup Lambda silently fails, the broken
        instance is in service for 59 minutes before anyone notices.
        Either lower the timeout or default to ABANDON.
      </Callout>

      <h2 id="common-pitfalls">Common pitfalls</h2>
      <ul>
        <li>
          Forgetting to call{' '}
          <InlineCode>record_lifecycle_action_heartbeat</InlineCode> on
          long-running setup. The hook ticks down from the moment it fires,
          not from the moment your handler reaches the slow part.
        </li>
        <li>
          Using <InlineCode>SQS</InlineCode> as the target without a
          dead-letter queue. A poison message can stall the launch
          forever.
        </li>
        <li>
          Mixing CloudWatch agent install with the hook. Cleaner to bake
          the agent into the AMI and use the hook only for
          environment-specific config.
        </li>
      </ul>

      <h2 id="check-understanding">Check your understanding</h2>
      <p>
        Quick gut-check before you move on:
      </p>

      <InlineQuestion
        question="An Auto Scaling group launches an instance. Your lifecycle hook handler crashes silently. Heartbeat timeout is left at the default; the hook's default result is CONTINUE. What happens?"
        options={[
          {
            label: 'A',
            text: 'The instance terminates immediately — broken hooks always abandon by default.',
          },
          {
            label: 'B',
            text: 'The instance sits in Pending:Wait for one hour, then enters service unhealthy.',
            correct: true,
          },
          {
            label: 'C',
            text: 'CloudWatch fires an alarm and replaces the instance.',
          },
          {
            label: 'D',
            text: 'Auto Scaling retries the hook three times before giving up.',
          },
        ]}
        explanation="With default-result CONTINUE and a 1-hour heartbeat, a non-responsive hook lets the broken instance enter service after 60 minutes. Either lower the heartbeat or set default-result to ABANDON to fail closed."
      />

      <p>
        Next lesson covers <strong>CloudFront origins and behaviors</strong>
        {' '}— how AWS turns 200+ POPs into a single coherent CDN, and the
        cache-key gotchas that the exam loves to dress up as
        cost-optimization questions.
      </p>
    </div>
  )
}
