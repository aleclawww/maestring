/**
 * /preview/dashboard/courses/[slug] — course overview.
 *
 * Layout: hero strip with cert metadata + 70/30 split (module accordion
 * left, sticky purchase-style sidebar right).
 *
 * The accordion uses native <details>/<summary> for a11y and zero JS.
 * Each module shows: order, title, lessons + duration, progress bar; on
 * open, lesson rows with status icons and durations.
 */
'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  ChevronDown,
  Check,
  Lock,
  PlayCircle,
  Award,
  Clock,
  FileCheck,
} from 'lucide-react'
import {
  Card,
  Button,
  Badge,
  Pill,
  Eyebrow,
} from '@/components/v2'

// ── Sample course data ───────────────────────────────────────────────

type LessonStatus = 'done' | 'in-progress' | 'todo' | 'locked'

interface Lesson {
  id: string
  order: string
  title: string
  minutes: number
  status: LessonStatus
}

interface Module {
  id: string
  title: string
  description: string
  lessons: Lesson[]
}

const COURSE = {
  code: 'SAA-C03',
  name: 'AWS Solutions Architect',
  level: 'Associate',
  totalLessons: 60,
  totalHours: '~80h',
  examMinutes: 130,
}

const MODULES: Module[] = [
  {
    id: 'foundations',
    title: 'Foundations · IAM, VPC, EC2',
    description:
      "The non-negotiable substrate. Identity, networking, and compute before anything else.",
    lessons: [
      { id: '1.1', order: '1.1', title: 'IAM identities and trust policies', minutes: 14, status: 'done' },
      { id: '1.2', order: '1.2', title: 'VPC subnets, route tables, IGW vs NAT', minutes: 18, status: 'done' },
      { id: '1.3', order: '1.3', title: 'Security groups vs NACLs', minutes: 12, status: 'done' },
      { id: '1.4', order: '1.4', title: 'EC2 placement groups + instance metadata', minutes: 16, status: 'done' },
    ],
  },
  {
    id: 'storage',
    title: 'Storage & Databases',
    description:
      'S3, EBS, EFS, FSx; RDS, DynamoDB, ElastiCache. When to pick which.',
    lessons: [
      { id: '2.1', order: '2.1', title: 'S3 storage classes and lifecycle', minutes: 17, status: 'done' },
      { id: '2.2', order: '2.2', title: 'EBS volume types and IOPS', minutes: 13, status: 'done' },
      { id: '2.3', order: '2.3', title: 'RDS Multi-AZ vs read replicas', minutes: 15, status: 'done' },
      { id: '2.4', order: '2.4', title: 'DynamoDB partitions and adaptive capacity', minutes: 19, status: 'done' },
    ],
  },
  {
    id: 'resilience',
    title: 'Resilience & Performance',
    description:
      'Multi-AZ patterns, ELB types, Auto Scaling lifecycles, CloudFront, Route 53.',
    lessons: [
      { id: '3.1', order: '3.1', title: 'ALB vs NLB vs Gateway LB', minutes: 14, status: 'done' },
      { id: '3.2', order: '3.2', title: 'Auto Scaling groups and policies', minutes: 16, status: 'done' },
      { id: '3.3', order: '3.3', title: 'Auto Scaling cooldowns and warm pools', minutes: 12, status: 'done' },
      { id: '3.4', order: '3.4', title: 'Auto Scaling lifecycle hooks', minutes: 13, status: 'in-progress' },
      { id: '3.5', order: '3.5', title: 'CloudFront origins and behaviors', minutes: 18, status: 'todo' },
      { id: '3.6', order: '3.6', title: 'Route 53 routing policies', minutes: 15, status: 'todo' },
    ],
  },
  {
    id: 'security',
    title: 'Security, Cost, Migration',
    description:
      'KMS, Secrets Manager, Cost Explorer, DMS, DataSync, plus test-taking strategy.',
    lessons: [
      { id: '4.1', order: '4.1', title: 'KMS keys, grants, and rotation', minutes: 16, status: 'todo' },
      { id: '4.2', order: '4.2', title: 'Secrets Manager vs Parameter Store', minutes: 11, status: 'todo' },
      { id: '4.3', order: '4.3', title: 'Cost Explorer and Compute Optimizer', minutes: 13, status: 'locked' },
      { id: '4.4', order: '4.4', title: 'DMS and DataSync migration patterns', minutes: 17, status: 'locked' },
    ],
  },
]

function moduleProgress(m: Module) {
  const done = m.lessons.filter((l) => l.status === 'done').length
  return Math.round((done / m.lessons.length) * 100)
}

function moduleMinutes(m: Module) {
  return m.lessons.reduce((acc, l) => acc + l.minutes, 0)
}

