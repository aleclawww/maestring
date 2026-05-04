/**
 * Marketing hero — the most important screen on the entire site.
 *
 * Layout: 60/40 split on desktop. Text left, isometric product card right.
 * The card has a perspective tilt (rotateX 5° rotateY -12°) per the
 * Corporate Trust signature. Two floating decorative cards sit around it
 * to suggest depth — Stripe-hero composite pattern.
 *
 * Content: one number + one specific claim ("3,200 engineers") beats five
 * adjectives. Copy is calibrated for skeptical European technical buyers.
 */
import Link from 'next/link'
import {
  ArrowRight,
  Check,
  Flame,
  Sparkles,
  Award,
} from 'lucide-react'
import { Button, Pill, BlurBlob } from '@/components/v2'

export function Hero() {
  return (
    <section className="relative isolate overflow-hidden">
      {/* Atmospheric blobs */}
      <BlurBlob className="-left-40 -top-32" size={620} opacity={0.22} animated />
      <BlurBlob
        className="right-0 top-32"
        background="var(--v2-gradient-brand-soft)"
        size={520}
        opacity={0.6}
      />

      <div className="relative z-10 mx-auto max-w-[1200px] px-6 pb-24 pt-20 sm:pt-24 lg:pt-28">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
          {/* ── Text column ─────────────────────────────────────── */}
          <div>
            <Pill tone="outlined" size="md">
              <span className="font-v2-mono text-[11px] uppercase tracking-v2-wide">
                AWS Certifications · 2026
              </span>
            </Pill>

            <h1 className="v2-display mt-6 text-[44px] leading-[1.05] sm:text-[56px] lg:text-[68px]">
              Pass your AWS exam.{' '}
              <span className="v2-text-gradient">First try.</span>
            </h1>

            <p className="mt-6 max-w-[540px] text-[17px] leading-[1.6] text-v2-foreground-muted sm:text-[18px]">
              Adaptive AI questions, exam-grade simulators, and the FSRS
              scheduling that powers serious self-study. Cover SAA, DVA, SAP
              and SOA with the same workflow.
            </p>

            <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
              <Button size="xl" className="rounded-full">
                Start free trial
                <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
              </Button>
              <Button variant="secondary" size="xl" className="rounded-full">
                See a sample exam
              </Button>
            </div>

            {/* Social proof row */}
            <ul className="mt-7 flex flex-col gap-3 text-[14px] text-v2-foreground-muted sm:flex-row sm:items-center sm:gap-6">
              {[
                'Aligned with 2026 exam guides',
                'No credit card required',
                '7-day free trial',
              ].map((t) => (
                <li key={t} className="inline-flex items-center gap-2">
                  <Check
                    className="h-4 w-4 text-v2-success"
                    strokeWidth={2.5}
                  />
                  {t}
                </li>
              ))}
            </ul>
          </div>

          {/* ── Visual column: isometric study card ────────────── */}
          <div className="relative" style={{ perspective: '2000px' }}>
            <HeroProductCard />

            {/* Floating streak ribbon */}
            <div
              className="absolute -left-6 top-12 hidden rounded-2xl border border-v2-border bg-v2-surface p-4 shadow-v2-elevated lg:block"
              style={{ transform: 'rotate(-4deg)' }}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-v2-warning-soft text-v2-warning">
                  <Flame className="h-5 w-5" strokeWidth={2.25} />
                </div>
                <div>
                  <div className="font-v2-mono text-[10px] uppercase tracking-v2-wide text-v2-foreground-subtle">
                    Streak
                  </div>
                  <div className="text-[16px] font-bold text-v2-foreground">
                    27 days
                  </div>
                </div>
              </div>
            </div>

            {/* Floating progress ribbon */}
            <div
              className="absolute -bottom-6 -right-2 hidden rounded-2xl border border-v2-border bg-v2-surface p-4 shadow-v2-elevated lg:block"
              style={{ transform: 'rotate(3deg)' }}
            >
              <div className="flex items-center gap-3">
                <ProgressRing value={68} />
                <div>
                  <div className="font-v2-mono text-[10px] uppercase tracking-v2-wide text-v2-foreground-subtle">
                    SAA-C03
                  </div>
                  <div className="text-[14px] font-bold text-v2-foreground">
                    68% mastered
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ── Sub-components (kept local — only the hero uses them) ────────────

function HeroProductCard() {
  return (
    <div
      className="relative rounded-2xl border border-v2-border bg-v2-surface shadow-v2-elevated transition-transform duration-500 ease-v2 hover:rotate-y-[-8deg]"
      style={{ transform: 'rotateX(5deg) rotateY(-12deg)' }}
    >
      {/* Top chrome */}
      <div className="flex items-center justify-between border-b border-v2-border px-5 py-3.5">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-v2-error/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-v2-warning/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-v2-success/80" />
        </div>
        <div className="flex items-center gap-1.5">
          <Sparkles className="h-3 w-3 text-v2-brand" strokeWidth={2.5} />
          <span className="font-v2-mono text-[10px] uppercase tracking-v2-wide text-v2-foreground-subtle">
            Adaptive · session 14
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="space-y-5 p-6 sm:p-7">
        {/* Cert + scheduling */}
        <div className="flex items-center justify-between">
          <span className="rounded-md border border-v2-brand/20 bg-v2-brand-soft px-2 py-0.5 font-v2-mono text-[10px] font-semibold uppercase tracking-v2-wide text-v2-brand">
            SAA-C03
          </span>
          <span className="rounded-full bg-v2-success-soft px-2 py-0.5 font-v2-mono text-[10px] font-semibold uppercase tracking-v2-wide text-v2-success">
            Due now · FSRS
          </span>
        </div>

        {/* Question */}
        <p className="text-[15px] font-semibold leading-[1.45] text-v2-foreground sm:text-[16px]">
          You need to host a static website with global low latency. Which AWS
          service combination is most cost-effective?
        </p>

        {/* Options */}
        <ul className="space-y-2">
          {[
            { label: 'A', text: 'EC2 + ELB across multiple regions', state: 'idle' as const },
            { label: 'B', text: 'S3 with CloudFront distribution', state: 'selected' as const },
            { label: 'C', text: 'Lightsail with Route 53 latency routing', state: 'idle' as const },
            { label: 'D', text: 'Global Accelerator + Application Load Balancer', state: 'idle' as const },
          ].map((o) => (
            <li
              key={o.label}
              className={
                o.state === 'selected'
                  ? 'flex items-start gap-3 rounded-lg border border-v2-brand bg-v2-brand-soft px-3 py-2.5'
                  : 'flex items-start gap-3 rounded-lg border border-v2-border bg-v2-surface px-3 py-2.5'
              }
            >
              <span
                className={
                  o.state === 'selected'
                    ? 'flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-v2-brand text-[10px] font-bold text-white'
                    : 'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-v2-border-strong text-[10px] font-bold text-v2-foreground-muted'
                }
              >
                {o.label}
              </span>
              <span className="text-[13px] leading-[1.5] text-v2-foreground">
                {o.text}
              </span>
            </li>
          ))}
        </ul>

        {/* Footer schedule */}
        <div className="flex items-center justify-between border-t border-v2-border-subtle pt-4">
          <div className="flex items-center gap-3">
            <Award className="h-4 w-4 text-v2-brand" strokeWidth={2.25} />
            <span className="font-v2-mono text-[11px] uppercase tracking-v2-wide text-v2-foreground-muted">
              Next review · in 4 days
            </span>
          </div>
          <span className="rounded-md bg-v2-foreground px-2.5 py-1 text-[11px] font-semibold text-white">
            Submit
          </span>
        </div>
      </div>
    </div>
  )
}

function ProgressRing({ value }: { value: number }) {
  const radius = 16
  const circ = 2 * Math.PI * radius
  const offset = circ - (value / 100) * circ
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" className="-rotate-90">
      <circle
        cx="20"
        cy="20"
        r={radius}
        fill="none"
        stroke="var(--v2-border)"
        strokeWidth="3"
      />
      <circle
        cx="20"
        cy="20"
        r={radius}
        fill="none"
        stroke="url(#progress-gradient)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
      />
      <defs>
        <linearGradient
          id="progress-gradient"
          x1="0"
          y1="0"
          x2="40"
          y2="40"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#4F46E5" />
          <stop offset="100%" stopColor="#7C3AED" />
        </linearGradient>
      </defs>
    </svg>
  )
}
