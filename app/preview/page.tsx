/**
 * /preview — index page for the v2 design preview.
 *
 * Frame: Corporate Trust signature elements right here on the entry page —
 * gradient eyebrow line, gradient text on the hero, soft blur orbs in the
 * background. The user lands here and immediately reads the new visual
 * language before clicking through.
 */
import Link from 'next/link'
import {
  ArrowRight,
  Palette,
  Layers,
  Sparkles,
  LayoutDashboard,
  CreditCard,
  GraduationCap,
  KeyRound,
} from 'lucide-react'

const routes = [
  {
    href: '/preview/tokens',
    label: 'Design tokens',
    desc: 'Color, type, spacing, motion, gradients — the system in one page.',
    Icon: Palette,
    status: 'Step 01 · Live',
  },
  {
    href: '/preview/kitchen-sink',
    label: 'Primitives',
    desc: 'Buttons, cards, inputs, badges — every component in every state.',
    Icon: Layers,
    status: 'Step 02 · Live',
  },
  {
    href: '/preview/landing',
    label: 'Marketing landing',
    desc: 'Hero, certs, features, specs, pricing, FAQ, final CTA.',
    Icon: Sparkles,
    status: 'Steps 03–04 · Live',
  },
  {
    href: '/preview/landing/pricing',
    label: 'Pricing page',
    desc: 'Tier cards + side-by-side comparison + FAQ.',
    Icon: CreditCard,
    status: 'Step 05 · Live',
  },
  {
    href: '/preview/landing/certifications',
    label: 'Certifications catalog',
    desc: 'All AWS certs we cover, with level filter.',
    Icon: GraduationCap,
    status: 'Step 05 · Live',
  },
  {
    href: '/preview/landing/certifications/saa-c03',
    label: 'Cert detail · SAA-C03',
    desc: 'Curriculum, exam blueprint, sticky purchase card.',
    Icon: GraduationCap,
    status: 'Step 05 · Live',
  },
  {
    href: '/preview/auth/login',
    label: 'Sign in',
    desc: 'OAuth + email/password, minimal auth shell.',
    Icon: KeyRound,
    status: 'Step 05 · Live',
  },
  {
    href: '/preview/auth/signup',
    label: 'Create account',
    desc: 'Same shape as login, plus name + trust strip.',
    Icon: KeyRound,
    status: 'Step 05 · Live',
  },
  {
    href: '/preview/dashboard',
    label: 'Dashboard home',
    desc: 'Greeting, continue card, week plan, domain mastery, activity.',
    Icon: LayoutDashboard,
    status: 'Step 06 · Live',
  },
  {
    href: '/preview/dashboard/courses/saa-c03',
    label: 'Course overview',
    desc: '4-module accordion with progress, sticky next-lesson + mock-exam sidebar.',
    Icon: LayoutDashboard,
    status: 'Step 07 · Live',
  },
  {
    href: '/preview/learn/saa-c03/3.4',
    label: 'Lesson view',
    desc: '3-column reading mode: module tree, 720px reading column, on-this-page rail.',
    Icon: LayoutDashboard,
    status: 'Step 07 · Live',
  },
  {
    href: '/preview/exam/saa-c03-mock-5',
    label: 'Practice exam',
    desc: 'Mock exam UI — timer, flag-for-review, navigator, segmented progress.',
    Icon: LayoutDashboard,
    status: 'Step 08 · Live',
  },
  {
    href: '/preview/exam/saa-c03-mock-5/results',
    label: 'Exam results',
    desc: 'Score ring, domain breakdown, filterable question review.',
    Icon: LayoutDashboard,
    status: 'Step 08 · Live',
  },
]

export default function PreviewIndex() {
  return (
    <main className="relative isolate overflow-hidden">
      {/* Atmospheric blobs — the third Corporate Trust signature */}
      <div
        aria-hidden
        className="v2-blob v2-animate-pulse-soft -left-32 -top-32 h-[480px] w-[480px]"
        style={{ background: 'var(--v2-gradient-brand)' }}
      />
      <div
        aria-hidden
        className="v2-blob v2-animate-pulse-soft -right-40 top-32 h-[420px] w-[420px]"
        style={{ background: 'var(--v2-gradient-brand-soft)', opacity: 0.7 }}
      />

      <section className="relative z-10 mx-auto max-w-[1200px] px-6 pb-24 pt-24 sm:pt-32">
        {/* Eyebrow */}
        <div className="inline-flex items-center gap-2 rounded-full border border-v2-border bg-v2-surface/80 px-4 py-1.5 backdrop-blur-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-v2-brand v2-animate-pulse-soft" />
          <span className="font-v2-mono text-[12px] uppercase tracking-v2-wide text-v2-foreground-muted">
            Maestring · v2 design preview
          </span>
        </div>

        {/* Hero */}
        <h1 className="v2-display mt-8 max-w-[920px] text-[44px] leading-[1.05] sm:text-[56px] lg:text-[72px]">
          A serious AWS prep platform,{' '}
          <span className="v2-text-gradient">designed like one.</span>
        </h1>

        <p className="mt-6 max-w-[640px] text-[18px] leading-[1.6] text-v2-foreground-muted">
          Indigo-to-violet gradients, colored shadows, dimensional depth. Every
          screen below is sandboxed under{' '}
          <code className="rounded-md bg-v2-surface px-1.5 py-0.5 font-v2-mono text-[14px] text-v2-foreground shadow-v2-soft">
            /preview
          </code>
          {' '}— production routes stay untouched until each step is approved.
        </p>

        {/* Route cards */}
        <div className="mt-16 grid grid-cols-1 gap-5 md:grid-cols-2">
          {routes.map((r, i) => (
            <Link
              key={r.href}
              href={r.href}
              className="group relative overflow-hidden rounded-2xl border border-v2-border bg-v2-surface p-7 shadow-v2-soft transition-all duration-300 ease-v2 hover:-translate-y-1 hover:border-v2-brand/30 hover:shadow-v2-elevated"
            >
              <div className="flex items-start gap-5">
                {/* Soft icon container */}
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-v2-brand-soft text-v2-brand transition-transform duration-300 ease-v2 group-hover:scale-110">
                  <r.Icon strokeWidth={2} className="h-5 w-5" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-[18px] font-bold text-v2-foreground">
                      {r.label}
                    </h2>
                    <span className="font-v2-mono text-[11px] uppercase tracking-v2-wide text-v2-foreground-subtle">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                  </div>
                  <p className="mt-2 text-[14px] leading-[1.6] text-v2-foreground-muted">
                    {r.desc}
                  </p>
                  <div className="mt-5 flex items-center justify-between">
                    <span className="font-v2-mono text-[11px] uppercase tracking-v2-wide text-v2-foreground-subtle">
                      {r.status}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-v2-brand">
                      View
                      <ArrowRight
                        className="h-3.5 w-3.5 transition-transform duration-200 ease-v2 group-hover:translate-x-1"
                        strokeWidth={2.25}
                      />
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <p className="mt-16 text-[13px] text-v2-foreground-subtle">
          Following the design directive · §13 build order · approve each step in chat
        </p>
      </section>
    </main>
  )
}