export default function CourseOverviewPage({
  params,
}: {
  params: { slug: string }
}) {
  const overall = Math.round(
    (MODULES.flatMap((m) => m.lessons).filter((l) => l.status === 'done')
      .length /
      MODULES.flatMap((m) => m.lessons).length) *
      100,
  )

  // Find first non-done lesson for the "Continue" CTA
  const nextLesson = MODULES.flatMap((m) =>
    m.lessons.map((l) => ({ ...l, moduleTitle: m.title })),
  ).find((l) => l.status === 'in-progress' || l.status === 'todo')

  return (
    <div className="space-y-10">
      {/* ── Hero ────────────────────────────────────────────── */}
      <header>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md border border-v2-brand/20 bg-v2-brand-soft px-2 py-0.5 font-v2-mono text-[11px] font-semibold uppercase tracking-v2-wide text-v2-brand">
            {COURSE.code}
          </span>
          <Badge tone="neutral" size="sm">
            {COURSE.level}
          </Badge>
          <Badge tone="neutral" size="sm" mono>
            {COURSE.totalHours}
          </Badge>
        </div>
        <h1 className="v2-display mt-4 text-[36px] sm:text-[44px]">
          {COURSE.name}
        </h1>
        <p className="mt-3 max-w-[640px] text-[15px] leading-[1.65] text-v2-foreground-muted">
          AWS's most popular certification — design distributed systems on
          AWS, choose the right service, secure it sensibly. {COURSE.totalLessons} lessons
          across 4 modules.
        </p>
      </header>

      {/* ── Two-column ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.6fr_1fr] lg:gap-8">
        {/* Module accordion */}
        <div className="space-y-3">
          {MODULES.map((m, idx) => {
            const progress = moduleProgress(m)
            const minutes = moduleMinutes(m)
            return (
              <details
                key={m.id}
                className="group/mod overflow-hidden rounded-xl border border-v2-border bg-v2-surface shadow-v2-soft transition-shadow"
                open={idx === 2}
              >
                <summary className="flex cursor-pointer list-none items-center gap-4 px-5 py-5 sm:px-6">
                  {/* Module index badge */}
                  <div
                    className={
                      progress === 100
                        ? 'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-v2-success-soft text-v2-success'
                        : progress > 0
                        ? 'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-v2-gradient-brand text-[14px] font-extrabold text-white shadow-v2-button'
                        : 'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-v2-border bg-v2-surface-subtle text-[14px] font-extrabold text-v2-foreground-muted'
                    }
                  >
                    {progress === 100 ? (
                      <Check className="h-5 w-5" strokeWidth={2.75} />
                    ) : (
                      <span className="font-v2-mono">
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                    )}
                  </div>

                  {/* Title + meta */}
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-[16px] font-bold text-v2-foreground sm:text-[17px]">
                      {m.title}
                    </h2>
                    <div className="mt-1 flex flex-wrap items-center gap-3 font-v2-mono text-[11px] text-v2-foreground-subtle">
                      <span>{m.lessons.length} lessons</span>
                      <span aria-hidden>·</span>
                      <span>{minutes} min total</span>
                      <span aria-hidden>·</span>
                      <span className="font-semibold text-v2-foreground-muted">
                        {progress}% complete
                      </span>
                    </div>
                  </div>

                  {/* Inline progress bar */}
                  <div className="hidden h-1.5 w-32 overflow-hidden rounded-full bg-v2-surface-sunken sm:block">
                    <div
                      className="h-full rounded-full bg-v2-gradient-brand transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>

                  <ChevronDown
                    className="h-4 w-4 shrink-0 text-v2-foreground-muted transition-transform duration-200 ease-v2 group-open/mod:rotate-180"
                    strokeWidth={2.25}
                  />
                </summary>

                {/* Lessons */}
                <div className="border-t border-v2-border-subtle bg-v2-surface-subtle/40">
                  <p className="px-5 pt-4 text-[13px] leading-[1.6] text-v2-foreground-muted sm:px-6">
                    {m.description}
                  </p>
                  <ul className="divide-y divide-v2-border-subtle px-5 pb-2 pt-3 sm:px-6">
                    {m.lessons.map((l) => (
                      <li key={l.id}>
                        <LessonRow
                          lesson={l}
                          courseSlug={params.slug}
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              </details>
            )
          })}
        </div>

        {/* Sidebar */}
        <aside className="space-y-5 lg:sticky lg:top-20 lg:self-start">
          {/* Progress ring card */}
          <Card padding="lg">
            <div className="flex items-center gap-5">
              <ProgressRing value={overall} />
              <div className="min-w-0">
                <p className="font-v2-mono text-[11px] uppercase tracking-v2-wide text-v2-foreground-subtle">
                  Course progress
                </p>
                <p className="mt-1 v2-display text-[28px] leading-none">
                  {overall}%
                </p>
                <p className="mt-1 text-[13px] text-v2-foreground-muted">
                  {MODULES.flatMap((m) => m.lessons).filter((l) => l.status === 'done').length}{' '}
                  of {COURSE.totalLessons} lessons
                </p>
              </div>
            </div>
          </Card>

          {/* Next lesson */}
          {nextLesson && (
            <Card padding="lg">
              <Pill tone="brand" size="md">
                <PlayCircle className="h-3 w-3" strokeWidth={2.5} />
                <span className="font-v2-mono text-[10px] uppercase tracking-v2-wide">
                  Next up
                </span>
              </Pill>
              <h3 className="mt-4 text-[16px] font-bold leading-[1.4] text-v2-foreground">
                {nextLesson.title}
              </h3>
              <p className="mt-1 text-[13px] text-v2-foreground-muted">
                {nextLesson.moduleTitle} · {nextLesson.minutes} min read
              </p>
              <Link
                href={`/preview/dashboard/courses/${params.slug}/lesson/${nextLesson.id}`}
                className="mt-5 block"
              >
                <Button size="md" className="w-full">
                  Continue lesson
                  <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
                </Button>
              </Link>
            </Card>
          )}

          {/* Mock exam CTA */}
          <Card padding="lg" tone="dark">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 text-white">
                <Award className="h-5 w-5" strokeWidth={2.25} />
              </div>
              <div>
                <p className="font-v2-mono text-[11px] uppercase tracking-v2-wide text-white/60">
                  Mock exam
                </p>
                <p className="text-[15px] font-bold text-white">
                  Test your readiness
                </p>
              </div>
            </div>
            <p className="mt-4 text-[13px] leading-[1.6] text-white/70">
              65 questions in 130 minutes — exact format of the official AWS
              exam. Score above 800 means you're ready.
            </p>
            <Button
              size="md"
              className="mt-5 w-full bg-white text-v2-foreground hover:bg-white/90"
            >
              Start mock exam
              <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
            </Button>
          </Card>
        </aside>
      </div>
    </div>
  )
}

// ── Lesson row ───────────────────────────────────────────────────────

function LessonRow({
  lesson,
  courseSlug,
}: {
  lesson: Lesson
  courseSlug: string
}) {
  const StatusIcon = ({ status }: { status: LessonStatus }) => {
    if (status === 'done')
      return (
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-v2-success-soft text-v2-success">
          <Check className="h-3.5 w-3.5" strokeWidth={2.75} />
        </span>
      )
    if (status === 'in-progress')
      return (
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-v2-gradient-brand text-white shadow-v2-button">
          <PlayCircle className="h-3.5 w-3.5" strokeWidth={2.5} fill="currentColor" />
        </span>
      )
    if (status === 'locked')
      return (
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-v2-surface-sunken text-v2-foreground-subtle">
          <Lock className="h-3 w-3" strokeWidth={2.25} />
        </span>
      )
    return (
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-v2-border-strong bg-v2-surface text-v2-foreground-muted">
        <FileCheck className="h-3 w-3" strokeWidth={2} />
      </span>
    )
  }

  const isLocked = lesson.status === 'locked'

  const inner = (
    <div
      className={
        'flex items-center gap-3 py-3 transition-colors ' +
        (isLocked
          ? 'text-v2-foreground-subtle'
          : 'text-v2-foreground hover:bg-v2-surface-subtle/60')
      }
    >
      <StatusIcon status={lesson.status} />
      <span className="font-v2-mono text-[11px] font-semibold text-v2-foreground-subtle">
        {lesson.order}
      </span>
      <span
        className={
          'flex-1 text-[14px] ' +
          (lesson.status === 'in-progress' ? 'font-semibold' : '')
        }
      >
        {lesson.title}
      </span>
      <span className="hidden font-v2-mono text-[11px] text-v2-foreground-subtle sm:inline-flex sm:items-center sm:gap-1">
        <Clock className="h-3 w-3" strokeWidth={2} />
        {lesson.minutes} min
      </span>
    </div>
  )

  if (isLocked) return inner
  return (
    <Link
      href={`/preview/dashboard/courses/${courseSlug}/lesson/${lesson.id}`}
      className="block focus-visible:outline-none"
    >
      {inner}
    </Link>
  )
}

// ── Progress ring ────────────────────────────────────────────────────

function ProgressRing({ value }: { value: number }) {
  const r = 30
  const circ = 2 * Math.PI * r
  const offset = circ - (value / 100) * circ
  return (
    <svg width="80" height="80" viewBox="0 0 80 80" className="-rotate-90 shrink-0">
      <circle
        cx="40"
        cy="40"
        r={r}
        fill="none"
        stroke="var(--v2-surface-sunken)"
        strokeWidth="6"
      />
      <circle
        cx="40"
        cy="40"
        r={r}
        fill="none"
        stroke="url(#course-progress)"
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
      />
      <defs>
        <linearGradient
          id="course-progress"
          x1="0"
          y1="0"
          x2="80"
          y2="80"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#4F46E5" />
          <stop offset="100%" stopColor="#7C3AED" />
        </linearGradient>
      </defs>
    </svg>
  )
}
